import { DecimalPipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import {
  PurchaseDto,
  PurchasePaymentType,
  RawMaterialDto,
  RawMaterialPackSizeDto,
  SupplierDto
} from '../../core/models/api.models';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';

interface LineUomOption {
  uomId: string;
  uomName: string;
  factor: number;
}

@Component({
  selector: 'app-purchases',
  standalone: true,
  imports: [
    DecimalPipe,
    ReactiveFormsModule,
    MatTableModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule
  ],
  templateUrl: './purchases.component.html',
  styleUrl: './purchases.component.scss'
})
export class PurchasesComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly dialog = inject(MatDialog);
  private readonly notification = inject(NotificationService);

  readonly purchases = signal<PurchaseDto[]>([]);
  readonly suppliers = signal<SupplierDto[]>([]);
  readonly rawMaterials = signal<RawMaterialDto[]>([]);
  readonly lineUoms = signal<Record<number, LineUomOption[]>>({});
  readonly loading = signal(false);
  readonly editingId = signal<string | null>(null);
  readonly showForm = signal(false);
  readonly invoiceNo = signal('');

  readonly canCreate = computed(() => this.auth.hasPermission('Purchases.Create'));
  readonly canUpdate = computed(() => this.auth.hasPermission('Purchases.Update'));
  readonly canDelete = computed(() => this.auth.hasPermission('Purchases.Delete'));
  readonly paymentTypes = [
    { value: PurchasePaymentType.Cash, label: 'Cash' },
    { value: PurchasePaymentType.Credit, label: 'Credit' }
  ];
  readonly displayedColumns = ['invoiceNo', 'date', 'supplier', 'payment', 'total', 'actions'];

  readonly form = this.fb.nonNullable.group({
    purchaseDate: [this.toInputDate(new Date()), Validators.required],
    supplierId: ['', Validators.required],
    paymentType: [PurchasePaymentType.Cash, Validators.required],
    remarks: [''],
    items: this.fb.array([])
  });

  get items(): FormArray {
    return this.form.controls.items as FormArray;
  }

  readonly grandTotal = computed(() => {
    // Depend on form value changes via signal refresh on valueChanges
    return this.lineTotalsSignal().reduce((sum, n) => sum + n, 0);
  });

  private readonly lineTotalsSignal = signal<number[]>([]);

  ngOnInit(): void {
    this.api.getSuppliers().subscribe({
      next: items => this.suppliers.set(items),
      error: (err: { error?: { detail?: string } }) =>
        this.notification.error(err?.error?.detail ?? 'Failed to load suppliers.')
    });
    this.api.getRawMaterials(null, true).subscribe({
      next: items => this.rawMaterials.set(items),
      error: (err: { error?: { detail?: string } }) =>
        this.notification.error(err?.error?.detail ?? 'Failed to load raw materials.')
    });
    this.form.valueChanges.subscribe(() => this.refreshLineTotals());
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.api.getPurchases().subscribe({
      next: items => {
        this.purchases.set(items);
        this.loading.set(false);
      },
      error: (err: { error?: { detail?: string } }) => {
        this.loading.set(false);
        this.notification.error(err?.error?.detail ?? 'Failed to load purchases.');
      }
    });
  }

  paymentLabel(type: PurchasePaymentType): string {
    return type === PurchasePaymentType.Credit ? 'Credit' : 'Cash';
  }

  startCreate(): void {
    this.editingId.set(null);
    this.invoiceNo.set('(assigned on save)');
    this.showForm.set(true);
    const defaultSupplier = this.suppliers().find(s => s.isDefault) ?? this.suppliers()[0];
    this.form.reset({
      purchaseDate: this.toInputDate(new Date()),
      supplierId: defaultSupplier?.id ?? '',
      paymentType: PurchasePaymentType.Cash,
      remarks: ''
    });
    this.items.clear();
    this.lineUoms.set({});
    this.addLine();
    this.refreshLineTotals();
  }

  startEdit(row: PurchaseDto): void {
    this.loading.set(true);
    this.api.getPurchase(row.id).subscribe({
      next: purchase => {
        this.loading.set(false);
        this.editingId.set(purchase.id);
        this.invoiceNo.set(purchase.invoiceNo);
        this.showForm.set(true);
        this.form.reset({
          purchaseDate: purchase.purchaseDate,
          supplierId: purchase.supplierId,
          paymentType: purchase.paymentType,
          remarks: purchase.remarks ?? ''
        });
        this.items.clear();
        this.lineUoms.set({});
        const lines = purchase.items ?? [];
        if (lines.length === 0) {
          this.addLine();
          this.refreshLineTotals();
          return;
        }
        lines.forEach((line, index) => {
          this.items.push(
            this.fb.nonNullable.group({
              rawMaterialId: [line.rawMaterialId, Validators.required],
              uomId: [line.uomId, Validators.required],
              quantity: [line.quantity, [Validators.required, Validators.min(0.0001)]],
              unitPrice: [line.unitPrice, [Validators.required, Validators.min(0)]]
            })
          );
          this.loadUomsForLine(index, line.rawMaterialId, line.uomId, false);
        });
        this.refreshLineTotals();
      },
      error: (err: { error?: { detail?: string } }) => {
        this.loading.set(false);
        this.notification.error(err?.error?.detail ?? 'Failed to load purchase.');
      }
    });
  }

  cancelEdit(): void {
    this.editingId.set(null);
    this.invoiceNo.set('');
    this.showForm.set(false);
    this.items.clear();
    this.lineUoms.set({});
    this.form.reset();
    this.refreshLineTotals();
  }

  addLine(): void {
    const index = this.items.length;
    this.items.push(
      this.fb.nonNullable.group({
        rawMaterialId: ['', Validators.required],
        uomId: ['', Validators.required],
        quantity: [1, [Validators.required, Validators.min(0.0001)]],
        unitPrice: [0, [Validators.required, Validators.min(0)]]
      })
    );
    this.lineUoms.update(map => ({ ...map, [index]: [] }));
    this.refreshLineTotals();
  }

  removeLine(index: number): void {
    this.items.removeAt(index);
    const next: Record<number, LineUomOption[]> = {};
    this.items.controls.forEach((_, i) => {
      const sourceIndex = i >= index ? i + 1 : i;
      next[i] = this.lineUoms()[sourceIndex] ?? [];
    });
    this.lineUoms.set(next);
    this.refreshLineTotals();
  }

  onRawMaterialChange(index: number): void {
    const rawMaterialId = this.items.at(index).get('rawMaterialId')?.value as string;
    this.items.at(index).patchValue({ uomId: '' });
    this.loadUomsForLine(index, rawMaterialId, null, true);
  }

  lineTotal(index: number): number {
    const row = this.items.at(index)?.getRawValue() as
      | { quantity: number; unitPrice: number }
      | undefined;
    if (!row) {
      return 0;
    }
    return Number(row.quantity || 0) * Number(row.unitPrice || 0);
  }

  uomOptions(index: number): LineUomOption[] {
    return this.lineUoms()[index] ?? [];
  }

  save(): void {
    if (this.form.invalid || this.items.length === 0) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const items = value.items as Array<{
      rawMaterialId: string;
      uomId: string;
      quantity: number;
      unitPrice: number;
    }>;
    const body = {
      purchaseDate: value.purchaseDate,
      supplierId: value.supplierId,
      paymentType: Number(value.paymentType) as PurchasePaymentType,
      remarks: value.remarks.trim() || null,
      items: items.map(line => ({
        rawMaterialId: line.rawMaterialId,
        uomId: line.uomId,
        quantity: Number(line.quantity),
        unitPrice: Number(line.unitPrice)
      }))
    };
    const editingId = this.editingId();
    this.loading.set(true);

    const request$ = editingId
      ? this.api.updatePurchase(editingId, body)
      : this.api.createPurchase(body);

    request$.subscribe({
      next: () => {
        this.loading.set(false);
        this.cancelEdit();
        this.reload();
        this.notification.success(editingId ? 'Purchase updated.' : 'Purchase created.');
      },
      error: (err: { error?: { detail?: string } }) => {
        this.loading.set(false);
        this.notification.error(err?.error?.detail ?? 'Failed to save purchase.');
      }
    });
  }

  remove(row: PurchaseDto): void {
    if (!this.canDelete()) {
      return;
    }

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Delete purchase',
        message: `Are you sure you want to delete invoice "${row.invoiceNo}"?`,
        confirmText: 'Yes, delete',
        cancelText: 'No'
      },
      autoFocus: false
    });

    dialogRef.afterClosed().subscribe((confirmed: boolean | undefined) => {
      if (!confirmed) {
        return;
      }
      this.api.deletePurchase(row.id).subscribe({
        next: () => {
          this.reload();
          this.notification.success('Purchase deleted.');
        },
        error: (err: { error?: { detail?: string } }) =>
          this.notification.error(err?.error?.detail ?? 'Failed to delete purchase.')
      });
    });
  }

  private loadUomsForLine(
    index: number,
    rawMaterialId: string,
    preferredUomId: string | null,
    autoSelect: boolean
  ): void {
    if (!rawMaterialId) {
      this.lineUoms.update(map => ({ ...map, [index]: [] }));
      return;
    }

    this.api.getRawMaterial(rawMaterialId).subscribe({
      next: detail => {
        const options: LineUomOption[] = [
          {
            uomId: detail.baseUomId,
            uomName: detail.baseUomName,
            factor: 1
          },
          ...(detail.packSizes ?? []).map((pack: RawMaterialPackSizeDto) => ({
            uomId: pack.uomId,
            uomName: pack.uomName ?? '',
            factor: pack.factor
          }))
        ];
        this.lineUoms.update(map => ({ ...map, [index]: options }));
        if (autoSelect) {
          const selected = preferredUomId && options.some(o => o.uomId === preferredUomId)
            ? preferredUomId
            : options[0]?.uomId ?? '';
          this.items.at(index).patchValue({ uomId: selected });
        }
      },
      error: (err: { error?: { detail?: string } }) =>
        this.notification.error(err?.error?.detail ?? 'Failed to load UOMs for raw material.')
    });
  }

  private refreshLineTotals(): void {
    const totals = this.items.controls.map((_, i) => this.lineTotal(i));
    this.lineTotalsSignal.set(totals);
  }

  private toInputDate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
}
