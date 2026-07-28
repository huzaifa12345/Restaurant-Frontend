import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { ExpenseCategoryDto, ExpenseReportDto, ExpenseReportRowDto } from '../../core/models/api.models';
import { ApiService } from '../../core/services/api.service';
import { NotificationService } from '../../core/services/notification.service';

@Component({
  selector: 'app-expense-reports',
  standalone: true,
  imports: [
    DatePipe,
    DecimalPipe,
    ReactiveFormsModule,
    MatTableModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule
  ],
  templateUrl: './expense-reports.component.html',
  styleUrl: './expense-reports.component.scss'
})
export class ExpenseReportsComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiService);
  private readonly notification = inject(NotificationService);

  readonly categories = signal<ExpenseCategoryDto[]>([]);
  readonly report = signal<ExpenseReportDto | null>(null);
  readonly loading = signal(false);
  readonly rows = computed(() => this.report()?.items ?? ([] as ExpenseReportRowDto[]));
  readonly totalAmount = computed(() => this.report()?.totalAmount ?? 0);
  readonly displayedColumns = ['occurredAt', 'category', 'amount', 'note'];

  readonly filters = this.fb.nonNullable.group({
    from: [this.toInputDate(new Date()), Validators.required],
    to: [this.toInputDate(new Date()), Validators.required],
    useBusinessDay: [false],
    categoryId: ['']
  });

  ngOnInit(): void {
    this.api.getExpenseCategories({ page: 1, pageSize: 100, activeOnly: true }).subscribe({
      next: result => this.categories.set(result.items),
      error: () => this.categories.set([])
    });
    this.load();
  }

  load(): void {
    if (this.filters.invalid) {
      this.filters.markAllAsTouched();
      return;
    }

    const { from, to, useBusinessDay, categoryId } = this.filters.getRawValue();
    this.loading.set(true);
    this.api.getExpenseReport(from, to, categoryId || null, useBusinessDay).subscribe({
      next: report => {
        this.report.set(report);
        this.loading.set(false);
      },
      error: (err: { error?: { detail?: string } }) => {
        this.loading.set(false);
        this.notification.error(err?.error?.detail ?? 'Failed to load expense report.');
      }
    });
  }

  export(format: 'xlsx' | 'pdf'): void {
    if (this.filters.invalid) {
      this.filters.markAllAsTouched();
      return;
    }
    const { from, to, useBusinessDay, categoryId } = this.filters.getRawValue();
    this.api.downloadExpenseReportExport(format, from, to, categoryId || null, useBusinessDay);
  }

  private toInputDate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
}
