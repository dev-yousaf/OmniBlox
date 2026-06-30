import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../audit-logs/audit-logs.service';
import { CacheService } from '../cache/cache.service';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { UpdatePurchaseOrderDto } from './dto/update-purchase-order.dto';
import { OrderStatus, PaymentStatus } from '@prisma/client';

const LIST_KEY = (cid: string) => `purchases:${cid}:list`;
const ITEM_KEY = (cid: string, id: string) => `purchases:${cid}:${id}`;
const STATS_KEY = (cid: string) => `purchases:${cid}:stats`;
const DASHBOARD_KEY = (cid: string) => `purchases:${cid}:dashboard`;

@Injectable()
export class PurchasesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
    private cache: CacheService,
  ) {}

  /**
   * Dashboard-specific purchase aggregations
   */
  async getDashboardStats(companyId: string) {
    const key = DASHBOARD_KEY(companyId);
    const cached = await this.cache.get(key);
    if (cached) return cached;

    const topSuppliersData = await this.prisma.purchaseOrder.groupBy({
      by: ['supplierId'],
      where: { companyId },
      _sum: { totalAmount: true },
      _count: { id: true },
      orderBy: { _sum: { totalAmount: 'desc' } },
      take: 5,
    });

    const supplierIds = topSuppliersData
      .map((s) => s.supplierId)
      .filter(Boolean) as string[];
    const suppliers = supplierIds.length
      ? await this.prisma.supplier.findMany({
          where: { id: { in: supplierIds } },
          select: { id: true, name: true },
        })
      : [];
    const supplierMap = new Map(suppliers.map((s) => [s.id, s.name]));

    const topSuppliers = topSuppliersData.map((s) => ({
      supplierId: s.supplierId,
      name: supplierMap.get(s.supplierId) || 'Unknown',
      total: Number(s._sum.totalAmount || 0),
      count: s._count.id,
    }));

    // Single raw SQL query instead of 6 individual month queries
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);

    const rows = (await this.prisma.$queryRawUnsafe(
      `SELECT date_trunc('month', "orderDate") as month, SUM("totalAmount")::text as total
       FROM purchase_orders
       WHERE "companyId" = $1 AND "orderDate" >= $2 AND status != 'CANCELLED'
       GROUP BY date_trunc('month', "orderDate") ORDER BY month`,
      companyId,
      sixMonthsAgo,
    )) as Array<{ month: Date; total: string | null }>;

    const rowMap = new Map<number, number>(
      rows.map((r) => [r.month.getTime(), Number(r.total || 0)]),
    );

    const months = Array.from({ length: 6 }).map((_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - (5 - i));
      return new Date(d.getFullYear(), d.getMonth(), 1);
    });

    const monthlySeries = months.map((m) => ({
      month: m.toLocaleString('default', { month: 'short' }),
      total: rowMap.get(m.getTime()) || 0,
    }));

    const result = { topSuppliers, monthlySeries };
    await this.cache.set(key, result, 120);
    return result;
  }

  async create(dto: CreatePurchaseOrderDto, userId: string, companyId: string) {
    if (!dto.items?.length) {
      throw new BadRequestException(
        'A purchase order must include at least one item',
      );
    }

    // Verify supplier belongs to company
    const supplier = await this.prisma.supplier.findFirst({
      where: { id: dto.supplierId, companyId },
    });

    if (!supplier) {
      throw new NotFoundException('Supplier not found');
    }

    // Generate reference number if not provided
    const referenceNumber =
      dto.referenceNumber ||
      `PO-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // Calculate totals
    const totalAmount = dto.items.reduce(
      (sum, item) => sum + item.quantity * item.unitCost,
      0,
    );

    // Create the purchase order with items
    const purchaseOrder = await this.prisma.purchaseOrder.create({
      data: {
        referenceNumber,
        billNumber: dto.billNumber ?? null,
        billDate: dto.billDate ? new Date(dto.billDate) : null,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        paymentStatus: dto.paymentStatus ?? 'PENDING',
        paymentMethod: dto.paymentMethod ?? null,
        orderDate: new Date(dto.orderDate),
        status: dto.status || OrderStatus.PENDING,
        totalAmount,
        supplierId: dto.supplierId,
        warehouseId: dto.warehouseId ?? null,
        notes: dto.notes,
        userId,
        companyId,
        items: {
          create: dto.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitCost: item.unitCost,
          })),
        },
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
              },
            },
          },
        },
        supplier: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    this.cache.del(LIST_KEY(companyId));
    this.cache.del(DASHBOARD_KEY(companyId));
    this.cache.del(STATS_KEY(companyId));

    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { name: true, role: true },
      });
      await this.auditLogService.create(
        {
          action: 'CREATE',
          entity: 'Purchase',
          entityId: purchaseOrder.id,
          details: JSON.stringify({
            referenceNumber: purchaseOrder.referenceNumber,
            amount: Number(purchaseOrder.totalAmount),
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

    return this.transformPurchase(purchaseOrder);
  }

  async findAll(companyId: string) {
    const key = LIST_KEY(companyId);
    const cached = await this.cache.get(key);
    if (cached) return cached;

    const purchases = await this.prisma.purchaseOrder.findMany({
      where: { companyId },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
              },
            },
          },
        },
        supplier: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        warehouse: {
          select: {
            id: true,
            name: true,
          },
        },
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
      orderBy: { orderDate: 'desc' },
    });

    // Batch query return statuses for all purchases
    const poIds = purchases.map((p) => p.id);
    const allReturns = await this.prisma.purchaseReturn.findMany({
      where: { purchaseOrderId: { in: poIds } },
      select: { purchaseOrderId: true, status: true },
    });
    const pendingMap = new Map<string, number>();
    const processingMap = new Map<string, number>();
    const completedMap = new Map<string, number>();
    for (const r of allReturns) {
      if (r.status === 'PENDING')
        pendingMap.set(
          r.purchaseOrderId,
          (pendingMap.get(r.purchaseOrderId) ?? 0) + 1,
        );
      else if (r.status === 'PROCESSING')
        processingMap.set(
          r.purchaseOrderId,
          (processingMap.get(r.purchaseOrderId) ?? 0) + 1,
        );
      else if (r.status === 'COMPLETED')
        completedMap.set(
          r.purchaseOrderId,
          (completedMap.get(r.purchaseOrderId) ?? 0) + 1,
        );
    }

    const result = purchases.map((p) =>
      this.transformPurchaseSummary(p, {
        pendingReturnCount: pendingMap.get(p.id) ?? 0,
        processingReturnCount: processingMap.get(p.id) ?? 0,
        completedReturnCount: completedMap.get(p.id) ?? 0,
      }),
    );
    await this.cache.set(key, result, 120);
    return result;
  }

  async findOne(id: string, companyId: string) {
    const key = ITEM_KEY(companyId, id);
    const cached = await this.cache.get(key);
    if (cached) return cached;

    const purchaseOrder = await this.prisma.purchaseOrder.findFirst({
      where: { id, companyId },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
              },
            },
          },
        },
        supplier: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        warehouse: {
          select: {
            id: true,
            name: true,
          },
        },
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    if (!purchaseOrder) {
      throw new NotFoundException('Purchase order not found');
    }

    const allRet = await this.prisma.purchaseReturn.findMany({
      where: { purchaseOrderId: id },
      select: { status: true },
    });
    const returnCounts = {
      pendingReturnCount: allRet.filter((r) => r.status === 'PENDING').length,
      processingReturnCount: allRet.filter((r) => r.status === 'PROCESSING')
        .length,
      completedReturnCount: allRet.filter((r) => r.status === 'COMPLETED')
        .length,
    };

    const result = this.transformPurchase(purchaseOrder, returnCounts);
    await this.cache.set(key, result, 120);
    return result;
  }

  async receive(
    id: string,
    warehouseId: string,
    userId: string,
    companyId: string,
  ) {
    const result = await this.prisma.$transaction(
      async (tx) => {
        // 1. Verify the warehouse belongs to this company
        const warehouse = await tx.warehouse.findFirst({
          where: { id: warehouseId, companyId },
        });

        if (!warehouse) {
          throw new NotFoundException('Warehouse not found');
        }

        // 2. Verify the purchase order exists and belongs to this company
        const purchaseOrder = await tx.purchaseOrder.findFirst({
          where: { id, companyId },
          include: {
            items: true,
          },
        });

        if (!purchaseOrder) {
          throw new NotFoundException('Purchase order not found');
        }

        if (purchaseOrder.status === OrderStatus.COMPLETED) {
          throw new BadRequestException(
            'This purchase order has already been received',
          );
        }

        // 2. Update the purchase order status to COMPLETED
        await tx.purchaseOrder.update({
          where: { id },
          data: {
            status: OrderStatus.COMPLETED,
            warehouseId: warehouseId,
          },
        });

        // 3. Update inventory for each item using atomic increment
        await Promise.all(
          purchaseOrder.items.map((item) =>
            tx.inventory.upsert({
              where: {
                productId_warehouseId: {
                  productId: item.productId,
                  warehouseId: warehouseId,
                },
              },
              create: {
                productId: item.productId,
                warehouseId: warehouseId,
                quantity: item.quantity,
              },
              update: {
                quantity: {
                  increment: item.quantity,
                },
              },
            }),
          ),
        );

        // Create stock ledger entries for each received item
        for (const item of purchaseOrder.items) {
          const inv = await tx.inventory.findUnique({
            where: {
              productId_warehouseId: {
                productId: item.productId,
                warehouseId,
              },
            },
          });

          await tx.stockLedger.create({
            data: {
              productId: item.productId,
              warehouseId,
              userId: purchaseOrder.userId,
              quantity: item.quantity,
              balance: inv?.quantity ?? item.quantity,
              type: 'PURCHASE',
              reference: purchaseOrder.referenceNumber,
              note: `Purchase order #${purchaseOrder.referenceNumber} received`,
            },
          });
        }

        // 4. Return the updated purchase order
        const po = await tx.purchaseOrder.findUnique({
          where: { id },
          include: {
            items: {
              include: {
                product: {
                  select: {
                    id: true,
                    name: true,
                    sku: true,
                  },
                },
              },
            },
            supplier: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            user: {
              select: {
                id: true,
                email: true,
                name: true,
              },
            },
          },
        });

        return this.transformPurchase(po);
      },
      { timeout: 20000 },
    );

    // Auto-create expense only when purchase is received (payment completed)
    try {
      const expenseCategory = await this.prisma.expenseCategory.upsert({
        where: { companyId_name: { companyId, name: 'Purchases' } },
        update: {},
        create: { name: 'Purchases', companyId },
      });
      await this.prisma.expense.create({
        data: {
          reference: result.referenceNumber,
          amount: result.totalAmount,
          expenseDate: new Date(result.orderDate),
          vendor: result.supplier.name,
          categoryId: expenseCategory.id,
          purchaseOrderId: result.id,
          description: `Purchase order ${result.referenceNumber} received`,
          userId: result.userId,
          companyId,
        },
      });
    } catch {
      // Expense creation is non-critical
    }

    this.cache.del(ITEM_KEY(companyId, result.id));
    this.cache.del(LIST_KEY(companyId));
    this.cache.del(DASHBOARD_KEY(companyId));
    this.cache.del(STATS_KEY(companyId));

    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { name: true, role: true },
      });
      await this.auditLogService.create(
        {
          action: 'RECEIVE',
          entity: 'Purchase',
          entityId: result.id,
          details: JSON.stringify({
            referenceNumber: result.referenceNumber,
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

    return result;
  }

  async markAsPaid(id: string, userId: string, companyId: string) {
    const existing = await this.prisma.purchaseOrder.findFirst({
      where: { id, companyId },
    });

    if (!existing) {
      throw new NotFoundException('Purchase order not found');
    }

    if (existing.paymentStatus === PaymentStatus.PAID) {
      throw new BadRequestException('This bill is already marked as paid');
    }

    const po = await this.prisma.purchaseOrder.update({
      where: { id },
      data: { paymentStatus: PaymentStatus.PAID },
      include: {
        items: {
          include: {
            product: { select: { id: true, name: true, sku: true } },
          },
        },
        supplier: { select: { id: true, name: true, email: true } },
        warehouse: { select: { id: true, name: true } },
        user: { select: { id: true, email: true, name: true } },
      },
    });

    const result = this.transformPurchase(po);

    this.cache.del(ITEM_KEY(companyId, result.id));
    this.cache.del(LIST_KEY(companyId));
    this.cache.del(DASHBOARD_KEY(companyId));
    this.cache.del(STATS_KEY(companyId));

    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { name: true, role: true },
      });
      await this.auditLogService.create(
        {
          action: 'MARK_PAID',
          entity: 'Purchase',
          entityId: result.id,
          details: JSON.stringify({
            referenceNumber: result.referenceNumber,
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

    return result;
  }

  async update(id: string, dto: UpdatePurchaseOrderDto, companyId: string) {
    // Verify purchase order exists
    const existing = await this.prisma.purchaseOrder.findFirst({
      where: { id, companyId },
    });

    if (!existing) {
      throw new NotFoundException('Purchase order not found');
    }

    // Verify supplier belongs to company
    const supplier = await this.prisma.supplier.findFirst({
      where: { id: dto.supplierId, companyId },
    });

    if (!supplier) {
      throw new NotFoundException('Supplier not found');
    }

    // Verify warehouse belongs to company if provided
    if (dto.warehouseId) {
      const warehouse = await this.prisma.warehouse.findFirst({
        where: { id: dto.warehouseId, companyId },
      });
      if (!warehouse) {
        throw new NotFoundException('Warehouse not found');
      }
    }

    // Calculate totals
    const totalAmount = dto.items.reduce(
      (sum, item) => sum + item.quantity * item.unitCost,
      0,
    );

    // Delete old items and recreate
    await this.prisma.purchaseOrderItem.deleteMany({
      where: { purchaseOrderId: id },
    });

    const purchaseOrder = await this.prisma.purchaseOrder.update({
      where: { id },
      data: {
        supplierId: dto.supplierId,
        billNumber: dto.billNumber ?? null,
        billDate: dto.billDate ? new Date(dto.billDate) : null,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        paymentStatus: dto.paymentStatus ?? undefined,
        paymentMethod: dto.paymentMethod ?? null,
        orderDate: new Date(dto.orderDate),
        warehouseId: dto.warehouseId ?? null,
        notes: dto.notes,
        totalAmount,
        items: {
          create: dto.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitCost: item.unitCost,
          })),
        },
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
              },
            },
          },
        },
        supplier: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        warehouse: {
          select: {
            id: true,
            name: true,
          },
        },
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    this.cache.del(ITEM_KEY(companyId, id));
    this.cache.del(LIST_KEY(companyId));
    this.cache.del(DASHBOARD_KEY(companyId));
    this.cache.del(STATS_KEY(companyId));

    return this.transformPurchase(purchaseOrder);
  }

  async remove(id: string, companyId: string) {
    const existing = await this.prisma.purchaseOrder.findFirst({
      where: { id, companyId },
    });

    if (!existing) {
      throw new NotFoundException('Purchase order not found');
    }

    await this.prisma.purchaseOrderItem.deleteMany({
      where: { purchaseOrderId: id },
    });

    await this.prisma.purchaseOrder.delete({
      where: { id },
    });

    this.cache.del(ITEM_KEY(companyId, id));
    this.cache.del(LIST_KEY(companyId));
    this.cache.del(DASHBOARD_KEY(companyId));
    this.cache.del(STATS_KEY(companyId));

    return { message: 'Purchase order deleted successfully' };
  }

  private decimalToNumber(value: any): number {
    if (value === null || value === undefined) return 0;
    return typeof value === 'number' ? value : Number(value);
  }

  private roundCurrency(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  private transformPurchaseItem(item: any) {
    const unitCost = this.decimalToNumber(item.unitCost);
    return {
      id: item.id,
      productId: item.productId,
      productName: item.product?.name ?? item.productId,
      productSku: item.product?.sku ?? null,
      quantity: item.quantity,
      returnedQuantity: item.returnedQuantity ?? 0,
      unitCost,
      total: this.roundCurrency(item.quantity * unitCost),
    };
  }

  private transformPurchaseSummary(
    po: any,
    returnCounts?: {
      pendingReturnCount: number;
      processingReturnCount: number;
      completedReturnCount: number;
    },
  ) {
    const {
      pendingReturnCount = 0,
      processingReturnCount = 0,
      completedReturnCount = 0,
    } = returnCounts ?? {};
    const total = this.decimalToNumber(po.totalAmount);
    const items =
      po.items?.map((i: any) => this.transformPurchaseItem(i)) ?? [];

    const returnedValue = items.reduce(
      (sum: number, i: any) => sum + (i.returnedQuantity ?? 0) * i.unitCost,
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
      id: po.id,
      referenceNumber: po.referenceNumber,
      billNumber: po.billNumber ?? null,
      billDate: po.billDate ? po.billDate.toISOString() : null,
      dueDate: po.dueDate ? po.dueDate.toISOString() : null,
      paymentStatus: po.paymentStatus ?? 'PENDING',
      paymentMethod: po.paymentMethod ?? null,
      orderDate: po.orderDate.toISOString(),
      status: po.status,
      hasReturns: Boolean(po.hasReturns),
      pendingReturnCount,
      processingReturnCount,
      completedReturnCount,
      returnStatus,
      returnedValue: this.roundCurrency(returnedValue),
      netTotal: this.roundCurrency(total - returnedValue),
      subtotal: 0,
      totalAmount: total,
      supplier: po.supplier
        ? { id: po.supplier.id, name: po.supplier.name }
        : null,
      warehouseId: po.warehouseId ?? null,
      warehouse: po.warehouse
        ? { id: po.warehouse.id, name: po.warehouse.name }
        : null,
      items,
    };
  }

  private transformPurchase(
    po: any,
    returnCounts?: {
      pendingReturnCount: number;
      processingReturnCount: number;
      completedReturnCount: number;
    },
  ) {
    return {
      ...this.transformPurchaseSummary(po, returnCounts),
      notes: po.notes ?? null,
      createdAt: po.createdAt.toISOString(),
      updatedAt: po.updatedAt.toISOString(),
    };
  }
}
