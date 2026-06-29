export interface SuperadminData {
  totalCompanies: number;
  companiesChange: number;
  activeCompanies: number;
  activeCompaniesChange: number;
  totalSubscribers: number;
  subscribersChange: number;
  totalEarnings: number;
  earningsChange: number;
  newCompaniesToday: number;
  adminName: string;
  storeName: string;
  companiesChart: BarChartItem[];
  companiesChartChange: number;
  companiesChartChangeText: string;
  revenueAmount: number;
  revenueChange: number;
  revenueChangeText: string;
  revenueChart: MonthlyRevenueItem[];
  plansDistribution: PlanDistributionItem[];
  recentTransactions: TransactionItem[];
  topCompanies: TopCompanyItem[];
  expiringSubscriptions: ExpiringSubscriptionItem[];
  inventoryValue: number;
  inventoryChange: number;
}

export interface BarChartItem {
  day: string;
  count: number;
}

export interface MonthlyRevenueItem {
  month: string;
  revenue: number;
}

export interface PlanDistributionItem {
  [key: string]: unknown;
  name: string;
  count: number;
  color: string;
}

export interface TransactionItem {
  id: string;
  companyName: string;
  companyLogo?: string;
  createdAt: string;
  usersCount: number;
}

export interface TopCompanyItem {
  id: string;
  name: string;
  logo?: string;
  plan: string;
  usersCount: number;
}

export interface ExpiringSubscriptionItem {
  id: string;
  companyName: string;
  companyLogo?: string;
  totalSales: number;
  lastSaleDate: string | null;
}

export const formatCompactCurrency = (value: number) => {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
};
