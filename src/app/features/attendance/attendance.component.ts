import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { AttendanceEntryDto, AttendanceStatus } from '../../core/models/api.models';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';

@Component({
  selector: 'app-attendance',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatTableModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule
  ],
  templateUrl: './attendance.component.html',
  styleUrl: './attendance.component.scss'
})
export class AttendanceComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly notification = inject(NotificationService);

  readonly AttendanceStatus = AttendanceStatus;
  readonly entries = signal<AttendanceEntryDto[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly workDate = new FormControl(this.toInputDate(new Date()), {
    nonNullable: true,
    validators: [Validators.required]
  });

  readonly canView = computed(() => this.auth.hasPermission('Employees.View'));
  readonly canUpdate = computed(() => this.auth.hasPermission('Employees.Update'));
  readonly displayedColumns = ['employee', 'dailyWage', 'status'];

  ngOnInit(): void {
    if (this.canView()) {
      this.load();
    }
  }

  load(): void {
    if (!this.canView() || this.workDate.invalid) {
      this.workDate.markAsTouched();
      return;
    }

    this.loading.set(true);
    this.api.getAttendanceByDate(this.workDate.value).subscribe({
      next: day => {
        this.entries.set(day.entries.map(e => ({ ...e })));
        this.loading.set(false);
      },
      error: (err: { error?: { detail?: string } }) => {
        this.loading.set(false);
        this.notification.error(err?.error?.detail ?? 'Failed to load attendance.');
      }
    });
  }

  setStatus(employeeId: string, status: AttendanceStatus | null): void {
    this.entries.update(list =>
      list.map(entry => (entry.employeeId === employeeId ? { ...entry, status } : entry))
    );
  }

  save(): void {
    if (!this.canUpdate() || this.workDate.invalid) {
      this.workDate.markAsTouched();
      return;
    }

    const marked = this.entries()
      .filter(e => e.status != null)
      .map(e => ({ employeeId: e.employeeId, status: e.status as AttendanceStatus }));

    this.saving.set(true);
    this.api
      .upsertAttendanceDay({
        workDate: this.workDate.value,
        entries: marked
      })
      .subscribe({
        next: day => {
          this.entries.set(day.entries.map(e => ({ ...e })));
          this.saving.set(false);
          this.notification.success('Attendance saved.');
        },
        error: (err: { error?: { detail?: string } }) => {
          this.saving.set(false);
          this.notification.error(err?.error?.detail ?? 'Failed to save attendance.');
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
