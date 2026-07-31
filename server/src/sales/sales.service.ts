import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrderStatus, PaymentStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../cache/cache.service';
import { StockService } from '../inventory/stock.service';
import { AuditLogService } from '../audit-logs/audit-logs.service';
import { CreateSaleDto, CreateSaleItemDto } from './dto/create-sale.dto';
import { UpdateSaleDto } from './dto/update-sale.dto';
import {
  SaleItemResponseDto,
  SaleResponseDto,
  SaleSummaryDto,
  SalesListResponseDto,
  SalesStatsDto,
} from './dto/sale-response.dto';

const LIST_KEY = (
  cid: string,
  page?: number,
  search?: string,
  status?: string,
  paymentStatus?: string,
  wid?: string,
  dateFrom?: string,
  dateTo?: string,
  productId?: string,
) =>
  `sales:${cid}:list:${page ?? 1}:${search ?? ''}:${status ?? ''}:${paymentStatus ?? ''}:${wid ?? ''}:${dateFrom ?? ''}:${dateTo ?? ''}:${productId ?? ''}`;
const ITEM_KEY = (cid: string, id: string) => `sales:${cid}:${id}`;
const STATS_KEY = (cid: string) => `sales:${cid}:stats`;
const DASHBOARD_KEY = (cid: string) => `sales:${cid}:dashboard`;

@Injectable()
export class SalesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly auditLogService: AuditLogService,
    private readonly stockService: StockService,
  ) {}

  /**
   * Dashboard-specific sales aggregations
   */
  async getDashboardStats(companyId: string) {
    const cacheKey = DASHBOARD_KEY(companyId);
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
      23,
      59,
      59,
      999,
    );

    const [invoicesThisMonth, revenueAgg, topCustomersData] = await Promise.all(
      [
        this.prisma.sale.count({
          where: {
            companyId,
            saleDate: { gte: startOfMonth, lte: endOfMonth },
            status: { not: 'CANCELLED' },
          },
        }),
        this.prisma.sale.aggregate({
          where: { companyId, status: { not: 'CANCELLED' } },
          _sum: { totalAmount: true },
        }),
        this.prisma.sale.groupBy({
          by: ['customerId'],
          where: { companyId, status: { not: 'CANCELLED' } },
          _sum: { totalAmount: true },
          _count: { id: true },
          orderBy: { _sum: { totalAmount: 'desc' } },
          take: 5,
        }),
      ],
    );

    const totalRevenue = Number(revenueAgg._sum.totalAmount || 0);

    // Fetch customer names
    const customerIds = topCustomersData
      .map((c) => c.customerId)
      .filter(Boolean) as string[];
    const customers = customerIds.length
      ? await this.prisma.customer.findMany({
          where: { id: { in: customerIds } },
          select: { id: true, name: true },
        })
      : [];
    const customerMap = new Map(customers.map((c) => [c.id, c.name]));

    const topCustomers = topCustomersData.map((c) => ({
      customerId: c.customerId,
      name: customerMap.get(c.customerId) || 'Unknown',
      total: Number(c._sum.totalAmount || 0),
      orders: c._count.id,
    }));

    // Single raw SQL query instead of 6 individual month queries
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);

    const rows = (await this.prisma.$queryRawUnsafe(
      `SELECT date_trunc('month', "saleDate") as month,
              COUNT(id)::bigint as invoices,
              SUM("totalAmount")::text as revenue
       FROM sales
       WHERE "companyId" = $1 AND "saleDate" >= $2 AND status != 'CANCELLED'
       GROUP BY date_trunc('month', "saleDate") ORDER BY month`,
      companyId,
      sixMonthsAgo,
    )) as Array<{ month: Date; invoices: bigint; revenue: string | null }>;

    const rowMap = new Map<number, { invoices: number; revenue: number }>();
    for (const r of rows) {
      rowMap.set(r.month.getTime(), {
        invoices: Number(r.invoices),
        revenue: Number(r.revenue),
      });
    }

    const months = Array.from({ length: 6 }).map((_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - (5 - i));
      return new Date(d.getFullYear(), d.getMonth(), 1);
    });

    const monthlySeries = months.map((m) => {
      const r = rowMap.get(m.getTime());
      return {
        month: m.toLocaleString('default', { month: 'short' }),
        invoices: r ? Number(r.invoices) : 0,
        revenue: r ? Number(r.revenue) : 0,
      };
    });

    // previous month metrics for percent change calculations
    const prevMonthIndex = monthlySeries.length - 2;
    const prevMonth = monthlySeries[prevMonthIndex] || {
      invoices: 0,
      revenue: 0,
    };

    const result = {
      invoicesThisMonth,
      totalRevenue,
      topCustomers,
      monthlySeries,
      previousMonth: {
        invoices: prevMonth.invoices,
        revenue: prevMonth.revenue,
      },
    };
    await this.cache.set(cacheKey, result, 60 * 2);
    return result;
  }

  async create(
    dto: CreateSaleDto,
    userId: string,
    companyId: string,
    sourceQuotationId?: string,
  ): Promise<SaleResponseDto> {
    if (!dto.items?.length) {
      throw new BadRequestException('A sale must include at least one item');
    }

    let saleCompleted = false;
    let saleId = '';
    let saleInvoiceNumber = '';
    let saleTotalAmount = 0;
    let saleDateObj = new Date();
    let customerName = '';

    const result = await this.prisma.$transaction(
      async (tx) => {
        // Verify warehouse belongs to company
        const warehouse = await tx.warehouse.findUnique({
          where: { id: dto.warehouseId, companyId },
        });
        if (!warehouse) {
          throw new NotFoundException('Warehouse not found');
        }

        const invoiceNumber = await this.ensureInvoiceNumber(
          tx,
          dto.invoiceNumber,
          companyId,
        );
        const productMap = await this.fetchProducts(tx, dto.items, companyId);

        // Check stock availability in the specific warehouse
        await this.ensureStockInWarehouse(
          tx,
          dto.items,
          productMap,
          dto.warehouseId,
          companyId,
        );

        const customer = await this.resolveCustomer(
          tx,
          dto.customer,
          companyId,
        );
        const providedEmail = dto.customer.email?.trim();
        // Determine final shipping address to snapshot on the Sale
        // Priority: dto.shippingAddress > dto.customer.address > resolved customer's address > ''
        let finalShippingAddress: string = '';
        if (dto.shippingAddress && dto.shippingAddress.trim().length > 0) {
          finalShippingAddress = dto.shippingAddress.trim();
        } else if (
          dto.customer.address &&
          dto.customer.address.trim().length > 0
        ) {
          finalShippingAddress = dto.customer.address.trim();
        } else if (dto.customer.id) {
          // Fetch customer's saved address if available
          const existingCustomer = await tx.customer.findUnique({
            where: { id: dto.customer.id, companyId },
            select: { address: true },
          });
          if (
            existingCustomer?.address &&
            existingCustomer.address.trim().length > 0
          ) {
            finalShippingAddress = existingCustomer.address.trim();
          }
        }
        const totals = this.calculateTotals(
          dto.items,
          dto.taxRate,
          dto.discount,
        );

        const sale = await tx.sale.create({
          data: {
            invoiceNumber,
            subtotal: totals.subtotal,
            tax: totals.tax,
            discount: totals.discount,
            totalAmount: totals.total,
            status: (dto.status ?? OrderStatus.PENDING) as OrderStatus,
            paymentStatus: (dto.paymentStatus ??
              PaymentStatus.PENDING) as PaymentStatus,
            paymentMethod: dto.paymentMethod ?? null,
            saleDate: new Date(dto.saleDate),
            dueDate: new Date(dto.dueDate),
            notes: dto.notes ?? null,
            shippingAddress: finalShippingAddress,
            customerId: customer.id,
            customerEmail: providedEmail ?? customer.email ?? null,
            sourceQuotationId: sourceQuotationId ?? null,
            warehouseId: dto.warehouseId,
            userId,
            companyId,
            items: {
              create: dto.items.map((item) => ({
                productId: item.productId,
                quantity: item.quantity,
                unitPrice: this.roundCurrency(
                  item.unitPrice ??
                    Number(productMap.get(item.productId)?.salePrice ?? 0),
                ),
              })),
            },
          },
          include: {
            items: { include: { product: true } },
            customer: true,
          },
        });

        // Decrement inventory from the specific warehouse only if sale is completed
        const saleStatus = (dto.status ?? OrderStatus.PENDING) as OrderStatus;
        if (saleStatus === OrderStatus.COMPLETED) {
          for (const item of dto.items) {
            await this.stockService.issueStock(tx, {
              productId: item.productId,
              warehouseId: dto.warehouseId,
              quantity: item.quantity,
              reference: sale.invoiceNumber,
              type: 'SALE',
              note: `Sale #${sale.invoiceNumber}`,
              userId: sale.userId,
              companyId,
            });
          }
        }

        saleCompleted = saleStatus === OrderStatus.COMPLETED;
        saleId = sale.id;
        saleInvoiceNumber = sale.invoiceNumber;
        saleTotalAmount = totals.total;
        saleDateObj = sale.saleDate;
        customerName = dto.customer.name.trim();

        // Create delivery record for the sale
        await tx.delivery.create({
          data: {
            saleId: sale.id,
            companyId,
            deliveryAddress:
              finalShippingAddress && finalShippingAddress.length > 0
                ? finalShippingAddress
                : 'Address not provided',
            status: 'PENDING',
          },
        });

        return this.transformSale(sale);
      },
      { timeout: 20000 },
    );

    // Auto-create expense for this sale if completed
    if (saleCompleted) {
      try {
        const expenseCategory = await this.prisma.expenseCategory.upsert({
          where: {
            companyId_name: { companyId, name: 'Sales' },
          },
          update: {},
          create: {
            name: 'Sales',
            companyId,
          },
        });

        await this.prisma.expense.create({
          data: {
            reference: saleInvoiceNumber,
            amount: saleTotalAmount,
            expenseDate: saleDateObj,
            vendor: customerName,
            categoryId: expenseCategory.id,
            saleId,
            description: dto.notes || `Sale #${saleInvoiceNumber}`,
            userId,
            companyId,
          },
        });
      } catch {
        // Expense creation is non-critical; sale creation succeeded
      }
    }

    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { name: true, role: true },
      });
      await this.auditLogService.create(
        {
          action: 'CREATE',
          entity: 'Sale',
          entityId: saleId,
          details: JSON.stringify({
            invoiceNumber: saleInvoiceNumber,
            amount: saleTotalAmount,
          }),
        },
        companyId,
        userId,
        user?.name || 'Unknown',
        user?.role || 'Unknown',
      );
    } catch {
      /* non-critical */
    }

    await Promise.all([
      this.cache.del(LIST_KEY(companyId)),
      this.cache.del(STATS_KEY(companyId)),
      this.cache.del(DASHBOARD_KEY(companyId)),
    ]);

    if (saleCompleted) {
      await this.stockService.invalidateStockCaches(
        companyId,
        dto.items.map((item) => item.productId),
        [dto.warehouseId],
      );
    }

    return result;
  }

  async findAll(
    companyId: string,
    page = 1,
    limit = 10,
    search?: string,
    status?: OrderStatus | string,
    paymentStatus?: PaymentStatus | string,
    warehouseId?: string,
    dateFrom?: string,
    dateTo?: string,
    productId?: string,
  ): Promise<SalesListResponseDto> {
    const cacheKey = LIST_KEY(
      companyId,
      page,
      search,
      status,
      paymentStatus,
      warehouseId,
      dateFrom,
      dateTo,
      productId,
    );
    const cached = await this.cache.get<SalesListResponseDto>(cacheKey);
    if (cached) return cached;
    const skip = (page - 1) * limit;
    const where: Record<string, unknown> = { companyId };

    if (search) {
      where.OR = [
        { invoiceNumber: { contains: search, mode: 'insensitive' } },
        { customer: { name: { contains: search, mode: 'insensitive' } } },
        { customerEmail: { contains: search, mode: 'insensitive' } },
        { customer: { email: { contains: search, mode: 'insensitive' } } },
      ];
    }

    if (status) {
      where.status = status as OrderStatus;
    }

    if (paymentStatus) {
      where.paymentStatus = paymentStatus as PaymentStatus;
    }

    if (warehouseId) {
      where.warehouseId = warehouseId;
    }

    if (dateFrom || dateTo) {
      const saleDateFilter: Record<string, Date> = {};
      if (dateFrom) {
        saleDateFilter.gte = new Date(dateFrom);
      }
      if (dateTo) {
        const endDate = new Date(dateTo);
        endDate.setHours(23, 59, 59, 999);
        saleDateFilter.lte = endDate;
      }
      where.saleDate = saleDateFilter;
    }

    if (productId) {
      const saleIds = await this.prisma.saleItem
        .findMany({
          where: { productId, sale: { companyId } },
          select: { saleId: true },
          distinct: ['saleId'],
        })
        .then((items) => items.map((i) => i.saleId));
      where.id = { in: saleIds };
    }

    const [sales, total] = await Promise.all([
      this.prisma.sale.findMany({
        where,
        skip,
        take: limit,
        orderBy: { saleDate: 'desc' },
        include: {
          customer: true,
          warehouse: true,
          items: { include: { product: true } },
        },
      }),
      this.prisma.sale.count({ where }),
    ]);

    // Batch query return statuses for all sales
    const saleIds = sales.map((s) => s.id);
    const allReturns = await this.prisma.salesReturn.findMany({
      where: { saleId: { in: saleIds } },
      select: { saleId: true, status: true },
    });
    const pendingMap = new Map<string, number>();
    const processingMap = new Map<string, number>();
    const completedMap = new Map<string, number>();
    for (const r of allReturns) {
      if (r.status === 'PENDING')
        pendingMap.set(r.saleId, (pendingMap.get(r.saleId) ?? 0) + 1);
      else if (r.status === 'PROCESSING')
        processingMap.set(r.saleId, (processingMap.get(r.saleId) ?? 0) + 1);
      else if (r.status === 'COMPLETED')
        completedMap.set(r.saleId, (completedMap.get(r.saleId) ?? 0) + 1);
    }

    const result = {
      sales: sales.map((sale) =>
        this.transformSaleSummary(sale, {
          pendingReturnCount: pendingMap.get(sale.id) ?? 0,
          processingReturnCount: processingMap.get(sale.id) ?? 0,
          completedReturnCount: completedMap.get(sale.id) ?? 0,
        }),
      ),
      total,
      pages: limit === 0 ? 1 : Math.max(1, Math.ceil(total / limit)),
    };
    await this.cache.set(cacheKey, result, 60 * 2);
    return result;
  }

  async findOne(id: string, companyId: string): Promise<SaleResponseDto> {
    const cacheKey = ITEM_KEY(companyId, id);
    const cached = await this.cache.get<SaleResponseDto>(cacheKey);
    if (cached) return cached;
    const sale = await this.prisma.sale.findUnique({
      where: { id, companyId },
      include: {
        customer: true,
        warehouse: true,
        items: { include: { product: true } },
      },
    });

    if (!sale) {
      throw new NotFoundException('Sale not found');
    }

    const allRet = await this.prisma.salesReturn.findMany({
      where: { saleId: id },
      select: { status: true },
    });
    const returnCounts = {
      pendingReturnCount: allRet.filter((r) => r.status === 'PENDING').length,
      processingReturnCount: allRet.filter((r) => r.status === 'PROCESSING')
        .length,
      completedReturnCount: allRet.filter((r) => r.status === 'COMPLETED')
        .length,
    };

    const result = this.transformSale(sale, returnCounts);
    await this.cache.set(cacheKey, result, 60 * 2);
    return result;
  }

  update(
    id: string,
    dto: UpdateSaleDto,
    companyId: string,
  ): Promise<SaleResponseDto> {
    return this.prisma.$transaction(
      async (tx) => {
        const existing = await tx.sale.findUnique({
          where: { id, companyId },
          include: {
            customer: true,
            items: true,
          },
        });

        if (!existing) {
          throw new NotFoundException('Sale not found');
        }

        if (dto.invoiceNumber && dto.invoiceNumber !== existing.invoiceNumber) {
          const duplicate = await tx.sale.findUnique({
            where: {
              companyId_invoiceNumber: {
                companyId,
                invoiceNumber: dto.invoiceNumber,
              },
            },
            select: { id: true },
          });
          if (duplicate) {
            throw new ConflictException('Invoice number already exists');
          }
        }

        const productMap = dto.items
          ? await this.fetchProducts(tx, dto.items, companyId)
          : null;
        if (dto.items) {
          await this.ensureStock(tx, dto.items, productMap!, companyId);
        }

        const resolvedCustomer = dto.customer
          ? await this.resolveCustomer(tx, dto.customer, companyId)
          : null;
        const providedEmail =
          dto.customer?.email !== undefined
            ? (dto.customer.email?.trim() ?? null)
            : undefined;

        const targetCustomerId = resolvedCustomer?.id ?? existing.customerId;
        const targetCustomerEmail =
          providedEmail !== undefined
            ? providedEmail
            : (resolvedCustomer?.email ??
              existing.customerEmail ??
              existing.customer?.email ??
              null);

        const recalculationNeeded =
          !!dto.items ||
          dto.taxRate !== undefined ||
          dto.discount !== undefined;

        const sourceItems: CreateSaleItemDto[] = dto.items
          ? dto.items
          : existing.items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: Number(item.unitPrice),
            }));

        const existingTotals = {
          subtotal: Number(existing.subtotal),
          tax: Number(existing.tax),
          discount: Number(existing.discount),
          total: Number(existing.totalAmount),
        };

        const targetTaxRate =
          dto.taxRate ??
          this.deriveTaxRate(existingTotals.subtotal, existingTotals.tax);
        const targetDiscount = dto.discount ?? existingTotals.discount;

        const totals = recalculationNeeded
          ? this.calculateTotals(sourceItems, targetTaxRate, targetDiscount)
          : existingTotals;

        const updated = await tx.sale.update({
          where: { id },
          data: {
            invoiceNumber: dto.invoiceNumber ?? existing.invoiceNumber,
            saleDate: dto.saleDate ? new Date(dto.saleDate) : existing.saleDate,
            dueDate: dto.dueDate ? new Date(dto.dueDate) : existing.dueDate,
            status: (dto.status ?? existing.status) as OrderStatus,
            paymentStatus: (dto.paymentStatus ??
              existing.paymentStatus) as PaymentStatus,
            paymentMethod: dto.paymentMethod ?? existing.paymentMethod,
            notes: dto.notes !== undefined ? dto.notes : existing.notes,
            subtotal: totals.subtotal,
            tax: totals.tax,
            discount: totals.discount,
            totalAmount: totals.total,
            customer:
              targetCustomerId !== existing.customerId
                ? { connect: { id: targetCustomerId } }
                : undefined,
            customerEmail: targetCustomerEmail,
            warehouseId: dto.warehouseId ?? existing.warehouseId,
            items: dto.items
              ? {
                  deleteMany: {},
                  create: dto.items.map((item) => ({
                    productId: item.productId,
                    quantity: item.quantity,
                    unitPrice: this.roundCurrency(
                      item.unitPrice ??
                        Number(productMap?.get(item.productId)?.salePrice ?? 0),
                    ),
                  })),
                }
              : undefined,
          },
          include: {
            customer: true,
            warehouse: true,
            items: { include: { product: true } },
          },
        });

        const newStatus = (dto.status ?? existing.status) as OrderStatus;

        // Stock position after update: a COMPLETED sale holds its items' stock
        // in its warehouse; any other status holds nothing. Reverse what was
        // issued before, then issue what should now be held.
        const oldWarehouseId = existing.warehouseId ?? undefined;
        const newWarehouseId = dto.warehouseId ?? existing.warehouseId ?? undefined;
        const movedProductIds = new Set<string>();

        if (oldWarehouseId && existing.status === OrderStatus.COMPLETED) {
          for (const item of existing.items) {
            await this.stockService.reverseIssue(tx, {
              productId: item.productId,
              warehouseId: oldWarehouseId,
              quantity: item.quantity,
              reference: updated.invoiceNumber,
              type: 'SALE',
              note: `Sale #${updated.invoiceNumber} reversal`,
              userId: updated.userId,
              companyId,
            });
            movedProductIds.add(item.productId);
          }
        }

        if (newWarehouseId && newStatus === OrderStatus.COMPLETED) {
          const currentItems = dto.items
            ? dto.items.map((item) => ({
                productId: item.productId,
                quantity: item.quantity,
              }))
            : updated.items.map((item) => ({
                productId: item.productId,
                quantity: item.quantity,
              }));
          for (const item of currentItems) {
            await this.stockService.issueStock(tx, {
              productId: item.productId,
              warehouseId: newWarehouseId,
              quantity: item.quantity,
              reference: updated.invoiceNumber,
              type: 'SALE',
              note: `Sale #${updated.invoiceNumber}`,
              userId: updated.userId,
              companyId,
            });
            movedProductIds.add(item.productId);
          }
        }

        await Promise.all([
          this.cache.del(ITEM_KEY(companyId, id)),
          this.cache.del(LIST_KEY(companyId)),
          this.cache.del(STATS_KEY(companyId)),
          this.cache.del(DASHBOARD_KEY(companyId)),
        ]);
        if (movedProductIds.size > 0) {
          await this.stockService.invalidateStockCaches(
            companyId,
            Array.from(movedProductIds),
            [oldWarehouseId, newWarehouseId].filter(
              (w): w is string => Boolean(w),
            ),
          );
        }
        return this.transformSale(updated);
      },
      { timeout: 20000 },
    );
  }

  async remove(id: string, companyId: string): Promise<void> {
    const removedProductIds: string[] = [];
    const removedWarehouseIds: string[] = [];
    await this.prisma.$transaction(
      async (tx) => {
        const sale = await tx.sale.findUnique({
          where: { id, companyId },
          include: { items: true },
        });

        if (!sale) {
          throw new NotFoundException('Sale not found');
        }

        // Only restore stock for sales that actually decremented it. Pending or
        // cancelled sales never moved stock, so reversing them would inflate
        // quantities (the old double-increment bug).
        if (sale.status === OrderStatus.COMPLETED && sale.warehouseId) {
          for (const item of sale.items) {
            await this.stockService.reverseIssue(tx, {
              productId: item.productId,
              warehouseId: sale.warehouseId,
              quantity: item.quantity,
              reference: sale.invoiceNumber,
              type: 'SALE',
              note: `Sale #${sale.invoiceNumber} deleted`,
              userId: sale.userId,
              companyId,
            });
          }
          removedProductIds.push(...sale.items.map((item) => item.productId));
          removedWarehouseIds.push(sale.warehouseId);
        }

        await tx.sale.delete({ where: { id } });
      },
      { timeout: 20000 },
    );

    await Promise.all([
      this.cache.del(ITEM_KEY(companyId, id)),
      this.cache.del(LIST_KEY(companyId)),
      this.cache.del(STATS_KEY(companyId)),
      this.cache.del(DASHBOARD_KEY(companyId)),
    ]);
    if (removedProductIds.length > 0) {
      await this.stockService.invalidateStockCaches(
        companyId,
        removedProductIds,
        removedWarehouseIds,
      );
    }
  }

  async markAsPaid(
    id: string,
    userId: string,
    companyId: string,
  ): Promise<SaleResponseDto> {
    const movedProductIds: string[] = [];
    const movedWarehouseIds: string[] = [];
    const result = await this.prisma.$transaction(
      async (tx) => {
        const existing = await tx.sale.findUnique({
          where: { id, companyId },
          include: { items: true },
        });

        if (!existing) {
          throw new NotFoundException('Sale not found');
        }

        const wasPending = existing.status !== OrderStatus.COMPLETED;

        const sale = await tx.sale.update({
          where: { id },
          data: {
            paymentStatus: PaymentStatus.PAID,
            status: OrderStatus.COMPLETED,
          },
          include: {
            customer: true,
            items: { include: { product: true } },
          },
        });

        // If sale was not already completed, decrement inventory
        if (wasPending && sale.warehouseId) {
          for (const item of sale.items) {
            await this.stockService.issueStock(tx, {
              productId: item.productId,
              warehouseId: sale.warehouseId,
              quantity: item.quantity,
              reference: sale.invoiceNumber,
              type: 'SALE',
              note: `Sale #${sale.invoiceNumber} marked as paid`,
              userId: sale.userId,
              companyId,
            });
          }
          movedProductIds.push(...sale.items.map((item) => item.productId));
          movedWarehouseIds.push(sale.warehouseId);
        }

        return this.transformSale(sale);
      },
      { timeout: 20000 },
    );

    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { name: true, role: true },
      });
      await this.auditLogService.create(
        {
          action: 'MARK_PAID',
          entity: 'Sale',
          entityId: result.id,
          details: JSON.stringify({
            invoiceNumber: result.invoiceNumber,
            amount: Number(result.totalAmount),
          }),
        },
        companyId,
        userId,
        user?.name || 'Unknown',
        user?.role || 'Unknown',
      );
    } catch {
      /* non-critical */
    }

    await Promise.all([
      this.cache.del(ITEM_KEY(companyId, id)),
      this.cache.del(LIST_KEY(companyId)),
      this.cache.del(STATS_KEY(companyId)),
      this.cache.del(DASHBOARD_KEY(companyId)),
    ]);

    if (movedProductIds.length > 0) {
      await this.stockService.invalidateStockCaches(
        companyId,
        movedProductIds,
        movedWarehouseIds,
      );
    }

    return result;
  }

  async getStats(companyId: string): Promise<SalesStatsDto> {
    const cacheKey = STATS_KEY(companyId);
    const cached = await this.cache.get<SalesStatsDto>(cacheKey);
    if (cached) return cached;
    const now = new Date();
    const [
      totalSales,
      paidAmount,
      pendingAmount,
      overdueAmount,
      paidInvoices,
      pendingInvoices,
      overdueInvoices,
    ] = await Promise.all([
      this.prisma.sale.count({ where: { companyId } }),
      this.prisma.sale.aggregate({
        _sum: { totalAmount: true },
        where: { companyId, paymentStatus: PaymentStatus.PAID },
      }),
      this.prisma.sale.aggregate({
        _sum: { totalAmount: true },
        where: { companyId, paymentStatus: { not: PaymentStatus.PAID } },
      }),
      this.prisma.sale.aggregate({
        _sum: { totalAmount: true },
        where: {
          companyId,
          dueDate: { lt: now },
          paymentStatus: { not: PaymentStatus.PAID },
        },
      }),
      this.prisma.sale.count({
        where: { companyId, paymentStatus: PaymentStatus.PAID },
      }),
      this.prisma.sale.count({
        where: { companyId, paymentStatus: PaymentStatus.PENDING },
      }),
      this.prisma.sale.count({
        where: {
          companyId,
          dueDate: { lt: now },
          paymentStatus: { not: PaymentStatus.PAID },
        },
      }),
    ]);

    const result = {
      totalSales,
      totalRevenue: this.decimalToNumber(paidAmount._sum.totalAmount),
      pendingAmount: this.decimalToNumber(pendingAmount._sum.totalAmount),
      overdueAmount: this.decimalToNumber(overdueAmount._sum.totalAmount),
      paidInvoices,
      pendingInvoices,
      overdueInvoices,
    };
    await this.cache.set(cacheKey, result, 60 * 5);
    return result;
  }

  private async ensureInvoiceNumber(
    tx: any,
    invoiceNumber?: string,
    companyId?: string,
  ): Promise<string> {
    if (invoiceNumber) {
      const existing = await tx.sale.findUnique({
        where: {
          companyId_invoiceNumber: {
            companyId,
            invoiceNumber,
          },
        },
        select: { id: true },
      });
      if (existing) {
        throw new ConflictException('Invoice number already exists');
      }
      return invoiceNumber;
    }

    // Generate unique invoice number using timestamp + random string
    return `INV-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  }

  private async fetchProducts(
    tx: any,
    items: CreateSaleItemDto[],
    companyId: string,
  ): Promise<Map<string, any>> {
    const uniqueProductIds = Array.from(
      new Set(items.map((item) => item.productId)),
    );
    const products = await tx.product.findMany({
      where: { id: { in: uniqueProductIds }, companyId },
    });

    if (products.length !== uniqueProductIds.length) {
      throw new BadRequestException('One or more products could not be found');
    }

    return new Map(products.map((product) => [product.id, product]));
  }

  private async ensureStock(
    tx: any,
    items: CreateSaleItemDto[],
    productMap: Map<string, any>,
    companyId: string,
  ): Promise<void> {
    const aggregated = this.aggregateQuantities(items);

    const checks = Array.from(aggregated.entries()).map(
      async ([productId, quantity]) => {
        const total = await tx.inventory.aggregate({
          _sum: { quantity: true },
          where: {
            productId,
            warehouse: { companyId },
          },
        });
        const available = total._sum.quantity ?? 0;
        if (available < quantity) {
          const name = productMap.get(productId)?.name ?? productId;
          throw new BadRequestException(
            `Insufficient stock for product: ${name}`,
          );
        }
      },
    );

    await Promise.all(checks);
  }

  private aggregateQuantities(items: CreateSaleItemDto[]): Map<string, number> {
    const aggregated = new Map<string, number>();
    for (const item of items) {
      aggregated.set(
        item.productId,
        (aggregated.get(item.productId) ?? 0) + item.quantity,
      );
    }
    return aggregated;
  }

  private async resolveCustomer(
    tx: any,
    customer: CreateSaleDto['customer'],
    companyId: string,
  ): Promise<{ id: string; email: string | null }> {
    const normalized = {
      ...customer,
      name: customer.name.trim(),
      email: customer.email?.trim(),
      phone: customer.phone?.trim(),
      address: customer.address?.trim(),
    };

    if (customer.id) {
      const existing = await tx.customer.findUnique({
        where: { id: customer.id, companyId },
      });
      if (!existing) {
        throw new BadRequestException('Customer not found');
      }
      const updates = this.buildCustomerUpdates(normalized, existing);
      if (Object.keys(updates).length) {
        const updated = await tx.customer.update({
          where: { id: existing.id },
          data: updates,
        });
        return { id: updated.id, email: updated.email ?? null };
      }
      return { id: existing.id, email: existing.email ?? null };
    }

    if (normalized.email) {
      const existing = await tx.customer.findUnique({
        where: {
          companyId_email: {
            companyId,
            email: normalized.email,
          },
        },
      });
      if (existing) {
        const updates = this.buildCustomerUpdates(normalized, existing);
        if (Object.keys(updates).length) {
          const updated = await tx.customer.update({
            where: { id: existing.id },
            data: updates,
          });
          return { id: updated.id, email: updated.email ?? null };
        }
        return { id: existing.id, email: existing.email ?? null };
      }
    }

    const byName = await tx.customer.findFirst({
      where: { name: normalized.name, companyId },
    });
    if (byName) {
      const updates = this.buildCustomerUpdates(normalized, byName);
      if (Object.keys(updates).length) {
        const updated = await tx.customer.update({
          where: { id: byName.id },
          data: updates,
        });
        return { id: updated.id, email: updated.email ?? null };
      }
      return { id: byName.id, email: byName.email ?? null };
    }

    const created = await tx.customer.create({
      data: {
        name: normalized.name,
        email: normalized.email,
        phone: normalized.phone,
        address: normalized.address,
        companyId,
      },
    });

    return { id: created.id, email: created.email ?? null };
  }

  private buildCustomerUpdates(
    customer: {
      name: string;
      email?: string | null;
      phone?: string | null;
      address?: string | null;
    },
    existing: {
      name: string;
      email: string | null;
      phone: string | null;
      address: string | null;
    },
  ): Record<string, unknown> {
    const updates: Record<string, unknown> = {};

    if (customer.name && customer.name !== existing.name) {
      updates.name = customer.name;
    }

    if (customer.email !== undefined && customer.email !== existing.email) {
      updates.email = customer.email;
    }

    if (customer.phone && customer.phone !== existing.phone) {
      updates.phone = customer.phone;
    }

    if (customer.address && customer.address !== existing.address) {
      updates.address = customer.address;
    }

    return updates;
  }

  private calculateTotals(
    items: CreateSaleItemDto[],
    taxRate?: number,
    discountAmount?: number,
  ) {
    const subtotal = this.roundCurrency(
      items.reduce(
        (sum, item) => sum + item.quantity * (item.unitPrice ?? 0),
        0,
      ),
    );

    const tax = taxRate ? this.roundCurrency(subtotal * (taxRate / 100)) : 0;
    const discount = this.roundCurrency(discountAmount ?? 0);

    if (discount > subtotal + tax) {
      throw new BadRequestException('Discount cannot exceed the invoice total');
    }

    const total = this.roundCurrency(subtotal + tax - discount);

    return { subtotal, tax, discount, total };
  }

  private deriveTaxRate(subtotal: number, tax: number): number | undefined {
    if (!subtotal) {
      return undefined;
    }
    return (tax / subtotal) * 100;
  }

  private roundCurrency(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  private decimalToNumber(value: any): number {
    if (value === null || value === undefined) {
      return 0;
    }
    return typeof value === 'number' ? value : Number(value);
  }

  private transformSaleItem(item: any): SaleItemResponseDto {
    const unitPrice = this.decimalToNumber(item.unitPrice);
    return {
      id: item.id,
      productId: item.productId,
      productName: item.product?.name ?? item.productId,
      quantity: item.quantity,
      returnedQuantity: item.returnedQuantity ?? 0,
      unitPrice,
      total: this.roundCurrency(item.quantity * unitPrice),
    };
  }

  private transformSaleSummary(
    sale: any,
    returnCounts?: {
      pendingReturnCount: number;
      processingReturnCount: number;
      completedReturnCount: number;
    },
  ): SaleSummaryDto {
    const {
      pendingReturnCount = 0,
      processingReturnCount = 0,
      completedReturnCount = 0,
    } = returnCounts ?? {};
    const subtotal = this.decimalToNumber(sale.subtotal);
    const tax = this.decimalToNumber(sale.tax);
    const discount = this.decimalToNumber(sale.discount);
    const total = this.decimalToNumber(sale.totalAmount);
    const isPaid = sale.paymentStatus === PaymentStatus.PAID;
    const isOverdue = !isPaid && sale.dueDate < new Date();

    const items = sale.items?.map((i: any) => this.transformSaleItem(i)) ?? [];

    const returnedValue = items.reduce(
      (sum: number, i: any) => sum + (i.returnedQuantity ?? 0) * i.unitPrice,
      0,
    );

    let returnStatus: 'NONE' | 'PARTIAL' | 'ALL' = 'NONE';
    if (items.length > 0) {
      const anyReturned = items.some((i: any) => (i.returnedQuantity ?? 0) > 0);
      const allReturned = items.every(
        (i: any) => (i.returnedQuantity ?? 0) >= i.quantity,
      );
      if (allReturned) returnStatus = 'ALL';
      else if (anyReturned) returnStatus = 'PARTIAL';
    }

    return {
      id: sale.id,
      invoiceNumber: sale.invoiceNumber,
      customerId: sale.customerId,
      customerName: sale.customer?.name ?? 'Unknown Customer',
      customerEmail: sale.customerEmail ?? sale.customer?.email ?? null,
      saleDate: sale.saleDate.toISOString(),
      dueDate: sale.dueDate.toISOString(),
      status: sale.status,
      paymentStatus: sale.paymentStatus,
      paymentMethod: sale.paymentMethod ?? null,
      warehouseId: sale.warehouseId,
      warehouseName: sale.warehouse?.name ?? '',
      hasReturns: Boolean(sale.hasReturns),
      pendingReturnCount,
      processingReturnCount,
      completedReturnCount,
      returnStatus,
      returnedValue: this.roundCurrency(returnedValue),
      netTotal: this.roundCurrency(total - returnedValue),
      subtotal,
      tax,
      discount,
      totalAmount: total,
      balanceDue: isPaid ? 0 : total,
      isOverdue,
      createdAt: sale.createdAt.toISOString(),
      updatedAt: sale.updatedAt.toISOString(),
    };
  }

  private transformSale(
    sale: any,
    returnCounts?: {
      pendingReturnCount: number;
      processingReturnCount: number;
      completedReturnCount: number;
    },
  ): SaleResponseDto {
    return {
      ...this.transformSaleSummary(sale, returnCounts),
      notes: sale.notes,
      items: sale.items.map((item) => this.transformSaleItem(item)),
    };
  }

  /**
   * Verify that sufficient stock exists in the specific warehouse for all sale items.
   * This is called before creating the sale to prevent overselling.
   */
  private async ensureStockInWarehouse(
    tx: any,
    items: CreateSaleItemDto[],
    productMap: Map<string, any>,
    warehouseId: string,
    companyId: string,
  ): Promise<void> {
    const aggregated = this.aggregateQuantities(items);

    const checks = Array.from(aggregated.entries()).map(
      async ([productId, quantityNeeded]) => {
        const product = productMap.get(productId);
        if (product?.type === 'COMBO') {
          const detail =
            await this.stockService.getComboAvailabilityDetail(
              companyId,
              productId,
              warehouseId,
              tx,
            );
          if (detail.available < quantityNeeded) {
            if (
              detail.limiting &&
              detail.limiting.productId !== productId
            ) {
              throw new BadRequestException(
                `Insufficient stock for combo "${product.name}": component "${detail.limiting.name}" has only ${detail.limiting.available} available in the selected warehouse (needs ${detail.limiting.neededPerCombo} per combo).`,
              );
            }
            throw new BadRequestException(
              `Insufficient stock for product "${product.name}" in selected warehouse. Available: ${detail.available}, Needed: ${quantityNeeded}`,
            );
          }
          return;
        }
        const available =
          (
            await tx.inventory.findUnique({
              where: {
                productId_warehouseId: {
                  productId,
                  warehouseId,
                },
              },
            })
          )?.quantity ?? 0;

        if (available < quantityNeeded) {
          const productName = product?.name ?? productId;
          throw new BadRequestException(
            `Insufficient stock for product "${productName}" in selected warehouse. Available: ${available}, Needed: ${quantityNeeded}`,
          );
        }
      },
    );

    await Promise.all(checks);
  }
}
