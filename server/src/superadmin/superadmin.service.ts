import { Injectable } from '@nestjs/common';
import { CacheService } from '../cache/cache.service';
import { PrismaService } from '../prisma/prisma.service';
import type {
  SuperadminDashboardDto,
  BarChartItem,
  MonthlyRevenueItem,
} from './dto/superadmin-dashboard.dto';

@Injectable()
export class SuperadminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  private readonly DASH_KEY = (cid: string, period?: string) =>
    `superadmin:${cid}:dash:${period ?? '1Y'}`;

  async getDashboard(
    companyId: string,
    period = '1Y',
  ): Promise<SuperadminDashboardDto> {
    const cached = await this.cache.get<SuperadminDashboardDto>(
      this.DASH_KEY(companyId, period),
    );
    if (cached) return cached;

    const now = new Date();
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const periodMs = (() => {
      const map: Record<string, number> = {
        '1D': 1,
        '1W': 7,
        '1M': 30,
        '3M': 90,
        '6M': 180,
        '1Y': 365,
      };
      return (map[period] ?? 365) * 24 * 60 * 60 * 1000;
    })();
    const periodAgo = new Date(now.getTime() - periodMs);
    const prevPeriodStart = new Date(periodAgo.getTime() - periodMs);

    // ── All independent queries in parallel ─────────────────────────────
    const [
      company,
      userCounts,
      productCounts,
      customerCount,
      salesAggs,
      inventoryAgg,
      oldInventoryAgg,
      chartData,
      expenseByCategory,
      roleCounts,
      recentLogs,
      warehouses,
      lowStockProducts,
      prevExpensesAgg,
    ] = await Promise.all([
      // Store info
      this.prisma.company.findUnique({
        where: { id: companyId },
        select: { id: true, name: true },
      }),

      // Users: total + last month
      Promise.all([
        this.prisma.user.count({ where: { companyId } }),
        this.prisma.user.count({
          where: { companyId, createdAt: { lt: oneMonthAgo } },
        }),
      ]),

      // Products: total + last month
      Promise.all([
        this.prisma.product.count({ where: { companyId } }),
        this.prisma.product.count({
          where: { companyId, createdAt: { lt: oneMonthAgo } },
        }),
      ]),

      // Customers
      this.prisma.customer.count({ where: { companyId } }),

      // Sales: current + last month in one query via raw SQL
      this.prisma.$queryRawUnsafe(
        `SELECT
          COALESCE(SUM("totalAmount") FILTER (WHERE "createdAt" >= $2), 0) as "currentSales",
          COALESCE(SUM("totalAmount") FILTER (WHERE "createdAt" < $2), 0) as "previousSales"
         FROM sales WHERE "companyId" = $1`,
        companyId,
        oneMonthAgo,
      ) as Promise<Array<{ currentSales: string; previousSales: string }>>,

      // Inventory value (current period)
      this.prisma.$queryRawUnsafe(
        `SELECT COALESCE(SUM(i.quantity * p."costPrice"), 0) as value
         FROM inventory i JOIN products p ON p.id = i."productId"
         WHERE p."companyId" = $1`,
        companyId,
      ) as Promise<Array<{ value: string }>>,

      // Inventory value (before last month)
      this.prisma.$queryRawUnsafe(
        `SELECT COALESCE(SUM(i.quantity * p."costPrice"), 0) as value
         FROM inventory i
         JOIN products p ON p.id = i."productId"
         WHERE p."companyId" = $1 AND p."createdAt" < $2`,
        companyId,
        oneMonthAgo,
      ) as Promise<Array<{ value: string }>>,

      // Activity chart — single raw SQL
      this.getActivityChart(companyId, period, now),

      // Expenses by category — single groupBy instead of N+1
      this.getExpensesByCategory(companyId, periodAgo),

      // Users by role — single groupBy instead of 4 count queries
      this.prisma.user.groupBy({
        by: ['role'],
        where: { companyId },
        _count: { id: true },
      }),

      // Recent activity
      this.prisma.auditLog.findMany({
        where: { companyId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          userName: true,
          action: true,
          entity: true,
          details: true,
          createdAt: true,
        },
      }),

      // Warehouse stock
      this.prisma.warehouse.findMany({
        where: { companyId },
        select: {
          id: true,
          name: true,
          inventory: { select: { quantity: true } },
        },
      }),

      // Low stock products
      this.prisma.product.findMany({
        where: {
          companyId,
          status: 'ACTIVE',
          inventory: { some: { quantity: { lte: 0 } } },
        },
        select: {
          id: true,
          name: true,
          inventory: { select: { quantity: true } },
        },
        take: 5,
      }),

      // Previous period expenses (for change %)
      this.prisma.expense.aggregate({
        _sum: { amount: true },
        where: {
          companyId,
          createdAt: { gte: prevPeriodStart, lt: periodAgo },
        },
      }),
    ]);

    // ── Compute derived values ──────────────────────────────────────────
    const storeName = company?.name ?? 'Store';

    const [totalUsers, usersLastMonth] = userCounts;
    const usersChange =
      usersLastMonth > 0
        ? Math.round(((totalUsers - usersLastMonth) / usersLastMonth) * 10000) /
          100
        : totalUsers > 0
          ? 100
          : 0;

    const [totalProducts, productsLastMonth] = productCounts;
    const productsChange =
      productsLastMonth > 0
        ? Math.round(
            ((totalProducts - productsLastMonth) / productsLastMonth) * 10000,
          ) / 100
        : totalProducts > 0
          ? 100
          : 0;

    const salesRow = salesAggs[0];
    const totalSales = Number(salesRow.currentSales);
    const lastMonthSales = Number(salesRow.previousSales);
    const salesChange =
      lastMonthSales > 0
        ? Math.round(((totalSales - lastMonthSales) / lastMonthSales) * 10000) /
          100
        : totalSales > 0
          ? 100
          : 0;

    const inventoryValue = Number(inventoryAgg[0]?.value ?? 0);
    const lastMonthValue = Number(oldInventoryAgg[0]?.value ?? 0);
    const inventoryChange =
      lastMonthValue > 0
        ? Math.round(
            ((inventoryValue - lastMonthValue) / lastMonthValue) * 10000,
          ) / 100
        : inventoryValue > 0
          ? 100
          : 0;

    const companiesChart = chartData;

    const totalExpenses = expenseByCategory.reduce((s, e) => s + e.revenue, 0);
    const prevExpenses = Number(prevExpensesAgg._sum.amount ?? 0);
    const expenseChange =
      prevExpenses > 0
        ? Math.round(((totalExpenses - prevExpenses) / prevExpenses) * 10000) /
          100
        : totalExpenses > 0
          ? 100
          : 0;

    const roleMap = new Map<string, number>(
      roleCounts.map((r) => [r.role, Number(r._count.id)]),
    );
    const plansDistribution = [
      { name: 'Owners', count: roleMap.get('OWNER') ?? 0, color: '#fe9f43' },
      { name: 'Admins', count: roleMap.get('ADMIN') ?? 0, color: '#6938ef' },
      {
        name: 'Managers',
        count: roleMap.get('MANAGER') ?? 0,
        color: '#06aed4',
      },
      {
        name: 'Observers',
        count: roleMap.get('OBSERVER') ?? 0,
        color: '#3eb780',
      },
    ];

    const recentTransactions = recentLogs.map((log) => ({
      id: log.id,
      companyName: `${log.userName} ${log.action.toLowerCase()}d ${log.entity}`,
      companyLogo: undefined,
      createdAt: log.createdAt.toISOString(),
      usersCount: 0,
    }));

    const topCompanies =
      warehouses.length > 0
        ? warehouses.map((w) => ({
            id: w.id,
            name: w.name,
            logo: undefined,
            plan: 'Standard',
            usersCount: w.inventory.reduce((s, i) => s + i.quantity, 0),
          }))
        : [
            {
              id: 'none',
              name: 'No warehouses',
              logo: undefined,
              plan: '',
              usersCount: 0,
            },
          ];

    const expiringSubscriptions = lowStockProducts.map((p) => ({
      id: p.id,
      companyName: p.name,
      companyLogo: undefined,
      totalSales: p.inventory.reduce((sum, i) => sum + i.quantity, 0),
      lastSaleDate: null,
    }));

    const result: SuperadminDashboardDto = {
      totalCompanies: customerCount,
      companiesChange: 0,
      activeCompanies: totalUsers,
      activeCompaniesChange: usersChange,
      totalSubscribers: totalProducts,
      subscribersChange: productsChange,
      totalEarnings: totalSales,
      earningsChange: salesChange,
      newCompaniesToday: customerCount,
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

    await this.cache.set(this.DASH_KEY(companyId, period), result, 120);
    return result;
  }

  private async getActivityChart(
    companyId: string,
    period: string,
    now: Date,
  ): Promise<BarChartItem[]> {
    const dayNames = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    const monthNames = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];

    if (period === '1W') {
      const rows = (await this.prisma.$queryRawUnsafe(
        `SELECT date_trunc('day', "createdAt") as day, COUNT(*)::int as count
         FROM audit_logs
         WHERE "companyId" = $1 AND "createdAt" >= $2
         GROUP BY date_trunc('day', "createdAt") ORDER BY day`,
        companyId,
        new Date(now.getTime() - 7 * 86400000),
      )) as Array<{ day: Date; count: number }>;

      const map = new Map<number, number>(
        rows.map((r) => [r.day.getTime(), r.count]),
      );
      const result: BarChartItem[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate() - i,
        );
        result.push({
          day: dayNames[d.getDay()],
          count: map.get(d.getTime()) ?? 0,
        });
      }
      return result;
    }

    if (period === '1M') {
      const rows = (await this.prisma.$queryRawUnsafe(
        `SELECT date_trunc('week', "createdAt") as week, COUNT(*)::int as count
         FROM audit_logs
         WHERE "companyId" = $1 AND "createdAt" >= date_trunc('week', $2::timestamp)
         GROUP BY date_trunc('week', "createdAt") ORDER BY week`,
        companyId,
        new Date(now.getTime() - 28 * 86400000),
      )) as Array<{ week: Date; count: number }>;

      const map = new Map(rows.map((r) => [r.week.getTime(), r.count]));
      const result: BarChartItem[] = [];
      for (let i = 3; i >= 0; i--) {
        const ws = new Date(now.getTime() - (i * 7 + 6) * 86400000);
        const wkStart = new Date(
          ws.getFullYear(),
          ws.getMonth(),
          ws.getDate() - ws.getDay(),
        );
        result.push({
          day: `W${4 - i}`,
          count: map.get(wkStart.getTime()) ?? 0,
        });
      }
      return result;
    }

    // 3M, 6M, 1Y — monthly
    const months = period === '3M' ? 3 : period === '6M' ? 6 : 12;
    const start = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);

    const rows = (await this.prisma.$queryRawUnsafe(
      `SELECT date_trunc('month', "createdAt") as month, COUNT(*)::int as count
       FROM audit_logs
       WHERE "companyId" = $1 AND "createdAt" >= $2
       GROUP BY date_trunc('month', "createdAt") ORDER BY month`,
      companyId,
      start,
    )) as Array<{ month: Date; count: number }>;

    const map = new Map(rows.map((r) => [r.month.getTime(), r.count]));
    const result: BarChartItem[] = [];
    for (let i = months - 1; i >= 0; i--) {
      const m = new Date(now.getFullYear(), now.getMonth() - i, 1);
      result.push({
        day: monthNames[m.getMonth()],
        count: map.get(m.getTime()) ?? 0,
      });
    }
    return result;
  }

  private async getExpensesByCategory(
    companyId: string,
    periodAgo: Date,
  ): Promise<MonthlyRevenueItem[]> {
    const rows = (await this.prisma.$queryRawUnsafe(
      `SELECT ec.name, COALESCE(SUM(e.amount), 0) as amount
       FROM expense_categories ec
       LEFT JOIN expenses e ON e."categoryId" = ec.id AND e."companyId" = $1 AND e."createdAt" >= $2
       WHERE ec."companyId" = $1
       GROUP BY ec.id, ec.name ORDER BY amount DESC`,
      companyId,
      periodAgo,
    )) as Array<{ name: string; amount: string }>;

    if (rows.length === 0) return [{ month: 'No data', revenue: 0 }];
    return rows.map((r) => ({ month: r.name, revenue: Number(r.amount) }));
  }
}
