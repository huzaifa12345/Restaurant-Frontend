import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule } from '@angular/material/table';
import { AuthService } from '../../core/services/auth.service';
import { ApiService } from '../../core/services/api.service';
import { CreateRestaurantRequest, RestaurantDto } from '../../core/models/api.models';

@Component({
  selector: 'app-restaurants',
  standalone: true,
  imports: [ReactiveFormsModule, MatTableModule, MatButtonModule, MatFormFieldModule, MatInputModule],
  templateUrl: './restaurants.component.html',
  styleUrl: './restaurants.component.scss'
})
export class RestaurantsComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);

  readonly restaurants = signal<RestaurantDto[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly message = signal<string | null>(null);
  readonly showForm = signal(false);
  readonly canCreate = computed(() => this.auth.hasPermission('Restaurants.Create'));

  readonly displayedColumns = ['name', 'code', 'city', 'currency', 'active'];

  readonly form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    restaurantCode: ['', Validators.required],
    phone: [''],
    email: [''],
    address: [''],
    city: [''],
    country: [''],
    currency: ['PKR', Validators.required],
    timezone: ['Asia/Karachi', Validators.required],
    adminFirstName: ['', Validators.required],
    adminLastName: ['', Validators.required],
    adminUsername: ['', Validators.required],
    adminEmail: ['', [Validators.required, Validators.email]],
    adminPassword: ['', [Validators.required, Validators.minLength(6)]]
  });

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.getRestaurants().subscribe({
      next: list => {
        this.restaurants.set(list);
        this.loading.set(false);
      },
      error: (err: { error?: { detail?: string } }) => {
        this.loading.set(false);
        this.error.set(err?.error?.detail ?? 'Failed to load restaurants.');
      }
    });
  }

  startCreate(): void {
    this.showForm.set(true);
    this.message.set(null);
    this.error.set(null);
    this.form.reset({
      name: '',
      restaurantCode: '',
      phone: '',
      email: '',
      address: '',
      city: '',
      country: '',
      currency: 'PKR',
      timezone: 'Asia/Karachi',
      adminFirstName: '',
      adminLastName: '',
      adminUsername: '',
      adminEmail: '',
      adminPassword: ''
    });
  }

  cancelForm(): void {
    this.showForm.set(false);
  }

  save(): void {
    if (this.form.invalid || !this.canCreate()) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const body: CreateRestaurantRequest = {
      name: raw.name.trim(),
      restaurantCode: raw.restaurantCode.trim(),
      phone: raw.phone.trim() || null,
      email: raw.email.trim() || null,
      address: raw.address.trim() || null,
      city: raw.city.trim() || null,
      country: raw.country.trim() || null,
      currency: raw.currency.trim(),
      timezone: raw.timezone.trim(),
      adminFirstName: raw.adminFirstName.trim(),
      adminLastName: raw.adminLastName.trim(),
      adminUsername: raw.adminUsername.trim(),
      adminEmail: raw.adminEmail.trim(),
      adminPassword: raw.adminPassword
    };

    this.saving.set(true);
    this.error.set(null);
    this.message.set(null);

    this.api.createRestaurant(body).subscribe({
      next: created => {
        this.saving.set(false);
        this.showForm.set(false);
        this.message.set(
          `Restaurant "${created.name}" created. Admin can log in with restaurant name "${created.name}".`
        );
        this.reload();
      },
      error: (err: { error?: { detail?: string } }) => {
        this.saving.set(false);
        this.error.set(err?.error?.detail ?? 'Failed to create restaurant.');
      }
    });
  }
}
