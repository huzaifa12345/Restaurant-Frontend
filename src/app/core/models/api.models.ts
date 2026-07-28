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
  businessDayStartTime: string;
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
  businessDayStartTime: string;
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
  /** Completed orders only. */
  orderCount: number;
  cancelledCount: number;
  deliveryCount: number;
  dineInCount: number;
  takeawayCount: number;
  cashCount: number;
  onlineCount: number;
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

export interface UnitOfMeasureDto {
  id: string;
  name: string;
  canEdit?: boolean;
  canDelete?: boolean;
}

export interface UnitOfMeasureRequest {
  name: string;
}

export interface RawMaterialCategoryDto {
  id: string;
  name: string;
  canEdit?: boolean;
  canDelete?: boolean;
}

export interface RawMaterialCategoryRequest {
  name: string;
}

export interface RawMaterialPackSizeDto {
  id?: string;
  uomId: string;
  uomName?: string;
  factor: number;
}

export interface RawMaterialDto {
  id: string;
  name: string;
  barcode: string;
  categoryId: string;
  categoryName: string;
  baseUomId: string;
  baseUomName: string;
  isActive: boolean;
  packSizeCount?: number;
  packSizes?: RawMaterialPackSizeDto[] | null;
  canEdit?: boolean;
  canDelete?: boolean;
}

export interface RawMaterialRequest {
  name: string;
  categoryId: string;
  baseUomId: string;
  isActive: boolean;
}

export interface ReplacePackSizeItemDto {
  uomId: string;
  factor: number;
}

export interface ReplacePackSizesRequest {
  items: ReplacePackSizeItemDto[];
}

export interface SupplierDto {
  id: string;
  name: string;
  phone?: string | null;
  country?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  isDefault: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
}

export interface SupplierRequest {
  name: string;
  phone?: string | null;
  country?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
}

export enum PurchasePaymentType {
  Cash = 1,
  Credit = 2
}

export interface PurchaseItemDto {
  id: string;
  rawMaterialId: string;
  rawMaterialName: string;
  uomId: string;
  uomName: string;
  quantity: number;
  unitPrice: number;
  factorSnapshot: number;
  baseQuantity: number;
  lineTotal: number;
}

export interface PurchaseDto {
  id: string;
  invoiceNo: string;
  purchaseDate: string;
  supplierId: string;
  supplierName: string;
  paymentType: PurchasePaymentType;
  remarks?: string | null;
  grandTotal: number;
  items?: PurchaseItemDto[];
}

export interface PurchaseLineInputDto {
  rawMaterialId: string;
  uomId: string;
  quantity: number;
  unitPrice: number;
}

export interface CreatePurchaseRequest {
  purchaseDate: string;
  supplierId: string;
  paymentType: PurchasePaymentType;
  remarks?: string | null;
  items: PurchaseLineInputDto[];
}

export interface UpdatePurchaseRequest {
  purchaseDate: string;
  supplierId: string;
  paymentType: PurchasePaymentType;
  remarks?: string | null;
  items: PurchaseLineInputDto[];
}

export interface PurchaseReportRowDto {
  id: string;
  invoiceNo: string;
  purchaseDate: string;
  supplierName: string;
  paymentType: string;
  grandTotal: number;
  lineCount: number;
}

export interface StockReportRowDto {
  rawMaterialId: string;
  rawMaterialName: string;
  barcode: string;
  categoryName: string;
  baseUomName: string;
  quantityBase: number;
  packSizesDisplay?: string | null;
  isActive: boolean;
}

export interface StockReportDto {
  hasPackSizes: boolean;
  items: StockReportRowDto[];
}

export enum AttendanceStatus {
  Present = 1,
  Absent = 2,
  HalfDay = 3
}

export enum EmployeePaymentType {
  Daily = 1,
  Salary = 2
}

export interface EmployeeDto {
  id: string;
  name: string;
  phone?: string | null;
  designation?: string | null;
  dailyWage?: number | null;
  monthlySalary?: number | null;
  isActive: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
}

export interface EmployeeRequest {
  name: string;
  phone?: string | null;
  designation?: string | null;
  dailyWage?: number | null;
  monthlySalary?: number | null;
  isActive: boolean;
}

export interface AttendanceEntryDto {
  employeeId: string;
  employeeName: string;
  dailyWage?: number | null;
  attendanceId?: string | null;
  status?: AttendanceStatus | null;
}

export interface AttendanceDayDto {
  workDate: string;
  entries: AttendanceEntryDto[];
}

export interface AttendanceMarkItem {
  employeeId: string;
  status: AttendanceStatus;
}

export interface UpsertAttendanceDayRequest {
  workDate: string;
  entries: AttendanceMarkItem[];
}

export interface EmployeePaymentDto {
  id: string;
  employeeId: string;
  employeeName: string;
  paidAt: string;
  amount: number;
  paymentType: EmployeePaymentType;
  note?: string | null;
  canEdit?: boolean;
  canDelete?: boolean;
}

export interface EmployeePaymentRequest {
  employeeId: string;
  paidAt: string;
  amount: number;
  paymentType: EmployeePaymentType;
  note?: string | null;
}

export interface ExpenseCategoryDto {
  id: string;
  name: string;
  isActive: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
}

export interface ExpenseCategoryRequest {
  name: string;
  isActive: boolean;
}

export interface ExpenseDto {
  id: string;
  categoryId: string;
  categoryName: string;
  occurredAt: string;
  amount: number;
  note?: string | null;
  canEdit?: boolean;
  canDelete?: boolean;
}

export interface ExpenseRequest {
  categoryId: string;
  occurredAt: string;
  amount: number;
  note?: string | null;
}

export interface ExpenseReportRowDto {
  id: string;
  occurredAt: string;
  categoryName: string;
  amount: number;
  note?: string | null;
}

export interface ExpenseReportDto {
  from: string;
  to: string;
  useBusinessDay: boolean;
  totalAmount: number;
  items: ExpenseReportRowDto[];
}

export interface WageReportEmployeeDto {
  employeeId: string;
  employeeName: string;
  dailyWage?: number | null;
  monthlySalary?: number | null;
  presentCount: number;
  halfDayCount: number;
  absentCount: number;
  earned: number;
  paidDaily: number;
  paidSalary: number;
  paidTotal: number;
  balance: number;
}

export interface WageReportDto {
  from: string;
  to: string;
  useBusinessDay: boolean;
  totalEarned: number;
  totalPaidDaily: number;
  totalPaidSalary: number;
  totalPaid: number;
  totalBalance: number;
  employees: WageReportEmployeeDto[];
}

