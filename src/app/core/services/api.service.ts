import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CategoryDto,
  CategoryRequest,
  CreateOrderRequest,
  CreatePurchaseRequest,
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
  PurchaseDto,
  PurchaseReportRowDto,
  RawMaterialCategoryDto,
  RawMaterialCategoryRequest,
  RawMaterialDto,
  RawMaterialRequest,
  ReplacePackSizesRequest,
  ReportOrderDto,
  RestaurantDto,
  RestaurantLookupDto,
  RoleDto,
  SalesSummaryDto,
  StockReportDto,
  SupplierDto,
  SupplierRequest,
  TopSellingItemDto,
  UnitOfMeasureDto,
  UnitOfMeasureRequest,
  UpdatePurchaseRequest,
  UpdateRestaurantRequest,
  UpdateRoleRequest,
  UpdateUserRequest,
  UploadImageResponse,
  UserDto,
  UserQuery
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

  getUsers(query: UserQuery = {}): Observable<PagedResultDto<UserDto>> {
    let params = new HttpParams()
      .set('page', String(query.page ?? 1))
      .set('pageSize', String(query.pageSize ?? 10));
    if (query.username?.trim()) {
      params = params.set('username', query.username.trim());
    }
    if (query.restaurantId) {
      params = params.set('restaurantId', query.restaurantId);
    }
    return this.http.get<PagedResultDto<UserDto>>(`${environment.apiUrl}/users`, { params });
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

  getRoles(restaurantId?: string | null): Observable<RoleDto[]> {
    let params = new HttpParams();
    if (restaurantId) {
      params = params.set('restaurantId', restaurantId);
    }
    return this.http.get<RoleDto[]>(`${environment.apiUrl}/roles`, { params });
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

  getNextMenuItemIdentifiers(categoryId: string): Observable<{ sku: string; barcode: string }> {
    const params = new HttpParams().set('categoryId', categoryId);
    return this.http.get<{ sku: string; barcode: string }>(`${environment.apiUrl}/menu-items/next-identifiers`, { params });
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

  getUnitsOfMeasure(): Observable<UnitOfMeasureDto[]> {
    return this.http.get<UnitOfMeasureDto[]>(`${environment.apiUrl}/units-of-measure`);
  }

  createUnitOfMeasure(body: UnitOfMeasureRequest): Observable<UnitOfMeasureDto> {
    return this.http.post<UnitOfMeasureDto>(`${environment.apiUrl}/units-of-measure`, body);
  }

  updateUnitOfMeasure(id: string, body: UnitOfMeasureRequest): Observable<UnitOfMeasureDto> {
    return this.http.put<UnitOfMeasureDto>(`${environment.apiUrl}/units-of-measure/${id}`, body);
  }

  deleteUnitOfMeasure(id: string): Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/units-of-measure/${id}`);
  }

  getRawMaterialCategories(): Observable<RawMaterialCategoryDto[]> {
    return this.http.get<RawMaterialCategoryDto[]>(`${environment.apiUrl}/raw-material-categories`);
  }

  createRawMaterialCategory(body: RawMaterialCategoryRequest): Observable<RawMaterialCategoryDto> {
    return this.http.post<RawMaterialCategoryDto>(`${environment.apiUrl}/raw-material-categories`, body);
  }

  updateRawMaterialCategory(id: string, body: RawMaterialCategoryRequest): Observable<RawMaterialCategoryDto> {
    return this.http.put<RawMaterialCategoryDto>(`${environment.apiUrl}/raw-material-categories/${id}`, body);
  }

  deleteRawMaterialCategory(id: string): Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/raw-material-categories/${id}`);
  }

  getRawMaterials(categoryId?: string | null, activeOnly = false): Observable<RawMaterialDto[]> {
    let params = new HttpParams().set('activeOnly', String(activeOnly));
    if (categoryId) {
      params = params.set('categoryId', categoryId);
    }
    return this.http.get<RawMaterialDto[]>(`${environment.apiUrl}/raw-materials`, { params });
  }

  getRawMaterial(id: string): Observable<RawMaterialDto> {
    return this.http.get<RawMaterialDto>(`${environment.apiUrl}/raw-materials/${id}`);
  }

  getNextRawMaterialBarcode(): Observable<{ barcode: string }> {
    return this.http.get<{ barcode: string }>(`${environment.apiUrl}/raw-materials/next-barcode`);
  }

  createRawMaterial(body: RawMaterialRequest): Observable<RawMaterialDto> {
    return this.http.post<RawMaterialDto>(`${environment.apiUrl}/raw-materials`, body);
  }

  updateRawMaterial(id: string, body: RawMaterialRequest): Observable<RawMaterialDto> {
    return this.http.put<RawMaterialDto>(`${environment.apiUrl}/raw-materials/${id}`, body);
  }

  replaceRawMaterialPackSizes(id: string, body: ReplacePackSizesRequest): Observable<RawMaterialDto> {
    return this.http.put<RawMaterialDto>(`${environment.apiUrl}/raw-materials/${id}/pack-sizes`, body);
  }

  deleteRawMaterial(id: string): Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/raw-materials/${id}`);
  }

  getSuppliers(): Observable<SupplierDto[]> {
    return this.http.get<SupplierDto[]>(`${environment.apiUrl}/suppliers`);
  }

  createSupplier(body: SupplierRequest): Observable<SupplierDto> {
    return this.http.post<SupplierDto>(`${environment.apiUrl}/suppliers`, body);
  }

  updateSupplier(id: string, body: SupplierRequest): Observable<SupplierDto> {
    return this.http.put<SupplierDto>(`${environment.apiUrl}/suppliers/${id}`, body);
  }

  deleteSupplier(id: string): Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/suppliers/${id}`);
  }

  getPurchases(from?: string | null, to?: string | null, supplierId?: string | null): Observable<PurchaseDto[]> {
    let params = new HttpParams();
    if (from) {
      params = params.set('from', from);
    }
    if (to) {
      params = params.set('to', to);
    }
    if (supplierId) {
      params = params.set('supplierId', supplierId);
    }
    return this.http.get<PurchaseDto[]>(`${environment.apiUrl}/purchases`, { params });
  }

  getPurchase(id: string): Observable<PurchaseDto> {
    return this.http.get<PurchaseDto>(`${environment.apiUrl}/purchases/${id}`);
  }

  createPurchase(body: CreatePurchaseRequest): Observable<PurchaseDto> {
    return this.http.post<PurchaseDto>(`${environment.apiUrl}/purchases`, body);
  }

  updatePurchase(id: string, body: UpdatePurchaseRequest): Observable<PurchaseDto> {
    return this.http.put<PurchaseDto>(`${environment.apiUrl}/purchases/${id}`, body);
  }

  deletePurchase(id: string): Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/purchases/${id}`);
  }

  getPurchaseReport(
    from: string,
    to: string,
    supplierId?: string | null,
    rawMaterialId?: string | null
  ): Observable<PurchaseReportRowDto[]> {
    let params = new HttpParams().set('from', from).set('to', to);
    if (supplierId) {
      params = params.set('supplierId', supplierId);
    }
    if (rawMaterialId) {
      params = params.set('rawMaterialId', rawMaterialId);
    }
    return this.http.get<PurchaseReportRowDto[]>(`${environment.apiUrl}/reports/purchases`, { params });
  }

  getStockReport(
    categoryId?: string | null,
    rawMaterialId?: string | null,
    activeOnly = false
  ): Observable<StockReportDto> {
    let params = new HttpParams().set('activeOnly', String(activeOnly));
    if (categoryId) {
      params = params.set('categoryId', categoryId);
    }
    if (rawMaterialId) {
      params = params.set('rawMaterialId', rawMaterialId);
    }
    return this.http.get<StockReportDto>(`${environment.apiUrl}/reports/stock`, { params });
  }

  downloadPurchaseReportExport(
    format: 'xlsx' | 'pdf',
    from: string,
    to: string,
    supplierId?: string | null,
    rawMaterialId?: string | null
  ): void {
    let params = new HttpParams().set('from', from).set('to', to).set('format', format);
    if (supplierId) {
      params = params.set('supplierId', supplierId);
    }
    if (rawMaterialId) {
      params = params.set('rawMaterialId', rawMaterialId);
    }
    this.downloadBlob(
      `${environment.apiUrl}/reports/purchases/export`,
      params,
      `purchase-report.${format === 'pdf' ? 'pdf' : 'xlsx'}`
    );
  }

  downloadStockReportExport(
    format: 'xlsx' | 'pdf',
    categoryId?: string | null,
    rawMaterialId?: string | null,
    activeOnly = false
  ): void {
    let params = new HttpParams().set('format', format).set('activeOnly', String(activeOnly));
    if (categoryId) {
      params = params.set('categoryId', categoryId);
    }
    if (rawMaterialId) {
      params = params.set('rawMaterialId', rawMaterialId);
    }
    this.downloadBlob(
      `${environment.apiUrl}/reports/stock/export`,
      params,
      `stock-report.${format === 'pdf' ? 'pdf' : 'xlsx'}`
    );
  }

  private downloadBlob(url: string, params: HttpParams, fallbackFilename: string): void {
    this.http.get(url, { params, responseType: 'blob', observe: 'response' }).subscribe({
      next: response => {
        const blob = response.body;
        if (!blob) {
          return;
        }
        const disposition = response.headers.get('content-disposition');
        const filename = this.parseFilename(disposition) ?? fallbackFilename;
        const objectUrl = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = objectUrl;
        anchor.download = filename;
        anchor.click();
        URL.revokeObjectURL(objectUrl);
      }
    });
  }

  private parseFilename(disposition: string | null): string | null {
    if (!disposition) {
      return null;
    }
    const utfMatch = /filename\*=UTF-8''([^;]+)/i.exec(disposition);
    if (utfMatch?.[1]) {
      return decodeURIComponent(utfMatch[1].trim());
    }
    const match = /filename="?([^";]+)"?/i.exec(disposition);
    return match?.[1]?.trim() ?? null;
  }
}
