import { Component, OnInit, TemplateRef, ViewChild, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule } from '@angular/material/table';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { RawMaterialCategoryDto } from '../../core/models/api.models';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-raw-material-categories',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatTableModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule
  ],
  templateUrl: './raw-material-categories.component.html',
  styleUrl: './raw-material-categories.component.scss'
})
export class RawMaterialCategoriesComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly dialog = inject(MatDialog);
  private readonly notification = inject(NotificationService);

  readonly items = signal<RawMaterialCategoryDto[]>([]);
  readonly loading = signal(false);
  readonly editingId = signal<string | null>(null);
  readonly page = signal(1);
  readonly pageSize = 20;
  readonly totalCount = signal(0);
  readonly totalPages = signal(0);
  readonly nameFilter = new FormControl('', { nonNullable: true });

  readonly canCreate = computed(() => this.auth.hasPermission('Inventory.Create'));
  readonly canUpdate = computed(() => this.auth.hasPermission('Inventory.Update'));
  readonly canDelete = computed(() => this.auth.hasPermission('Inventory.Delete'));
  readonly displayedColumns = ['name', 'actions'];

  @ViewChild('categoryFormTemplate') private readonly categoryFormTemplate?: TemplateRef<unknown>;
  private activeDialogRef: MatDialogRef<unknown> | null = null;

  readonly form = this.fb.nonNullable.group({
    name: ['', Validators.required]
  });

  ngOnInit(): void {
    this.nameFilter.valueChanges.pipe(debounceTime(300), distinctUntilChanged()).subscribe(() => {
      this.page.set(1);
      this.reload(1);
    });
    this.reload();
  }

  reload(page = this.page()): void {
    this.loading.set(true);
    this.api
      .getRawMaterialCategories({
        page,
        pageSize: this.pageSize,
        name: this.nameFilter.value.trim() || null
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
        this.notification.error(err?.error?.detail ?? 'Failed to load raw material categories.');
      }
    });
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

  startCreate(): void {
    this.editingId.set(null);
    this.form.reset({ name: '' });
    this.openFormDialog();
  }

  startEdit(item: RawMaterialCategoryDto): void {
    if (item.canEdit === false) {
      return;
    }
    this.editingId.set(item.id);
    this.form.reset({ name: item.name });
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

    const body = { name: this.form.getRawValue().name.trim() };
    const editingId = this.editingId();
    this.loading.set(true);

    const request$ = editingId
      ? this.api.updateRawMaterialCategory(editingId, body)
      : this.api.createRawMaterialCategory(body);

    request$.subscribe({
      next: () => {
        this.loading.set(false);
        this.cancelEdit();
        this.reload();
        this.notification.success(editingId ? 'Category updated successfully.' : 'Category created successfully.');
      },
      error: (err: { error?: { detail?: string } }) => {
        this.loading.set(false);
        this.notification.error(err?.error?.detail ?? 'Failed to save category.');
      }
    });
  }

  remove(item: RawMaterialCategoryDto): void {
    if (!this.canDelete() || item.canDelete === false) {
      return;
    }

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Delete category',
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
      this.api.deleteRawMaterialCategory(item.id).subscribe({
        next: () => {
          const nextPage = this.items().length <= 1 ? Math.max(1, this.page() - 1) : this.page();
          this.reload(nextPage);
          this.notification.success('Category deleted successfully.');
        },
        error: (err: { error?: { detail?: string } }) => {
          this.notification.error(err?.error?.detail ?? 'Failed to delete category.');
        }
      });
    });
  }

  private openFormDialog(): void {
    if (!this.categoryFormTemplate) {
      return;
    }

    this.activeDialogRef?.close();
    this.activeDialogRef = this.dialog.open(this.categoryFormTemplate, {
      width: '520px',
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
}
