import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CategoryDto,
  CategoryRequest,
  CreateOrderRequest,
  CreateRestaurantRequest,
  CreateRoleRequest,
  CreateUserRequest,
  DashboardDto,
  InvoiceDto,
  MenuItemDto,
  MenuItemRequest,
  OrderDto,
  OrderStatus,
  OrderSummaryDto,
  OrderType,
  PagedResultDto,
  PermissionDto,
  ReportOrderDto,
  RestaurantDto,
  RestaurantLookupDto,
  RoleDto,
  SalesSummaryDto,
  TopSellingItemDto,
  UpdateRestaurantRequest,
  UpdateRoleRequest,
  UpdateUserRequest,
  UploadImageResponse,
  UserDto
} from '../models/api.models';

@Injectable({ providedIn: 'root' })
export class ApiService {
  constructor(private readonly http: HttpClient) {}

  lookupRestaurants(search = '', take = 10): Observable<RestaurantLookupDto[]> {
    let params = new HttpParams().set('take', String(take));
    if (search.trim()) {
      params = params.set('search', search.trim());
    }
    return this.http.get<RestaurantLookupDto[]>(`${environment.apiUrl}/auth/restaurants`, { params });
  }

  getCurrentRestaurant(): Observable<RestaurantDto> {
    return this.http.get<RestaurantDto>(`${environment.apiUrl}/restaurants/current`);
  }

  getRestaurants(): Observable<RestaurantDto[]> {
    return this.http.get<RestaurantDto[]>(`${environment.apiUrl}/restaurants`);
  }

  createRestaurant(body: CreateRestaurantRequest): Observable<RestaurantDto> {
    return this.http.post<RestaurantDto>(`${environment.apiUrl}/restaurants`, body);
  }

  getDashboard(): Observable<DashboardDto> {
    return this.http.get<DashboardDto>(`${environment.apiUrl}/dashboard`);
  }

  updateCurrentRestaurant(body: UpdateRestaurantRequest): Observable<RestaurantDto> {
    return this.http.put<RestaurantDto>(`${environment.apiUrl}/restaurants/current`, body);
  }

  getUsers(): Observable<UserDto[]> {
    return this.http.get<UserDto[]>(`${environment.apiUrl}/users`);
  }

  getUser(id: string): Observable<UserDto> {
    return this.http.get<UserDto>(`${environment.apiUrl}/users/${id}`);
  }

  createUser(body: CreateUserRequest): Observable<UserDto> {
    return this.http.post<UserDto>(`${environment.apiUrl}/users`, body);
  }

  updateUser(id: string, body: UpdateUserRequest): Observable<UserDto> {
    return this.http.put<UserDto>(`${environment.apiUrl}/users/${id}`, body);
  }

  setUserStatus(id: string, isActive: boolean): Observable<UserDto> {
    return this.http.patch<UserDto>(`${environment.apiUrl}/users/${id}/status`, { isActive });
  }

  getRoles(): Observable<RoleDto[]> {
    return this.http.get<RoleDto[]>(`${environment.apiUrl}/roles`);
  }

  getRole(id: string): Observable<RoleDto> {
    return this.http.get<RoleDto>(`${environment.apiUrl}/roles/${id}`);
  }

  getPermissions(): Observable<PermissionDto[]> {
    return this.http.get<PermissionDto[]>(`${environment.apiUrl}/permissions`);
  }

  createRole(body: CreateRoleRequest): Observable<RoleDto> {
    return this.http.post<RoleDto>(`${environment.apiUrl}/roles`, body);
  }

  updateRole(id: string, body: UpdateRoleRequest): Observable<RoleDto> {
    return this.http.put<RoleDto>(`${environment.apiUrl}/roles/${id}`, body);
  }

  updateRolePermissions(id: string, permissionIds: string[]): Observable<RoleDto> {
    return this.http.put<RoleDto>(`${environment.apiUrl}/roles/${id}/permissions`, { permissionIds });
  }

  deleteRole(id: string): Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/roles/${id}`);
  }

  getCategories(activeOnly = false): Observable<CategoryDto[]> {
    const params = new HttpParams().set('activeOnly', String(activeOnly));
    return this.http.get<CategoryDto[]>(`${environment.apiUrl}/categories`, { params });
  }

  createCategory(body: CategoryRequest): Observable<CategoryDto> {
    return this.http.post<CategoryDto>(`${environment.apiUrl}/categories`, body);
  }

  updateCategory(id: string, body: CategoryRequest): Observable<CategoryDto> {
    return this.http.put<CategoryDto>(`${environment.apiUrl}/categories/${id}`, body);
  }

  deleteCategory(id: string): Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/categories/${id}`);
  }

  getMenuItems(categoryId?: string | null, activeOnly = false): Observable<MenuItemDto[]> {
    let params = new HttpParams().set('activeOnly', String(activeOnly));
    if (categoryId) {
      params = params.set('categoryId', categoryId);
    }
    return this.http.get<MenuItemDto[]>(`${environment.apiUrl}/menu-items`, { params });
  }

  getPosMenuItems(categoryId?: string | null): Observable<MenuItemDto[]> {
    let params = new HttpParams();
    if (categoryId) {
      params = params.set('categoryId', categoryId);
    }
    return this.http.get<MenuItemDto[]>(`${environment.apiUrl}/menu-items/pos`, { params });
  }

  createMenuItem(body: MenuItemRequest): Observable<MenuItemDto> {
    return this.http.post<MenuItemDto>(`${environment.apiUrl}/menu-items`, body);
  }

  updateMenuItem(id: string, body: MenuItemRequest): Observable<MenuItemDto> {
    return this.http.put<MenuItemDto>(`${environment.apiUrl}/menu-items/${id}`, body);
  }

  deleteMenuItem(id: string): Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/menu-items/${id}`);
  }

  uploadImage(file: File): Observable<UploadImageResponse> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<UploadImageResponse>(`${environment.apiUrl}/uploads/images`, formData);
  }

  resolveMediaUrl(path?: string | null): string | null {
    if (!path) {
      return null;
    }
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path;
    }
    return `${environment.mediaBaseUrl}${path.startsWith('/') ? path : `/${path}`}`;
  }

  createOrder(body: CreateOrderRequest): Observable<OrderDto> {
    return this.http.post<OrderDto>(`${environment.apiUrl}/orders`, body);
  }

  getOrders(take = 50, orderType?: OrderType | null, orderStatus?: OrderStatus | null): Observable<OrderSummaryDto[]> {
    let params = new HttpParams().set('take', String(take));
    if (orderType != null) {
      params = params.set('orderType', String(orderType));
    }
    if (orderStatus != null) {
      params = params.set('orderStatus', String(orderStatus));
    }
    return this.http.get<OrderSummaryDto[]>(`${environment.apiUrl}/orders`, { params });
  }

  getOrder(id: string): Observable<OrderDto> {
    return this.http.get<OrderDto>(`${environment.apiUrl}/orders/${id}`);
  }

  getInvoice(orderId: string): Observable<InvoiceDto> {
    return this.http.get<InvoiceDto>(`${environment.apiUrl}/orders/${orderId}/invoice`);
  }

  completeOrder(id: string): Observable<InvoiceDto> {
    return this.http.post<InvoiceDto>(`${environment.apiUrl}/orders/${id}/complete`, {});
  }

  cancelOrder(id: string): Observable<void> {
    return this.http.post<void>(`${environment.apiUrl}/orders/${id}/cancel`, {});
  }

  getSalesReport(from: string, to: string): Observable<SalesSummaryDto> {
    const params = new HttpParams().set('from', from).set('to', to);
    return this.http.get<SalesSummaryDto>(`${environment.apiUrl}/reports/sales`, { params });
  }

  getTodaySales(): Observable<SalesSummaryDto> {
    return this.http.get<SalesSummaryDto>(`${environment.apiUrl}/reports/today-sales`);
  }

  getMonthlySales(year?: number, month?: number): Observable<SalesSummaryDto> {
    let params = new HttpParams();
    if (year != null) {
      params = params.set('year', String(year));
    }
    if (month != null) {
      params = params.set('month', String(month));
    }
    return this.http.get<SalesSummaryDto>(`${environment.apiUrl}/reports/monthly-sales`, { params });
  }

  getOrderReport(from: string, to: string, page = 1, pageSize = 40): Observable<PagedResultDto<ReportOrderDto>> {
    const params = new HttpParams()
      .set('from', from)
      .set('to', to)
      .set('page', String(page))
      .set('pageSize', String(pageSize));
    return this.http.get<PagedResultDto<ReportOrderDto>>(`${environment.apiUrl}/reports/orders`, { params });
  }

  getTopSellingItems(from: string, to: string, take = 20): Observable<TopSellingItemDto[]> {
    const params = new HttpParams().set('from', from).set('to', to).set('take', String(take));
    return this.http.get<TopSellingItemDto[]>(`${environment.apiUrl}/reports/top-selling-items`, { params });
  }

  getCancelledOrdersReport(
    from: string,
    to: string,
    page = 1,
    pageSize = 40
  ): Observable<PagedResultDto<ReportOrderDto>> {
    const params = new HttpParams()
      .set('from', from)
      .set('to', to)
      .set('page', String(page))
      .set('pageSize', String(pageSize));
    return this.http.get<PagedResultDto<ReportOrderDto>>(`${environment.apiUrl}/reports/cancelled-orders`, {
      params
    });
  }

  getDeliveryOrdersReport(
    from: string,
    to: string,
    page = 1,
    pageSize = 40
  ): Observable<PagedResultDto<ReportOrderDto>> {
    const params = new HttpParams()
      .set('from', from)
      .set('to', to)
      .set('page', String(page))
      .set('pageSize', String(pageSize));
    return this.http.get<PagedResultDto<ReportOrderDto>>(`${environment.apiUrl}/reports/delivery-orders`, {
      params
    });
  }
}
