import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../cache/cache.service';
import {
  CreateWarehouseDto,
  UpdateWarehouseDto,
  InventoryQueryDto,
  UpdateInventoryDto,
  StockTransferDto,
  BulkStockTransferDto,
  CreateStockAdjustmentDto,
  InventoryStatsDto,
  InventoryItemDto,
  WarehouseInventoryDto,
} from './dto/inventory.dto';

const INV_LIST_KEY = (cid: string, page?: number, filter?: string) =>
  `inventory:${cid}:list:${page ?? 1}:${filter ?? ''}`;
const WAREHOUSE_KEY = (cid: string) => `inventory:${cid}:warehouses`;
const WH_ITEM_KEY = (cid: string, id: string) => `inventory:${cid}:wh:${id}`;
const PROD_INV_KEY = (cid: string, pid: string) => `inventory:${cid}:prod:${pid}`;
const WH_INV_KEY = (cid: string, wid: string) => `inventory:${cid}:whinv:${wid}`;
const STATS_KEY = (cid: string) => `inventory:${cid}:stats`;
const ADJ_LIST_KEY = (cid: string, page?: number) => `inventory:${cid}:adj:${page ?? 1}`;
const TRANSFER_LIST_KEY = (cid: string, page?: number) => `inventory:${cid}:transfers:${page ?? 1}`;
const TRANSFER_KEY = (cid: string, id: string) => `inventory:${cid}:transfer:${id}`;

@Injectable()
export class InventoryService {
  constructor(
    private prisma: PrismaService,
    private cache: CacheService,
  ) {}

  // === WAREHOUSE MANAGEMENT ===
  async createWarehouse(companyId: string, dto: CreateWarehouseDto) {
    const result = await this.prisma.warehouse.create({
      data: {
        ...dto,
        companyId,
      },
    });
    await this.invalidateWarehouseCache(companyId);
    return result;
  }

  async getWarehouses(companyId: string) {
    const cached = await this.cache.get<any[]>(WAREHOUSE_KEY(companyId));
    if (cached) return cached;

    const result = await this.prisma.warehouse.findMany({
      where: { companyId },
      include: {
        _count: {
          select: {
            inventory: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    await this.cache.set(WAREHOUSE_KEY(companyId), result, 300);
    return result;
  }

  async getWarehouse(companyId: string, id: string) {
    const cacheKey = WH_ITEM_KEY(companyId, id);
    const cached = await this.cache.get<any>(cacheKey);
    if (cached) return cached;

    const warehouse = await this.prisma.warehouse.findFirst({
      where: { id, companyId },
      include: {
        inventory: {
          include: {
            product: {
              include: {
                category: true,
                brand: true,
              },
            },
          },
        },
      },
    });

    if (!warehouse) {
      throw new NotFoundException('Warehouse not found');
    }

    await this.cache.set(cacheKey, warehouse, 300);
    return warehouse;
  }

  async updateWarehouse(
    companyId: string,
    id: string,
    dto: UpdateWarehouseDto,
  ) {
    const warehouse = await this.prisma.warehouse.findFirst({
      where: { id, companyId },
    });

    if (!warehouse) {
      throw new NotFoundException('Warehouse not found');
    }

    const result = await this.prisma.warehouse.update({
      where: { id },
      data: dto,
    });

    await this.invalidateWarehouseCache(companyId, id);

    return result;
  }

  async deleteWarehouse(companyId: string, id: string) {
    const warehouse = await this.prisma.warehouse.findFirst({
      where: { id, companyId },
      include: {
        inventory: true,
      },
    });

    if (!warehouse) {
      throw new NotFoundException('Warehouse not found');
    }

    if (warehouse.inventory.length > 0) {
      throw new BadRequestException(
        'Cannot delete warehouse with existing inventory',
      );
    }

    await this.prisma.warehouse.delete({
      where: { id },
    });

    await this.invalidateWarehouseCache(companyId, id);

    return { message: 'Warehouse deleted successfully' };
  }

  // === INVENTORY MANAGEMENT ===
  async getInventory(companyId: string, query: InventoryQueryDto) {
    const { page = 1, limit = 10, search, warehouseId, filter } = query;
    const skip = (page - 1) * limit;

    const shouldCache = !search && !warehouseId;
    const cacheKey = INV_LIST_KEY(companyId, page, filter);
    if (shouldCache) {
      const cached = await this.cache.get<any>(cacheKey);
      if (cached) return cached;
    }

    // Build where clause
    const where: any = {
      product: {
        companyId,
      },
    };

    if (warehouseId) {
      where.warehouseId = warehouseId;
    }

    if (search) {
      where.OR = [
        {
          product: {
            name: {
              contains: search,
              mode: 'insensitive',
            },
          },
        },
        {
          product: {
            sku: {
              contains: search,
              mode: 'insensitive',
            },
          },
        },
      ];
    }

    // Apply filter conditions
    if (filter === 'low_stock') {
      where.AND = [
        {
          quantity: {
            gt: 0,
          },
        },
        {
          product: {
            reorderLevel: {
              gt: 0,
            },
          },
        },
      ];
      // Add a custom condition for low stock in the query
    } else if (filter === 'out_of_stock') {
      where.quantity = 0;
    }

    const [inventory, total] = await Promise.all([
      this.prisma.inventory.findMany({
        where,
        include: {
          product: {
            include: {
              category: true,
              brand: true,
            },
          },
          warehouse: true,
        },
        skip,
        take: limit,
        orderBy: [{ product: { name: 'asc' } }, { warehouse: { name: 'asc' } }],
      }),
      this.prisma.inventory.count({ where }),
    ]);

    // Filter low stock items if needed (since Prisma doesn't support complex comparisons easily)
    let filteredInventory = inventory;
    if (filter === 'low_stock') {
      filteredInventory = inventory.filter(
        (item) =>
          item.quantity > 0 &&
          item.product.reorderLevel > 0 &&
          item.quantity <= item.product.reorderLevel,
      );
    }

    const items: InventoryItemDto[] = filteredInventory.map((item) => ({
      productId: item.productId,
      productName: item.product.name,
      productSku: item.product.sku,
      imageUrl: item.product.imageUrl,
      warehouseId: item.warehouseId,
      warehouseName: item.warehouse.name,
      quantity: item.quantity,
      salePrice: Number(item.product.salePrice),
      costPrice: Number(item.product.costPrice),
      reorderLevel: item.product.reorderLevel,
      stockValue: item.quantity * Number(item.product.costPrice),
      status: this.getStockStatus(item.quantity, item.product.reorderLevel),
      category: item.product.category.name,
      brand: item.product.brand?.name,
      updatedAt: item.updatedAt.toISOString(),
    }));

    const result = {
      inventory: items,
      total: filter === 'low_stock' ? filteredInventory.length : total,
      pages: Math.ceil(
        (filter === 'low_stock' ? filteredInventory.length : total) / limit,
      ),
    };

    if (shouldCache) {
      await this.cache.set(cacheKey, result, 120);
    }

    return result;
  }

  async getProductInventory(
    companyId: string,
    productId: string,
  ): Promise<InventoryItemDto[]> {
    const cacheKey = PROD_INV_KEY(companyId, productId);
    const cached = await this.cache.get<any[]>(cacheKey);
    if (cached) return cached;

    // Verify product belongs to company
    const product = await this.prisma.product.findFirst({
      where: { id: productId, companyId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const inventory = await this.prisma.inventory.findMany({
      where: {
        productId,
        warehouse: {
          companyId,
        },
      },
      include: {
        product: {
          include: {
            category: true,
            brand: true,
          },
        },
        warehouse: true,
      },
      orderBy: { warehouse: { name: 'asc' } },
    });

    const result = inventory.map((item) => ({
      productId: item.productId,
      productName: item.product.name,
      productSku: item.product.sku,
      imageUrl: item.product.imageUrl,
      warehouseId: item.warehouseId,
      warehouseName: item.warehouse.name,
      quantity: item.quantity,
      salePrice: Number(item.product.salePrice),
      costPrice: Number(item.product.costPrice),
      reorderLevel: item.product.reorderLevel,
      stockValue: item.quantity * Number(item.product.costPrice),
      status: this.getStockStatus(item.quantity, item.product.reorderLevel),
      category: item.product.category.name,
      brand: item.product.brand?.name,
      updatedAt: item.updatedAt.toISOString(),
    }));

    await this.cache.set(cacheKey, result, 120);
    return result;
  }

  async getWarehouseInventory(
    companyId: string,
    warehouseId: string,
  ): Promise<WarehouseInventoryDto> {
    const cacheKey = WH_INV_KEY(companyId, warehouseId);
    const cached = await this.cache.get<any>(cacheKey);
    if (cached) return cached;

    const warehouse = await this.prisma.warehouse.findFirst({
      where: { id: warehouseId, companyId },
      include: {
        inventory: {
          include: {
            product: {
              include: {
                category: true,
                brand: true,
              },
            },
          },
        },
      },
    });

    if (!warehouse) {
      throw new NotFoundException('Warehouse not found');
    }

    const inventory: InventoryItemDto[] = warehouse.inventory.map((item) => ({
      productId: item.productId,
      productName: item.product.name,
      productSku: item.product.sku,
      imageUrl: item.product.imageUrl,
      warehouseId: item.warehouseId,
      warehouseName: warehouse.name,
      quantity: item.quantity,
      salePrice: Number(item.product.salePrice),
      costPrice: Number(item.product.costPrice),
      reorderLevel: item.product.reorderLevel,
      stockValue: item.quantity * Number(item.product.costPrice),
      status: this.getStockStatus(item.quantity, item.product.reorderLevel),
      category: item.product.category.name,
      brand: item.product.brand?.name,
      updatedAt: item.updatedAt.toISOString(),
    }));

    const totalStockValue = inventory.reduce(
      (sum, item) => sum + item.stockValue,
      0,
    );
    const lowStockCount = inventory.filter(
      (item) => item.status === 'low_stock',
    ).length;
    const outOfStockCount = inventory.filter(
      (item) => item.status === 'out_of_stock',
    ).length;

    const result = {
      warehouseId: warehouse.id,
      warehouseName: warehouse.name,
      location: warehouse.location,
      totalProducts: inventory.length,
      totalStockValue,
      lowStockCount,
      outOfStockCount,
      inventory,
    };

    await this.cache.set(cacheKey, result, 120);
    return result;
  }

  async updateInventory(
    companyId: string,
    userId: string,
    productId: string,
    warehouseId: string,
    dto: UpdateInventoryDto,
  ) {
    // Verify product belongs to company
    const product = await this.prisma.product.findFirst({
      where: { id: productId, companyId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Verify warehouse belongs to company
    const warehouse = await this.prisma.warehouse.findFirst({
      where: { id: warehouseId, companyId },
    });

    if (!warehouse) {
      throw new NotFoundException('Warehouse not found');
    }

    // Create stock adjustment + update inventory in a transaction
    const referenceNumber = `ADJ-${Date.now()}`;

    const invResult = await this.prisma.$transaction(async (prisma) => {
      const currentInventory = await prisma.inventory.findUnique({
        where: {
          productId_warehouseId: {
            productId,
            warehouseId,
          },
        },
      });

      const previousQuantity = currentInventory?.quantity ?? 0;
      const difference = dto.quantity - previousQuantity;

      // Update or create inventory
      const inv = await prisma.inventory.upsert({
        where: {
          productId_warehouseId: {
            productId,
            warehouseId,
          },
        },
        update: {
          quantity: dto.quantity,
        },
        create: {
          productId,
          warehouseId,
          quantity: dto.quantity,
        },
      });

      // Determine adjustment type from delta
      const adjType =
        difference > 0 ? 'ADDITION' : difference < 0 ? 'REMOVAL' : 'ADDITION';

      // Create stock adjustment record (if quantity actually changed)
      if (difference !== 0) {
        const stockAdjustment = await prisma.stockAdjustment.create({
          data: {
            referenceNumber,
            adjustmentDate: new Date(),
            notes: dto.notes || 'Manual update from inventory page',
            type: adjType,
            totalItems: 1,
            netChange: difference,
            companyId,
            userId,
          },
        });

        // Create stock adjustment item
        await prisma.stockAdjustmentItem.create({
          data: {
            stockAdjustmentId: stockAdjustment.id,
            productId,
            warehouseId,
            previousQuantity,
            newQuantity: dto.quantity,
            difference,
          },
        });

        // Create stock ledger entry
        await prisma.stockLedger.create({
          data: {
            productId,
            warehouseId,
            userId,
            quantity: difference,
            balance: dto.quantity,
            type: 'ADJUSTMENT',
            reference: referenceNumber,
            note: dto.notes || 'Manual update from inventory page',
          },
        });
      }

      return inv;
    });

    await this.invalidateInventoryListCache(companyId);
    await Promise.all([
      this.cache.del(PROD_INV_KEY(companyId, productId)),
      this.cache.del(WH_INV_KEY(companyId, warehouseId)),
      this.cache.del(WH_ITEM_KEY(companyId, warehouseId)),
    ]);

    return invResult;
  }

  // === STOCK TRANSFERS ===
  async transferStock(
    companyId: string,
    userId: string,
    dto: StockTransferDto,
  ) {
    const { productId, fromWarehouseId, toWarehouseId, quantity, notes } = dto;

    if (fromWarehouseId === toWarehouseId) {
      throw new BadRequestException('Cannot transfer to the same warehouse');
    }

    // Verify product and warehouses belong to company
    const [product, fromWarehouse, toWarehouse] = await Promise.all([
      this.prisma.product.findFirst({ where: { id: productId, companyId } }),
      this.prisma.warehouse.findFirst({
        where: { id: fromWarehouseId, companyId },
      }),
      this.prisma.warehouse.findFirst({
        where: { id: toWarehouseId, companyId },
      }),
    ]);

    if (!product) throw new NotFoundException('Product not found');
    if (!fromWarehouse)
      throw new NotFoundException('Source warehouse not found');
    if (!toWarehouse)
      throw new NotFoundException('Destination warehouse not found');

    // Check source inventory
    const sourceInventory = await this.prisma.inventory.findUnique({
      where: {
        productId_warehouseId: {
          productId,
          warehouseId: fromWarehouseId,
        },
      },
    });

    if (!sourceInventory || sourceInventory.quantity < quantity) {
      throw new BadRequestException('Insufficient stock in source warehouse');
    }

    // Create stock adjustment for transfer
    const referenceNumber = `TRF-${Date.now()}`;

    const stockAdjustment = await this.prisma.$transaction(async (prisma) => {
      // Create stock adjustment record
      const sa = await prisma.stockAdjustment.create({
        data: {
          referenceNumber,
          adjustmentDate: new Date(),
          notes:
            notes ||
            `Transfer from ${fromWarehouse.name} to ${toWarehouse.name}`,
          totalItems: 2, // From and To entries
          netChange: 0, // Net change is 0 for transfers
          companyId,
          userId,
        },
      });

      // Update source inventory (decrease)
      await prisma.inventory.update({
        where: {
          productId_warehouseId: {
            productId,
            warehouseId: fromWarehouseId,
          },
        },
        data: {
          quantity: {
            decrement: quantity,
          },
        },
      });

      // Update destination inventory (increase or create)
      await prisma.inventory.upsert({
        where: {
          productId_warehouseId: {
            productId,
            warehouseId: toWarehouseId,
          },
        },
        update: {
          quantity: {
            increment: quantity,
          },
        },
        create: {
          productId,
          warehouseId: toWarehouseId,
          quantity,
        },
      });

      // Create stock ledger entries for transfer
      const srcInv = await prisma.inventory.findUnique({
        where: {
          productId_warehouseId: {
            productId,
            warehouseId: fromWarehouseId,
          },
        },
      });
      const dstInv = await prisma.inventory.findUnique({
        where: {
          productId_warehouseId: {
            productId,
            warehouseId: toWarehouseId,
          },
        },
      });

      await prisma.stockLedger.createMany({
        data: [
          {
            productId,
            warehouseId: fromWarehouseId,
            userId,
            quantity: -quantity,
            balance: srcInv?.quantity ?? 0,
            type: 'TRANSFER',
            reference: referenceNumber,
            note: `Transfer from ${fromWarehouse.name} to ${toWarehouse.name}`,
          },
          {
            productId,
            warehouseId: toWarehouseId,
            userId,
            quantity,
            balance: dstInv?.quantity ?? quantity,
            type: 'TRANSFER',
            reference: referenceNumber,
            note: `Transfer from ${fromWarehouse.name} to ${toWarehouse.name}`,
          },
        ],
      });

      // Create adjustment items
      await prisma.stockAdjustmentItem.createMany({
        data: [
          {
            stockAdjustmentId: sa.id,
            productId,
            warehouseId: fromWarehouseId,
            previousQuantity: sourceInventory.quantity,
            newQuantity: sourceInventory.quantity - quantity,
            difference: -quantity,
          },
          {
            stockAdjustmentId: sa.id,
            productId,
            warehouseId: toWarehouseId,
            previousQuantity: 0, // We'll update this if destination inventory exists
            newQuantity: quantity,
            difference: quantity,
          },
        ],
      });

      return sa;
    });

    await this.invalidateInventoryListCache(companyId);
    await Promise.all([
      this.cache.del(PROD_INV_KEY(companyId, productId)),
      this.cache.del(WH_INV_KEY(companyId, fromWarehouseId)),
      this.cache.del(WH_INV_KEY(companyId, toWarehouseId)),
      this.cache.del(WH_ITEM_KEY(companyId, fromWarehouseId)),
      this.cache.del(WH_ITEM_KEY(companyId, toWarehouseId)),
    ]);
    await this.invalidateTransferCache(companyId);

    return stockAdjustment;
  }

  // === BULK STOCK TRANSFER ===
  async bulkTransferStock(
    companyId: string,
    userId: string,
    dto: BulkStockTransferDto,
  ) {
    const { fromWarehouseId, toWarehouseId, notes, items } = dto;

    if (fromWarehouseId === toWarehouseId) {
      throw new BadRequestException('Cannot transfer to the same warehouse');
    }

    // Verify warehouses
    const [fromWarehouse, toWarehouse] = await Promise.all([
      this.prisma.warehouse.findFirst({
        where: { id: fromWarehouseId, companyId },
      }),
      this.prisma.warehouse.findFirst({
        where: { id: toWarehouseId, companyId },
      }),
    ]);

    if (!fromWarehouse)
      throw new NotFoundException('Source warehouse not found');
    if (!toWarehouse)
      throw new NotFoundException('Destination warehouse not found');

    const referenceNumber = `TRF-${Date.now()}`;

    const bulkResult = await this.prisma.$transaction(async (prisma) => {
      // Create stock adjustment record
      const sa = await prisma.stockAdjustment.create({
        data: {
          referenceNumber,
          adjustmentDate: new Date(),
          notes:
            notes ||
            `Bulk transfer from ${fromWarehouse.name} to ${toWarehouse.name}`,
          totalItems: items.length * 2,
          netChange: 0,
          companyId,
          userId,
        },
      });

      const adjustmentItems: any[] = [];

      for (const item of items) {
        // Verify product
        const product = await prisma.product.findFirst({
          where: { id: item.productId, companyId },
        });
        if (!product)
          throw new NotFoundException(`Product ${item.productId} not found`);

        // Check source inventory
        const sourceInventory = await prisma.inventory.findUnique({
          where: {
            productId_warehouseId: {
              productId: item.productId,
              warehouseId: fromWarehouseId,
            },
          },
        });

        if (!sourceInventory || sourceInventory.quantity < item.quantity) {
          throw new BadRequestException(
            `Insufficient stock for product ${product.name}. Available: ${sourceInventory?.quantity || 0}, Requested: ${item.quantity}`,
          );
        }

        // Decrement source
        await prisma.inventory.update({
          where: {
            productId_warehouseId: {
              productId: item.productId,
              warehouseId: fromWarehouseId,
            },
          },
          data: { quantity: { decrement: item.quantity } },
        });

        // Increment destination
        await prisma.inventory.upsert({
          where: {
            productId_warehouseId: {
              productId: item.productId,
              warehouseId: toWarehouseId,
            },
          },
          update: { quantity: { increment: item.quantity } },
          create: {
            productId: item.productId,
            warehouseId: toWarehouseId,
            quantity: item.quantity,
          },
        });

        // Create stock ledger entries for this transfer item
        const srcInv = await prisma.inventory.findUnique({
          where: {
            productId_warehouseId: {
              productId: item.productId,
              warehouseId: fromWarehouseId,
            },
          },
        });
        const dstInv = await prisma.inventory.findUnique({
          where: {
            productId_warehouseId: {
              productId: item.productId,
              warehouseId: toWarehouseId,
            },
          },
        });

        adjustmentItems.push(
          {
            stockAdjustmentId: sa.id,
            productId: item.productId,
            warehouseId: fromWarehouseId,
            previousQuantity: sourceInventory.quantity,
            newQuantity: sourceInventory.quantity - item.quantity,
            difference: -item.quantity,
          },
          {
            stockAdjustmentId: sa.id,
            productId: item.productId,
            warehouseId: toWarehouseId,
            previousQuantity: 0,
            newQuantity: item.quantity,
            difference: item.quantity,
          },
        );

        // Add stock ledger entries
        await prisma.stockLedger.createMany({
          data: [
            {
              productId: item.productId,
              warehouseId: fromWarehouseId,
              userId,
              quantity: -item.quantity,
              balance: srcInv?.quantity ?? 0,
              type: 'TRANSFER',
              reference: referenceNumber,
              note: `Bulk transfer from ${fromWarehouse.name} to ${toWarehouse.name}`,
            },
            {
              productId: item.productId,
              warehouseId: toWarehouseId,
              userId,
              quantity: item.quantity,
              balance: dstInv?.quantity ?? item.quantity,
              type: 'TRANSFER',
              reference: referenceNumber,
              note: `Bulk transfer from ${fromWarehouse.name} to ${toWarehouse.name}`,
            },
          ],
        });
      }

      await prisma.stockAdjustmentItem.createMany({ data: adjustmentItems });

      return prisma.stockAdjustment.findUnique({
        where: { id: sa.id },
        include: {
          user: { select: { name: true, email: true } },
          items: {
            include: {
              product: { select: { name: true, sku: true, imageUrl: true } },
              warehouse: { select: { name: true } },
            },
          },
        },
      });
    });

    await this.invalidateInventoryListCache(companyId);
    await Promise.all([
      this.cache.del(WH_INV_KEY(companyId, fromWarehouseId)),
      this.cache.del(WH_INV_KEY(companyId, toWarehouseId)),
      this.cache.del(WH_ITEM_KEY(companyId, fromWarehouseId)),
      this.cache.del(WH_ITEM_KEY(companyId, toWarehouseId)),
      ...items.map((item) => PROD_INV_KEY(companyId, item.productId)),
    ]);
    await this.invalidateTransferCache(companyId);

    return bulkResult;
  }

  // === STOCK ADJUSTMENTS ===
  async createStockAdjustment(
    companyId: string,
    userId: string,
    dto: CreateStockAdjustmentDto,
  ) {
    const referenceNumber = `ADJ-${Date.now()}`;

    const result = await this.prisma.$transaction(async (prisma) => {
      let netChange = 0;

      // Validate all products and warehouses first
      for (const item of dto.adjustmentItems) {
        const product = await prisma.product.findFirst({
          where: { id: item.productId, companyId },
        });

        if (!product) {
          throw new NotFoundException(`Product ${item.productId} not found`);
        }

        const warehouse = await prisma.warehouse.findFirst({
          where: { id: item.warehouseId, companyId },
        });

        if (!warehouse) {
          throw new NotFoundException(
            `Warehouse ${item.warehouseId} not found`,
          );
        }
      }

      // Create stock adjustment record
      const sa = await prisma.stockAdjustment.create({
        data: {
          referenceNumber,
          adjustmentDate: new Date(),
          notes: dto.notes,
          totalItems: dto.adjustmentItems.length,
          netChange: 0, // Will be updated after processing items
          companyId,
          userId,
        },
      });

      // Process each adjustment item
      for (const item of dto.adjustmentItems) {
        const currentInventory = await prisma.inventory.findUnique({
          where: {
            productId_warehouseId: {
              productId: item.productId,
              warehouseId: item.warehouseId,
            },
          },
        });

        const previousQuantity = currentInventory?.quantity || 0;
        const difference = item.newQuantity - previousQuantity;
        netChange += difference;

        // Update or create inventory
        await prisma.inventory.upsert({
          where: {
            productId_warehouseId: {
              productId: item.productId,
              warehouseId: item.warehouseId,
            },
          },
          update: {
            quantity: item.newQuantity,
          },
          create: {
            productId: item.productId,
            warehouseId: item.warehouseId,
            quantity: item.newQuantity,
          },
        });

        // Create stock ledger entry for this adjustment
        await prisma.stockLedger.create({
          data: {
            productId: item.productId,
            warehouseId: item.warehouseId,
            userId,
            quantity: difference,
            balance: item.newQuantity,
            type: 'ADJUSTMENT',
            reference: referenceNumber,
            note: dto.notes || 'Stock adjustment',
          },
        });

        // Create adjustment item record
        await prisma.stockAdjustmentItem.create({
          data: {
            stockAdjustmentId: sa.id,
            productId: item.productId,
            warehouseId: item.warehouseId,
            previousQuantity,
            newQuantity: item.newQuantity,
            difference,
          },
        });
      }

      // Update stock adjustment with final totals
      await prisma.stockAdjustment.update({
        where: { id: sa.id },
        data: { netChange },
      });

      return sa;
    });

    await this.invalidateInventoryListCache(companyId);
    await this.invalidateAdjustmentCache(companyId);

    return result;
  }

  async getStockAdjustments(companyId: string, page = 1, limit = 10) {
    const cacheKey = ADJ_LIST_KEY(companyId, page);
    const cached = await this.cache.get<any>(cacheKey);
    if (cached) return cached;

    const skip = (page - 1) * limit;

    const [adjustments, total] = await Promise.all([
      this.prisma.stockAdjustment.findMany({
        where: { companyId },
        include: {
          user: {
            select: {
              name: true,
              email: true,
            },
          },
          items: {
            include: {
              product: {
                select: {
                  name: true,
                  sku: true,
                },
              },
              warehouse: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
        skip,
        take: limit,
        orderBy: { adjustmentDate: 'desc' },
      }),
      this.prisma.stockAdjustment.count({ where: { companyId } }),
    ]);

    const result = {
      adjustments,
      total,
      pages: Math.ceil(total / limit),
    };

    await this.cache.set(cacheKey, result, 120);
    return result;
  }

  // === TRANSFER HISTORY ===
  async getTransfers(companyId: string, page = 1, limit = 20) {
    const cacheKey = TRANSFER_LIST_KEY(companyId, page);
    const cached = await this.cache.get<any>(cacheKey);
    if (cached) return cached;

    const skip = (page - 1) * limit;

    const where = {
      companyId,
      referenceNumber: { startsWith: 'TRF-' },
    };

    const [adjustments, total] = await Promise.all([
      this.prisma.stockAdjustment.findMany({
        where,
        include: {
          user: { select: { name: true, email: true } },
          items: {
            include: {
              product: { select: { name: true, sku: true, imageUrl: true } },
              warehouse: { select: { name: true } },
            },
          },
        },
        skip,
        take: limit,
        orderBy: { adjustmentDate: 'desc' },
      }),
      this.prisma.stockAdjustment.count({ where }),
    ]);

    const result = {
      transfers: adjustments,
      total,
      pages: Math.ceil(total / limit),
    };

    await this.cache.set(cacheKey, result, 120);
    return result;
  }

  async getTransfer(companyId: string, id: string) {
    const cacheKey = TRANSFER_KEY(companyId, id);
    const cached = await this.cache.get<any>(cacheKey);
    if (cached) return cached;

    const transfer = await this.prisma.stockAdjustment.findFirst({
      where: { id, companyId, referenceNumber: { startsWith: 'TRF-' } },
      include: {
        user: { select: { name: true, email: true } },
        items: {
          include: {
            product: { select: { name: true, sku: true, imageUrl: true } },
            warehouse: { select: { name: true } },
          },
        },
      },
    });

    if (!transfer) {
      throw new NotFoundException('Transfer not found');
    }

    // Group items by direction (from/to)
    const fromItems = transfer.items.filter((i) => i.difference < 0);
    const toItems = transfer.items.filter((i) => i.difference > 0);

    const result = {
      ...transfer,
      fromWarehouse: fromItems[0]?.warehouse.name || 'Unknown',
      toWarehouse: toItems[0]?.warehouse.name || 'Unknown',
      fromItems,
      toItems,
    };

    await this.cache.set(cacheKey, result, 300);
    return result;
  }

  // === INVENTORY STATISTICS ===
  async getInventoryStats(companyId: string): Promise<InventoryStatsDto> {
    const cacheKey = STATS_KEY(companyId);
    const cached = await this.cache.get<InventoryStatsDto>(cacheKey);
    if (cached) return cached;

    const [totalProducts, totalWarehouses, allInventory, recentAdjustments] =
      await Promise.all([
        this.prisma.product.count({ where: { companyId } }),
        this.prisma.warehouse.count({ where: { companyId } }),
        this.prisma.inventory.findMany({
          where: {
            product: {
              companyId,
            },
          },
          include: {
            product: true,
          },
        }),
        this.prisma.stockAdjustment.count({
          where: {
            companyId,
            adjustmentDate: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
            },
          },
        }),
      ]);

    let lowStockProducts = 0;
    let outOfStockProducts = 0;
    let totalStockValue = 0;

    allInventory.forEach((item) => {
      const stockValue = item.quantity * Number(item.product.costPrice);
      totalStockValue += stockValue;

      if (item.quantity === 0) {
        outOfStockProducts++;
      } else if (
        item.product.reorderLevel > 0 &&
        item.quantity <= item.product.reorderLevel
      ) {
        lowStockProducts++;
      }
    });

    const statsResult: InventoryStatsDto = {
      totalProducts,
      totalWarehouses,
      lowStockProducts,
      outOfStockProducts,
      totalStockValue,
      recentAdjustments,
    };

    await this.cache.set(cacheKey, statsResult, 120);
    return statsResult;
  }

  private async invalidateWarehouseCache(companyId: string, warehouseId?: string) {
    const keys = [WAREHOUSE_KEY(companyId), STATS_KEY(companyId)];
    if (warehouseId) {
      keys.push(WH_ITEM_KEY(companyId, warehouseId));
      keys.push(WH_INV_KEY(companyId, warehouseId));
    }
    await Promise.all(keys.map((k) => this.cache.del(k)));
  }

  private async invalidateInventoryListCache(companyId: string) {
    const filters = ['', 'low_stock', 'out_of_stock'];
    const keys: string[] = [STATS_KEY(companyId)];
    for (const p of [1, 2, 3]) {
      for (const f of filters) {
        keys.push(INV_LIST_KEY(companyId, p, f));
      }
    }
    await Promise.all(keys.map((k) => this.cache.del(k)));
  }

  private async invalidateTransferCache(companyId: string) {
    await Promise.all(
      [1, 2, 3].map((p) => this.cache.del(TRANSFER_LIST_KEY(companyId, p))),
    );
  }

  private async invalidateAdjustmentCache(companyId: string) {
    await Promise.all(
      [1, 2, 3].map((p) => this.cache.del(ADJ_LIST_KEY(companyId, p))),
    );
  }

  private getStockStatus(
    quantity: number,
    reorderLevel: number,
  ): 'in_stock' | 'low_stock' | 'out_of_stock' {
    if (quantity === 0) return 'out_of_stock';
    if (reorderLevel > 0 && quantity <= reorderLevel) return 'low_stock';
    return 'in_stock';
  }
}
