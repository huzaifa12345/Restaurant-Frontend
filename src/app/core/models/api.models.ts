export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresOn: string;
  userId: string;
  restaurantId: string;
  restaurantName: string;
  restaurantCode: string;
  username: string;
  roleName: string;
  permissions: string[];
}

export interface LoginRequest {
  restaurantName: string;
  username: string;
  password: string;
}

export interface RestaurantLookupDto {
  name: string;
}

export interface ChangePasswordRequest {
  oldPassword: string;
  newPassword: string;
}

export interface ChangePasswordPublicRequest {
  restaurantName: string;
  username: string;
  oldPassword: string;
  newPassword: string;
}

export interface RestaurantDto {
  id: string;
  name: string;
  restaurantCode: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  currency: string;
  timezone: string;
  logo?: string | null;
  subscriptionExpiryDate?: string | null;
  isActive: boolean;
}

export interface UserDto {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  phone?: string | null;
  roleId: string;
  roleName: string;
  restaurantId: string;
  restaurantName: string;
  isActive: boolean;
  isPrimaryAdmin?: boolean;
  createdAt: string;
}

export interface UserQuery {
  page?: number;
  pageSize?: number;
  username?: string | null;
  restaurantId?: string | null;
}

export interface RoleDto {
  id: string;
  name: string;
  description?: string | null;
  isSystem: boolean;
  permissions: string[];
}

export interface PermissionDto {
  id: string;
  code: string;
  name: string;
}

export interface CreateRoleRequest {
  name: string;
  description?: string | null;
  permissionIds: string[];
}

export interface UpdateRoleRequest {
  name: string;
  description?: string | null;
}

export interface CreateUserRequest {
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  phone?: string | null;
  password: string;
  roleId: string;
}

export interface UpdateUserRequest {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  roleId: string;
  isActive: boolean;
  password?: string | null;
}

export interface UpdateRestaurantRequest {
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  currency: string;
  timezone: string;
  logo?: string | null;
  isActive: boolean;
}

export interface CreateRestaurantRequest {
  name: string;
  restaurantCode: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  currency: string;
  timezone: string;
  adminFirstName: string;
  adminLastName: string;
  adminUsername: string;
  adminEmail: string;
  adminPassword: string;
}

export interface CategoryDto {
  id: string;
  name: string;
  displayOrder: number;
  image?: string | null;
  isActive: boolean;
}

export interface MenuItemDto {
  id: string;
  categoryId: string;
  categoryName: string;
  name: string;
  sku?: string | null;
  barcode?: string | null;
  description?: string | null;
  price: number;
  costPrice?: number | null;
  image?: string | null;
  sortOrder: number;
  isActive: boolean;
}

export interface CategoryRequest {
  name: string;
  displayOrder: number;
  image?: string | null;
  isActive: boolean;
}

export interface MenuItemRequest {
  categoryId: string;
  name: string;
  sku?: string | null;
  barcode?: string | null;
  description?: string | null;
  price: number;
  costPrice?: number | null;
  image?: string | null;
  sortOrder: number;
  isActive: boolean;
}

export interface UploadImageResponse {
  /** Durable storage key to save on category/menu (Cloudinary public_id or /uploads/...). */
  path: string;
  /** Browser-ready URL (signed Cloudinary or local path). */
  url: string;
}

export enum OrderType {
  DineIn = 1,
  Takeaway = 2,
  Delivery = 3
}

export enum PaymentType {
  Cash = 1,
  Card = 2,
  Online = 3
}

export enum PaymentStatus {
  Pending = 1,
  Paid = 2,
  Refunded = 3
}

export enum OrderStatus {
  Pending = 1,
  Completed = 2,
  Cancelled = 3
}

export interface OrderItemDto {
  id: string;
  menuItemId: string;
  menuItemName: string;
  menuItemImage?: string | null;
  quantity: number;
  unitPrice: number;
  discount: number;
  total: number;
}

export interface OrderDto {
  id: string;
  orderNo: string;
  subtotal: number;
  discount: number;
  tax: number;
  deliveryCharges: number;
  grandTotal: number;
  paymentType: PaymentType;
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  orderType: OrderType;
  remarks?: string | null;
  createdAt: string;
  items: OrderItemDto[];
}

export interface OrderSummaryLineDto {
  name: string;
  quantity: number;
}

export interface OrderSummaryDto {
  id: string;
  orderNo: string;
  grandTotal: number;
  orderType: OrderType;
  paymentType: PaymentType;
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  createdAt: string;
  itemCount: number;
  items?: OrderSummaryLineDto[];
}

export interface CreateOrderLineRequest {
  menuItemId: string;
  quantity: number;
  discount: number;
}

export interface CreateOrderRequest {
  orderType: OrderType;
  paymentType: PaymentType;
  paymentStatus: PaymentStatus;
  discount: number;
  tax: number;
  deliveryCharges: number;
  remarks?: string | null;
  items: CreateOrderLineRequest[];
}

export interface InvoiceRestaurantDto {
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  currency: string;
}

export interface InvoiceLineDto {
  name: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  total: number;
}

export interface InvoiceDto {
  restaurant: InvoiceRestaurantDto;
  orderId: string;
  orderNo: string;
  createdAt: string;
  orderType: OrderType;
  paymentType: PaymentType;
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  subtotal: number;
  discount: number;
  tax: number;
  deliveryCharges: number;
  grandTotal: number;
  remarks?: string | null;
  currency: string;
  items: InvoiceLineDto[];
}

export interface SalesSummaryDto {
  from: string;
  to: string;
  orderCount: number;
  cancelledCount: number;
  deliveryCount: number;
  grossSales: number;
  discountTotal: number;
  taxTotal: number;
  deliveryChargesTotal: number;
  netSales: number;
  averageTicket: number;
}

export interface ReportOrderDto {
  id: string;
  orderNo: string;
  createdAt: string;
  orderType: string;
  paymentType: string;
  paymentStatus: string;
  orderStatus: string;
  subtotal: number;
  discount: number;
  tax: number;
  deliveryCharges: number;
  grandTotal: number;
  itemCount: number;
}

export interface PagedResultDto<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export interface TopSellingItemDto {
  menuItemId: string;
  name: string;
  quantitySold: number;
  salesAmount: number;
}

export interface DashboardDto {
  todaySales: number;
  todayOrders: number;
  monthlySales: number;
  cancelledOrdersToday: number;
  topItems: TopSellingItemDto[];
  recentOrders: OrderSummaryDto[];
}
