import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { forkJoin } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { ReportOrderDto, SalesSummaryDto, TopSellingItemDto } from '../../core/models/api.models';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [
    DatePipe,
    DecimalPipe,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule
  ],
  templateUrl: './reports.component.html',
  styleUrl: './reports.component.scss'
})
export class ReportsComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiService);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly summary = signal<SalesSummaryDto | null>(null);
  readonly orders = signal<ReportOrderDto[]>([]);
  readonly topItems = signal<TopSellingItemDto[]>([]);
  readonly cancelled = signal<ReportOrderDto[]>([]);
  readonly delivery = signal<ReportOrderDto[]>([]);

  readonly filters = this.fb.nonNullable.group({
    from: [this.toInputDate(new Date()), Validators.required],
    to: [this.toInputDate(new Date()), Validators.required]
  });

  ngOnInit(): void {
    this.load();
  }

  setToday(): void {
    const today = this.toInputDate(new Date());
    this.filters.patchValue({ from: today, to: today });
    this.load();
  }

  setThisMonth(): void {
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    this.filters.patchValue({
      from: this.toInputDate(from),
      to: this.toInputDate(to)
    });
    this.load();
  }

  load(): void {
    if (this.filters.invalid) {
      this.filters.markAllAsTouched();
      return;
    }

    const { from, to } = this.filters.getRawValue();
    this.loading.set(true);
    this.error.set(null);

    forkJoin({
      summary: this.api.getSalesReport(from, to),
      orders: this.api.getOrderReport(from, to),
      topItems: this.api.getTopSellingItems(from, to),
      cancelled: this.api.getCancelledOrdersReport(from, to),
      delivery: this.api.getDeliveryOrdersReport(from, to)
    }).subscribe({
      next: result => {
        this.summary.set(result.summary);
        this.orders.set(result.orders);
        this.topItems.set(result.topItems);
        this.cancelled.set(result.cancelled);
        this.delivery.set(result.delivery);
        this.loading.set(false);
      },
      error: (err: { error?: { detail?: string } }) => {
        this.loading.set(false);
        this.error.set(err?.error?.detail ?? 'Failed to load reports.');
      }
    });
  }

  private toInputDate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
}
