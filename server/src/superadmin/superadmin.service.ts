import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { SuperadminDashboardDto, BarChartItem, MonthlyRevenueItem } from './dto/superadmin-dashboard.dto';

@Injectable()
export class SuperadminService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard(companyId: string, period = '1Y'): Promise<SuperadminDashboardDto> {
    const now = new Date();
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const periodMs = (() => {
      const map: Record<string, number> = { '1D': 1, '1W': 7, '1M': 30, '3M': 90, '6M': 180, '1Y': 365 };
      return (map[period] ?? 365) * 24 * 60 * 60 * 1000;
    })();
    const periodAgo = new Date(now.getTime() - periodMs);
    const dayNames = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

    // ── Store info ────────────────────────────────────────────────────
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { id: true, name: true },
    });
    const storeName = company?.name ?? 'Store';

    // ── Total users (team size) ───────────────────────────────────────
    const totalUsers = await this.prisma.user.count({ where: { companyId } });
    const usersLastMonth = await this.prisma.user.count({
      where: { companyId, createdAt: { lt: oneMonthAgo } },
    });
    const usersChange = usersLastMonth > 0
      ? Math.round(((totalUsers - usersLastMonth) / usersLastMonth) * 10000) / 100
      : totalUsers > 0 ? 100 : 0;

    // ── Total products ────────────────────────────────────────────────
    const totalProducts = await this.prisma.product.count({ where: { companyId } });
    const productsLastMonth = await this.prisma.product.count({
      where: { companyId, createdAt: { lt: oneMonthAgo } },
    });
    const productsChange = productsLastMonth > 0
      ? Math.round(((totalProducts - productsLastMonth) / productsLastMonth) * 10000) / 100
      : totalProducts > 0 ? 100 : 0;

    // ── Total customers ───────────────────────────────────────────────
    const totalCustomers = await this.prisma.customer.count({ where: { companyId } });

    // ── Total sales ───────────────────────────────────────────────────
    const salesAgg = await this.prisma.sale.aggregate({
      _sum: { totalAmount: true },
      where: { companyId },
    });
    const totalSales = Number(salesAgg._sum.totalAmount ?? 0);
    const lastMonthSalesAgg = await this.prisma.sale.aggregate({
      _sum: { totalAmount: true },
      where: { companyId, createdAt: { lt: oneMonthAgo } },
    });
    const lastMonthSales = Number(lastMonthSalesAgg._sum.totalAmount ?? 0);
    const salesChange = lastMonthSales > 0
      ? Math.round(((totalSales - lastMonthSales) / lastMonthSales) * 10000) / 100
      : totalSales > 0 ? 100 : 0;

    // ── Inventory value (costPrice × quantity in stock) ───────────────
    const inventoryItems = await this.prisma.inventory.findMany({
      where: { product: { companyId } },
      select: { quantity: true, product: { select: { costPrice: true } } },
    });
    const inventoryValue = inventoryItems.reduce(
      (sum, i) => sum + i.quantity * Number(i.product.costPrice),
      0,
    );
    const lastMonthInvItems = await this.prisma.inventory.findMany({
      where: { product: { companyId, createdAt: { lt: oneMonthAgo } } },
      select: { quantity: true, product: { select: { costPrice: true } } },
    });
    const lastMonthValue = lastMonthInvItems.reduce(
      (sum, i) => sum + i.quantity * Number(i.product.costPrice),
      0,
    );
    const inventoryChange = lastMonthValue > 0
      ? Math.round(((inventoryValue - lastMonthValue) / lastMonthValue) * 10000) / 100
      : inventoryValue > 0 ? 100 : 0;

    // ── Activity chart (audit log, period-aware) ─────────────────────
    const companiesChart: BarChartItem[] = [];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    if (period === '1W') {
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
        const dEnd = new Date(d.getTime() + 86400000);
        const count = await this.prisma.auditLog.count({
          where: { companyId, createdAt: { gte: d, lt: dEnd } },
        });
        companiesChart.push({ day: dayNames[d.getDay()], count });
      }
    } else if (period === '1M') {
      for (let i = 3; i >= 0; i--) {
        const weekStart = new Date(now.getTime() - (i * 7 + 6) * 86400000);
        const weekEnd = new Date(weekStart.getTime() + 7 * 86400000);
        const count = await this.prisma.auditLog.count({
          where: { companyId, createdAt: { gte: weekStart, lt: weekEnd } },
        });
        companiesChart.push({ day: `W${4 - i}`, count });
      }
    } else {
      // 3M, 6M, 1Y — monthly buckets
      const months = period === '3M' ? 3 : period === '6M' ? 6 : 12;
      for (let i = months - 1; i >= 0; i--) {
        const m = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const mEnd = new Date(m.getFullYear(), m.getMonth() + 1, 1);
        const count = await this.prisma.auditLog.count({
          where: { companyId, createdAt: { gte: m, lt: mEnd } },
        });
        companiesChart.push({ day: monthNames[m.getMonth()], count });
      }
    }

    // ── Expenses by category ──────────────────────────────────────────
    const expenseCategories = await this.prisma.expenseCategory.findMany({
      where: { companyId },
      select: { id: true, name: true },
    });
    const expenseByCategory: MonthlyRevenueItem[] = [];
    for (const cat of expenseCategories) {
      const agg = await this.prisma.expense.aggregate({
        _sum: { amount: true },
        where: { companyId, categoryId: cat.id, createdAt: { gte: periodAgo } },
      });
      expenseByCategory.push({ month: cat.name, revenue: Number(agg._sum.amount ?? 0) });
    }
    if (expenseByCategory.length === 0) {
      expenseByCategory.push({ month: 'No data', revenue: 0 });
    }
    const totalExpenses = expenseByCategory.reduce((s, e) => s + e.revenue, 0);
    const prevPeriodStart = new Date(periodAgo.getTime() - periodMs);
    const prevExpensesAgg = await this.prisma.expense.aggregate({
      _sum: { amount: true },
      where: { companyId, createdAt: { gte: prevPeriodStart, lt: periodAgo } },
    });
    const prevExpenses = Number(prevExpensesAgg._sum.amount ?? 0);
    const expenseChange = prevExpenses > 0
      ? Math.round(((totalExpenses - prevExpenses) / prevExpenses) * 10000) / 100
      : totalExpenses > 0 ? 100 : 0;

    // ── Users by role ─────────────────────────────────────────────────
    const ownerCount = await this.prisma.user.count({ where: { companyId, role: 'OWNER' } });
    const adminCount = await this.prisma.user.count({ where: { companyId, role: 'ADMIN' } });
    const managerCount = await this.prisma.user.count({ where: { companyId, role: 'MANAGER' } });
    const observerCount = await this.prisma.user.count({ where: { companyId, role: 'OBSERVER' } });
    const plansDistribution = [
      { name: 'Owners', count: ownerCount, color: '#fe9f43' },
      { name: 'Admins', count: adminCount, color: '#6938ef' },
      { name: 'Managers', count: managerCount, color: '#06aed4' },
      { name: 'Observers', count: observerCount, color: '#3eb780' },
    ];

    // ── Recent activity feed (audit log entries) ──────────────────────
    const recentLogs = await this.prisma.auditLog.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, userName: true, action: true, entity: true, details: true, createdAt: true },
    });
    const recentTransactions = recentLogs.map((log) => ({
      id: log.id,
      companyName: `${log.userName} ${log.action.toLowerCase()}d ${log.entity}`,
      companyLogo: undefined,
      createdAt: log.createdAt.toISOString(),
      usersCount: 0,
    }));

    // ── Warehouse stock overview ──────────────────────────────────────
    const warehouses = await this.prisma.warehouse.findMany({
      where: { companyId },
      select: {
        id: true,
        name: true,
        inventory: { select: { quantity: true } },
      },
    });
    const topCompanies = warehouses.map((w) => ({
      id: w.id,
      name: w.name,
      logo: undefined,
      plan: 'Standard',
      usersCount: w.inventory.reduce((s, i) => s + i.quantity, 0),
    }));
    if (topCompanies.length === 0) {
      topCompanies.push({ id: 'none', name: 'No warehouses', logo: undefined, plan: '', usersCount: 0 });
    }

    // ── Low stock products ────────────────────────────────────────────
    const lowStockProducts = await this.prisma.product.findMany({
      where: {
        companyId,
        status: 'ACTIVE',
        inventory: { some: { quantity: { lte: 0 } } },
      },
      select: { id: true, name: true, inventory: { select: { quantity: true } } },
      take: 5,
    });
    const expiringSubscriptions = lowStockProducts.map((p) => {
      const qty = p.inventory.reduce((sum, i) => sum + i.quantity, 0);
      return { id: p.id, companyName: p.name, companyLogo: undefined, totalSales: qty, lastSaleDate: null };
    });

    return {
      totalCompanies: totalCustomers,
      companiesChange: 0,
      activeCompanies: totalUsers,
      activeCompaniesChange: usersChange,
      totalSubscribers: totalProducts,
      subscribersChange: productsChange,
      totalEarnings: totalSales,
      earningsChange: salesChange,
      newCompaniesToday: totalCustomers,
      adminName: 'Super Admin',
      storeName,
      companiesChart,
      companiesChartChange: 0,
      companiesChartChangeText: 'Actions (last 7 days)',
      revenueAmount: totalExpenses,
      revenueChange: expenseChange,
      revenueChangeText: `${expenseChange > 0 ? '+' : ''}${expenseChange.toFixed(1)}% from last month`,
      revenueChart: expenseByCategory,
      plansDistribution,
      recentTransactions,
      topCompanies,
      expiringSubscriptions,
      inventoryValue,
      inventoryChange,
    };
  }
}