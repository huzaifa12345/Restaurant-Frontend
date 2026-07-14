import { DecimalPipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { AuthService } from '../../core/services/auth.service';
import { ApiService } from '../../core/services/api.service';
import { CategoryDto, MenuItemDto } from '../../core/models/api.models';

@Component({
  selector: 'app-menu-items',
  standalone: true,
  imports: [
    DecimalPipe,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSlideToggleModule
  ],
  templateUrl: './menu-items.component.html',
  styleUrl: './menu-items.component.scss'
})
export class MenuItemsComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);

  readonly categories = signal<CategoryDto[]>([]);
  readonly items = signal<MenuItemDto[]>([]);
  readonly filterCategoryId = signal<string>('');
  readonly loading = signal(false);
  readonly uploading = signal(false);
  readonly error = signal<string | null>(null);
  readonly editingId = signal<string | null>(null);
  readonly showForm = signal(false);
  readonly imagePreview = signal<string | null>(null);

  readonly canCreate = computed(() => this.auth.hasPermission('Menu.Create'));
  readonly canUpdate = computed(() => this.auth.hasPermission('Menu.Update'));
  readonly canDelete = computed(() => this.auth.hasPermission('Menu.Delete'));

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
    this.api.getCategories(true).subscribe({
      next: cats => this.categories.set(cats),
      error: (err: { error?: { detail?: string } }) =>
        this.error.set(err?.error?.detail ?? 'Failed to load categories.')
    });
    this.reload();
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
        this.error.set(err?.error?.detail ?? 'Failed to load menu items.');
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
    this.showForm.set(true);
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
  }

  startEdit(item: MenuItemDto): void {
    this.editingId.set(item.id);
    this.showForm.set(true);
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
  }

  cancelEdit(): void {
    this.editingId.set(null);
    this.showForm.set(false);
    this.form.reset();
    this.imagePreview.set(null);
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
        this.imagePreview.set(this.mediaUrl(result.path));
        this.uploading.set(false);
      },
      error: (err: { error?: { detail?: string } }) => {
        this.uploading.set(false);
        this.error.set(err?.error?.detail ?? 'Image upload failed.');
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
      },
      error: (err: { error?: { detail?: string } }) => {
        this.loading.set(false);
        this.error.set(err?.error?.detail ?? 'Failed to save menu item.');
      }
    });
  }

  remove(item: MenuItemDto): void {
    if (!this.canDelete()) {
      return;
    }

    this.api.deleteMenuItem(item.id).subscribe({
      next: () => this.reload(),
      error: (err: { error?: { detail?: string } }) =>
        this.error.set(err?.error?.detail ?? 'Failed to delete menu item.')
    });
  }
}
