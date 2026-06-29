export interface TopSellingProduct {
  productId: string;
  name: string;
  imageUrl: string;
  salePrice: number;
  salesCount: number;
  totalRevenue: number;
}

export interface RecentSale {
  id: string;
  customerName: string;
  productName: string;
  categoryName: string;
  totalAmount: number;
  status: string;
  saleDate: string;
}

export interface LowStockProduct {
  productId: string;
  name: string;
  sku: string;
  imageUrl: string;
  stockQuantity: number;
  alertQuantity: number;
}

export interface SalesPurchaseChartItem {
  month: string;
  purchase: number;
  sales: number;
}

export interface DashboardData {
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
  totalSalesAmount: number;
  totalPurchaseAmount: number;
  suppliersCount: number;
  customersCount: number;
  ordersCount: number;
  firstTimeCustomers: number;
  firstTimeCustomersPercent: number;
  returnCustomers: number;
  returnCustomersPercent: number;
  topSellingProducts: TopSellingProduct[];
  lowStockProducts: LowStockProduct[];
  recentSales: RecentSale[];
}

export interface UserProfile {
  _id: string;
  name: string;
  email: string;
  company?: { name: string };
}

export const formatCurrency = (value: number) =>
  `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const formatCompactCurrency = (value: number) => {
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
};

export interface FinancialCardData {
  title: string;
  amount: number;
  change: number;
  label: string;
  iconBg: string;
}
