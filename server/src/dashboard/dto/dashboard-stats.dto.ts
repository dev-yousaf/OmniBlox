export interface DashboardStatsDto {
  products?: any;
  sales?: any;
  purchases?: any;
  customers?: any;
}

export interface ProductDashboardStatsDto {
  totalProducts: number;
  lowStockCount: number;
  stockOverviewByCategory: Array<{
    categoryId?: string;
    categoryName?: string;
    totalQuantity: number;
  }>;
  bestSellers: Array<{ productId: string; name?: string; revenue: number }>;
}

export interface SalesDashboardStatsDto {
  invoicesThisMonth: number;
  totalRevenue: number;
  topCustomers: Array<{ customerId?: string; name?: string; total: number }>;
}

export interface PurchasesDashboardStatsDto {
  topSuppliers: Array<{ supplierId?: string; name?: string; total: number }>;
}

export interface CustomersDashboardStatsDto {
  totalCustomers: number;
  newCustomersThisMonth: number;
}
