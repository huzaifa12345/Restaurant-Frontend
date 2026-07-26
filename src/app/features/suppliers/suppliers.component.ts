import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { SupplierDto } from '../../core/models/api.models';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { WORLD_COUNTRIES } from '../../shared/data/world-countries';

@Component({
  selector: 'app-suppliers',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatTableModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule
  ],
  templateUrl: './suppliers.component.html',
  styleUrl: './suppliers.component.scss'
})
export class SuppliersComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly dialog = inject(MatDialog);
  private readonly notification = inject(NotificationService);

  readonly items = signal<SupplierDto[]>([]);
  readonly loading = signal(false);
  readonly editingId = signal<string | null>(null);
  readonly showForm = signal(false);
  readonly editingIsDefault = signal(false);
  readonly countries = WORLD_COUNTRIES;

  readonly canCreate = computed(() => this.auth.hasPermission('Inventory.Create'));
  readonly canUpdate = computed(() => this.auth.hasPermission('Inventory.Update'));
  readonly canDelete = computed(() => this.auth.hasPermission('Inventory.Delete'));
  readonly displayedColumns = ['name', 'phone', 'country', 'city', 'default', 'actions'];

  readonly form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    phone: [''],
    country: [''],
    city: [''],
    state: [''],
    zip: ['']
  });

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.api.getSuppliers().subscribe({
      next: items => {
        this.items.set(items);
        this.loading.set(false);
      },
      error: (err: { error?: { detail?: string } }) => {
        this.loading.set(false);
        this.notification.error(err?.error?.detail ?? 'Failed to load suppliers.');
      }
    });
  }

  startCreate(): void {
    this.editingId.set(null);
    this.editingIsDefault.set(false);
    this.showForm.set(true);
    this.form.reset({
      name: '',
      phone: '',
      country: 'Pakistan',
      city: '',
      state: '',
      zip: ''
    });
    this.form.controls.name.enable();
  }

  startEdit(item: SupplierDto): void {
    if (item.canEdit === false) {
      return;
    }
    this.editingId.set(item.id);
    this.editingIsDefault.set(item.isDefault);
    this.showForm.set(true);
    this.form.reset({
      name: item.name,
      phone: item.phone ?? '',
      country: item.country ?? '',
      city: item.city ?? '',
      state: item.state ?? '',
      zip: item.zip ?? ''
    });
    if (item.isDefault) {
      this.form.controls.name.disable();
    } else {
      this.form.controls.name.enable();
    }
  }

  cancelEdit(): void {
    this.editingId.set(null);
    this.editingIsDefault.set(false);
    this.showForm.set(false);
    this.form.reset();
    this.form.controls.name.enable();
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const body = {
      name: value.name.trim(),
      phone: value.phone.trim() || null,
      country: value.country.trim() || null,
      city: value.city.trim() || null,
      state: value.state.trim() || null,
      zip: value.zip.trim() || null
    };
    const editingId = this.editingId();
    this.loading.set(true);

    const request$ = editingId
      ? this.api.updateSupplier(editingId, body)
      : this.api.createSupplier(body);

    request$.subscribe({
      next: () => {
        this.loading.set(false);
        this.cancelEdit();
        this.reload();
        this.notification.success(editingId ? 'Supplier updated.' : 'Supplier created.');
      },
      error: (err: { error?: { detail?: string } }) => {
        this.loading.set(false);
        this.notification.error(err?.error?.detail ?? 'Failed to save supplier.');
      }
    });
  }

  remove(item: SupplierDto): void {
    if (!this.canDelete() || item.isDefault || item.canDelete === false) {
      return;
    }

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Delete supplier',
        message: `Are you sure you want to delete "${item.name}"?`,
        confirmText: 'Yes, delete',
        cancelText: 'No'
      },
      autoFocus: false
    });

    dialogRef.afterClosed().subscribe((confirmed: boolean | undefined) => {
      if (!confirmed) {
        return;
      }
      this.api.deleteSupplier(item.id).subscribe({
        next: () => {
          this.reload();
          this.notification.success('Supplier deleted.');
        },
        error: (err: { error?: { detail?: string } }) =>
          this.notification.error(err?.error?.detail ?? 'Failed to delete supplier.')
      });
    });
  }
}
