import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, OnInit, TemplateRef, ViewChild, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { ExpenseCategoryDto, ExpenseDto } from '../../core/models/api.models';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-expenses',
  standalone: true,
  imports: [
    DatePipe,
    DecimalPipe,
    ReactiveFormsModule,
    MatTableModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule
  ],
  templateUrl: './expenses.component.html',
  styleUrl: './expenses.component.scss'
})
export class ExpensesComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly dialog = inject(MatDialog);
  private readonly notification = inject(NotificationService);

  readonly items = signal<ExpenseDto[]>([]);
  readonly categories = signal<ExpenseCategoryDto[]>([]);
  readonly loading = signal(false);
  readonly editingId = signal<string | null>(null);
  readonly page = signal(1);
  readonly pageSize = 20;
  readonly totalCount = signal(0);
  readonly totalPages = signal(0);

  readonly canCreate = computed(() => this.auth.hasPermission('Expenses.Create'));
  readonly canUpdate = computed(() => this.auth.hasPermission('Expenses.Update'));
  readonly canDelete = computed(() => this.auth.hasPermission('Expenses.Delete'));
  readonly displayedColumns = ['category', 'occurredAt', 'amount', 'note', 'actions'];

  @ViewChild('expenseFormTemplate') private readonly expenseFormTemplate?: TemplateRef<unknown>;
  private activeDialogRef: MatDialogRef<unknown> | null = null;

  readonly filters = this.fb.nonNullable.group({
    categoryId: [''],
    from: [''],
    to: [''],
    useBusinessDay: [false]
  });

  readonly form = this.fb.nonNullable.group({
    categoryId: ['', Validators.required],
    occurredAt: ['', Validators.required],
    amount: [0, [Validators.required, Validators.min(0.01)]],
    note: ['']
  });

  ngOnInit(): void {
    this.api.getExpenseCategories({ page: 1, pageSize: 100, activeOnly: true }).subscribe({
      next: result => this.categories.set(result.items),
      error: () => this.categories.set([])
    });
    this.reload();
  }

  reload(page = this.page()): void {
    const { categoryId, from, to, useBusinessDay } = this.filters.getRawValue();
    this.loading.set(true);
    this.api
      .getExpenses({
        page,
        pageSize: this.pageSize,
        categoryId: categoryId || null,
        from: from || null,
        to: to || null,
        useBusinessDay
      })
      .subscribe({
        next: result => {
          this.items.set(result.items);
          this.page.set(result.page);
          this.totalCount.set(result.totalCount);
          this.totalPages.set(result.totalPages);
          this.loading.set(false);
        },
        error: (err: { error?: { detail?: string } }) => {
          this.loading.set(false);
          this.notification.error(err?.error?.detail ?? 'Failed to load expenses.');
        }
      });
  }

  applyFilters(): void {
    this.page.set(1);
    this.reload(1);
  }

  prevPage(): void {
    if (this.page() > 1) {
      this.reload(this.page() - 1);
    }
  }

  nextPage(): void {
    if (this.totalPages() > 0 && this.page() < this.totalPages()) {
      this.reload(this.page() + 1);
    }
  }

  startCreate(): void {
    this.editingId.set(null);
    this.form.reset({
      categoryId: '',
      occurredAt: this.toLocalDatetimeInput(new Date()),
      amount: 0,
      note: ''
    });
    this.openFormDialog();
  }

  startEdit(item: ExpenseDto): void {
    if (item.canEdit === false) {
      return;
    }
    this.editingId.set(item.id);
    this.form.reset({
      categoryId: item.categoryId,
      occurredAt: this.toLocalDatetimeInput(new Date(item.occurredAt)),
      amount: item.amount,
      note: item.note ?? ''
    });
    this.openFormDialog();
  }

  cancelEdit(): void {
    this.activeDialogRef?.close();
    this.resetDialogState();
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const body = {
      categoryId: value.categoryId,
      occurredAt: new Date(value.occurredAt).toISOString(),
      amount: Number(value.amount),
      note: value.note.trim() || null
    };
    const editingId = this.editingId();
    this.loading.set(true);

    const request$ = editingId ? this.api.updateExpense(editingId, body) : this.api.createExpense(body);

    request$.subscribe({
      next: () => {
        this.loading.set(false);
        this.cancelEdit();
        this.reload();
        this.notification.success(editingId ? 'Expense updated.' : 'Expense created.');
      },
      error: (err: { error?: { detail?: string } }) => {
        this.loading.set(false);
        this.notification.error(err?.error?.detail ?? 'Failed to save expense.');
      }
    });
  }

  remove(item: ExpenseDto): void {
    if (!this.canDelete() || item.canDelete === false) {
      return;
    }

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Delete expense',
        message: `Are you sure you want to delete this expense (${item.categoryName})?`,
        confirmText: 'Yes, delete',
        cancelText: 'No'
      },
      autoFocus: false
    });

    dialogRef.afterClosed().subscribe((confirmed: boolean | undefined) => {
      if (!confirmed) {
        return;
      }
      this.api.deleteExpense(item.id).subscribe({
        next: () => {
          const nextPage = this.items().length <= 1 ? Math.max(1, this.page() - 1) : this.page();
          this.reload(nextPage);
          this.notification.success('Expense deleted.');
        },
        error: (err: { error?: { detail?: string } }) =>
          this.notification.error(err?.error?.detail ?? 'Failed to delete expense.')
      });
    });
  }

  private openFormDialog(): void {
    if (!this.expenseFormTemplate) {
      return;
    }

    this.activeDialogRef?.close();
    this.activeDialogRef = this.dialog.open(this.expenseFormTemplate, {
      width: '640px',
      autoFocus: false
    });

    this.activeDialogRef.afterClosed().subscribe(() => {
      this.activeDialogRef = null;
      this.resetDialogState();
    });
  }

  private resetDialogState(): void {
    this.editingId.set(null);
    this.form.reset();
  }

  private toLocalDatetimeInput(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const h = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    return `${y}-${m}-${d}T${h}:${min}`;
  }
}
