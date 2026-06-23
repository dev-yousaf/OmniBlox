export interface DashboardDataDto {
  totalSales: number;
  salesChange: number;
  totalSalesReturn: number;
  salesReturnChange: number;
  totalPurchase: number;
  purchaseChange: number;
  totalPurchaseReturn: number;
  purchaseReturnChange: number;
  profit: number;
  profitLabel: string;
  profitChange: number;
  invoiceDue: number;
  invoiceDueLabel: string;
  invoiceDueChange: number;
  totalExpenses: number;
  expensesLabel: string;
  expensesChange: number;
  totalPaymentReturns: number;
  paymentReturnsLabel: string;
  paymentReturnsChange: number;
  salesPurchaseChart: SalesPurchaseChartItem[];
  totalPurchaseAmount: number;
  totalSalesAmount: number;
  suppliersCount: number;
  customersCount: number;
  ordersCount: number;
  firstTimeCustomers: number;
  firstTimeCustomersPercent: number;
  returnCustomers: number;
  returnCustomersPercent: number;
  topSellingProducts: TopSellingProductDto[];
  lowStockProducts: LowStockProductDto[];
}

export interface SalesPurchaseChartItem {
  month: string;
  purchase: number;
  sales: number;
}

export interface TopSellingProductDto {
  productId: string;
  name: string;
  imageUrl: string;
  salePrice: number;
  salesCount: number;
  totalRevenue: number;
}

export interface LowStockProductDto {
  productId: string;
  name: string;
  sku: string;
  imageUrl: string;
  stockQuantity: number;
  alertQuantity: number;
}
