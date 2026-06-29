export interface SaleItemResponseDto {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  returnedQuantity: number;
  unitPrice: number;
  total: number;
}

export interface SaleSummaryDto {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  customerEmail: string | null;
  saleDate: string;
  dueDate: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string | null;
  warehouseId: string;
  warehouseName: string;
  hasReturns: boolean;
  pendingReturnCount: number;
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

export interface SaleResponseDto extends SaleSummaryDto {
  notes?: string | null;
  items: SaleItemResponseDto[];
}

export interface SalesListResponseDto {
  sales: SaleSummaryDto[];
  total: number;
  pages: number;
}

export interface SalesStatsDto {
  totalSales: number;
  totalRevenue: number;
  pendingAmount: number;
  overdueAmount: number;
  paidInvoices: number;
  pendingInvoices: number;
  overdueInvoices: number;
}
