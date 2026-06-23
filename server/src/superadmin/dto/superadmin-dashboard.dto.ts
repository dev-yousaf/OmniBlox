export interface SuperadminDashboardDto {
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
  companiesChart: BarChartItem[];
  companiesChartChange: number;
  companiesChartChangeText: string;
  revenueAmount: number;
  revenueChange: number;
  revenueChangeText: string;
  revenueChart: MonthlyRevenueItem[];
  plansDistribution: PlanDistributionItem[];
  recentTransactions: TransactionDto[];
  topCompanies: TopCompanyDto[];
  expiringSubscriptions: ExpiringSubscriptionDto[];
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
  name: string;
  count: number;
  color: string;
}

export interface TransactionDto {
  id: string;
  companyName: string;
  companyLogo?: string;
  transactionId: string;
  date: string;
  amount: number;
  plan: string;
}

export interface TopCompanyDto {
  id: string;
  name: string;
  logo?: string;
  plan: string;
  usersCount: number;
}

export interface ExpiringSubscriptionDto {
  id: string;
  companyName: string;
  companyLogo?: string;
  expirationDate: string;
  plan: string;
}
