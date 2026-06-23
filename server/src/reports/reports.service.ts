import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GenerateExpenseReportDto } from './dto/generate-expense-report.dto';
import { DateRangeDto } from './dto/date-range.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  /**
   * PHASE 1: FINANCIAL SUMMARY REPORT
   * Comprehensive Profit & Loss statement with revenue, COGS, expenses, and category breakdown
   */
  async getFinancialSummary(dto: DateRangeDto, companyId: string) {
    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);
    endDate.setHours(23, 59, 59, 999);

    const dateFilter = {
      gte: startDate,
      lte: endDate,
    };

    // Run all queries in parallel for performance
    const [
      revenueData,
      cogsData,
      expensesData,
      revenueByCategoryData,
      salesByDate,
    ] = await Promise.all([
      // 1. Total Revenue from Sales
      this.prisma.sale.aggregate({
        where: {
          companyId,
          saleDate: dateFilter,
          status: { not: 'CANCELLED' },
        },
        _sum: {
          totalAmount: true,
          tax: true,
        },
        _count: {
          id: true,
        },
      }),

      // 2. Cost of Goods Sold (COGS) - Sum of cost prices for all sold items
      this.prisma.saleItem.aggregate({
        where: {
          sale: {
            companyId,
            saleDate: dateFilter,
            status: { not: 'CANCELLED' },
          },
        },
        _sum: {
          quantity: true,
        },
      }),

      // 3. Total Expenses
      this.prisma.expense.aggregate({
        where: {
          companyId,
          expenseDate: dateFilter,
        },
        _sum: {
          amount: true,
        },
        _count: {
          id: true,
        },
      }),

      // 4. Revenue by Product Category
      this.prisma.saleItem.groupBy({
        by: ['productId'],
        where: {
          sale: {
            companyId,
            saleDate: dateFilter,
            status: { not: 'CANCELLED' },
          },
        },
        _sum: {
          quantity: true,
          unitPrice: true,
        },
      }),

      // 5. Sales trend data for chart
      this.prisma.sale.groupBy({
        by: ['saleDate'],
        where: {
          companyId,
          saleDate: dateFilter,
          status: { not: 'CANCELLED' },
        },
        _sum: {
          totalAmount: true,
        },
        orderBy: {
          saleDate: 'asc',
        },
      }),
    ]);

    // Calculate detailed COGS by fetching product cost prices
    const saleItems = await this.prisma.saleItem.findMany({
      where: {
        sale: {
          companyId,
          saleDate: dateFilter,
          status: { not: 'CANCELLED' },
        },
      },
      include: {
        product: {
          select: {
            costPrice: true,
            categoryId: true,
          },
        },
      },
    });

    // Calculate COGS and revenue by category
    let totalCOGS = 0;
    const categoryRevenue = new Map<
      string,
      { revenue: number; cogs: number; count: number }
    >();

    for (const item of saleItems) {
      const itemCOGS = Number(item.product.costPrice) * item.quantity;
      const itemRevenue = Number(item.unitPrice) * item.quantity;
      totalCOGS += itemCOGS;

      const categoryId = item.product.categoryId;
      const existing = categoryRevenue.get(categoryId) || {
        revenue: 0,
        cogs: 0,
        count: 0,
      };
      categoryRevenue.set(categoryId, {
        revenue: existing.revenue + itemRevenue,
        cogs: existing.cogs + itemCOGS,
        count: existing.count + 1,
      });
    }

    // Get category names
    const categoryIds = Array.from(categoryRevenue.keys());
    const categories = await this.prisma.productCategory.findMany({
      where: {
        id: { in: categoryIds },
        companyId,
      },
      select: {
        id: true,
        name: true,
      },
    });

    const categoryMap = new Map(categories.map((cat) => [cat.id, cat.name]));

    // Format revenue by category with profit margins
    const revenueByCategory = Array.from(categoryRevenue.entries()).map(
      ([categoryId, data]) => ({
        categoryId,
        categoryName: categoryMap.get(categoryId) || 'Unknown',
        revenue: data.revenue,
        cogs: data.cogs,
        profit: data.revenue - data.cogs,
        margin:
          data.revenue > 0
            ? ((data.revenue - data.cogs) / data.revenue) * 100
            : 0,
        itemCount: data.count,
      }),
    );

    // Calculate summary metrics
    const totalRevenue = Number(revenueData._sum.totalAmount || 0);
    const totalExpenses = Number(expensesData._sum.amount || 0);
    const grossProfit = totalRevenue - totalCOGS;
    const netProfit = grossProfit - totalExpenses;
    const grossMargin =
      totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
    const netMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    // Format P&L chart data (group by month or week)
    const pnlChartData = this.formatChartData(salesByDate, startDate, endDate);

    return {
      summary: {
        totalRevenue,
        totalCOGS,
        grossProfit,
        totalExpenses,
        netProfit,
        grossMargin,
        netMargin,
        orderCount: revenueData._count.id,
        expenseCount: expensesData._count.id,
        taxCollected: Number(revenueData._sum.tax || 0),
      },
      revenueByCategory: revenueByCategory.sort(
        (a, b) => b.revenue - a.revenue,
      ),
      pnlChartData,
      dateRange: {
        startDate: dto.startDate,
        endDate: dto.endDate,
      },
    };
  }

  /**
   * PHASE 2: INVENTORY SUMMARY REPORT
   * Stock levels, valuation, low stock alerts, and warehouse breakdown
   */
  async getInventorySummary(dto: DateRangeDto, companyId: string) {
    const [productCount, inventoryData, warehouseBreakdown, recentAdjustments] =
      await Promise.all([
        // 1. Total Products
        this.prisma.product.count({
          where: { companyId, status: 'ACTIVE' },
        }),

        // 2. Total Stock Value - Get all inventory with product cost prices
        this.prisma.inventory.findMany({
          where: {
            product: { companyId },
          },
          include: {
            product: {
              select: {
                costPrice: true,
                salePrice: true,
                reorderLevel: true,
              },
            },
            warehouse: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        }),

        // 3. Stock by Warehouse
        this.prisma.inventory.groupBy({
          by: ['warehouseId'],
          where: {
            product: { companyId },
          },
          _sum: {
            quantity: true,
          },
        }),

        // 4. Recent Stock Adjustments in date range
        this.prisma.stockAdjustment.findMany({
          where: {
            companyId,
            adjustmentDate: {
              gte: new Date(dto.startDate),
              lte: new Date(dto.endDate),
            },
          },
          include: {
            items: {
              include: {
                product: {
                  select: {
                    name: true,
                    sku: true,
                  },
                },
              },
            },
          },
          orderBy: {
            adjustmentDate: 'desc',
          },
          take: 10,
        }),
      ]);

    // Calculate total stock value and identify low stock items
    let totalStockValue = 0;
    let totalRetailValue = 0;
    const lowStockItems: any[] = [];

    for (const inv of inventoryData) {
      const costValue = Number(inv.product.costPrice) * inv.quantity;
      const retailValue = Number(inv.product.salePrice) * inv.quantity;
      totalStockValue += costValue;
      totalRetailValue += retailValue;

      // Check if below reorder level
      if (inv.quantity <= inv.product.reorderLevel) {
        lowStockItems.push({
          productId: inv.productId,
          warehouseId: inv.warehouseId,
          warehouseName: inv.warehouse.name,
          currentQuantity: inv.quantity,
          reorderLevel: inv.product.reorderLevel,
        });
      }
    }

    // Get warehouse names for breakdown
    const warehouseIds = warehouseBreakdown.map((w) => w.warehouseId);
    const warehouses = await this.prisma.warehouse.findMany({
      where: {
        id: { in: warehouseIds },
        companyId,
      },
      select: {
        id: true,
        name: true,
        location: true,
      },
    });

    const warehouseMap = new Map<
      string,
      { name: string; location: string | null }
    >(warehouses.map((w) => [w.id, { name: w.name, location: w.location }]));

    const stockByWarehouse = warehouseBreakdown.map((item) => {
      const warehouse = warehouseMap.get(item.warehouseId);
      return {
        warehouseId: item.warehouseId,
        warehouseName: warehouse?.name || 'Unknown',
        location: warehouse?.location || null,
        totalQuantity: item._sum.quantity || 0,
      };
    });

    return {
      summary: {
        totalProducts: productCount,
        totalStockValue,
        totalRetailValue,
        potentialProfit: totalRetailValue - totalStockValue,
        lowStockCount: lowStockItems.length,
        warehouseCount: warehouses.length,
      },
      stockByWarehouse,
      lowStockItems: lowStockItems.slice(0, 20), // Return top 20 low stock items
      recentAdjustments: recentAdjustments.map((adj) => ({
        id: adj.id,
        adjustmentDate: adj.adjustmentDate,
        reason: adj.reason,
        itemCount: adj.items.length,
        items: adj.items.map((item) => ({
          productName: item.product.name,
          sku: item.product.sku,
          quantityChange: item.quantityChange,
        })),
      })),
      dateRange: {
        startDate: dto.startDate,
        endDate: dto.endDate,
      },
    };
  }

  /**
   * PHASE 2: SALES SUMMARY REPORT
   * Sales performance, new customers, and top-selling products
   */
  async getSalesSummary(dto: DateRangeDto, companyId: string) {
    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);
    endDate.setHours(23, 59, 59, 999);

    const dateFilter = {
      gte: startDate,
      lte: endDate,
    };

    const [
      salesData,
      newCustomers,
      topProductsData,
      salesByStatus,
      salesByPaymentStatus,
    ] = await Promise.all([
      // 1. Total Sales metrics
      this.prisma.sale.aggregate({
        where: {
          companyId,
          saleDate: dateFilter,
          status: { not: 'CANCELLED' },
        },
        _sum: {
          totalAmount: true,
          tax: true,
        },
        _count: {
          id: true,
        },
        _avg: {
          totalAmount: true,
        },
      }),

      // 2. New Customers in period
      this.prisma.customer.count({
        where: {
          companyId,
          createdAt: dateFilter,
        },
      }),

      // 3. Top Selling Products
      this.prisma.saleItem.groupBy({
        by: ['productId'],
        where: {
          sale: {
            companyId,
            saleDate: dateFilter,
            status: { not: 'CANCELLED' },
          },
        },
        _sum: {
          quantity: true,
          unitPrice: true,
        },
        _count: {
          id: true,
        },
        orderBy: {
          _sum: {
            quantity: 'desc',
          },
        },
        take: 10,
      }),

      // 4. Sales by Status
      this.prisma.sale.groupBy({
        by: ['status'],
        where: {
          companyId,
          saleDate: dateFilter,
        },
        _count: {
          id: true,
        },
        _sum: {
          totalAmount: true,
        },
      }),

      // 5. Sales by Payment Status
      this.prisma.sale.groupBy({
        by: ['paymentStatus'],
        where: {
          companyId,
          saleDate: dateFilter,
          status: { not: 'CANCELLED' },
        },
        _count: {
          id: true,
        },
        _sum: {
          totalAmount: true,
        },
      }),
    ]);

    // Get product details for top sellers
    const productIds = topProductsData.map((item) => item.productId);
    const products = await this.prisma.product.findMany({
      where: {
        id: { in: productIds },
        companyId,
      },
      select: {
        id: true,
        name: true,
        sku: true,
        salePrice: true,
        costPrice: true,
      },
    });

    const productMap = new Map<
      string,
      { id: string; name: string; sku: string; salePrice: any; costPrice: any }
    >(products.map((p) => [p.id, p]));

    const topSellingProducts = topProductsData.map((item) => {
      const product = productMap.get(item.productId);
      const revenue =
        Number(item._sum.unitPrice || 0) * Number(item._sum.quantity || 0);
      const quantity = item._sum.quantity || 0;

      return {
        productId: item.productId,
        productName: product?.name ?? 'Unknown',
        sku: product?.sku ?? '',
        quantitySold: quantity,
        revenue,
        orderCount: item._count.id,
        avgPrice: quantity > 0 ? revenue / quantity : 0,
      };
    });

    return {
      summary: {
        totalSales: Number(salesData._sum.totalAmount || 0),
        orderCount: salesData._count.id,
        averageOrderValue: Number(salesData._avg.totalAmount || 0),
        totalTax: Number(salesData._sum.tax || 0),
        newCustomers,
      },
      topSellingProducts,
      salesByStatus: salesByStatus.map((item) => ({
        status: item.status,
        count: item._count.id,
        totalAmount: Number(item._sum.totalAmount || 0),
      })),
      salesByPaymentStatus: salesByPaymentStatus.map((item) => ({
        paymentStatus: item.paymentStatus,
        count: item._count.id,
        totalAmount: Number(item._sum.totalAmount || 0),
      })),
      dateRange: {
        startDate: dto.startDate,
        endDate: dto.endDate,
      },
    };
  }

  /**
   * PHASE 3: STAFF PERFORMANCE REPORT
   * Sales performance by staff member
   * Note: Requires salesTarget field on User model
   */
  async getStaffPerformance(dto: DateRangeDto, companyId: string) {
    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);
    endDate.setHours(23, 59, 59, 999);

    const dateFilter = {
      gte: startDate,
      lte: endDate,
    };

    // Get sales grouped by user (staff member)
    const staffSales = await this.prisma.sale.groupBy({
      by: ['userId'],
      where: {
        companyId,
        saleDate: dateFilter,
        status: { not: 'CANCELLED' },
      },
      _sum: {
        totalAmount: true,
      },
      _count: {
        id: true,
      },
    });

    // Get staff details
    const userIds = staffSales.map((item) => item.userId);
    const staff = await this.prisma.user.findMany({
      where: {
        id: { in: userIds },
        companyId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        // salesTarget: true, // Uncomment after migration
      },
    });

    const staffMap = new Map<
      string,
      { id: string; name: string; email: string; role: any }
    >(staff.map((s) => [s.id, s]));

    const performance = staffSales.map((item) => {
      const staffMember = staffMap.get(item.userId);
      const revenue = Number(item._sum.totalAmount || 0);
      // const target = Number(staffMember?.salesTarget || 0);
      // const achievement = target > 0 ? (revenue / target) * 100 : 0;

      return {
        userId: item.userId,
        name: staffMember?.name ?? 'Unknown',
        email: staffMember?.email ?? '',
        role: staffMember?.role ?? 'OBSERVER',
        revenue,
        orderCount: item._count.id,
        averageOrderValue: item._count.id > 0 ? revenue / item._count.id : 0,
        // target,
        // achievement,
        // NOTE: Uncomment above lines after adding salesTarget field to User model
      };
    });

    return {
      performance: performance.sort((a, b) => b.revenue - a.revenue),
      summary: {
        totalStaff: staff.length,
        totalRevenue: performance.reduce((sum, p) => sum + p.revenue, 0),
        totalOrders: performance.reduce((sum, p) => sum + p.orderCount, 0),
      },
      dateRange: {
        startDate: dto.startDate,
        endDate: dto.endDate,
      },
      note: 'To enable target tracking, add salesTarget: Decimal? field to User model',
    };
  }

  /**
   * PHASE 3: TAX SUMMARY REPORT
   * Tax collected and paid summary
   * Note: Requires tax field on PurchaseOrder and Expense models
   */
  async getTaxSummary(dto: DateRangeDto, companyId: string) {
    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);
    endDate.setHours(23, 59, 59, 999);

    const dateFilter = {
      gte: startDate,
      lte: endDate,
    };

    const [taxCollectedData, salesWithTax] = await Promise.all([
      // 1. Total Tax Collected from Sales
      this.prisma.sale.aggregate({
        where: {
          companyId,
          saleDate: dateFilter,
          status: { not: 'CANCELLED' },
        },
        _sum: {
          tax: true,
        },
        _count: {
          id: true,
        },
      }),

      // 2. Sales grouped by month for chart
      this.prisma.sale.groupBy({
        by: ['saleDate'],
        where: {
          companyId,
          saleDate: dateFilter,
          status: { not: 'CANCELLED' },
        },
        _sum: {
          tax: true,
        },
        orderBy: {
          saleDate: 'asc',
        },
      }),
    ]);

    // Note: For tax paid, you would need to add tax fields to PurchaseOrder and Expense models
    // const taxPaidData = await this.prisma.expense.aggregate({
    //   where: {
    //     companyId,
    //     expenseDate: dateFilter,
    //   },
    //   _sum: {
    //     tax: true,
    //   },
    // });

    const totalTaxCollected = Number(taxCollectedData._sum.tax || 0);
    // const totalTaxPaid = Number(taxPaidData._sum.tax || 0);
    // const netTaxLiability = totalTaxCollected - totalTaxPaid;

    return {
      summary: {
        totalTaxCollected,
        // totalTaxPaid,
        // netTaxLiability,
        transactionCount: taxCollectedData._count.id,
      },
      taxTrend: this.formatChartData(salesWithTax, startDate, endDate, 'tax'),
      dateRange: {
        startDate: dto.startDate,
        endDate: dto.endDate,
      },
      note: 'To track tax paid, add tax: Decimal? field to PurchaseOrder and Expense models',
    };
  }

  /**
   * Helper function to format chart data by grouping dates
   */
  private formatChartData(
    data: any[],
    startDate: Date,
    endDate: Date,
    field: string = 'totalAmount',
  ) {
    const daysDiff = Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
    );

    // Group by day if less than 60 days, otherwise by month
    const groupByMonth = daysDiff > 60;

    const grouped = new Map<string, number>();

    for (const item of data) {
      const date = new Date(item.saleDate);
      const key = groupByMonth
        ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        : date.toISOString().split('T')[0];

      const value = Number(item._sum[field] || 0);
      grouped.set(key, (grouped.get(key) || 0) + value);
    }

    return Array.from(grouped.entries())
      .map(([date, value]) => ({
        date,
        value,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * EXISTING METHOD: Generate Expense Report
   */
  async generateExpenseReport(
    dto: GenerateExpenseReportDto,
    companyId: string,
  ) {
    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);

    // Set end date to end of day
    endDate.setHours(23, 59, 59, 999);

    // Build dynamic where clause
    const whereClause: any = {
      companyId,
      expenseDate: {
        gte: startDate,
        lte: endDate,
      },
    };

    // Add optional filters
    if (dto.categoryId) {
      whereClause.categoryId = dto.categoryId;
    }

    if (dto.vendor) {
      whereClause.vendor = {
        contains: dto.vendor,
        mode: 'insensitive',
      };
    }

    // Get aggregated summary
    const summary = await this.prisma.expense.aggregate({
      where: whereClause,
      _sum: {
        amount: true,
      },
      _count: {
        id: true,
      },
    });

    // Get detailed expenses with relations
    const expenses = await this.prisma.expense.findMany({
      where: whereClause,
      include: {
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        expenseDate: 'desc',
      },
    });

    // Calculate category breakdown
    const categoryBreakdown = await this.prisma.expense.groupBy({
      by: ['categoryId'],
      where: whereClause,
      _sum: {
        amount: true,
      },
      _count: {
        id: true,
      },
    });

    // Get category names for breakdown
    const categoryIds = categoryBreakdown.map((item) => item.categoryId);
    const categories = await this.prisma.expenseCategory.findMany({
      where: {
        id: { in: categoryIds },
        companyId,
      },
      select: {
        id: true,
        name: true,
      },
    });

    const categoryMap = new Map(categories.map((cat) => [cat.id, cat.name]));

    const breakdownWithNames = categoryBreakdown.map((item) => ({
      categoryId: item.categoryId,
      categoryName: categoryMap.get(item.categoryId) || 'Unknown',
      totalAmount: item._sum.amount || 0,
      count: item._count.id,
    }));

    return {
      summary: {
        totalAmount: summary._sum.amount || 0,
        totalExpenses: summary._count.id,
        startDate: dto.startDate,
        endDate: dto.endDate,
        categoryFilter: dto.categoryId || null,
        vendorFilter: dto.vendor || null,
      },
      expenses,
      categoryBreakdown: breakdownWithNames,
    };
  }
}
