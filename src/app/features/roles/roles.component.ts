import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { AuthService } from '../../core/services/auth.service';
import { ApiService } from '../../core/services/api.service';
import { NotificationService } from '../../core/services/notification.service';
import { PermissionDto, RoleDto } from '../../core/models/api.models';

@Component({
  selector: 'app-roles',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatTableModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatCheckboxModule,
    MatSnackBarModule
  ],
  templateUrl: './roles.component.html',
  styleUrl: './roles.component.scss'
})
export class RolesComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly notification = inject(NotificationService);

  readonly roles = signal<RoleDto[]>([]);
  readonly permissions = signal<PermissionDto[]>([]);
  readonly selectedPermissionIds = signal<Set<string>>(new Set());
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly editingId = signal<string | null>(null);
  readonly showForm = signal(false);

  readonly canCreate = computed(() => this.auth.hasPermission('Roles.Create'));
  readonly canUpdate = computed(() => this.auth.hasPermission('Roles.Update'));
  readonly displayedColumns = ['name', 'system', 'permissions', 'actions'];

  readonly form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    description: ['']
  });

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.error.set(null);

    this.api.getPermissions().subscribe({
      next: (items: PermissionDto[]) => this.permissions.set(items),
      error: (err: { error?: { detail?: string } }) => {
        const message = err?.error?.detail ?? 'Failed to load permissions.';
        this.error.set(message);
        this.notification.error(message);
      }
    });

    this.api.getRoles().subscribe({
      next: (items: RoleDto[]) => {
        this.roles.set(items);
        this.loading.set(false);
      },
      error: (err: { error?: { detail?: string } }) => {
        this.loading.set(false);
        const message = err?.error?.detail ?? 'Failed to load roles.';
        this.error.set(message);
        this.notification.error(message);
      }
    });
  }

  startCreate(): void {
    this.editingId.set(null);
    this.showForm.set(true);
    this.form.reset({ name: '', description: '' });
    this.form.controls.name.enable();
    this.selectedPermissionIds.set(new Set());
  }

  startEdit(role: RoleDto): void {
    this.editingId.set(role.id);
    this.showForm.set(true);
    this.form.reset({
      name: role.name,
      description: role.description ?? ''
    });

    if (role.isSystem) {
      this.form.controls.name.disable();
    } else {
      this.form.controls.name.enable();
    }

    const selected = new Set(
      this.permissions()
        .filter(p => role.permissions?.includes(p.code))
        .map(p => p.id)
    );
    this.selectedPermissionIds.set(selected);
  }

  cancelEdit(): void {
    this.editingId.set(null);
    this.showForm.set(false);
    this.form.reset();
    this.selectedPermissionIds.set(new Set());
  }

  togglePermission(permissionId: string, checked: boolean): void {
    const next = new Set(this.selectedPermissionIds());
    if (checked) {
      next.add(permissionId);
    } else {
      next.delete(permissionId);
    }
    this.selectedPermissionIds.set(next);
  }

  isPermissionSelected(permissionId: string): boolean {
    return this.selectedPermissionIds().has(permissionId);
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const editingId = this.editingId();
    const permissionIds = Array.from(this.selectedPermissionIds());
    this.loading.set(true);
    this.error.set(null);

    if (!editingId) {
      this.api.createRole({
        name: value.name,
        description: value.description || null,
        permissionIds
      }).subscribe({
        next: () => {
          this.loading.set(false);
          this.cancelEdit();
          this.reload();
          this.notification.success('Role created successfully.');
        },
        error: (err: { error?: { detail?: string } }) => {
          this.loading.set(false);
          const message = err?.error?.detail ?? 'Failed to create role.';
          this.error.set(message);
          this.notification.error(message);
        }
      });
      return;
    }

    this.api.updateRole(editingId, {
      name: value.name,
      description: value.description || null
    }).subscribe({
      next: () => {
        if (!this.canUpdate()) {
          this.loading.set(false);
          this.cancelEdit();
          this.reload();
          return;
        }

        this.api.updateRolePermissions(editingId, permissionIds).subscribe({
          next: () => {
            this.loading.set(false);
            this.cancelEdit();
            this.reload();
            this.notification.success('Role updated successfully. Users may need to re-login.');
          },
          error: (err: { error?: { detail?: string } }) => {
            this.loading.set(false);
            const message = err?.error?.detail ?? 'Failed to update role permissions.';
            this.error.set(message);
            this.notification.error(message);
          }
        });
      },
      error: (err: { error?: { detail?: string } }) => {
        this.loading.set(false);
        const message = err?.error?.detail ?? 'Failed to update role.';
        this.error.set(message);
        this.notification.error(message);
      }
    });
  }

  remove(role: RoleDto): void {
    if (role.isSystem || !this.canUpdate()) {
      return;
    }

    this.api.deleteRole(role.id).subscribe({
      next: () => {
        this.reload();
        this.notification.success('Role deleted successfully.');
      },
      error: (err: { error?: { detail?: string } }) => {
        const message = err?.error?.detail ?? 'Failed to delete role.';
        this.error.set(message);
        this.notification.error(message);
      }
    });
  }
}
