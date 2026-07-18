import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { debounceTime, distinctUntilChanged, finalize, switchMap } from 'rxjs/operators';
import { AuthService } from '../../../core/services/auth.service';
import { ApiService } from '../../../core/services/api.service';
import { RestaurantLookupDto } from '../../../core/models/api.models';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatAutocompleteModule
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);

  readonly errorMessage = signal<string | null>(null);
  readonly loading = signal(false);
  readonly restaurants = signal<RestaurantLookupDto[]>([]);
  readonly loadingRestaurants = signal(false);

  readonly form = this.fb.nonNullable.group({
    restaurantName: ['', Validators.required],
    username: ['', Validators.required],
    password: ['', Validators.required]
  });

  ngOnInit(): void {
    this.loadRestaurants('');

    this.form.controls.restaurantName.valueChanges
      .pipe(
        debounceTime(250),
        distinctUntilChanged(),
        switchMap(term => {
          this.loadingRestaurants.set(true);
          return this.api.lookupRestaurants(term ?? '', 10).pipe(
            finalize(() => this.loadingRestaurants.set(false))
          );
        })
      )
      .subscribe({
        next: list => this.restaurants.set(list),
        error: () => this.restaurants.set([])
      });
  }

  displayRestaurant(name: string | null): string {
    return name ?? '';
  }

  onRestaurantFocus(): void {
    if (this.restaurants().length === 0) {
      this.loadRestaurants(this.form.controls.restaurantName.value);
    }
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);

    const value = this.form.getRawValue();
    this.auth
      .login({
        restaurantName: value.restaurantName.trim(),
        username: value.username.trim(),
        password: value.password
      })
      .subscribe({
        next: () => {
          this.loading.set(false);
          void this.router.navigate(['/app/dashboard']);
        },
        error: (err: { error?: { detail?: string } }) => {
          this.loading.set(false);
          this.errorMessage.set(err?.error?.detail ?? 'Invalid credentials.');
        }
      });
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
