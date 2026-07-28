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
import {
  EmployeeDto,
  EmployeePaymentDto,
  EmployeePaymentType
} from '../../core/models/api.models';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-employee-payments',
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
  templateUrl: './employee-payments.component.html',
  styleUrl: './employee-payments.component.scss'
})
export class EmployeePaymentsComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly dialog = inject(MatDialog);
  private readonly notification = inject(NotificationService);

  readonly EmployeePaymentType = EmployeePaymentType;
  readonly items = signal<EmployeePaymentDto[]>([]);
  readonly employees = signal<EmployeeDto[]>([]);
  readonly loading = signal(false);
  readonly editingId = signal<string | null>(null);
  readonly page = signal(1);
  readonly pageSize = 20;
  readonly totalCount = signal(0);
  readonly totalPages = signal(0);

  readonly canCreate = computed(() => this.auth.hasPermission('Employees.Create'));
  readonly canUpdate = computed(() => this.auth.hasPermission('Employees.Update'));
  readonly canDelete = computed(() => this.auth.hasPermission('Employees.Delete'));
  readonly displayedColumns = ['employee', 'paidAt', 'amount', 'paymentType', 'note', 'actions'];

  @ViewChild('paymentFormTemplate') private readonly paymentFormTemplate?: TemplateRef<unknown>;
  private activeDialogRef: MatDialogRef<unknown> | null = null;

  readonly filters = this.fb.nonNullable.group({
    from: [''],
    to: [''],
    useBusinessDay: [false],
    employeeId: [''],
    paymentType: ['' as '' | `${EmployeePaymentType}`]
  });

  readonly form = this.fb.nonNullable.group({
    employeeId: ['', Validators.required],
    paidAt: ['', Validators.required],
    amount: [0, [Validators.required, Validators.min(0.01)]],
    paymentType: [EmployeePaymentType.Daily as EmployeePaymentType, Validators.required],
    note: ['']
  });

  ngOnInit(): void {
    this.api.getEmployees({ page: 1, pageSize: 100, activeOnly: true }).subscribe({
      next: result => this.employees.set(result.items),
      error: () => this.employees.set([])
    });
    this.reload();
  }

  reload(page = this.page()): void {
    const { from, to, useBusinessDay, employeeId, paymentType } = this.filters.getRawValue();
    this.loading.set(true);
    this.api
      .getEmployeePayments({
        page,
        pageSize: this.pageSize,
        from: from || null,
        to: to || null,
        useBusinessDay,
        employeeId: employeeId || null,
        paymentType: paymentType === '' ? null : (Number(paymentType) as EmployeePaymentType)
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
          this.notification.error(err?.error?.detail ?? 'Failed to load payments.');
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

  paymentTypeLabel(type: EmployeePaymentType): string {
    return type === EmployeePaymentType.Salary ? 'Salary' : 'Daily';
  }

  startCreate(): void {
    this.editingId.set(null);
    this.form.reset({
      employeeId: '',
      paidAt: this.toLocalDatetimeInput(new Date()),
      amount: 0,
      paymentType: EmployeePaymentType.Daily,
      note: ''
    });
    this.openFormDialog();
  }

  startEdit(item: EmployeePaymentDto): void {
    if (item.canEdit === false) {
      return;
    }
    this.editingId.set(item.id);
    this.form.reset({
      employeeId: item.employeeId,
      paidAt: this.toLocalDatetimeInput(new Date(item.paidAt)),
      amount: item.amount,
      paymentType: item.paymentType,
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
      employeeId: value.employeeId,
      paidAt: new Date(value.paidAt).toISOString(),
      amount: Number(value.amount),
      paymentType: value.paymentType,
      note: value.note.trim() || null
    };
    const editingId = this.editingId();
    this.loading.set(true);

    const request$ = editingId
      ? this.api.updateEmployeePayment(editingId, body)
      : this.api.createEmployeePayment(body);

    request$.subscribe({
      next: () => {
        this.loading.set(false);
        this.cancelEdit();
        this.reload();
        this.notification.success(editingId ? 'Payment updated.' : 'Payment created.');
      },
      error: (err: { error?: { detail?: string } }) => {
        this.loading.set(false);
        this.notification.error(err?.error?.detail ?? 'Failed to save payment.');
      }
    });
  }

  remove(item: EmployeePaymentDto): void {
    if (!this.canDelete() || item.canDelete === false) {
      return;
    }

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Delete payment',
        message: `Are you sure you want to delete payment for "${item.employeeName}"?`,
        confirmText: 'Yes, delete',
        cancelText: 'No'
      },
      autoFocus: false
    });

    dialogRef.afterClosed().subscribe((confirmed: boolean | undefined) => {
      if (!confirmed) {
        return;
      }
      this.api.deleteEmployeePayment(item.id).subscribe({
        next: () => {
          const nextPage = this.items().length <= 1 ? Math.max(1, this.page() - 1) : this.page();
          this.reload(nextPage);
          this.notification.success('Payment deleted.');
        },
        error: (err: { error?: { detail?: string } }) =>
          this.notification.error(err?.error?.detail ?? 'Failed to delete payment.')
      });
    });
  }

  private openFormDialog(): void {
    if (!this.paymentFormTemplate) {
      return;
    }

    this.activeDialogRef?.close();
    this.activeDialogRef = this.dialog.open(this.paymentFormTemplate, {
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
