import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { AuthService } from '../../core/services/auth.service';
import { ApiService } from '../../core/services/api.service';
import { DashboardDto, OrderStatus, OrderType, PaymentType } from '../../core/models/api.models';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [DatePipe, DecimalPipe, RouterLink, MatButtonModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly api = inject(ApiService);

  readonly user = this.auth.currentUser;
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly data = signal<DashboardDto | null>(null);
  readonly canUsePos = () => this.auth.hasPermission('Orders.Create');
  readonly canViewReports = () => this.auth.hasPermission('Reports.View');

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.getDashboard().subscribe({
      next: dto => {
        this.data.set(dto);
        this.loading.set(false);
      },
      error: (err: { error?: { detail?: string } }) => {
        this.loading.set(false);
        this.error.set(err?.error?.detail ?? 'Failed to load dashboard.');
      }
    });
  }

  orderTypeLabel(type: OrderType): string {
    switch (type) {
      case OrderType.Takeaway:
        return 'Takeaway';
      case OrderType.Delivery:
        return 'Delivery';
      default:
        return 'Dine In';
    }
  }

  paymentTypeLabel(type: PaymentType): string {
    switch (type) {
      case PaymentType.Card:
        return 'Card';
      case PaymentType.Online:
        return 'Online';
      default:
        return 'Cash';
    }
  }

  orderStatusLabel(status: OrderStatus): string {
    switch (status) {
      case OrderStatus.Cancelled:
        return 'Cancelled';
      case OrderStatus.Pending:
        return 'Pending';
      default:
        return 'Completed';
    }
  }
}
