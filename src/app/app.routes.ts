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
      { path: 'reports', pathMatch: 'full', redirectTo: 'reports/sales' },
      {
        path: 'reports/sales',
        component: ReportsComponent,
        canActivate: [permissionGuard],
        data: { permissions: ['Reports.View'] }
      },
      {
        path: 'reports/purchases',
        loadComponent: () =>
          import('./features/purchase-reports/purchase-reports.component').then(m => m.PurchaseReportsComponent),
        canActivate: [permissionGuard],
        data: { permissions: ['Reports.View'] }
      },
      {
        path: 'reports/stock',
        loadComponent: () =>
          import('./features/stock-report/stock-report.component').then(m => m.StockReportComponent),
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
        path: 'units-of-measure',
        loadComponent: () =>
          import('./features/units-of-measure/units-of-measure.component').then(m => m.UnitsOfMeasureComponent),
        canActivate: [permissionGuard],
        data: { permissions: ['Inventory.View'] }
      },
      {
        path: 'raw-material-categories',
        loadComponent: () =>
          import('./features/raw-material-categories/raw-material-categories.component').then(
            m => m.RawMaterialCategoriesComponent
          ),
        canActivate: [permissionGuard],
        data: { permissions: ['Inventory.View'] }
      },
      {
        path: 'raw-materials',
        loadComponent: () =>
          import('./features/raw-materials/raw-materials.component').then(m => m.RawMaterialsComponent),
        canActivate: [permissionGuard],
        data: { permissions: ['Inventory.View'] }
      },
      {
        path: 'suppliers',
        loadComponent: () => import('./features/suppliers/suppliers.component').then(m => m.SuppliersComponent),
        canActivate: [permissionGuard],
        data: { permissions: ['Inventory.View'] }
      },
      {
        path: 'purchases',
        loadComponent: () => import('./features/purchases/purchases.component').then(m => m.PurchasesComponent),
        canActivate: [permissionGuard],
        data: { permissions: ['Purchases.View'] }
      },
      {
        path: 'employees',
        loadComponent: () => import('./features/employees/employees.component').then(m => m.EmployeesComponent),
        canActivate: [permissionGuard],
        data: { permissions: ['Employees.View'] }
      },
      {
        path: 'attendance',
        loadComponent: () => import('./features/attendance/attendance.component').then(m => m.AttendanceComponent),
        canActivate: [permissionGuard],
        data: { permissions: ['Employees.View'] }
      },
      {
        path: 'employee-payments',
        loadComponent: () =>
          import('./features/employee-payments/employee-payments.component').then(m => m.EmployeePaymentsComponent),
        canActivate: [permissionGuard],
        data: { permissions: ['Employees.View'] }
      },
      {
        path: 'expense-categories',
        loadComponent: () =>
          import('./features/expense-categories/expense-categories.component').then(m => m.ExpenseCategoriesComponent),
        canActivate: [permissionGuard],
        data: { permissions: ['Expenses.View'] }
      },
      {
        path: 'expenses',
        loadComponent: () => import('./features/expenses/expenses.component').then(m => m.ExpensesComponent),
        canActivate: [permissionGuard],
        data: { permissions: ['Expenses.View'] }
      },
      {
        path: 'reports/expenses',
        loadComponent: () =>
          import('./features/expense-reports/expense-reports.component').then(m => m.ExpenseReportsComponent),
        canActivate: [permissionGuard],
        data: { permissions: ['Reports.View'] }
      },
      {
        path: 'reports/wages',
        loadComponent: () => import('./features/wage-reports/wage-reports.component').then(m => m.WageReportsComponent),
        canActivate: [permissionGuard],
        data: { permissions: ['Reports.View'] }
      },
      {
        path: 'reports/attendance',
        loadComponent: () =>
          import('./features/attendance-reports/attendance-reports.component').then(
            m => m.AttendanceReportsComponent
          ),
        canActivate: [permissionGuard],
        data: { permissions: ['Reports.View'] }
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
