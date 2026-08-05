import { Component, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatToolbarModule } from '@angular/material/toolbar';
import { filter } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { AppFooterComponent } from '../../shared/components/app-footer/app-footer.component';

type NavSection = 'sales' | 'inventory' | 'expenses' | 'admin';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatToolbarModule,
    MatListModule,
    MatButtonModule,
    MatIconModule,
    AppFooterComponent
  ],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss'
})
export class ShellComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  constructor() {
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe(() => {
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      });
  }

  readonly user = this.auth.currentUser;
  readonly salesOpen = signal(true);
  readonly inventoryOpen = signal(true);
  readonly expensesOpen = signal(true);
  readonly adminOpen = signal(true);

  readonly canManageUsers = computed(() => this.auth.hasPermission('Users.View'));
  readonly canManageRoles = computed(() => this.auth.hasPermission('Roles.View'));
  readonly canUpdateRestaurant = computed(() => this.auth.hasPermission('Restaurant.Update'));
  readonly canManageRestaurants = computed(
    () =>
      this.auth.isPlatformRestaurant() &&
      this.auth.hasAnyPermission(['Restaurants.View', 'Restaurants.Create'])
  );
  readonly canViewReports = computed(() => this.auth.hasPermission('Reports.View'));
  readonly canUsePos = computed(() => this.auth.hasPermission('Orders.Create'));
  readonly canViewMenu = computed(() => this.auth.hasPermission('Menu.View'));
  readonly canViewInventory = computed(() => this.auth.hasPermission('Inventory.View'));
  readonly canViewPurchases = computed(() => this.auth.hasPermission('Purchases.View'));
  readonly canViewEmployees = computed(() => this.auth.hasPermission('Employees.View'));
  readonly canViewExpenses = computed(() => this.auth.hasPermission('Expenses.View'));
  readonly showInventoryNav = computed(
    () => this.canViewInventory() || this.canViewPurchases() || this.canViewReports()
  );
  readonly showExpensesNav = computed(
    () => this.canViewExpenses() || this.canViewReports()
  );
  readonly showAdminNav = computed(
    () =>
      this.canManageUsers() ||
      this.canManageRoles() ||
      this.canUpdateRestaurant() ||
      this.canManageRestaurants() ||
      this.canViewEmployees() ||
      this.canViewReports()
  );

  toggleSection(section: NavSection): void {
    if (section === 'sales') {
      this.salesOpen.update(v => !v);
      return;
    }
    if (section === 'inventory') {
      this.inventoryOpen.update(v => !v);
      return;
    }
    if (section === 'expenses') {
      this.expensesOpen.update(v => !v);
      return;
    }
    this.adminOpen.update(v => !v);
  }

  logout(): void {
    this.auth.logout();
  }
}
