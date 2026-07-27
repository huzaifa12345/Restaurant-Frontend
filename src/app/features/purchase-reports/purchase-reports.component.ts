import { DecimalPipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { PurchaseReportRowDto, RawMaterialDto, SupplierDto } from '../../core/models/api.models';
import { ApiService } from '../../core/services/api.service';
import { NotificationService } from '../../core/services/notification.service';

@Component({
  selector: 'app-purchase-reports',
  standalone: true,
  imports: [
    DecimalPipe,
    ReactiveFormsModule,
    MatTableModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule
  ],
  templateUrl: './purchase-reports.component.html',
  styleUrl: './purchase-reports.component.scss'
})
export class PurchaseReportsComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiService);
  private readonly notification = inject(NotificationService);

  readonly rows = signal<PurchaseReportRowDto[]>([]);
  readonly suppliers = signal<SupplierDto[]>([]);
  readonly rawMaterials = signal<RawMaterialDto[]>([]);
  readonly loading = signal(false);
  readonly displayedColumns = ['invoiceNo', 'date', 'supplier', 'payment', 'lines', 'total'];

  readonly filters = this.fb.nonNullable.group({
    from: [this.toInputDate(new Date()), Validators.required],
    to: [this.toInputDate(new Date()), Validators.required],
    supplierId: [''],
    rawMaterialId: ['']
  });

  ngOnInit(): void {
    this.api.getSuppliers({ page: 1, pageSize: 100 }).subscribe({
      next: result => this.suppliers.set(result.items),
      error: () => this.suppliers.set([])
    });
    this.api.getRawMaterials({ page: 1, pageSize: 100 }).subscribe({
      next: result => this.rawMaterials.set(result.items),
      error: () => this.rawMaterials.set([])
    });
    this.load();
  }

  load(): void {
    if (this.filters.invalid) {
      this.filters.markAllAsTouched();
      return;
    }

    const { from, to, supplierId, rawMaterialId } = this.filters.getRawValue();
    this.loading.set(true);
    this.api.getPurchaseReport(from, to, supplierId || null, rawMaterialId || null).subscribe({
      next: rows => {
        this.rows.set(rows);
        this.loading.set(false);
      },
      error: (err: { error?: { detail?: string } }) => {
        this.loading.set(false);
        this.notification.error(err?.error?.detail ?? 'Failed to load purchase report.');
      }
    });
  }

  export(format: 'xlsx' | 'pdf'): void {
    if (this.filters.invalid) {
      this.filters.markAllAsTouched();
      return;
    }
    const { from, to, supplierId, rawMaterialId } = this.filters.getRawValue();
    this.api.downloadPurchaseReportExport(format, from, to, supplierId || null, rawMaterialId || null);
  }

  private toInputDate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
}
