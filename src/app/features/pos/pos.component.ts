import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { AuthService } from '../../core/services/auth.service';
import { ApiService } from '../../core/services/api.service';
import {
  CategoryDto,
  CreateOrderRequest,
  InvoiceDto,
  MenuItemDto,
  OrderStatus,
  OrderSummaryDto,
  OrderType,
  PaymentStatus,
  PaymentType
} from '../../core/models/api.models';

type PosTab = 'billing' | 'orders';

interface CartLine {
  menuItemId: string;
  name: string;
  image?: string | null;
  unitPrice: number;
  quantity: number;
}

interface BillingState {
  orderType: OrderType;
  discount: number;
  tax: number;
  deliveryCharges: number;
}

@Component({
  selector: 'app-pos',
  standalone: true,
  imports: [
    DatePipe,
    DecimalPipe,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule
  ],
  templateUrl: './pos.component.html',
  styleUrl: './pos.component.scss'
})
export class PosComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);

  readonly OrderType = OrderType;
  readonly PaymentType = PaymentType;
  readonly OrderStatus = OrderStatus;

  readonly activeTab = signal<PosTab>('billing');
  readonly categories = signal<CategoryDto[]>([]);
  readonly items = signal<MenuItemDto[]>([]);
  readonly selectedCategoryId = signal<string>('');
  readonly cart = signal<CartLine[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly actingOrderId = signal<string | null>(null);
  readonly error = signal<string | null>(null);
  readonly message = signal<string | null>(null);
  readonly invoice = signal<InvoiceDto | null>(null);
  readonly orders = signal<OrderSummaryDto[]>([]);
  readonly billing = signal<BillingState>({
    orderType: OrderType.DineIn,
    discount: 0,
    tax: 0,
    deliveryCharges: 0
  });

  readonly canViewOrders = computed(() => this.auth.hasPermission('Orders.View'));
  readonly canComplete = computed(() => this.auth.hasPermission('Orders.Update'));
  readonly canCancel = computed(() => this.auth.hasPermission('Orders.Cancel'));

  readonly pendingOrders = computed(() =>
    this.orders().filter(o => o.orderStatus === OrderStatus.Pending)
  );

  readonly recentOrders = computed(() =>
    this.orders()
      .filter(o => o.orderStatus !== OrderStatus.Pending)
      .slice(0, 10)
  );

  readonly subtotal = computed(() =>
    this.cart().reduce((sum, line) => sum + line.unitPrice * line.quantity, 0)
  );

  readonly form = this.fb.nonNullable.group({
    orderType: [OrderType.DineIn, Validators.required],
    paymentType: [PaymentType.Cash, Validators.required],
    discount: [0, [Validators.required, Validators.min(0)]],
    tax: [0], // Tax UI commented out; always 0 for now
    deliveryCharges: [0, [Validators.required, Validators.min(0)]],
    remarks: ['']
  });

  readonly grandTotal = computed(() => {
    const value = this.billing();
    const delivery = value.orderType === OrderType.Delivery ? value.deliveryCharges : 0;
    return Math.max(0, this.subtotal() - value.discount + value.tax + delivery);
  });

  /** Cash tender suggestions: change due if customer pays with next common notes. */
  readonly cashChangeHints = computed(() => {
    const total = Math.round(this.grandTotal() * 100) / 100;
    if (total <= 0) {
      return [];
    }

    const denominations = total > 1000 ? [2000, 5000] : [500, 1000];
    return denominations
      .filter(payWith => payWith > total)
      .map(payWith => ({
        payWith,
        remaining: Math.round((payWith - total) * 100) / 100
      }));
  });

  readonly cashChangeHintText = computed(() => {
    const hints = this.cashChangeHints();
    if (!hints.length) {
      return null;
    }

    const parts = hints.map(
      h => `${h.remaining.toFixed(h.remaining % 1 === 0 ? 0 : 2)} if ${h.payWith}`
    );
    return `remaining: ${parts.join(', ')}`;
  });

  ngOnInit(): void {
    this.form.valueChanges.subscribe(() => this.syncBilling());
    this.form.controls.orderType.valueChanges.subscribe(type => {
      if (type !== OrderType.Delivery) {
        this.form.patchValue({ deliveryCharges: 0 }, { emitEvent: false });
        this.syncBilling();
      }
    });

    this.api.getCategories(true).subscribe({
      next: cats => {
        this.categories.set(cats);
        this.loadItems();
      },
      error: (err: { error?: { detail?: string } }) =>
        this.error.set(err?.error?.detail ?? 'Failed to load categories.')
    });

    if (this.canViewOrders()) {
      this.reloadOrders();
    }
  }

  setTab(tab: PosTab): void {
    this.activeTab.set(tab);
    this.error.set(null);
    if (tab === 'orders' && this.canViewOrders()) {
      this.reloadOrders();
    }
  }

  private syncBilling(): void {
    const value = this.form.getRawValue();
    this.billing.set({
      orderType: value.orderType,
      discount: Number(value.discount || 0),
      tax: 0, // Tax UI commented out; always 0 for now
      deliveryCharges: Number(value.deliveryCharges || 0)
    });
  }

  selectCategory(categoryId: string): void {
    this.selectedCategoryId.set(categoryId);
    this.loadItems();
  }

  loadItems(): void {
    this.loading.set(true);
    this.error.set(null);
    const categoryId = this.selectedCategoryId() || null;
    this.api.getPosMenuItems(categoryId).subscribe({
      next: items => {
        this.items.set(items);
        this.loading.set(false);
      },
      error: (err: { error?: { detail?: string } }) => {
        this.loading.set(false);
        this.error.set(err?.error?.detail ?? 'Failed to load menu items.');
      }
    });
  }

  mediaUrl(path?: string | null): string | null {
    return this.api.resolveMediaUrl(path);
  }

  addItem(item: MenuItemDto): void {
    this.cart.update(lines => {
      const existing = lines.find(l => l.menuItemId === item.id);
      if (existing) {
        return lines.map(l =>
          l.menuItemId === item.id ? { ...l, quantity: l.quantity + 1 } : l
        );
      }
      return [
        ...lines,
        {
          menuItemId: item.id,
          name: item.name,
          image: item.image,
          unitPrice: item.price,
          quantity: 1
        }
      ];
    });
  }

  increase(menuItemId: string): void {
    this.cart.update(lines =>
      lines.map(l => (l.menuItemId === menuItemId ? { ...l, quantity: l.quantity + 1 } : l))
    );
  }

  decrease(menuItemId: string): void {
    this.cart.update(lines =>
      lines
        .map(l => (l.menuItemId === menuItemId ? { ...l, quantity: l.quantity - 1 } : l))
        .filter(l => l.quantity > 0)
    );
  }

  remove(menuItemId: string): void {
    this.cart.update(lines => lines.filter(l => l.menuItemId !== menuItemId));
  }

  clearCart(): void {
    this.cart.set([]);
  }

  orderTypeLabel(type: OrderType): string {
    switch (type) {
      case OrderType.Takeaway:
        return 'Takeaway';
      case OrderType.Delivery:
        return 'Delivery';
      default:
        return 'Dine In';
    }
  }

  paymentTypeLabel(type: PaymentType): string {
    switch (type) {
      case PaymentType.Card:
        return 'Card';
      case PaymentType.Online:
        return 'Online';
      default:
        return 'Cash';
    }
  }

  orderStatusLabel(status: OrderStatus): string {
    switch (status) {
      case OrderStatus.Completed:
        return 'Done';
      case OrderStatus.Cancelled:
        return 'Cancelled';
      default:
        return 'Pending';
    }
  }

  save(): void {
    if (this.cart().length === 0) {
      this.error.set('Add at least one item to the cart.');
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const body: CreateOrderRequest = {
      orderType: value.orderType,
      paymentType: value.paymentType,
      paymentStatus: PaymentStatus.Pending,
      discount: Number(value.discount || 0),
      tax: 0, // Tax UI commented out; always 0 for now
      deliveryCharges: value.orderType === OrderType.Delivery ? Number(value.deliveryCharges || 0) : 0,
      remarks: value.remarks || null,
      items: this.cart().map(line => ({
        menuItemId: line.menuItemId,
        quantity: line.quantity,
        discount: 0
      }))
    };

    this.saving.set(true);
    this.error.set(null);
    this.message.set(null);
    this.api.createOrder(body).subscribe({
      next: order => {
        this.saving.set(false);
        this.clearCart();
        this.form.patchValue({
          discount: 0,
          tax: 0,
          deliveryCharges: 0,
          remarks: '',
          orderType: OrderType.DineIn,
          paymentType: PaymentType.Cash
        });
        this.syncBilling();
        this.message.set(`Order ${order.orderNo} saved as Pending.`);
        this.reloadOrders();
        this.setTab('orders');
      },
      error: (err: { error?: { detail?: string } }) => {
        this.saving.set(false);
        this.error.set(err?.error?.detail ?? 'Failed to save order.');
      }
    });
  }

  markDone(order: OrderSummaryDto): void {
    if (!this.canComplete()) {
      return;
    }

    this.actingOrderId.set(order.id);
    this.error.set(null);
    this.api.completeOrder(order.id).subscribe({
      next: () => {
        this.actingOrderId.set(null);
        this.message.set(`Order ${order.orderNo} marked Completed.`);
        this.reloadOrders();
      },
      error: (err: { error?: { detail?: string } }) => {
        this.actingOrderId.set(null);
        this.error.set(err?.error?.detail ?? 'Failed to complete order.');
      }
    });
  }

  markCancel(order: OrderSummaryDto): void {
    if (!this.canCancel()) {
      return;
    }

    this.actingOrderId.set(order.id);
    this.error.set(null);
    this.api.cancelOrder(order.id).subscribe({
      next: () => {
        this.actingOrderId.set(null);
        this.message.set(`Order ${order.orderNo} cancelled.`);
        this.reloadOrders();
      },
      error: (err: { error?: { detail?: string } }) => {
        this.actingOrderId.set(null);
        this.error.set(err?.error?.detail ?? 'Failed to cancel order.');
      }
    });
  }

  closeInvoice(): void {
    this.invoice.set(null);
  }

  printInvoice(): void {
    window.print();
  }

  viewReceipt(order: OrderSummaryDto): void {
    this.api.getInvoice(order.id).subscribe({
      next: invoice => this.invoice.set(invoice),
      error: (err: { error?: { detail?: string } }) =>
        this.error.set(err?.error?.detail ?? 'Failed to load invoice.')
    });
  }

  reloadOrders(): void {
    this.api.getOrders(40).subscribe({
      next: orders => this.orders.set(orders),
      error: () => undefined
    });
  }
}
