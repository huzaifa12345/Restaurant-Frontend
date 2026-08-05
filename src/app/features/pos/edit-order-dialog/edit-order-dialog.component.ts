import { DecimalPipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import {
  CreateOrderRequest,
  OrderDto,
  OrderType,
  PaymentStatus,
  PaymentType
} from '../../../core/models/api.models';
import { ApiService } from '../../../core/services/api.service';

export interface EditOrderDialogData {
  orderId: string;
  orderNo: string;
}

interface EditLine {
  menuItemId: string;
  name: string;
  unitPrice: number;
  quantity: number;
}

@Component({
  selector: 'app-edit-order-dialog',
  standalone: true,
  imports: [
    DecimalPipe,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule
  ],
  templateUrl: './edit-order-dialog.component.html',
  styleUrl: './edit-order-dialog.component.scss'
})
export class EditOrderDialogComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiService);
  private readonly dialogRef = inject(MatDialogRef<EditOrderDialogComponent, boolean>);
  readonly data = inject<EditOrderDialogData>(MAT_DIALOG_DATA);

  readonly OrderType = OrderType;
  readonly PaymentType = PaymentType;

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly lines = signal<EditLine[]>([]);
  readonly billing = signal({
    orderType: OrderType.DineIn,
    discount: 0,
    deliveryCharges: 0
  });

  readonly form = this.fb.nonNullable.group({
    orderType: [OrderType.DineIn, Validators.required],
    paymentType: [PaymentType.Cash, Validators.required],
    discount: [0, [Validators.required, Validators.min(0)]],
    deliveryCharges: [0, [Validators.required, Validators.min(0)]],
    remarks: ['']
  });

  readonly subtotal = computed(() =>
    this.lines().reduce((sum, line) => sum + line.unitPrice * line.quantity, 0)
  );

  readonly grandTotal = computed(() => {
    const value = this.billing();
    const delivery = value.orderType === OrderType.Delivery ? value.deliveryCharges : 0;
    return Math.max(0, this.subtotal() - value.discount + delivery);
  });

  ngOnInit(): void {
    this.form.valueChanges.subscribe(() => this.syncBilling());
    this.form.controls.orderType.valueChanges.subscribe(type => {
      this.setDeliveryChargesEnabled(type === OrderType.Delivery);
      if (type !== OrderType.Delivery) {
        this.form.patchValue({ deliveryCharges: 0 }, { emitEvent: false });
      }
      this.syncBilling();
    });
    this.form.controls.deliveryCharges.disable({ emitEvent: false });

    this.api.getOrder(this.data.orderId).subscribe({
      next: (order: OrderDto) => {
        this.lines.set(
          order.items.map(i => ({
            menuItemId: i.menuItemId,
            name: i.menuItemName,
            unitPrice: i.unitPrice,
            quantity: i.quantity
          }))
        );
        this.form.patchValue({
          orderType: order.orderType,
          paymentType: order.paymentType,
          discount: order.discount,
          deliveryCharges: order.deliveryCharges,
          remarks: order.remarks ?? ''
        });
        this.setDeliveryChargesEnabled(order.orderType === OrderType.Delivery);
        this.syncBilling();
        this.loading.set(false);
      },
      error: (err: { error?: { detail?: string } }) => {
        this.loading.set(false);
        this.error.set(err?.error?.detail ?? 'Failed to load order.');
      }
    });
  }

  private setDeliveryChargesEnabled(enabled: boolean): void {
    if (enabled) {
      this.form.controls.deliveryCharges.enable({ emitEvent: false });
    } else {
      this.form.controls.deliveryCharges.disable({ emitEvent: false });
    }
  }

  private syncBilling(): void {
    const value = this.form.getRawValue();
    this.billing.set({
      orderType: value.orderType,
      discount: Number(value.discount || 0),
      deliveryCharges: Number(value.deliveryCharges || 0)
    });
  }

  increase(menuItemId: string): void {
    this.lines.update(list =>
      list.map(l => (l.menuItemId === menuItemId ? { ...l, quantity: l.quantity + 1 } : l))
    );
  }

  decrease(menuItemId: string): void {
    this.lines.update(list =>
      list
        .map(l => (l.menuItemId === menuItemId ? { ...l, quantity: l.quantity - 1 } : l))
        .filter(l => l.quantity > 0)
    );
  }

  remove(menuItemId: string): void {
    this.lines.update(list => list.filter(l => l.menuItemId !== menuItemId));
  }

  cancel(): void {
    this.dialogRef.close(false);
  }

  save(): void {
    if (this.lines().length === 0) {
      this.error.set('At least one item is required.');
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
      tax: 0,
      deliveryCharges: value.orderType === OrderType.Delivery ? Number(value.deliveryCharges || 0) : 0,
      remarks: value.remarks || null,
      items: this.lines().map(line => ({
        menuItemId: line.menuItemId,
        quantity: line.quantity,
        discount: 0
      }))
    };

    this.saving.set(true);
    this.error.set(null);
    this.api.updateOrder(this.data.orderId, body).subscribe({
      next: () => {
        this.saving.set(false);
        this.dialogRef.close(true);
      },
      error: (err: { error?: { detail?: string } }) => {
        this.saving.set(false);
        this.error.set(err?.error?.detail ?? 'Failed to update order.');
      }
    });
  }
}
