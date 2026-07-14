import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTableModule } from '@angular/material/table';
import { AuthService } from '../../core/services/auth.service';
import { ApiService } from '../../core/services/api.service';
import { CategoryDto } from '../../core/models/api.models';

@Component({
  selector: 'app-categories',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatTableModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSlideToggleModule
  ],
  templateUrl: './categories.component.html',
  styleUrl: './categories.component.scss'
})
export class CategoriesComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);

  readonly categories = signal<CategoryDto[]>([]);
  readonly loading = signal(false);
  readonly uploading = signal(false);
  readonly error = signal<string | null>(null);
  readonly editingId = signal<string | null>(null);
  readonly showForm = signal(false);
  readonly imagePreview = signal<string | null>(null);

  readonly canCreate = computed(() => this.auth.hasPermission('Menu.Create'));
  readonly canUpdate = computed(() => this.auth.hasPermission('Menu.Update'));
  readonly canDelete = computed(() => this.auth.hasPermission('Menu.Delete'));
  readonly displayedColumns = ['image', 'name', 'order', 'active', 'actions'];

  readonly form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    displayOrder: [0, Validators.required],
    image: [''],
    isActive: [true]
  });

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.getCategories().subscribe({
      next: items => {
        this.categories.set(items);
        this.loading.set(false);
      },
      error: (err: { error?: { detail?: string } }) => {
        this.loading.set(false);
        this.error.set(err?.error?.detail ?? 'Failed to load categories.');
      }
    });
  }

  mediaUrl(path?: string | null): string | null {
    return this.api.resolveMediaUrl(path);
  }

  startCreate(): void {
    this.editingId.set(null);
    this.showForm.set(true);
    this.form.reset({ name: '', displayOrder: 0, image: '', isActive: true });
    this.imagePreview.set(null);
  }

  startEdit(category: CategoryDto): void {
    this.editingId.set(category.id);
    this.showForm.set(true);
    this.form.reset({
      name: category.name,
      displayOrder: category.displayOrder,
      image: category.image ?? '',
      isActive: category.isActive
    });
    this.imagePreview.set(this.mediaUrl(category.image));
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
      name: value.name,
      displayOrder: Number(value.displayOrder),
      image: value.image || null,
      isActive: value.isActive
    };
    const editingId = this.editingId();
    this.loading.set(true);
    this.error.set(null);

    const request$ = editingId
      ? this.api.updateCategory(editingId, body)
      : this.api.createCategory(body);

    request$.subscribe({
      next: () => {
        this.loading.set(false);
        this.cancelEdit();
        this.reload();
      },
      error: (err: { error?: { detail?: string } }) => {
        this.loading.set(false);
        this.error.set(err?.error?.detail ?? 'Failed to save category.');
      }
    });
  }

  remove(category: CategoryDto): void {
    if (!this.canDelete()) {
      return;
    }

    this.api.deleteCategory(category.id).subscribe({
      next: () => this.reload(),
      error: (err: { error?: { detail?: string } }) =>
        this.error.set(err?.error?.detail ?? 'Failed to delete category.')
    });
  }
}
