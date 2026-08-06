import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule } from '@angular/material/table';
import {
  AttendanceReportDto,
  AttendanceReportEmployeeRowDto,
  AttendanceStatus
} from '../../core/models/api.models';
import { ApiService } from '../../core/services/api.service';
import { NotificationService } from '../../core/services/notification.service';
import { EmployeeTypeaheadComponent } from '../../shared/components/employee-typeahead/employee-typeahead.component';

@Component({
  selector: 'app-attendance-reports',
  standalone: true,
  imports: [
    DatePipe,
    ReactiveFormsModule,
    MatTableModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    EmployeeTypeaheadComponent
  ],
  templateUrl: './attendance-reports.component.html',
  styleUrl: './attendance-reports.component.scss'
})
export class AttendanceReportsComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiService);
  private readonly notification = inject(NotificationService);

  readonly AttendanceStatus = AttendanceStatus;
  readonly report = signal<AttendanceReportDto | null>(null);
  readonly loading = signal(false);
  readonly employeeId = signal<string | null>(null);
  readonly page = signal(1);
  readonly pageSize = 20;

  readonly employees = computed(
    () => this.report()?.employees ?? ([] as AttendanceReportEmployeeRowDto[])
  );
  readonly dates = computed(() => this.report()?.dates ?? []);
  readonly totalPages = computed(() => this.report()?.totalPages ?? 0);
  readonly totalCount = computed(() => this.report()?.totalCount ?? 0);

  readonly filters = this.fb.nonNullable.group({
    from: [this.monthStart(), Validators.required],
    to: [this.today(), Validators.required]
  });

  ngOnInit(): void {
    this.load();
  }

  onEmployeeChange(id: string | null): void {
    this.employeeId.set(id);
    this.page.set(1);
    this.load();
  }

  load(): void {
    if (this.filters.invalid) {
      this.filters.markAllAsTouched();
      return;
    }

    const { from, to } = this.filters.getRawValue();
    this.loading.set(true);
    this.api
      .getAttendanceReport({
        from,
        to,
        employeeId: this.employeeId(),
        page: this.page(),
        pageSize: this.pageSize
      })
      .subscribe({
        next: report => {
          this.report.set(report);
          this.loading.set(false);
        },
        error: (err: { error?: { detail?: string } }) => {
          this.loading.set(false);
          this.notification.error(err?.error?.detail ?? 'Failed to load attendance report.');
        }
      });
  }

  apply(): void {
    this.page.set(1);
    this.load();
  }

  prevPage(): void {
    if (this.page() <= 1) {
      return;
    }
    this.page.update(p => p - 1);
    this.load();
  }

  nextPage(): void {
    if (this.page() >= this.totalPages()) {
      return;
    }
    this.page.update(p => p + 1);
    this.load();
  }

  statusLabel(status: AttendanceStatus | null | undefined): string {
    if (status == null) {
      return '—';
    }
    switch (status) {
      case AttendanceStatus.Present:
        return 'P';
      case AttendanceStatus.Absent:
        return 'A';
      case AttendanceStatus.HalfDay:
        return 'H';
      default:
        return '—';
    }
  }

  statusClass(status: AttendanceStatus | null | undefined): string {
    if (status == null) {
      return 'cell-empty';
    }
    switch (status) {
      case AttendanceStatus.Present:
        return 'cell-present';
      case AttendanceStatus.Absent:
        return 'cell-absent';
      case AttendanceStatus.HalfDay:
        return 'cell-half';
      default:
        return 'cell-empty';
    }
  }

  dayStatus(
    row: AttendanceReportEmployeeRowDto,
    date: string
  ): AttendanceStatus | null | undefined {
    return row.days.find(d => d.workDate === date)?.status;
  }

  private monthStart(): string {
    const now = new Date();
    return this.toInputDate(new Date(now.getFullYear(), now.getMonth(), 1));
  }

  private today(): string {
    return this.toInputDate(new Date());
  }

  private toInputDate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
}
