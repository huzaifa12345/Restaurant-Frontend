import { Component, OnInit, TemplateRef, ViewChild, computed, inject, signal } from '@angular/core';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTableModule } from '@angular/material/table';
import {
  RawMaterialCategoryDto,
  RawMaterialDto,
  UnitOfMeasureDto
} from '../../core/models/api.models';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-raw-materials',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatTableModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatIconModule
  ],
  templateUrl: './raw-materials.component.html',
  styleUrl: './raw-materials.component.scss'
})
export class RawMaterialsComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly dialog = inject(MatDialog);
  private readonly notification = inject(NotificationService);

  readonly items = signal<RawMaterialDto[]>([]);
  readonly categories = signal<RawMaterialCategoryDto[]>([]);
  readonly uoms = signal<UnitOfMeasureDto[]>([]);
  readonly loading = signal(false);
  readonly editingId = signal<string | null>(null);
  readonly showForm = signal(false);
  readonly packMaterial = signal<RawMaterialDto | null>(null);

  readonly canCreate = computed(() => this.auth.hasPermission('Inventory.Create'));
  readonly canUpdate = computed(() => this.auth.hasPermission('Inventory.Update'));
  readonly canDelete = computed(() => this.auth.hasPermission('Inventory.Delete'));
  readonly displayedColumns = ['name', 'barcode', 'category', 'baseUom', 'packs', 'active', 'actions'];

  @ViewChild('packSizesTemplate') private readonly packSizesTemplate?: TemplateRef<unknown>;
  private packDialogRef: MatDialogRef<unknown> | null = null;

  readonly form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    categoryId: ['', Validators.required],
    baseUomId: ['', Validators.required],
    barcode: [{ value: '', disabled: true }],
    isActive: [true]
  });

  readonly packForm = this.fb.nonNullable.group({
    rows: this.fb.array([])
  });

  get packRows(): FormArray {
    return this.packForm.controls.rows as FormArray;
  }

  ngOnInit(): void {
    this.api.getRawMaterialCategories().subscribe({
      next: items => this.categories.set(items),
      error: (err: { error?: { detail?: string } }) =>
        this.notification.error(err?.error?.detail ?? 'Failed to load categories.')
    });
    this.api.getUnitsOfMeasure().subscribe({
      next: items => this.uoms.set(items),
      error: (err: { error?: { detail?: string } }) =>
        this.notification.error(err?.error?.detail ?? 'Failed to load units of measure.')
    });
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.api.getRawMaterials().subscribe({
      next: items => {
        this.items.set(items);
        this.loading.set(false);
      },
      error: (err: { error?: { detail?: string } }) => {
        this.loading.set(false);
        this.notification.error(err?.error?.detail ?? 'Failed to load raw materials.');
      }
    });
  }

  startCreate(): void {
    this.editingId.set(null);
    this.showForm.set(true);
    this.form.reset({
      name: '',
      categoryId: this.categories()[0]?.id ?? '',
      baseUomId: this.uoms()[0]?.id ?? '',
      barcode: '',
      isActive: true
    });
    this.api.getNextRawMaterialBarcode().subscribe({
      next: result => this.form.patchValue({ barcode: result.barcode }),
      error: (err: { error?: { detail?: string } }) =>
        this.notification.error(err?.error?.detail ?? 'Failed to load next barcode.')
    });
  }

  startEdit(item: RawMaterialDto): void {
    if (item.canEdit === false) {
      return;
    }
    this.editingId.set(item.id);
    this.showForm.set(true);
    this.form.reset({
      name: item.name,
      categoryId: item.categoryId,
      baseUomId: item.baseUomId,
      barcode: item.barcode,
      isActive: item.isActive
    });
  }

  cancelEdit(): void {
    this.editingId.set(null);
    this.showForm.set(false);
    this.form.reset();
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const body = {
      name: value.name.trim(),
      categoryId: value.categoryId,
      baseUomId: value.baseUomId,
      isActive: value.isActive
    };
    const editingId = this.editingId();
    this.loading.set(true);

    const request$ = editingId
      ? this.api.updateRawMaterial(editingId, body)
      : this.api.createRawMaterial(body);

    request$.subscribe({
      next: () => {
        this.loading.set(false);
        this.cancelEdit();
        this.reload();
        this.notification.success(editingId ? 'Raw material updated.' : 'Raw material created.');
      },
      error: (err: { error?: { detail?: string } }) => {
        this.loading.set(false);
        this.notification.error(err?.error?.detail ?? 'Failed to save raw material.');
      }
    });
  }

  openPackSizes(item: RawMaterialDto): void {
    if (!this.canUpdate() || item.canEdit === false || !this.packSizesTemplate) {
      return;
    }

    this.api.getRawMaterial(item.id).subscribe({
      next: detail => {
        this.packMaterial.set(detail);
        this.packRows.clear();
        const packs = detail.packSizes ?? [];
        if (packs.length === 0) {
          this.addPackRow();
        } else {
          for (const pack of packs) {
            this.packRows.push(
              this.fb.nonNullable.group({
                uomId: [pack.uomId, Validators.required],
                factor: [pack.factor, [Validators.required, Validators.min(0.0001)]]
              })
            );
          }
        }

        this.packDialogRef?.close();
        this.packDialogRef = this.dialog.open(this.packSizesTemplate!, {
          width: '720px',
          autoFocus: false
        });
        this.packDialogRef.afterClosed().subscribe(() => {
          this.packDialogRef = null;
          this.packMaterial.set(null);
          this.packRows.clear();
        });
      },
      error: (err: { error?: { detail?: string } }) =>
        this.notification.error(err?.error?.detail ?? 'Failed to load pack sizes.')
    });
  }

  closePackSizes(): void {
    this.packDialogRef?.close();
  }

  addPackRow(): void {
    this.packRows.push(
      this.fb.nonNullable.group({
        uomId: ['', Validators.required],
        factor: [1, [Validators.required, Validators.min(0.0001)]]
      })
    );
  }

  removePackRow(index: number): void {
    this.packRows.removeAt(index);
  }

  savePackSizes(): void {
    const material = this.packMaterial();
    if (!material || this.packForm.invalid) {
      this.packForm.markAllAsTouched();
      return;
    }

    const items = this.packRows.getRawValue().map((row: { uomId: string; factor: number }) => ({
      uomId: row.uomId,
      factor: Number(row.factor)
    }));

    this.loading.set(true);
    this.api.replaceRawMaterialPackSizes(material.id, { items }).subscribe({
      next: () => {
        this.loading.set(false);
        this.closePackSizes();
        this.reload();
        this.notification.success('Pack sizes saved.');
      },
      error: (err: { error?: { detail?: string } }) => {
        this.loading.set(false);
        this.notification.error(err?.error?.detail ?? 'Failed to save pack sizes.');
      }
    });
  }

  remove(item: RawMaterialDto): void {
    if (!this.canDelete() || item.canDelete === false) {
      return;
    }

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Delete raw material',
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
      this.api.deleteRawMaterial(item.id).subscribe({
        next: () => {
          this.reload();
          this.notification.success('Raw material deleted.');
        },
        error: (err: { error?: { detail?: string } }) =>
          this.notification.error(err?.error?.detail ?? 'Failed to delete raw material.')
      });
    });
  }
}
