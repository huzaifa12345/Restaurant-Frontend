import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTableModule } from '@angular/material/table';
import { AuthService } from '../../core/services/auth.service';
import { ApiService } from '../../core/services/api.service';
import { RoleDto, UserDto } from '../../core/models/api.models';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatTableModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSlideToggleModule
  ],
  templateUrl: './users.component.html',
  styleUrl: './users.component.scss'
})
export class UsersComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);

  readonly users = signal<UserDto[]>([]);
  readonly roles = signal<RoleDto[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly editingId = signal<string | null>(null);
  readonly showForm = signal(false);
  readonly canCreate = computed(() => this.auth.hasPermission('Users.Create'));
  readonly canUpdate = computed(() => this.auth.hasPermission('Users.Update'));
  readonly currentUserId = computed(() => this.auth.currentUser()?.userId ?? null);

  readonly displayedColumns = ['name', 'username', 'role', 'active', 'actions'];

  readonly form = this.fb.nonNullable.group({
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    username: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    phone: [''],
    roleId: ['', Validators.required],
    password: [''],
    isActive: [true]
  });

  isSelf(user: UserDto): boolean {
    return this.currentUserId() === user.id;
  }

  isRoleLocked(user: UserDto): boolean {
    return !!user.isPrimaryAdmin || this.isSelf(user);
  }

  isActiveLocked(user: UserDto): boolean {
    return !!user.isPrimaryAdmin || this.isSelf(user);
  }

  canToggleActive(user: UserDto): boolean {
    return this.canUpdate() && !this.isActiveLocked(user);
  }

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.error.set(null);

    this.api.getRoles().subscribe({
      next: (roles: RoleDto[]) => this.roles.set(roles),
      error: (err: { error?: { detail?: string } }) =>
        this.error.set(err?.error?.detail ?? 'Failed to load roles.')
    });

    this.api.getUsers().subscribe({
      next: (users: UserDto[]) => {
        this.users.set(users);
        this.loading.set(false);
      },
      error: (err: { error?: { detail?: string } }) => {
        this.loading.set(false);
        this.error.set(err?.error?.detail ?? 'Failed to load users.');
      }
    });
  }

  startCreate(): void {
    this.editingId.set(null);
    this.showForm.set(true);
    this.form.reset({
      firstName: '',
      lastName: '',
      username: '',
      email: '',
      phone: '',
      roleId: this.roles()[0]?.id ?? '',
      password: '',
      isActive: true
    });
    this.form.controls.username.enable();
    this.form.controls.roleId.enable();
    this.form.controls.isActive.enable();
    this.form.controls.password.setValidators([Validators.required, Validators.minLength(6)]);
    this.form.controls.password.updateValueAndValidity();
  }

  startEdit(user: UserDto): void {
    this.editingId.set(user.id);
    this.showForm.set(true);
    this.form.reset({
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username,
      email: user.email,
      phone: user.phone ?? '',
      roleId: user.roleId,
      password: '',
      isActive: user.isActive
    });
    this.form.controls.username.disable();
    this.form.controls.password.clearValidators();
    this.form.controls.password.updateValueAndValidity();

    if (this.isRoleLocked(user)) {
      this.form.controls.roleId.disable();
    } else {
      this.form.controls.roleId.enable();
    }

    if (this.isActiveLocked(user)) {
      this.form.controls.isActive.disable();
    } else {
      this.form.controls.isActive.enable();
    }
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
    const editingId = this.editingId();
    this.loading.set(true);
    this.error.set(null);

    if (!editingId) {
      this.api.createUser({
        firstName: value.firstName,
        lastName: value.lastName,
        username: value.username,
        email: value.email,
        phone: value.phone || null,
        password: value.password,
        roleId: value.roleId
      }).subscribe({
        next: () => {
          this.loading.set(false);
          this.cancelEdit();
          this.reload();
        },
        error: (err: { error?: { detail?: string } }) => {
          this.loading.set(false);
          this.error.set(err?.error?.detail ?? 'Failed to create user.');
        }
      });
      return;
    }

    this.api.updateUser(editingId, {
      firstName: value.firstName,
      lastName: value.lastName,
      email: value.email,
      phone: value.phone || null,
      roleId: value.roleId,
      isActive: value.isActive,
      password: value.password || null
    }).subscribe({
      next: () => {
        this.loading.set(false);
        this.cancelEdit();
        this.reload();
      },
      error: (err: { error?: { detail?: string } }) => {
        this.loading.set(false);
        this.error.set(err?.error?.detail ?? 'Failed to update user.');
      }
    });
  }

  toggleActive(user: UserDto): void {
    if (!this.canToggleActive(user)) {
      return;
    }

    this.api.setUserStatus(user.id, !user.isActive).subscribe({
      next: () => this.reload(),
      error: (err: { error?: { detail?: string } }) =>
        this.error.set(err?.error?.detail ?? 'Failed to update status.')
    });
  }
}
