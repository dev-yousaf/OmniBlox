import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../cache/cache.service';
import { StockService } from '../inventory/stock.service';
import { CreateStockAdjustmentDto } from './dto/create-stock-adjustment.dto';

@Injectable()
export class StockAdjustmentsService {
  private readonly LIST_KEY = (cid: string) => `stock-adjustments:list:${cid}`;
  private readonly ITEM_KEY = (cid: string, id: string) =>
    `stock-adjustments:item:${cid}:${id}`;

  constructor(
    private readonly prisma: PrismaService,
    private cache: CacheService,
    private readonly stockService: StockService,
  ) {}

  async create(
    dto: CreateStockAdjustmentDto,
    userId: string,
    companyId: string,
  ) {
    if (!dto.items?.length) {
      throw new BadRequestException(
        'A stock adjustment must include at least one item',
      );
    }

    const result = await this.prisma.$transaction(
      async (tx) => {
        // Verify warehouse belongs to company
        const warehouse = await tx.warehouse.findUnique({
          where: { id: dto.warehouseId, companyId },
        });

        if (!warehouse) {
          throw new BadRequestException('Warehouse not found');
        }

        // Read current quantities for all items
        const itemsWithPreviousQuantities = await Promise.all(
          dto.items.map(async (item) => {
            const inventory = await tx.inventory.findUnique({
              where: {
                productId_warehouseId: {
                  productId: item.productId,
                  warehouseId: dto.warehouseId,
                },
              },
            });

            const previousQuantity = inventory?.quantity ?? 0;
            const difference = item.newQuantity - previousQuantity;

            return {
              ...item,
              previousQuantity,
              difference,
            };
          }),
        );

        // Generate reference number
        const referenceNumber = `SA-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

        // Calculate totals
        const totalItems = dto.items.length;
        const netChange = itemsWithPreviousQuantities.reduce(
          (sum, item) => sum + item.difference,
          0,
        );

        // Create the main StockAdjustment record
        const stockAdjustment = await tx.stockAdjustment.create({
          data: {
            referenceNumber,
            companyId,
            userId,
            notes: dto.notes ?? null,
            adjustmentDate: new Date(dto.adjustmentDate),
            totalItems,
            netChange,
          },
        });

        // Create all StockAdjustmentItem records
        await Promise.all(
          itemsWithPreviousQuantities.map((item) =>
            tx.stockAdjustmentItem.create({
              data: {
                stockAdjustmentId: stockAdjustment.id,
                productId: item.productId,
                warehouseId: dto.warehouseId,
                previousQuantity: item.previousQuantity,
                newQuantity: item.newQuantity,
                difference: item.difference,
              },
            }),
          ),
        );

        // Adjust inventory records to the new quantities
        await Promise.all(
          itemsWithPreviousQuantities.map((item) =>
            this.stockService.adjustStock(tx, {
              companyId,
              productId: item.productId,
              warehouseId: dto.warehouseId,
              newQuantity: item.newQuantity,
              reference: referenceNumber,
              type: 'ADJUSTMENT',
              note: `Stock adjustment #${referenceNumber}`,
              userId,
            }),
          ),
        );

        // Return the complete adjustment with items
        return tx.stockAdjustment.findUnique({
          where: { id: stockAdjustment.id },
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
                warehouse: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
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
      },
      { timeout: 20000 },
    );

    await this.cache.del(this.LIST_KEY(companyId));
    await this.cache.del(this.ITEM_KEY(companyId, result.id));
    await this.stockService.invalidateStockCaches(
      companyId,
      dto.items.map((item) => item.productId),
      [dto.warehouseId],
    );
    return result;
  }

  async findAll(companyId: string) {
    const cacheKey = this.LIST_KEY(companyId);
    const cached = await this.cache.get<any[]>(cacheKey);
    if (cached) return cached;

    const result = await this.prisma.stockAdjustment.findMany({
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
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { adjustmentDate: 'desc' },
    });

    await this.cache.set(cacheKey, result, 120);
    return result;
  }

  async findOne(id: string, companyId: string) {
    const cacheKey = this.ITEM_KEY(companyId, id);
    const cached = await this.cache.get<any>(cacheKey);
    if (cached) return cached;

    const result = await this.prisma.stockAdjustment.findUnique({
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
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    await this.cache.set(cacheKey, result, 300);
    return result;
  }
}
