import { Component, OnInit, TemplateRef, ViewChild, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { AuthService } from '../../core/services/auth.service';
import { ApiService } from '../../core/services/api.service';
import { NotificationService } from '../../core/services/notification.service';
import { CategoryDto } from '../../core/models/api.models';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-categories',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatTableModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSlideToggleModule,
    MatSnackBarModule
  ],
  templateUrl: './categories.component.html',
  styleUrl: './categories.component.scss'
})
export class CategoriesComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly dialog = inject(MatDialog);
  private readonly notification = inject(NotificationService);

  readonly categories = signal<CategoryDto[]>([]);
  readonly loading = signal(false);
  readonly uploading = signal(false);
  readonly error = signal<string | null>(null);
  readonly editingId = signal<string | null>(null);
  readonly imagePreview = signal<string | null>(null);

  readonly canCreate = computed(() => this.auth.hasPermission('Menu.Create'));
  readonly canUpdate = computed(() => this.auth.hasPermission('Menu.Update'));
  readonly canDelete = computed(() => this.auth.hasPermission('Menu.Delete'));
  readonly displayedColumns = ['image', 'name', 'order', 'active', 'actions'];

  @ViewChild('categoryFormTemplate') private readonly categoryFormTemplate?: TemplateRef<any>;
  private activeDialogRef: MatDialogRef<any> | null = null;

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
        const message = err?.error?.detail ?? 'Failed to load categories.';
        this.error.set(message);
        this.notification.error(message);
      }
    });
  }

  mediaUrl(path?: string | null): string | null {
    return this.api.resolveMediaUrl(path);
  }

  startCreate(): void {
    this.editingId.set(null);
    this.form.reset({ name: '', displayOrder: 0, image: '', isActive: true });
    this.imagePreview.set(null);
    this.openFormDialog();
  }

  startEdit(category: CategoryDto): void {
    this.editingId.set(category.id);
    this.form.reset({
      name: category.name,
      displayOrder: category.displayOrder,
      image: category.image ?? '',
      isActive: category.isActive
    });
    this.imagePreview.set(this.mediaUrl(category.image));
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
        this.notification.success(editingId ? 'Category updated successfully.' : 'Category created successfully.');
      },
      error: (err: { error?: { detail?: string } }) => {
        this.loading.set(false);
        const message = err?.error?.detail ?? 'Failed to save category.';
        this.notification.error(message);
      }
    });
  }

  private openFormDialog(): void {
    if (!this.categoryFormTemplate) {
      return;
    }

    this.activeDialogRef?.close();
    this.activeDialogRef = this.dialog.open(this.categoryFormTemplate, {
      width: '640px',
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

  remove(category: CategoryDto): void {
    if (!this.canDelete()) {
      return;
    }

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Delete category',
        message: `Are you sure you want to delete "${category.name}"?`,
        confirmText: 'Yes, delete',
        cancelText: 'No'
      },
      autoFocus: false
    });

    dialogRef.afterClosed().subscribe((confirmed: boolean | undefined) => {
      if (!confirmed) {
        return;
      }

      this.api.deleteCategory(category.id).subscribe({
        next: () => {
          this.reload();
          this.notification.success('Category deleted successfully.');
        },
        error: (err: { error?: { detail?: string } }) => {
          const message = err?.error?.detail ?? 'Failed to delete category.';
          this.error.set(message);
          this.notification.error(message);
        }
      });
    });
  }
}
