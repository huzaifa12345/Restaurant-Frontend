import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { forkJoin } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { ReportOrderDto, SalesSummaryDto, TopSellingItemDto } from '../../core/models/api.models';

const PAGE_SIZE = 40;

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

  readonly pageSize = PAGE_SIZE;
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly appliedFrom = signal('');
  readonly appliedTo = signal('');
  readonly summary = signal<SalesSummaryDto | null>(null);
  readonly orders = signal<ReportOrderDto[]>([]);
  readonly topItems = signal<TopSellingItemDto[]>([]);
  readonly cancelled = signal<ReportOrderDto[]>([]);
  readonly delivery = signal<ReportOrderDto[]>([]);

  readonly ordersPage = signal(1);
  readonly cancelledPage = signal(1);
  readonly deliveryPage = signal(1);
  readonly ordersTotal = signal(0);
  readonly cancelledTotal = signal(0);
  readonly deliveryTotal = signal(0);
  readonly ordersTotalPages = signal(0);
  readonly cancelledTotalPages = signal(0);
  readonly deliveryTotalPages = signal(0);

  readonly filterLabel = computed(() => {
    const from = this.appliedFrom();
    const to = this.appliedTo();
    if (!from || !to) {
      return '';
    }
    return from === to ? from : `${from} → ${to}`;
  });

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

    this.ordersPage.set(1);
    this.cancelledPage.set(1);
    this.deliveryPage.set(1);
    this.reloadAll();
  }

  goOrdersPage(page: number): void {
    if (page < 1 || (this.ordersTotalPages() > 0 && page > this.ordersTotalPages())) {
      return;
    }
    this.ordersPage.set(page);
    this.reloadOrdersOnly();
  }

  goCancelledPage(page: number): void {
    if (page < 1 || (this.cancelledTotalPages() > 0 && page > this.cancelledTotalPages())) {
      return;
    }
    this.cancelledPage.set(page);
    this.reloadCancelledOnly();
  }

  goDeliveryPage(page: number): void {
    if (page < 1 || (this.deliveryTotalPages() > 0 && page > this.deliveryTotalPages())) {
      return;
    }
    this.deliveryPage.set(page);
    this.reloadDeliveryOnly();
  }

  private reloadAll(): void {
    const { from, to } = this.filters.getRawValue();
    this.appliedFrom.set(from);
    this.appliedTo.set(to);
    this.loading.set(true);
    this.error.set(null);

    forkJoin({
      summary: this.api.getSalesReport(from, to),
      orders: this.api.getOrderReport(from, to, this.ordersPage(), PAGE_SIZE),
      topItems: this.api.getTopSellingItems(from, to),
      cancelled: this.api.getCancelledOrdersReport(from, to, this.cancelledPage(), PAGE_SIZE),
      delivery: this.api.getDeliveryOrdersReport(from, to, this.deliveryPage(), PAGE_SIZE)
    }).subscribe({
      next: result => {
        this.summary.set(result.summary);
        this.topItems.set(result.topItems);
        this.applyOrdersPage(result.orders);
        this.applyCancelledPage(result.cancelled);
        this.applyDeliveryPage(result.delivery);
        this.loading.set(false);
      },
      error: (err: { error?: { detail?: string } }) => {
        this.loading.set(false);
        this.error.set(err?.error?.detail ?? 'Failed to load reports.');
      }
    });
  }

  private reloadOrdersOnly(): void {
    const from = this.appliedFrom();
    const to = this.appliedTo();
    this.api.getOrderReport(from, to, this.ordersPage(), PAGE_SIZE).subscribe({
      next: page => this.applyOrdersPage(page),
      error: (err: { error?: { detail?: string } }) =>
        this.error.set(err?.error?.detail ?? 'Failed to load order report.')
    });
  }

  private reloadCancelledOnly(): void {
    const from = this.appliedFrom();
    const to = this.appliedTo();
    this.api.getCancelledOrdersReport(from, to, this.cancelledPage(), PAGE_SIZE).subscribe({
      next: page => this.applyCancelledPage(page),
      error: (err: { error?: { detail?: string } }) =>
        this.error.set(err?.error?.detail ?? 'Failed to load cancelled orders.')
    });
  }

  private reloadDeliveryOnly(): void {
    const from = this.appliedFrom();
    const to = this.appliedTo();
    this.api.getDeliveryOrdersReport(from, to, this.deliveryPage(), PAGE_SIZE).subscribe({
      next: page => this.applyDeliveryPage(page),
      error: (err: { error?: { detail?: string } }) =>
        this.error.set(err?.error?.detail ?? 'Failed to load delivery orders.')
    });
  }

  private applyOrdersPage(page: {
    items: ReportOrderDto[];
    page: number;
    totalCount: number;
    totalPages: number;
  }): void {
    this.orders.set(page.items);
    this.ordersPage.set(page.page);
    this.ordersTotal.set(page.totalCount);
    this.ordersTotalPages.set(page.totalPages);
  }

  private applyCancelledPage(page: {
    items: ReportOrderDto[];
    page: number;
    totalCount: number;
    totalPages: number;
  }): void {
    this.cancelled.set(page.items);
    this.cancelledPage.set(page.page);
    this.cancelledTotal.set(page.totalCount);
    this.cancelledTotalPages.set(page.totalPages);
  }

  private applyDeliveryPage(page: {
    items: ReportOrderDto[];
    page: number;
    totalCount: number;
    totalPages: number;
  }): void {
    this.delivery.set(page.items);
    this.deliveryPage.set(page.page);
    this.deliveryTotal.set(page.totalCount);
    this.deliveryTotalPages.set(page.totalPages);
  }

  private toInputDate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
}
