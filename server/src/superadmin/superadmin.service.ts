import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { SuperadminDashboardDto, BarChartItem, MonthlyRevenueItem } from './dto/superadmin-dashboard.dto';

@Injectable()
export class SuperadminService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard(): Promise<SuperadminDashboardDto> {
    const now = new Date();

    // Total companies across the platform
    const totalCompanies = await this.prisma.company.count();
    const companiesLastMonth = await this.prisma.company.count({
      where: { createdAt: { lt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) } },
    });
    const companiesChange = companiesLastMonth > 0
      ? Math.round(((totalCompanies - companiesLastMonth) / companiesLastMonth) * 10000) / 100
      : totalCompanies > 0 ? 100 : 0;

    // Active companies (companies with at least one ACTIVE user)
    const companiesWithActiveUsers = await this.prisma.user.groupBy({
      by: ['companyId'],
      where: { status: 'ACTIVE' },
    });
    const activeCompanies = companiesWithActiveUsers.length;

    // Total subscribers (all users)
    const totalSubscribers = await this.prisma.user.count();
    const subscribersLastMonth = await this.prisma.user.count({
      where: { createdAt: { lt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) } },
    });
    const subscribersChange = subscribersLastMonth > 0
      ? Math.round(((totalSubscribers - subscribersLastMonth) / subscribersLastMonth) * 10000) / 100
      : totalSubscribers > 0 ? 100 : 0;

    // New companies today
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const newCompaniesToday = await this.prisma.company.count({
      where: { createdAt: { gte: todayStart } },
    });

    // Weekly companies chart (last 7 days)
    const companiesChart: BarChartItem[] = [];
    const dayNames = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    for (let i = 6; i >= 0; i--) {
      const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
      const count = await this.prisma.company.count({
        where: { createdAt: { gte: dayStart, lt: dayEnd } },
      });
      companiesChart.push({ day: dayNames[dayStart.getDay()], count });
    }

    // Revenue chart (last 12 months) — placeholder since no subscription model yet
    const revenueChart: MonthlyRevenueItem[] = [];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    for (let i = 11; i >= 0; i--) {
      const m = new Date(now.getFullYear(), now.getMonth() - i, 1);
      revenueChart.push({ month: monthNames[m.getMonth()], revenue: 0 });
    }

    // Top companies by user count
    const companiesWithCounts = await this.prisma.company.findMany({
      select: {
        id: true,
        name: true,
        _count: { select: { users: true } },
      },
      orderBy: { users: { _count: 'desc' } },
      take: 5,
    });
    const topCompanies = companiesWithCounts.map((c) => ({
      id: c.id,
      name: c.name,
      logo: undefined,
      plan: 'Standard',
      usersCount: c._count.users,
    }));

    return {
      totalCompanies,
      companiesChange,
      activeCompanies,
      activeCompaniesChange: 0,
      totalSubscribers,
      subscribersChange,
      totalEarnings: 0,
      earningsChange: 0,
      newCompaniesToday,
      adminName: 'Super Admin',
      companiesChart,
      companiesChartChange: companiesChange,
      companiesChartChangeText: `${Math.abs(totalCompanies - companiesLastMonth)} Companies from last month`,
      revenueAmount: 0,
      revenueChange: 0,
      revenueChangeText: '0% increased from last year',
      revenueChart,
      plansDistribution: [
        { name: 'Basic', count: 0, color: '#fe9f43' },
        { name: 'Premium', count: 0, color: '#6938ef' },
        { name: 'Enterprise', count: 0, color: '#06aed4' },
      ],
      recentTransactions: [],
      topCompanies,
      expiringSubscriptions: [],
    };
  }
}
