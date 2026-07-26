import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import {
  RawMaterialCategoryDto,
  RawMaterialDto,
  StockReportDto,
  StockReportRowDto
} from '../../core/models/api.models';
import { ApiService } from '../../core/services/api.service';
import { NotificationService } from '../../core/services/notification.service';

@Component({
  selector: 'app-stock-report',
  standalone: true,
  imports: [ReactiveFormsModule, MatTableModule, MatButtonModule, MatFormFieldModule, MatSelectModule],
  templateUrl: './stock-report.component.html',
  styleUrl: './stock-report.component.scss'
})
export class StockReportComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiService);
  private readonly notification = inject(NotificationService);

  readonly categories = signal<RawMaterialCategoryDto[]>([]);
  readonly rawMaterials = signal<RawMaterialDto[]>([]);
  readonly report = signal<StockReportDto | null>(null);
  readonly loading = signal(false);

  readonly hasPackSizes = computed(() => this.report()?.hasPackSizes ?? false);
  readonly rows = computed(() => this.report()?.items ?? []);
  readonly displayedColumns = computed(() =>
    this.hasPackSizes()
      ? ['name', 'barcode', 'category', 'baseQty', 'packSizes', 'active']
      : ['name', 'barcode', 'category', 'baseQty', 'active']
  );

  readonly filters = this.fb.nonNullable.group({
    categoryId: [''],
    rawMaterialId: ['']
  });

  ngOnInit(): void {
    this.api.getRawMaterialCategories().subscribe({
      next: items => this.categories.set(items),
      error: () => this.categories.set([])
    });
    this.api.getRawMaterials().subscribe({
      next: items => this.rawMaterials.set(items),
      error: () => this.rawMaterials.set([])
    });
    this.load();
  }

  load(): void {
    const { categoryId, rawMaterialId } = this.filters.getRawValue();
    this.loading.set(true);
    this.api.getStockReport(categoryId || null, rawMaterialId || null).subscribe({
      next: report => {
        this.report.set(report);
        this.loading.set(false);
      },
      error: (err: { error?: { detail?: string } }) => {
        this.loading.set(false);
        this.notification.error(err?.error?.detail ?? 'Failed to load stock report.');
      }
    });
  }

  export(format: 'xlsx' | 'pdf'): void {
    const { categoryId, rawMaterialId } = this.filters.getRawValue();
    this.api.downloadStockReportExport(format, categoryId || null, rawMaterialId || null);
  }

  baseQtyLabel(row: StockReportRowDto): string {
    return `${row.quantityBase} ${row.baseUomName}`;
  }
}
