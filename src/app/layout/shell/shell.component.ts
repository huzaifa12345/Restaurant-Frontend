import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { MatToolbarModule } from '@angular/material/toolbar';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatToolbarModule, MatListModule, MatButtonModule],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss'
})
export class ShellComponent {
  private readonly auth = inject(AuthService);

  readonly user = this.auth.currentUser;
  readonly canManageUsers = computed(() => this.auth.hasPermission('Users.View'));
  readonly canManageRoles = computed(() => this.auth.hasPermission('Roles.View'));
  readonly canUpdateRestaurant = computed(() => this.auth.hasPermission('Restaurant.Update'));
  readonly canViewReports = computed(() => this.auth.hasPermission('Reports.View'));
  readonly canUsePos = computed(() => this.auth.hasPermission('Orders.Create'));
  readonly canViewMenu = computed(() => this.auth.hasPermission('Menu.View'));

  logout(): void {
    this.auth.logout();
  }
}
