import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { ApiService } from '../../core/services/api.service';
import { RestaurantDto } from '../../core/models/api.models';

@Component({
  selector: 'app-restaurant-settings',
  standalone: true,
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatSlideToggleModule],
  templateUrl: './restaurant-settings.component.html',
  styleUrl: './restaurant-settings.component.scss'
})
export class RestaurantSettingsComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiService);

  readonly loading = signal(false);
  readonly message = signal<string | null>(null);
  readonly error = signal<string | null>(null);
  restaurantCode = '';

  readonly form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    phone: [''],
    email: [''],
    address: [''],
    city: [''],
    country: [''],
    currency: ['PKR', Validators.required],
    timezone: ['Asia/Karachi', Validators.required],
    logo: [''],
    isActive: [true]
  });

  ngOnInit(): void {
    this.loading.set(true);
    this.api.getCurrentRestaurant().subscribe({
      next: (restaurant: RestaurantDto) => {
        this.restaurantCode = restaurant.restaurantCode;
        this.form.patchValue({
          name: restaurant.name,
          phone: restaurant.phone ?? '',
          email: restaurant.email ?? '',
          address: restaurant.address ?? '',
          city: restaurant.city ?? '',
          country: restaurant.country ?? '',
          currency: restaurant.currency,
          timezone: restaurant.timezone,
          logo: restaurant.logo ?? '',
          isActive: restaurant.isActive
        });
        this.loading.set(false);
      },
      error: (err: { error?: { detail?: string } }) => {
        this.loading.set(false);
        this.error.set(err?.error?.detail ?? 'Failed to load restaurant.');
      }
    });
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.message.set(null);
    this.error.set(null);

    const value = this.form.getRawValue();
    this.api.updateCurrentRestaurant({
      name: value.name,
      phone: value.phone || null,
      email: value.email || null,
      address: value.address || null,
      city: value.city || null,
      country: value.country || null,
      currency: value.currency,
      timezone: value.timezone,
      logo: value.logo || null,
      isActive: value.isActive
    }).subscribe({
      next: () => {
        this.loading.set(false);
        this.message.set('Restaurant settings saved.');
      },
      error: (err: { error?: { detail?: string } }) => {
        this.loading.set(false);
        this.error.set(err?.error?.detail ?? 'Failed to save settings.');
      }
    });
  }
}
