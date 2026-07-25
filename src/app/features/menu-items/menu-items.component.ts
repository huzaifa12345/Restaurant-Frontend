import { DecimalPipe } from '@angular/common';
import { Component, OnInit, TemplateRef, ViewChild, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { AuthService } from '../../core/services/auth.service';
import { ApiService } from '../../core/services/api.service';
import { NotificationService } from '../../core/services/notification.service';
import { CategoryDto, MenuItemDto } from '../../core/models/api.models';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-menu-items',
  standalone: true,
  imports: [
    DecimalPipe,
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSnackBarModule,
    MatSlideToggleModule
  ],
  templateUrl: './menu-items.component.html',
  styleUrl: './menu-items.component.scss'
})
export class MenuItemsComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly dialog = inject(MatDialog);
  private readonly notification = inject(NotificationService);

  readonly categories = signal<CategoryDto[]>([]);
  readonly items = signal<MenuItemDto[]>([]);
  readonly filterCategoryId = signal<string>('');
  readonly loading = signal(false);
  readonly uploading = signal(false);
  readonly error = signal<string | null>(null);
  readonly editingId = signal<string | null>(null);
  readonly imagePreview = signal<string | null>(null);

  readonly canCreate = computed(() => this.auth.hasPermission('Menu.Create'));
  readonly canUpdate = computed(() => this.auth.hasPermission('Menu.Update'));
  readonly canDelete = computed(() => this.auth.hasPermission('Menu.Delete'));

  @ViewChild('menuItemFormTemplate') private readonly menuItemFormTemplate?: TemplateRef<any>;
  private activeDialogRef: MatDialogRef<any> | null = null;

  readonly form = this.fb.nonNullable.group({
    categoryId: ['', Validators.required],
    name: ['', Validators.required],
    sku: [''],
    barcode: [''],
    description: [''],
    price: [0, [Validators.required, Validators.min(0)]],
    costPrice: [0],
    image: [''],
    sortOrder: [0],
    isActive: [true]
  });

  ngOnInit(): void {
    this.form.get('sku')?.disable();
    this.form.get('barcode')?.disable();

    this.api.getCategories(true).subscribe({
      next: cats => this.categories.set(cats),
      error: (err: { error?: { detail?: string } }) => {
        const message = err?.error?.detail ?? 'Failed to load categories.';
        this.error.set(message);
        this.notification.error(message);
      }
    });
    this.reload();
    // regenerate SKU/barcode when the category control changes while creating
    const categoryControl = this.form.get('categoryId');
    categoryControl?.valueChanges?.subscribe((catId: string) => {
      if (!this.editingId()) {
        this.generateSkuAndBarcode(catId);
      }
    });
  }

  reload(): void {
    this.loading.set(true);
    this.error.set(null);
    const categoryId = this.filterCategoryId() || null;
    this.api.getMenuItems(categoryId).subscribe({
      next: items => {
        this.items.set(items);
        this.loading.set(false);
      },
      error: (err: { error?: { detail?: string } }) => {
        this.loading.set(false);
        const message = err?.error?.detail ?? 'Failed to load menu items.';
        this.error.set(message);
        this.notification.error(message);
      }
    });
  }

  onFilterChange(categoryId: string): void {
    this.filterCategoryId.set(categoryId);
    this.reload();
  }

  mediaUrl(path?: string | null): string | null {
    return this.api.resolveMediaUrl(path);
  }

  startCreate(): void {
    this.editingId.set(null);
    this.form.reset({
      categoryId: this.categories()[0]?.id ?? '',
      name: '',
      sku: '',
      barcode: '',
      description: '',
      price: 0,
      costPrice: 0,
      image: '',
      sortOrder: 0,
      isActive: true
    });
    this.imagePreview.set(null);
    // generate SKU and barcode for the default category selection
    const defaultCategoryId = this.form.get('categoryId')?.value || this.categories()[0]?.id || '';
    this.generateSkuAndBarcode(defaultCategoryId);
    this.openFormDialog();
  }

  startEdit(item: MenuItemDto): void {
    this.editingId.set(item.id);
    this.form.reset({
      categoryId: item.categoryId,
      name: item.name,
      sku: item.sku ?? '',
      barcode: item.barcode ?? '',
      description: item.description ?? '',
      price: item.price,
      costPrice: item.costPrice ?? 0,
      image: item.image ?? '',
      sortOrder: item.sortOrder,
      isActive: item.isActive
    });
    this.imagePreview.set(this.mediaUrl(item.image));
    this.openFormDialog();
  }

  cancelEdit(): void {
    this.activeDialogRef?.close();
    this.resetDialogState();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    this.uploading.set(true);
    this.error.set(null);
    this.api.uploadImage(file).subscribe({
      next: result => {
        this.form.patchValue({ image: result.path });
        this.imagePreview.set(result.url || this.mediaUrl(result.path));
        this.uploading.set(false);
      },
      error: (err: { error?: { detail?: string } }) => {
        this.uploading.set(false);
        const message = err?.error?.detail ?? 'Image upload failed.';
        this.error.set(message);
        this.notification.error(message);
      }
    });
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const body = {
      categoryId: value.categoryId,
      name: value.name,
      sku: value.sku || null,
      barcode: value.barcode || null,
      description: value.description || null,
      price: Number(value.price),
      costPrice: value.costPrice ? Number(value.costPrice) : null,
      image: value.image || null,
      sortOrder: Number(value.sortOrder),
      isActive: value.isActive
    };

    const editingId = this.editingId();
    this.loading.set(true);
    this.error.set(null);

    const request$ = editingId
      ? this.api.updateMenuItem(editingId, body)
      : this.api.createMenuItem(body);

    request$.subscribe({
      next: () => {
        this.loading.set(false);
        this.cancelEdit();
        this.reload();
        this.notification.success(editingId ? 'Menu item updated successfully.' : 'Menu item created successfully.');
      },
      error: (err: { error?: { detail?: string } }) => {
        this.loading.set(false);
        const message = err?.error?.detail ?? 'Failed to save menu item.';
        this.notification.error(message);
      }
    });
  }

  private openFormDialog(): void {
    if (!this.menuItemFormTemplate) {
      return;
    }

    this.activeDialogRef?.close();
    this.activeDialogRef = this.dialog.open(this.menuItemFormTemplate, {
      width: '720px',
      autoFocus: false
    });

    this.activeDialogRef.afterClosed().subscribe(() => {
      if (this.activeDialogRef) {
        this.activeDialogRef = null;
      }
      this.resetDialogState();
    });
  }

  private resetDialogState(): void {
    this.editingId.set(null);
    this.form.reset();
    this.imagePreview.set(null);
  }

  remove(item: MenuItemDto): void {
    if (!this.canDelete()) {
      return;
    }

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Delete menu item',
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

      this.api.deleteMenuItem(item.id).subscribe({
        next: () => {
          this.reload();
          this.notification.success('Menu item deleted successfully.');
        },
        error: (err: { error?: { detail?: string } }) => {
          const message = err?.error?.detail ?? 'Failed to delete menu item.';
          this.notification.error(message);
        }
      });
    });
  }

  private generateSkuAndBarcode(categoryId: string): void {
    // Prefer server-generated identifiers for correctness and to avoid races
    this.api.getNextMenuItemIdentifiers(categoryId).subscribe({
      next: ids => this.form.patchValue({ sku: ids.sku, barcode: ids.barcode }),
      error: () => {
        // Fallback to client-side heuristic if server is unavailable
        const category = this.categories().find(c => c.id === categoryId);
        if (!category) {
          this.form.patchValue({ sku: '', barcode: '' });
          return;
        }

        const prefix = this.getCategoryPrefix(category.name);

        // Determine next SKU suffix for this prefix
        const existingSkus = this.items().map(i => i.sku).filter(Boolean) as string[];
        let maxSuffix = 0;
        for (const s of existingSkus) {
          if (s && s.startsWith(prefix)) {
            const num = parseInt(s.slice(prefix.length), 10);
            if (!isNaN(num) && num > maxSuffix) {
              maxSuffix = num;
            }
          }
        }
        const nextNumber = maxSuffix + 1;
        const sku = `${prefix}${String(nextNumber).padStart(3, '0')}`;

        // Determine next barcode (global within loaded items)
        const existingBarcodes = this.items().map(i => i.barcode).filter(Boolean) as string[];
        let maxBarcodeNum = 0;
        for (const b of existingBarcodes) {
          const num = parseInt(b, 10);
          if (!isNaN(num) && num > maxBarcodeNum) {
            maxBarcodeNum = num;
          }
        }
        const nextBarcodeNum = maxBarcodeNum > 0 ? maxBarcodeNum + 1 : 101;
        const barcode = String(nextBarcodeNum).padStart(6, '0');

        this.form.patchValue({ sku, barcode });
      }
    });
  }

  private getCategoryPrefix(name: string): string {
    const cleaned = (name || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    if (cleaned.length >= 3) return cleaned.slice(0, 3);
    if (cleaned.length === 2) return cleaned + cleaned[1];
    if (cleaned.length === 1) return cleaned + cleaned + cleaned;
    return 'XXX';
  }
}
