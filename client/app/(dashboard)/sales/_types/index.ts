export type SaleStatus = "DRAFT" | "PENDING" | "COMPLETED" | "CANCELLED";
export type SalePaymentStatus = "PAID" | "PENDING" | "PARTIAL";
export type SalePaymentMethod =
  | "CASH"
  | "CREDIT_CARD"
  | "BANK_TRANSFER"
  | "CHECK";

export interface SaleItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  returnedQuantity: number;
  unitPrice: number;
  total: number;
}

export interface SaleSummary {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  customerEmail: string | null;
  saleDate: string;
  dueDate: string;
  status: SaleStatus;
  paymentStatus: SalePaymentStatus;
  paymentMethod: SalePaymentMethod | null;
  warehouseId: string;
  warehouseName: string;
  hasReturns: boolean;
  pendingReturnCount: number;
  processingReturnCount: number;
  completedReturnCount: number;
  returnStatus: 'NONE' | 'PARTIAL' | 'ALL';
  returnedValue: number;
  netTotal: number;
  subtotal: number;
  tax: number;
  discount: number;
  totalAmount: number;
  balanceDue: number;
  isOverdue: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SaleDetail extends SaleSummary {
  notes?: string | null;
  items: SaleItem[];
}

export interface SalesListResponse {
  sales: SaleSummary[];
  total: number;
  pages: number;
}

export interface SalesStats {
  totalSales: number;
  totalRevenue: number;
  pendingAmount: number;
  overdueAmount: number;
  paidInvoices: number;
  pendingInvoices: number;
  overdueInvoices: number;
}

export interface SaleCustomerPayload {
  id?: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
}

export interface SaleItemPayload {
  productId: string;
  quantity: number;
  unitPrice: number;
}

export interface CreateSalePayload {
  invoiceNumber?: string;
  customer: SaleCustomerPayload;
  // Destination warehouse for fulfilling the sale
  warehouseId: string;
  saleDate: string;
  dueDate: string;
  status?: SaleStatus;
  paymentStatus?: SalePaymentStatus;
  paymentMethod?: SalePaymentMethod | null;
  taxRate?: number;
  discount?: number;
  notes?: string;
  // Optional snapshot of the shipping address captured at the time of sale
  shippingAddress?: string;
  items: SaleItemPayload[];
}

export interface UpdateSalePayload extends Partial<CreateSalePayload> {}

export interface SalesFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: SaleStatus | "ALL";
  paymentStatus?: SalePaymentStatus | "ALL";
  warehouseId?: string;
  dateFrom?: string;
  dateTo?: string;
  productId?: string;
}
