import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { permissionGuard } from './core/guards/permission.guard';
import { platformTenantGuard } from './core/guards/platform-tenant.guard';
import { ChangePasswordComponent } from './features/auth/change-password/change-password.component';
import { LoginComponent } from './features/auth/login/login.component';
import { CategoriesComponent } from './features/categories/categories.component';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { MenuItemsComponent } from './features/menu-items/menu-items.component';
import { PosComponent } from './features/pos/pos.component';
import { ReportsComponent } from './features/reports/reports.component';
import { RestaurantSettingsComponent } from './features/restaurant/restaurant-settings.component';
import { RestaurantsComponent } from './features/restaurants/restaurants.component';
import { RolesComponent } from './features/roles/roles.component';
import { UsersComponent } from './features/users/users.component';
import { ShellComponent } from './layout/shell/shell.component';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'app/dashboard' },
  { path: 'login', component: LoginComponent },
  { path: 'change-password', component: ChangePasswordComponent, data: { mode: 'public' } },
  {
    path: 'app',
    component: ShellComponent,
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      { path: 'dashboard', component: DashboardComponent, canActivate: [permissionGuard], data: { permissions: ['Dashboard.View'] } },
      { path: 'change-password', component: ChangePasswordComponent, data: { mode: 'auth' } },
      {
        path: 'pos',
        component: PosComponent,
        canActivate: [permissionGuard],
        data: { permissions: ['Orders.Create'] }
      },
      {
        path: 'reports',
        component: ReportsComponent,
        canActivate: [permissionGuard],
        data: { permissions: ['Reports.View'] }
      },
      {
        path: 'categories',
        component: CategoriesComponent,
        canActivate: [permissionGuard],
        data: { permissions: ['Menu.View'] }
      },
      {
        path: 'menu-items',
        component: MenuItemsComponent,
        canActivate: [permissionGuard],
        data: { permissions: ['Menu.View'] }
      },
      {
        path: 'restaurants',
        component: RestaurantsComponent,
        canActivate: [platformTenantGuard]
      },
      {
        path: 'restaurant',
        component: RestaurantSettingsComponent,
        canActivate: [permissionGuard],
        data: { permissions: ['Restaurant.Update'] }
      },
      {
        path: 'users',
        component: UsersComponent,
        canActivate: [permissionGuard],
        data: { permissions: ['Users.View'] }
      },
      {
        path: 'roles',
        component: RolesComponent,
        canActivate: [permissionGuard],
        data: { permissions: ['Roles.View'] }
      }
    ]
  },
  { path: '**', redirectTo: 'app/dashboard' }
];
