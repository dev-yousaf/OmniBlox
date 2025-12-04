import { api } from "@/lib/api";

// Types for Reports API
export interface DateRangeParams {
  startDate: string;
  endDate: string;
}

export interface FinancialSummary {
  summary: {
    totalRevenue: number;
    totalCOGS: number;
    grossProfit: number;
    totalExpenses: number;
    netProfit: number;
    grossMargin: number;
    netMargin: number;
    orderCount: number;
    expenseCount: number;
    taxCollected: number;
  };
  revenueByCategory: Array<{
    categoryId: string;
    categoryName: string;
    revenue: number;
    cogs: number;
    profit: number;
    margin: number;
    itemCount: number;
  }>;
  pnlChartData: Array<{
    date: string;
    value: number;
  }>;
  dateRange: {
    startDate: string;
    endDate: string;
  };
}

export interface InventorySummary {
  summary: {
    totalProducts: number;
    totalStockValue: number;
    totalRetailValue: number;
    potentialProfit: number;
    lowStockCount: number;
    warehouseCount: number;
  };
  stockByWarehouse: Array<{
    warehouseId: string;
    warehouseName: string;
    location: string | null;
    totalQuantity: number;
  }>;
  lowStockItems: Array<{
    productId: string;
    warehouseId: string;
    warehouseName: string;
    currentQuantity: number;
    reorderLevel: number;
  }>;
  recentAdjustments: Array<{
    id: string;
    adjustmentDate: string;
    reason: string | null;
    itemCount: number;
    items: Array<{
      productName: string;
      sku: string;
      quantityChange: number;
    }>;
  }>;
  dateRange: {
    startDate: string;
    endDate: string;
  };
}

export interface SalesSummary {
  summary: {
    totalSales: number;
    orderCount: number;
    averageOrderValue: number;
    totalTax: number;
    newCustomers: number;
  };
  topSellingProducts: Array<{
    productId: string;
    productName: string;
    sku: string;
    quantitySold: number;
    revenue: number;
    orderCount: number;
    avgPrice: number;
  }>;
  salesByStatus: Array<{
    status: string;
    count: number;
    totalAmount: number;
  }>;
  salesByPaymentStatus: Array<{
    paymentStatus: string;
    count: number;
    totalAmount: number;
  }>;
  dateRange: {
    startDate: string;
    endDate: string;
  };
}

export interface StaffPerformance {
  performance: Array<{
    userId: string;
    name: string;
    email: string;
    role: string;
    revenue: number;
    orderCount: number;
    averageOrderValue: number;
  }>;
  summary: {
    totalStaff: number;
    totalRevenue: number;
    totalOrders: number;
  };
  dateRange: {
    startDate: string;
    endDate: string;
  };
  note?: string;
}

export interface TaxSummary {
  summary: {
    totalTaxCollected: number;
    transactionCount: number;
  };
  taxTrend: Array<{
    date: string;
    value: number;
  }>;
  dateRange: {
    startDate: string;
    endDate: string;
  };
  note?: string;
}

// Reports Service
export const reportsService = {
  async getFinancialSummary(
    params: DateRangeParams
  ): Promise<FinancialSummary> {
    return api.post("/reports/financial-summary", params);
  },

  async getInventorySummary(
    params: DateRangeParams
  ): Promise<InventorySummary> {
    return api.post("/reports/inventory-summary", params);
  },

  async getSalesSummary(params: DateRangeParams): Promise<SalesSummary> {
    return api.post("/reports/sales-summary", params);
  },

  async getStaffPerformance(
    params: DateRangeParams
  ): Promise<StaffPerformance> {
    return api.post("/reports/staff-performance", params);
  },

  async getTaxSummary(params: DateRangeParams): Promise<TaxSummary> {
    return api.post("/reports/tax-summary", params);
  },

  async getAllReports(params: DateRangeParams) {
    return Promise.all([
      this.getFinancialSummary(params),
      this.getInventorySummary(params),
      this.getSalesSummary(params),
      this.getStaffPerformance(params),
      this.getTaxSummary(params),
    ]);
  },
};
