import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { OrderStatus } from '@prisma/client';

@Injectable()
export class PurchasesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Dashboard-specific purchase aggregations
   */
  async getDashboardStats(companyId: string) {
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

    // Build a 6-month series for purchases
    const months = Array.from({ length: 6 }).map((_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - (5 - i));
      return new Date(d.getFullYear(), d.getMonth(), 1);
    });

    const monthlyQueries = months.map((m) => {
      const start = new Date(m.getFullYear(), m.getMonth(), 1);
      const end = new Date(
        m.getFullYear(),
        m.getMonth() + 1,
        0,
        23,
        59,
        59,
        999,
      );
      return this.prisma.purchaseOrder.aggregate({
        where: {
          companyId,
          orderDate: { gte: start, lte: end },
          status: { not: 'CANCELLED' },
        },
        _sum: { totalAmount: true },
      });
    });

    const monthAggs = await Promise.all(monthlyQueries);
    const monthlySeries = monthAggs.map((mAgg, idx) => ({
      month: months[idx].toLocaleString('default', { month: 'short' }),
      total: Number(mAgg._sum.totalAmount || 0),
    }));

    return { topSuppliers, monthlySeries };
  }

  async create(dto: CreatePurchaseOrderDto, userId: string, companyId: string) {
    if (!dto.items?.length) {
      throw new BadRequestException(
        'A purchase order must include at least one item',
      );
    }

    // Verify supplier belongs to company
    const supplier = await this.prisma.supplier.findUnique({
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
        orderDate: new Date(dto.orderDate),
        status: dto.status || OrderStatus.PENDING,
        totalAmount,
        supplierId: dto.supplierId,
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

    return this.transformPurchase(purchaseOrder);
  }

  async findAll(companyId: string) {
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

    return purchases.map((p) => this.transformPurchaseSummary(p));
  }

  async findOne(id: string, companyId: string) {
    const purchaseOrder = await this.prisma.purchaseOrder.findUnique({
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

    return this.transformPurchase(purchaseOrder);
  }

  async receive(id: string, warehouseId: string, companyId: string) {
    return this.prisma.$transaction(
      async (tx) => {
        // 1. Verify the warehouse belongs to this company
        const warehouse = await tx.warehouse.findUnique({
          where: { id: warehouseId, companyId },
        });

        if (!warehouse) {
          throw new NotFoundException('Warehouse not found');
        }

        // 2. Verify the purchase order exists and belongs to this company
        const purchaseOrder = await tx.purchaseOrder.findUnique({
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
      quantity: item.quantity,
      returnedQuantity: item.returnedQuantity ?? 0,
      unitCost,
      total: this.roundCurrency(item.quantity * unitCost),
    };
  }

  private transformPurchaseSummary(po: any) {
    const total = this.decimalToNumber(po.totalAmount);
    return {
      id: po.id,
      referenceNumber: po.referenceNumber,
      orderDate: po.orderDate.toISOString(),
      status: po.status,
      hasReturns: Boolean(po.hasReturns),
      subtotal: 0, // not currently tracked separately for purchases
      totalAmount: total,
      supplier: po.supplier
        ? { id: po.supplier.id, name: po.supplier.name }
        : null,
      warehouseId: po.warehouseId ?? null,
      warehouse: po.warehouse
        ? { id: po.warehouse.id, name: po.warehouse.name }
        : null,
      items: po.items?.map((i) => this.transformPurchaseItem(i)) ?? [],
    };
  }

  private transformPurchase(po: any) {
    return {
      ...this.transformPurchaseSummary(po),
      notes: po.notes ?? null,
      createdAt: po.createdAt.toISOString(),
      updatedAt: po.updatedAt.toISOString(),
    };
  }
}
