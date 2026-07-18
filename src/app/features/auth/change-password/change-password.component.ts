import { Component, OnInit, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { debounceTime, distinctUntilChanged, finalize, switchMap } from 'rxjs/operators';
import { AuthService } from '../../../core/services/auth.service';
import { ApiService } from '../../../core/services/api.service';
import { RestaurantLookupDto } from '../../../core/models/api.models';

const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  const newPassword = group.get('newPassword')?.value;
  const confirmPassword = group.get('confirmPassword')?.value;
  return newPassword && confirmPassword && newPassword !== confirmPassword
    ? { passwordMismatch: true }
    : null;
}

@Component({
  selector: 'app-change-password',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatAutocompleteModule
  ],
  templateUrl: './change-password.component.html',
  styleUrl: './change-password.component.scss'
})
export class ChangePasswordComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly isPublic = signal(false);
  readonly loading = signal(false);
  readonly message = signal<string | null>(null);
  readonly error = signal<string | null>(null);
  readonly showOld = signal(false);
  readonly showNew = signal(false);
  readonly showConfirm = signal(false);
  readonly restaurants = signal<RestaurantLookupDto[]>([]);
  readonly loadingRestaurants = signal(false);

  readonly form = this.fb.nonNullable.group(
    {
      restaurantName: [''],
      username: [''],
      oldPassword: ['', Validators.required],
      newPassword: ['', [Validators.required, Validators.pattern(PASSWORD_PATTERN)]],
      confirmPassword: ['', Validators.required]
    },
    { validators: passwordsMatch }
  );

  ngOnInit(): void {
    const mode = this.route.snapshot.data['mode'] ?? (this.auth.isAuthenticated() ? 'auth' : 'public');
    this.isPublic.set(mode === 'public');

    if (this.isPublic()) {
      this.form.controls.restaurantName.addValidators(Validators.required);
      this.form.controls.username.addValidators(Validators.required);
      this.form.controls.restaurantName.updateValueAndValidity();
      this.form.controls.username.updateValueAndValidity();

      this.loadRestaurants('');
      this.form.controls.restaurantName.valueChanges
        .pipe(
          debounceTime(250),
          distinctUntilChanged(),
          switchMap(term => {
            this.loadingRestaurants.set(true);
            return this.api
              .lookupRestaurants(term ?? '', 10)
              .pipe(finalize(() => this.loadingRestaurants.set(false)));
          })
        )
        .subscribe({
          next: list => this.restaurants.set(list),
          error: () => this.restaurants.set([])
        });
    }
  }

  displayRestaurant(name: string | null): string {
    return name ?? '';
  }

  onRestaurantFocus(): void {
    if (this.restaurants().length === 0) {
      this.loadRestaurants(this.form.controls.restaurantName.value);
    }
  }

  get newPassword(): string {
    return this.form.controls.newPassword.value;
  }

  get hasMinLength(): boolean {
    return this.newPassword.length >= 8;
  }

  get hasUpper(): boolean {
    return /[A-Z]/.test(this.newPassword);
  }

  get hasLower(): boolean {
    return /[a-z]/.test(this.newPassword);
  }

  get hasNumber(): boolean {
    return /[0-9]/.test(this.newPassword);
  }

  get hasSpecial(): boolean {
    return /[^A-Za-z0-9]/.test(this.newPassword);
  }

  submit(): void {
    this.message.set(null);
    this.error.set(null);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    this.loading.set(true);

    const request$ = this.isPublic()
      ? this.auth.changePasswordPublic({
          restaurantName: value.restaurantName.trim(),
          username: value.username.trim(),
          oldPassword: value.oldPassword,
          newPassword: value.newPassword
        })
      : this.auth.changePassword({ oldPassword: value.oldPassword, newPassword: value.newPassword });

    request$.pipe(finalize(() => this.loading.set(false))).subscribe({
      next: () => {
        this.message.set('Password changed successfully.');
        this.form.reset();
        if (this.isPublic()) {
          this.restaurants.set([]);
          setTimeout(() => void this.router.navigate(['/login']), 1500);
        }
      },
      error: (err: { error?: { detail?: string; errors?: Record<string, string[]> } }) => {
        const firstFieldError = err?.error?.errors
          ? Object.values(err.error.errors)[0]?.[0]
          : undefined;
        this.error.set(err?.error?.detail ?? firstFieldError ?? 'Failed to change password.');
      }
    });
  }

  cancel(): void {
    void this.router.navigate([this.isPublic() ? '/login' : '/app/dashboard']);
  }

  private loadRestaurants(search: string): void {
    this.loadingRestaurants.set(true);
    this.api
      .lookupRestaurants(search, 10)
      .pipe(finalize(() => this.loadingRestaurants.set(false)))
      .subscribe({
        next: list => this.restaurants.set(list),
        error: () => this.restaurants.set([])
      });
  }
}
