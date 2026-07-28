import { DecimalPipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule } from '@angular/material/table';
import { WageReportDto, WageReportEmployeeDto } from '../../core/models/api.models';
import { ApiService } from '../../core/services/api.service';
import { NotificationService } from '../../core/services/notification.service';

@Component({
  selector: 'app-wage-reports',
  standalone: true,
  imports: [
    DecimalPipe,
    ReactiveFormsModule,
    MatTableModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatCheckboxModule
  ],
  templateUrl: './wage-reports.component.html',
  styleUrl: './wage-reports.component.scss'
})
export class WageReportsComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiService);
  private readonly notification = inject(NotificationService);

  readonly report = signal<WageReportDto | null>(null);
  readonly loading = signal(false);
  readonly employees = computed(() => this.report()?.employees ?? ([] as WageReportEmployeeDto[]));
  readonly displayedColumns = [
    'employee',
    'present',
    'halfDay',
    'absent',
    'earned',
    'paid',
    'balance'
  ];

  readonly filters = this.fb.nonNullable.group({
    from: [this.toInputDate(new Date()), Validators.required],
    to: [this.toInputDate(new Date()), Validators.required],
    useBusinessDay: [false]
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    if (this.filters.invalid) {
      this.filters.markAllAsTouched();
      return;
    }

    const { from, to, useBusinessDay } = this.filters.getRawValue();
    this.loading.set(true);
    this.api.getWageReport(from, to, useBusinessDay).subscribe({
      next: report => {
        this.report.set(report);
        this.loading.set(false);
      },
      error: (err: { error?: { detail?: string } }) => {
        this.loading.set(false);
        this.notification.error(err?.error?.detail ?? 'Failed to load wage report.');
      }
    });
  }

  export(format: 'xlsx' | 'pdf'): void {
    if (this.filters.invalid) {
      this.filters.markAllAsTouched();
      return;
    }
    const { from, to, useBusinessDay } = this.filters.getRawValue();
    this.api.downloadWageReportExport(format, from, to, useBusinessDay);
  }

  private toInputDate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
}
