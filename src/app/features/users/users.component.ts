import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTableModule } from '@angular/material/table';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { AuthService } from '../../core/services/auth.service';
import { ApiService } from '../../core/services/api.service';
import { RestaurantDto, RoleDto, UserDto } from '../../core/models/api.models';

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
    MatSlideToggleModule,
    MatAutocompleteModule
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
  readonly formRoles = signal<RoleDto[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly editingId = signal<string | null>(null);
  readonly editingRestaurantName = signal<string | null>(null);
  readonly showForm = signal(false);
  readonly canCreate = computed(() => this.auth.hasPermission('Users.Create'));
  readonly canUpdate = computed(() => this.auth.hasPermission('Users.Update'));
  readonly currentUserId = computed(() => this.auth.currentUser()?.userId ?? null);
  readonly currentRestaurantId = computed(() => this.auth.currentUser()?.restaurantId ?? null);
  readonly isPlatform = computed(() => this.auth.isPlatformRestaurant());

  readonly page = signal(1);
  readonly pageSize = 10;
  readonly totalCount = signal(0);
  readonly totalPages = signal(0);

  readonly restaurants = signal<RestaurantDto[]>([]);
  readonly filteredRestaurants = signal<RestaurantDto[]>([]);
  readonly usernameSuggestions = signal<string[]>([]);
  readonly selectedRestaurantId = signal<string | null>(null);

  readonly usernameFilter = new FormControl<string>('', { nonNullable: true });
  readonly restaurantFilter = new FormControl<string>('', { nonNullable: true });

  readonly displayedColumns = computed(() =>
    this.isPlatform()
      ? ['restaurant', 'name', 'username', 'role', 'active', 'actions']
      : ['name', 'username', 'role', 'active', 'actions']
  );

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
    this.api.getRoles().subscribe({
      next: (roles: RoleDto[]) => this.roles.set(roles),
      error: (err: { error?: { detail?: string } }) =>
        this.error.set(err?.error?.detail ?? 'Failed to load roles.')
    });

    if (this.isPlatform()) {
      this.api.getRestaurants().subscribe({
        next: (list: RestaurantDto[]) => {
          this.restaurants.set(list);
          this.filteredRestaurants.set(list);
        },
        error: () => this.restaurants.set([])
      });

      this.usernameFilter.valueChanges
        .pipe(debounceTime(300), distinctUntilChanged())
        .subscribe(() => {
          this.page.set(1);
          this.loadUsers();
        });

      this.restaurantFilter.valueChanges
        .pipe(debounceTime(200))
        .subscribe(value => {
          const term = (value ?? '').toLowerCase().trim();
          this.filteredRestaurants.set(
            term
              ? this.restaurants().filter(r => r.name.toLowerCase().includes(term))
              : this.restaurants()
          );

          if (term === '') {
            if (this.selectedRestaurantId() !== null) {
              this.selectedRestaurantId.set(null);
              this.page.set(1);
              this.loadUsers();
            }
          }
        });
    }

    this.loadUsers();
  }

  loadUsers(): void {
    this.loading.set(true);
    this.error.set(null);

    this.api
      .getUsers({
        page: this.page(),
        pageSize: this.pageSize,
        username: this.usernameFilter.value,
        restaurantId: this.selectedRestaurantId()
      })
      .subscribe({
        next: result => {
          this.users.set(result.items);
          this.totalCount.set(result.totalCount);
          this.totalPages.set(result.totalPages);
          if (this.isPlatform()) {
            this.usernameSuggestions.set([...new Set(result.items.map(u => u.username))]);
          }
          this.loading.set(false);
        },
        error: (err: { error?: { detail?: string } }) => {
          this.loading.set(false);
          this.error.set(err?.error?.detail ?? 'Failed to load users.');
        }
      });
  }

  reload(): void {
    this.loadUsers();
  }

  onRestaurantSelected(restaurant: RestaurantDto): void {
    this.selectedRestaurantId.set(restaurant.id);
    this.restaurantFilter.setValue(restaurant.name, { emitEvent: false });
    this.page.set(1);
    this.loadUsers();
  }

  clearRestaurantFilter(): void {
    this.restaurantFilter.setValue('');
    this.selectedRestaurantId.set(null);
    this.filteredRestaurants.set(this.restaurants());
    this.page.set(1);
    this.loadUsers();
  }

  prevPage(): void {
    if (this.page() > 1) {
      this.page.set(this.page() - 1);
      this.loadUsers();
    }
  }

  nextPage(): void {
    if (this.totalPages() > 0 && this.page() < this.totalPages()) {
      this.page.set(this.page() + 1);
      this.loadUsers();
    }
  }

  startCreate(): void {
    this.editingId.set(null);
    this.editingRestaurantName.set(null);
    this.formRoles.set(this.roles());
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
    this.editingRestaurantName.set(this.isPlatform() ? user.restaurantName : null);
    this.showForm.set(true);

    if (this.isPlatform() && user.restaurantId !== this.currentRestaurantId()) {
      this.formRoles.set([]);
      this.api.getRoles(user.restaurantId).subscribe({
        next: (roles: RoleDto[]) => this.formRoles.set(roles),
        error: () => this.formRoles.set([])
      });
    } else {
      this.formRoles.set(this.roles());
    }

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
    this.editingRestaurantName.set(null);
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
          this.loadUsers();
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
        this.loadUsers();
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
      next: () => this.loadUsers(),
      error: (err: { error?: { detail?: string } }) =>
        this.error.set(err?.error?.detail ?? 'Failed to update status.')
    });
  }
}
