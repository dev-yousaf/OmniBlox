import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrderStatus, PaymentStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSaleDto, CreateSaleItemDto } from './dto/create-sale.dto';
import { UpdateSaleDto } from './dto/update-sale.dto';
import {
  SaleItemResponseDto,
  SaleResponseDto,
  SaleSummaryDto,
  SalesListResponseDto,
  SalesStatsDto,
} from './dto/sale-response.dto';

@Injectable()
export class SalesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Dashboard-specific sales aggregations
   */
  async getDashboardStats(companyId: string) {
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

    // Build a 6-month series (including current month) for monthly trends
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
      return this.prisma.sale.aggregate({
        where: {
          companyId,
          saleDate: { gte: start, lte: end },
          status: { not: 'CANCELLED' },
        },
        _count: { id: true },
        _sum: { totalAmount: true },
      });
    });

    const monthAggs = await Promise.all(monthlyQueries);
    const monthlySeries = monthAggs.map((mAgg, idx) => ({
      month: months[idx].toLocaleString('default', { month: 'short' }),
      invoices: mAgg._count.id || 0,
      revenue: Number(mAgg._sum.totalAmount || 0),
    }));

    // previous month metrics for percent change calculations
    const prevMonthIndex = monthlySeries.length - 2;
    const prevMonth = monthlySeries[prevMonthIndex] || {
      invoices: 0,
      revenue: 0,
    };

    return {
      invoicesThisMonth,
      totalRevenue,
      topCustomers,
      monthlySeries,
      previousMonth: {
        invoices: prevMonth.invoices,
        revenue: prevMonth.revenue,
      },
    };
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

    return this.prisma.$transaction(
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
          await this.decrementInventoryFromWarehouse(
            tx,
            dto.items,
            dto.warehouseId,
          );
          await this.createStockLedgerEntries(
            tx,
            dto.items,
            dto.warehouseId,
            sale.userId,
            sale.invoiceNumber,
            'SALE',
            `Sale #${sale.invoiceNumber}`,
            -1,
          );
        }

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

    // Batch query pending returns for all sales
    const saleIds = sales.map((s) => s.id);
    const pendingGroups = await this.prisma.salesReturn.groupBy({
      by: ['saleId'],
      where: {
        saleId: { in: saleIds },
        status: 'PENDING',
      },
      _count: { id: true },
    });
    const pendingMap = new Map<string, number>();
    for (const g of pendingGroups) {
      pendingMap.set(g.saleId, Number(g._count.id));
    }

    return {
      sales: sales.map((sale) =>
        this.transformSaleSummary(sale, pendingMap.get(sale.id) ?? 0),
      ),
      total,
      pages: limit === 0 ? 1 : Math.max(1, Math.ceil(total / limit)),
    };
  }

  async findOne(id: string, companyId: string): Promise<SaleResponseDto> {
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

    const pendingCount = await this.prisma.salesReturn.count({
      where: { saleId: id, status: 'PENDING' },
    });

    return this.transformSale(sale, pendingCount);
  }

  async update(
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
          await this.adjustInventory(
            tx,
            existing.items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
            })),
            'increment',
            companyId,
          );
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

        if (dto.items) {
          await this.adjustInventory(tx, dto.items, 'decrement', companyId);
          await this.createStockLedgerEntries(
            tx,
            dto.items,
            dto.warehouseId ?? existing.warehouseId ?? '',
            updated.userId,
            updated.invoiceNumber,
            'SALE',
            `Sale #${updated.invoiceNumber} item update`,
            -1,
          );
        }

        // Handle inventory adjustments based on status changes
        if (newStatus !== existing.status) {
          if (
            newStatus === OrderStatus.COMPLETED &&
            existing.status !== OrderStatus.COMPLETED
          ) {
            // Sale completed - decrement inventory
            await this.adjustInventory(
              tx,
              updated.items.map((item) => ({
                productId: item.productId,
                quantity: item.quantity,
              })),
              'decrement',
              companyId,
            );
            await this.createStockLedgerEntries(
              tx,
              updated.items.map((item) => ({
                productId: item.productId,
                quantity: item.quantity,
                unitPrice: Number(item.unitPrice),
              })),
              dto.warehouseId ?? existing.warehouseId ?? '',
              updated.userId,
              updated.invoiceNumber,
              'SALE',
              `Sale #${updated.invoiceNumber} completed`,
              -1,
            );
          } else if (
            newStatus === OrderStatus.CANCELLED &&
            existing.status === OrderStatus.COMPLETED
          ) {
            // Sale cancelled after being completed - increment inventory back
            await this.adjustInventory(
              tx,
              updated.items.map((item) => ({
                productId: item.productId,
                quantity: item.quantity,
              })),
              'increment',
              companyId,
            );
            await this.createStockLedgerEntries(
              tx,
              updated.items.map((item) => ({
                productId: item.productId,
                quantity: item.quantity,
                unitPrice: Number(item.unitPrice),
              })),
              dto.warehouseId ?? existing.warehouseId ?? '',
              updated.userId,
              updated.invoiceNumber,
              'SALE',
              `Sale #${updated.invoiceNumber} cancelled`,
              1,
            );
          }
        }

        return this.transformSale(updated);
      },
      { timeout: 20000 },
    );
  }

  async remove(id: string, companyId: string): Promise<void> {
    await this.prisma.$transaction(
      async (tx) => {
        const sale = await tx.sale.findUnique({
          where: { id, companyId },
          include: { items: true },
        });

        if (!sale) {
          throw new NotFoundException('Sale not found');
        }

        await this.adjustInventory(
          tx,
          sale.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
          })),
          'increment',
          companyId,
        );

        await this.createStockLedgerEntries(
          tx,
          sale.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: Number(item.unitPrice),
          })),
          sale.warehouseId ?? '',
          sale.userId,
          sale.invoiceNumber,
          'SALE',
          `Sale #${sale.invoiceNumber} deleted`,
          1,
        );

        await tx.sale.delete({ where: { id } });
      },
      { timeout: 20000 },
    );
  }

  async markAsPaid(id: string, companyId: string): Promise<SaleResponseDto> {
    return this.prisma.$transaction(
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
        if (wasPending) {
          await this.decrementInventoryFromWarehouse(
            tx,
            sale.items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: Number(item.unitPrice),
            })),
            sale.warehouseId ?? '',
          );
          await this.createStockLedgerEntries(
            tx,
            sale.items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: Number(item.unitPrice),
            })),
            sale.warehouseId ?? '',
            sale.userId,
            sale.invoiceNumber,
            'SALE',
            `Sale #${sale.invoiceNumber} marked as paid`,
            -1,
          );
        }

        return this.transformSale(sale);
      },
      { timeout: 20000 },
    );
  }

  async getStats(companyId: string): Promise<SalesStatsDto> {
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

    return {
      totalSales,
      totalRevenue: this.decimalToNumber(paidAmount._sum.totalAmount),
      pendingAmount: this.decimalToNumber(pendingAmount._sum.totalAmount),
      overdueAmount: this.decimalToNumber(overdueAmount._sum.totalAmount),
      paidInvoices,
      pendingInvoices,
      overdueInvoices,
    };
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

  private transformSaleSummary(sale: any, pendingReturnCount = 0): SaleSummaryDto {
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

  private transformSale(sale: any, pendingReturnCount = 0): SaleResponseDto {
    return {
      ...this.transformSaleSummary(sale, pendingReturnCount),
      notes: sale.notes,
      items: sale.items.map((item) => this.transformSaleItem(item)),
    };
  }

  private async adjustInventory(
    tx: any,
    items: { productId: string; quantity: number }[],
    direction: 'increment' | 'decrement',
    companyId: string,
  ): Promise<void> {
    for (const item of items) {
      if (direction === 'decrement') {
        await this.decrementInventory(
          tx,
          item.productId,
          item.quantity,
          companyId,
        );
      } else {
        await this.incrementInventory(
          tx,
          item.productId,
          item.quantity,
          companyId,
        );
      }
    }
  }

  private async decrementInventory(
    tx: any,
    productId: string,
    quantity: number,
    companyId: string,
  ) {
    if (quantity <= 0) {
      return;
    }

    const inventoryRecords = await tx.inventory.findMany({
      where: {
        productId,
        warehouse: { companyId },
      },
      orderBy: { createdAt: 'asc' },
    });

    if (!inventoryRecords.length) {
      throw new BadRequestException(
        'No inventory found for the requested product',
      );
    }

    let remaining = quantity;

    for (const record of inventoryRecords) {
      if (remaining <= 0) {
        break;
      }

      if (record.quantity <= 0) {
        continue;
      }

      const deduction = Math.min(record.quantity, remaining);
      await tx.inventory.update({
        where: {
          productId_warehouseId: {
            productId: record.productId,
            warehouseId: record.warehouseId,
          },
        },
        data: {
          quantity: { decrement: deduction },
        },
      });
      remaining -= deduction;
    }

    if (remaining > 0) {
      throw new BadRequestException('Insufficient stock to complete this sale');
    }
  }

  private async incrementInventory(
    tx: any,
    productId: string,
    quantity: number,
    companyId: string,
  ) {
    if (quantity <= 0) {
      return;
    }

    const existing = await tx.inventory.findMany({
      where: {
        productId,
        warehouse: { companyId },
      },
      orderBy: { createdAt: 'asc' },
    });

    if (existing.length) {
      const target = existing[0];
      await tx.inventory.update({
        where: {
          productId_warehouseId: {
            productId: target.productId,
            warehouseId: target.warehouseId,
          },
        },
        data: {
          quantity: { increment: quantity },
        },
      });
      return;
    }

    const warehouse =
      (await tx.warehouse.findFirst({
        where: { companyId },
        orderBy: { createdAt: 'asc' },
      })) ??
      (await tx.warehouse.create({
        data: {
          name: 'Default Warehouse',
          location: 'Default Location',
          companyId,
        },
      }));

    await tx.inventory.create({
      data: {
        productId,
        warehouseId: warehouse.id,
        quantity,
      },
    });
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
  ): Promise<void> {
    const aggregated = this.aggregateQuantities(items);

    const checks = Array.from(aggregated.entries()).map(
      async ([productId, quantityNeeded]) => {
        const inventoryRecord = await tx.inventory.findUnique({
          where: {
            productId_warehouseId: {
              productId,
              warehouseId,
            },
          },
        });

        const available = inventoryRecord?.quantity ?? 0;

        if (available < quantityNeeded) {
          const productName = productMap.get(productId)?.name ?? productId;
          throw new BadRequestException(
            `Insufficient stock for product "${productName}" in selected warehouse. Available: ${available}, Needed: ${quantityNeeded}`,
          );
        }
      },
    );

    await Promise.all(checks);
  }

  /**
   * Atomically decrement inventory quantities from the specific warehouse.
   * Uses Prisma's atomic decrement to ensure thread-safe stock updates.
   * This is called within the sale creation transaction.
   */
  private async decrementInventoryFromWarehouse(
    tx: any,
    items: CreateSaleItemDto[],
    warehouseId: string,
  ): Promise<void> {
    for (const item of items) {
      await tx.inventory.update({
        where: {
          productId_warehouseId: {
            productId: item.productId,
            warehouseId: warehouseId,
          },
        },
        data: {
          quantity: {
            decrement: item.quantity,
          },
        },
      });
    }
  }

  private async createStockLedgerEntries(
    tx: any,
    items: { productId: string; quantity: number; unitPrice?: number }[],
    warehouseId: string,
    userId: string,
    reference: string,
    type: string,
    note: string,
    sign: 1 | -1,
  ): Promise<void> {
    for (const item of items) {
      const inventory = await tx.inventory.findUnique({
        where: {
          productId_warehouseId: {
            productId: item.productId,
            warehouseId: warehouseId,
          },
        },
      });

      const quantityChange = item.quantity * sign;
      const currentBalance = inventory?.quantity ?? 0;

      await tx.stockLedger.create({
        data: {
          productId: item.productId,
          warehouseId,
          userId,
          quantity: quantityChange,
          balance: currentBalance,
          type,
          reference,
          note,
        },
      });
    }
  }
}
