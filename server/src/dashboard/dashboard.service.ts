import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DashboardDataDto, SalesPurchaseChartItem } from './dto/dashboard-stats.dto';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getData(companyId: string, period: string = '1Y'): Promise<DashboardDataDto> {
    const now = new Date();
    const range = this.getDateRange(period, now);
    const prevRange = this.getPreviousPeriodRange(period, now);

    const [
      currentSalesAgg,
      prevSalesAgg,
      currentSalesReturnAgg,
      prevSalesReturnAgg,
      currentPurchaseAgg,
      prevPurchaseAgg,
      currentPurchaseReturnAgg,
      prevPurchaseReturnAgg,
      invoiceDueAgg,
      totalExpenses,
      totalExpensesPrev,
      totalPaymentReturns,
      paymentReturnsPrev,
      suppliersCount,
      customersCount,
      ordersCount,
      customerStats,
      topSelling,
      lowStock,
      chartData,
    ] = await Promise.all([
      // Current period sales
      this.prisma.sale.aggregate({
        where: { companyId, saleDate: { gte: range.start, lte: range.end }, status: { not: 'CANCELLED' } },
        _sum: { totalAmount: true },
      }),
      // Previous period sales (for change %)
      this.prisma.sale.aggregate({
        where: { companyId, saleDate: { gte: prevRange.start, lte: prevRange.end }, status: { not: 'CANCELLED' } },
        _sum: { totalAmount: true },
      }),
      // Current period sales returns
      this.prisma.salesReturn.aggregate({
        where: { companyId, returnDate: { gte: range.start, lte: range.end }, status: { not: 'CANCELLED' } },
        _sum: { totalAmount: true },
      }),
      // Previous period sales returns
      this.prisma.salesReturn.aggregate({
        where: { companyId, returnDate: { gte: prevRange.start, lte: prevRange.end }, status: { not: 'CANCELLED' } },
        _sum: { totalAmount: true },
      }),
      // Current period purchases
      this.prisma.purchaseOrder.aggregate({
        where: { companyId, orderDate: { gte: range.start, lte: range.end }, status: { not: 'CANCELLED' } },
        _sum: { totalAmount: true },
      }),
      // Previous period purchases
      this.prisma.purchaseOrder.aggregate({
        where: { companyId, orderDate: { gte: prevRange.start, lte: prevRange.end }, status: { not: 'CANCELLED' } },
        _sum: { totalAmount: true },
      }),
      // Current period purchase returns
      this.prisma.purchaseReturn.aggregate({
        where: { companyId, returnDate: { gte: range.start, lte: range.end }, status: { not: 'CANCELLED' } },
        _sum: { totalAmount: true },
      }),
      // Previous period purchase returns
      this.prisma.purchaseReturn.aggregate({
        where: { companyId, returnDate: { gte: prevRange.start, lte: prevRange.end }, status: { not: 'CANCELLED' } },
        _sum: { totalAmount: true },
      }),
      // Invoice due (all unpaid sales)
      this.prisma.sale.aggregate({
        where: { companyId, paymentStatus: { not: 'PAID' }, status: { not: 'CANCELLED' } },
        _sum: { totalAmount: true },
      }),
      // Total expenses current period
      this.prisma.expense.aggregate({
        where: { companyId, expenseDate: { gte: range.start, lte: range.end }, status: { not: 'CANCELLED' } },
        _sum: { amount: true },
      }),
      // Total expenses previous period
      this.prisma.expense.aggregate({
        where: { companyId, expenseDate: { gte: prevRange.start, lte: prevRange.end }, status: { not: 'CANCELLED' } },
        _sum: { amount: true },
      }),
      // Payment returns (this is simplified — total amount of cancelled/pending payment sales that were returned)
      this.prisma.purchaseReturn.aggregate({
        where: { companyId, returnDate: { gte: range.start, lte: range.end }, status: 'COMPLETED' },
        _sum: { totalAmount: true },
      }),
      // Payment returns previous period
      this.prisma.purchaseReturn.aggregate({
        where: { companyId, returnDate: { gte: prevRange.start, lte: prevRange.end }, status: 'COMPLETED' },
        _sum: { totalAmount: true },
      }),
      // Suppliers count
      this.prisma.supplier.count({ where: { companyId } }),
      // Customers count
      this.prisma.customer.count({ where: { companyId } }),
      // Orders count (total non-cancelled sales)
      this.prisma.sale.count({ where: { companyId, status: { not: 'CANCELLED' } } }),
      // Customer stats (first time vs returning this period)
      this.getCustomerStats(companyId, range),
      // Top selling products
      this.getTopSellingProducts(companyId, range),
      // Low stock products
      this.getLowStockProducts(companyId),
      // Monthly chart data
      this.getSalesPurchaseChart(companyId, range.start, range.end),
    ]);

    const sales = Number(currentSalesAgg._sum.totalAmount || 0);
    const prevSales = Number(prevSalesAgg._sum.totalAmount || 0);
    const salesReturn = Number(currentSalesReturnAgg._sum.totalAmount || 0);
    const prevSalesReturn = Number(prevSalesReturnAgg._sum.totalAmount || 0);
    const purchase = Number(currentPurchaseAgg._sum.totalAmount || 0);
    const prevPurchase = Number(prevPurchaseAgg._sum.totalAmount || 0);
    const purchaseReturn = Number(currentPurchaseReturnAgg._sum.totalAmount || 0);
    const prevPurchaseReturn = Number(prevPurchaseReturnAgg._sum.totalAmount || 0);
    const expenses = Number(totalExpenses._sum.amount || 0);
    const prevExpenses = Number(totalExpensesPrev._sum.amount || 0);
    const paymentReturns = Number(totalPaymentReturns._sum.totalAmount || 0);
    const prevPaymentReturns = Number(paymentReturnsPrev._sum.totalAmount || 0);

    const totalSalesAmount = await this.getTotalAllTime(companyId, 'sale');
    const totalPurchaseAmount = await this.getTotalAllTime(companyId, 'purchase');

    const chartTotalSales = chartData.reduce((s, c) => s + c.sales, 0);
    const chartTotalPurchase = chartData.reduce((s, c) => s + c.purchase, 0);

    return {
      totalSales: sales,
      salesChange: this.pctChange(sales, prevSales),
      totalSalesReturn: salesReturn,
      salesReturnChange: this.pctChange(salesReturn, prevSalesReturn),
      totalPurchase: purchase,
      purchaseChange: this.pctChange(purchase, prevPurchase),
      totalPurchaseReturn: purchaseReturn,
      purchaseReturnChange: this.pctChange(purchaseReturn, prevPurchaseReturn),
      profit: sales - salesReturn - purchase + purchaseReturn - expenses,
      profitLabel: '% from last month',
      profitChange: this.directionalArrow((sales - salesReturn - purchase + purchaseReturn - expenses), (prevSales - prevSalesReturn - prevPurchase + prevPurchaseReturn - prevExpenses)),
      invoiceDue: Number(invoiceDueAgg._sum.totalAmount || 0),
      invoiceDueLabel: '% from last month',
      invoiceDueChange: 0,
      totalExpenses: expenses,
      expensesLabel: '% from last month',
      expensesChange: this.pctChange(expenses, prevExpenses),
      totalPaymentReturns: paymentReturns,
      paymentReturnsLabel: '% from last month',
      paymentReturnsChange: this.pctChange(paymentReturns, prevPaymentReturns),
      salesPurchaseChart: chartData,
      totalSalesAmount: chartTotalSales,
      totalPurchaseAmount: chartTotalPurchase,
      suppliersCount,
      customersCount,
      ordersCount,
      firstTimeCustomers: customerStats.firstTime,
      firstTimeCustomersPercent: customerStats.firstTimePct,
      returnCustomers: customerStats.returning,
      returnCustomersPercent: customerStats.returningPct,
      topSellingProducts: topSelling,
      lowStockProducts: lowStock,
    };
  }

  private async getSalesPurchaseChart(companyId: string, start: Date, end: Date): Promise<SalesPurchaseChartItem[]> {
    const months: SalesPurchaseChartItem[] = [];
    const iter = new Date(start.getFullYear(), start.getMonth(), 1);

    while (iter <= end) {
      const monthStart = new Date(iter.getFullYear(), iter.getMonth(), 1);
      const monthEnd = new Date(iter.getFullYear(), iter.getMonth() + 1, 0, 23, 59, 59, 999);
      const label = monthStart.toLocaleString('default', { month: 'short' });

      const [saleAgg, purchaseAgg] = await Promise.all([
        this.prisma.sale.aggregate({
          where: { companyId, saleDate: { gte: monthStart, lte: monthEnd }, status: { not: 'CANCELLED' } },
          _sum: { totalAmount: true },
        }),
        this.prisma.purchaseOrder.aggregate({
          where: { companyId, orderDate: { gte: monthStart, lte: monthEnd }, status: { not: 'CANCELLED' } },
          _sum: { totalAmount: true },
        }),
      ]);

      months.push({
        month: label,
        purchase: Number(purchaseAgg._sum.totalAmount || 0),
        sales: Number(saleAgg._sum.totalAmount || 0),
      });

      iter.setMonth(iter.getMonth() + 1);
    }

    return months;
  }

  private async getTopSellingProducts(companyId: string, range: { start: Date; end: Date }) {
    const items = await this.prisma.saleItem.groupBy({
      by: ['productId'],
      where: {
        sale: { companyId, saleDate: { gte: range.start, lte: range.end }, status: { not: 'CANCELLED' } },
      },
      _sum: { quantity: true, unitPrice: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 5,
    });

    type ProductSummary = { id: string; name: string; imageUrl: string | null; salePrice: any; sku: string | null };
    const productIds = items.map((i) => i.productId).filter(Boolean);
    const products = productIds.length
      ? await this.prisma.product.findMany({
          where: { id: { in: productIds } },
          select: { id: true, name: true, imageUrl: true, salePrice: true, sku: true },
        }) as ProductSummary[]
      : [];
    const productMap = new Map(products.map((p) => [p.id, p]));

    return items.map((i) => {
      const p = productMap.get(i.productId);
      return {
        productId: i.productId,
        name: p?.name || 'Unknown',
        imageUrl: p?.imageUrl || '',
        salePrice: Number(p?.salePrice || 0),
        salesCount: i._sum.quantity || 0,
        totalRevenue: Number(i._sum.unitPrice || 0) * (i._sum.quantity || 0),
      };
    });
  }

  private async getLowStockProducts(companyId: string) {
    type ProductInfo = { id: string; name: string; sku: string; imageUrl: string | null; alertQuantity: number; reorderLevel: number };
    const inventory = await this.prisma.inventory.findMany({
      where: { product: { companyId, status: 'ACTIVE', parentId: null } },
      select: { productId: true, quantity: true, product: { select: { id: true, name: true, sku: true, imageUrl: true, alertQuantity: true, reorderLevel: true } } },
    }) as Array<{ productId: string; quantity: number; product: ProductInfo }>;

    // Sum stock per product
    const stockMap = new Map<string, { product: ProductInfo; totalQty: number }>();
    for (const inv of inventory) {
      const existing = stockMap.get(inv.productId) || { product: inv.product, totalQty: 0 };
      existing.totalQty += inv.quantity;
      stockMap.set(inv.productId, existing);
    }

    return Array.from(stockMap.values())
      .filter((s) => s.totalQty <= s.product.alertQuantity)
      .sort((a, b) => a.totalQty - b.totalQty)
      .slice(0, 5)
      .map((s) => ({
        productId: s.product.id,
        name: s.product.name,
        sku: s.product.sku,
        imageUrl: s.product.imageUrl || '',
        stockQuantity: s.totalQty,
        alertQuantity: s.product.alertQuantity,
      }));
  }

  private async getCustomerStats(companyId: string, range: { start: Date; end: Date }) {
    // Find customers who had their first sale in this period (first-time)
    // vs those who had sales before (returning)
    const salesInPeriod = await this.prisma.sale.findMany({
      where: { companyId, saleDate: { gte: range.start, lte: range.end }, status: { not: 'CANCELLED' } },
      select: { customerId: true, saleDate: true },
      orderBy: { saleDate: 'asc' },
    });

    const customerIds = [...new Set(salesInPeriod.map((s) => s.customerId))].filter(Boolean) as string[];

    if (!customerIds.length) {
      return { firstTime: 0, firstTimePct: 0, returning: 0, returningPct: 0 };
    }

    // Check which customers had sales before this period
    const earlierSales = await this.prisma.sale.count({
      where: {
        companyId,
        customerId: { in: customerIds },
        saleDate: { lt: range.start },
        status: { not: 'CANCELLED' },
      },
    });

    // Customers who have sales only in this period (not before) — approximation
    const customersWithEarlierSales = await this.prisma.sale.groupBy({
      by: ['customerId'],
      where: {
        companyId,
        customerId: { in: customerIds },
        saleDate: { lt: range.start },
        status: { not: 'CANCELLED' },
      },
    });

    const returningCount = customersWithEarlierSales.length;
    const firstTimeCount = customerIds.length - returningCount;
    const total = customerIds.length;

    return {
      firstTime: firstTimeCount,
      firstTimePct: total ? Math.round((firstTimeCount / total) * 100) : 0,
      returning: returningCount,
      returningPct: total ? Math.round((returningCount / total) * 100) : 0,
    };
  }

  private async getTotalAllTime(companyId: string, type: 'sale' | 'purchase') {
    if (type === 'sale') {
      const agg = await this.prisma.sale.aggregate({
        where: { companyId, status: { not: 'CANCELLED' } },
        _sum: { totalAmount: true },
      });
      return Number(agg._sum.totalAmount || 0);
    }
    const agg = await this.prisma.purchaseOrder.aggregate({
      where: { companyId, status: { not: 'CANCELLED' } },
      _sum: { totalAmount: true },
    });
    return Number(agg._sum.totalAmount || 0);
  }

  private getDateRange(period: string, now: Date) {
    const start = new Date(now);
    switch (period) {
      case '1D': start.setDate(start.getDate() - 1); break;
      case '1W': start.setDate(start.getDate() - 7); break;
      case '1M': start.setMonth(start.getMonth() - 1); break;
      case '3M': start.setMonth(start.getMonth() - 3); break;
      case '6M': start.setMonth(start.getMonth() - 6); break;
      default: start.setFullYear(start.getFullYear() - 1); break; // 1Y
    }
    return { start, end: now };
  }

  private getPreviousPeriodRange(period: string, now: Date) {
    const end = new Date(this.getDateRange(period, now).start);
    end.setDate(end.getDate() - 1);
    const start = new Date(end);
    switch (period) {
      case '1D': start.setDate(start.getDate() - 1); break;
      case '1W': start.setDate(start.getDate() - 7); break;
      case '1M': start.setMonth(start.getMonth() - 1); break;
      case '3M': start.setMonth(start.getMonth() - 3); break;
      case '6M': start.setMonth(start.getMonth() - 6); break;
      default: start.setFullYear(start.getFullYear() - 1); break;
    }
    return { start, end };
  }

  private pctChange(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  }

  private directionalArrow(current: number, previous: number): number {
    return this.pctChange(current, previous);
  }
}
