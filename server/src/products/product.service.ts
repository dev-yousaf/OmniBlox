import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductResponseDto } from './dto/product-response.dto';
import { CreateStockAdjustmentDto } from './dto/create-stock-adjustment.dto';
import { StockAdjustmentResponseDto } from './dto/stock-adjustment-response.dto';

@Injectable()
export class ProductService {
  constructor(private prisma: PrismaService) {}

  async create(
    createProductDto: CreateProductDto,
    companyId: string,
  ): Promise<ProductResponseDto> {
    const { sku, category, brand, stock, ...productData } = createProductDto;

    // Check if SKU already exists within this company (Golden Rule applied)
    const existingProduct = await this.prisma.product.findUnique({
      where: {
        companyId_sku: {
          companyId,
          sku,
        },
      },
    });

    if (existingProduct) {
      throw new ConflictException(
        'Product with this SKU already exists in your company',
      );
    }

    try {
      // Find or create category within this company (Golden Rule applied)
      let categoryRecord = await this.prisma.productCategory.findUnique({
        where: {
          companyId_name: {
            companyId,
            name: category,
          },
        },
      });

      if (!categoryRecord) {
        categoryRecord = await this.prisma.productCategory.create({
          data: {
            name: category,
            companyId, // Golden Rule: always include companyId
          },
        });
      }

      // Find or create brand if provided within this company (Golden Rule applied)
      let brandRecord: { id: string; name: string } | null = null;
      if (brand) {
        brandRecord = await this.prisma.brand.findUnique({
          where: {
            companyId_name: {
              companyId,
              name: brand,
            },
          },
        });

        if (!brandRecord) {
          brandRecord = await this.prisma.brand.create({
            data: {
              name: brand,
              companyId, // Golden Rule: always include companyId
            },
          });
        }
      }

      // Create product with companyId (Golden Rule applied)
      const product = await this.prisma.product.create({
        data: {
          sku,
          ...productData,
          categoryId: categoryRecord.id,
          brandId: brandRecord?.id || null,
          companyId, // Golden Rule: always include companyId
        },
        include: {
          category: true,
          brand: true,
        },
      });

      // Find a warehouse for this company (Golden Rule applied)
      const defaultWarehouse = await this.prisma.warehouse.findFirst({
        where: { companyId }, // Golden Rule: filter by companyId
      });

      if (!defaultWarehouse) {
        // Create a default warehouse for this company if none exists
        const warehouse = await this.prisma.warehouse.create({
          data: {
            name: 'Default Warehouse',
            location: 'Default Location',
            companyId, // Golden Rule: always include companyId
          },
        });

        await this.prisma.inventory.create({
          data: {
            productId: product.id,
            warehouseId: warehouse.id,
            quantity: stock,
          },
        });
      } else {
        await this.prisma.inventory.create({
          data: {
            productId: product.id,
            warehouseId: defaultWarehouse.id,
            quantity: stock,
          },
        });
      }

      return this.transformToDto(product, stock);
    } catch (error) {
      throw new BadRequestException('Failed to create product');
    }
  }

  async findAll(
    companyId: string, // Golden Rule: always require companyId
    page: number = 1,
    limit: number = 10,
    search?: string,
    category?: string,
    status?: string,
  ): Promise<{ products: ProductResponseDto[]; total: number; pages: number }> {
    const skip = (page - 1) * limit;

    const where: any = {
      companyId, // Golden Rule: always filter by companyId
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (category) {
      where.category = {
        name: category,
        companyId, // Golden Rule: filter category by companyId too
      };
    }

    if (status) {
      where.status = status;
    }

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          category: true,
          brand: true,
          inventory: {
            include: {
              warehouse: true,
            },
          },
        },
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      products: products.map((product) => {
        const totalStock = product.inventory.reduce(
          (sum, inv) => sum + inv.quantity,
          0,
        );
        return this.transformToDto(product, totalStock);
      }),
      total,
      pages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string, companyId: string): Promise<ProductResponseDto> {
    const product = await this.prisma.product.findFirst({
      where: {
        id,
        companyId, // Golden Rule: always filter by companyId
      },
      include: {
        category: true,
        brand: true,
        inventory: {
          include: {
            warehouse: true,
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const totalStock = product.inventory.reduce(
      (sum, inv) => sum + inv.quantity,
      0,
    );
    return this.transformToDto(product, totalStock);
  }

  async findBySku(sku: string, companyId: string): Promise<ProductResponseDto> {
    const product = await this.prisma.product.findFirst({
      where: {
        sku,
        companyId, // Golden Rule: always filter by companyId
      },
      include: {
        category: true,
        brand: true,
        inventory: {
          include: {
            warehouse: true,
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const totalStock = product.inventory.reduce(
      (sum, inv) => sum + inv.quantity,
      0,
    );
    return this.transformToDto(product, totalStock);
  }

  async update(
    id: string,
    updateProductDto: UpdateProductDto,
    companyId: string,
  ): Promise<ProductResponseDto> {
    const existingProduct = await this.prisma.product.findFirst({
      where: {
        id,
        companyId, // Golden Rule: always filter by companyId
      },
      include: {
        category: true,
        brand: true,
        inventory: true,
      },
    });

    if (!existingProduct) {
      throw new NotFoundException('Product not found');
    }

    // Check if SKU is being updated and if it conflicts with existing product within the company
    if (updateProductDto.sku && updateProductDto.sku !== existingProduct.sku) {
      const existingSkuProduct = await this.prisma.product.findUnique({
        where: {
          companyId_sku: {
            companyId,
            sku: updateProductDto.sku,
          },
        },
      });

      if (existingSkuProduct) {
        throw new ConflictException(
          'Product with this SKU already exists in your company',
        );
      }
    }

    try {
      const { category, brand, stock, ...productData } = updateProductDto;
      const updateData: any = { ...productData };

      // Handle category update within company scope
      if (category !== undefined) {
        let categoryRecord = await this.prisma.productCategory.findUnique({
          where: {
            companyId_name: {
              companyId,
              name: category,
            },
          },
        });

        if (!categoryRecord) {
          categoryRecord = await this.prisma.productCategory.create({
            data: {
              name: category,
              companyId, // Golden Rule: always include companyId
            },
          });
        }
        updateData.categoryId = categoryRecord.id;
      }

      // Handle brand update within company scope
      if (brand !== undefined) {
        if (brand === null || brand === '') {
          updateData.brandId = null;
        } else {
          let brandRecord = await this.prisma.brand.findUnique({
            where: {
              companyId_name: {
                companyId,
                name: brand,
              },
            },
          });

          if (!brandRecord) {
            brandRecord = await this.prisma.brand.create({
              data: {
                name: brand,
                companyId, // Golden Rule: always include companyId
              },
            });
          }
          updateData.brandId = brandRecord.id;
        }
      }

      const product = await this.prisma.product.update({
        where: {
          id,
          // NOTE: Prisma doesn't support compound where in update, but we've already verified ownership above
        },
        data: updateData,
        include: {
          category: true,
          brand: true,
          inventory: {
            include: {
              warehouse: true,
            },
          },
        },
      });

      // Handle stock update if provided (find warehouse within company)
      if (stock !== undefined) {
        const defaultWarehouse = await this.prisma.warehouse.findFirst({
          where: { companyId }, // Golden Rule: filter by companyId
        });

        if (defaultWarehouse) {
          await this.prisma.inventory.upsert({
            where: {
              productId_warehouseId: {
                productId: product.id,
                warehouseId: defaultWarehouse.id,
              },
            },
            update: {
              quantity: stock,
            },
            create: {
              productId: product.id,
              warehouseId: defaultWarehouse.id,
              quantity: stock,
            },
          });
        }
      }

      const totalStock = product.inventory.reduce(
        (sum, inv) => sum + inv.quantity,
        0,
      );
      return this.transformToDto(product, totalStock);
    } catch (error) {
      throw new BadRequestException('Failed to update product');
    }
  }

  async remove(id: string, companyId: string): Promise<void> {
    const existingProduct = await this.prisma.product.findFirst({
      where: {
        id,
        companyId, // Golden Rule: always filter by companyId
      },
    });

    if (!existingProduct) {
      throw new NotFoundException('Product not found');
    }

    try {
      await this.prisma.$transaction([
        this.prisma.inventory.deleteMany({
          where: { productId: id },
        }),
        this.prisma.product.delete({
          where: { id },
        }),
      ]);
    } catch (error) {
      throw new BadRequestException(
        'Failed to delete product. It may be referenced by other records.',
      );
    }
  }

  /**
   * Dashboard-specific aggregations for products
   */
  async getDashboardStats(companyId: string) {
    // 1. Total active products
    const totalProducts = await this.prisma.product.count({
      where: { companyId, status: 'ACTIVE' },
    });

    // 2. Inventory entries with product and category
    const inventory = await this.prisma.inventory.findMany({
      where: { product: { companyId } },
      include: { product: { include: { category: true } }, warehouse: true },
    });

    // Aggregate stock per product
    const stockByProduct = new Map<string, number>();
    for (const inv of inventory) {
      stockByProduct.set(
        inv.productId,
        (stockByProduct.get(inv.productId) || 0) + inv.quantity,
      );
    }

    // Low stock products (product-level compare against reorderLevel)
    let lowStockCount = 0;
    for (const inv of inventory) {
      const total = stockByProduct.get(inv.productId) || 0;
      if (total <= (inv.product.reorderLevel || 0)) {
        lowStockCount++;
      }
    }

    // Stock overview by category
    const stockByCategoryMap = new Map<
      string,
      { categoryName: string; totalQuantity: number }
    >();
    for (const inv of inventory) {
      const catName = inv.product.category?.name || 'Uncategorized';
      const item = stockByCategoryMap.get(catName) || {
        categoryName: catName,
        totalQuantity: 0,
      };
      item.totalQuantity += inv.quantity;
      stockByCategoryMap.set(catName, item);
    }

    const stockOverviewByCategory = Array.from(stockByCategoryMap.values());

    // Best sellers: compute revenue per product from sale items
    const saleItems = await this.prisma.saleItem.findMany({
      where: { sale: { companyId } },
      include: { product: true },
    });

    const revenueByProduct = new Map<
      string,
      {
        productId: string;
        name: string;
        sku?: string;
        revenue: number;
        quantity: number;
      }
    >();
    for (const si of saleItems) {
      const rev = Number(si.unitPrice) * si.quantity;
      const cur = revenueByProduct.get(si.productId) || {
        productId: si.productId,
        name: si.product?.name || si.productId,
        sku: si.product?.sku,
        revenue: 0,
        quantity: 0,
      };
      cur.revenue += rev;
      cur.quantity += si.quantity;
      revenueByProduct.set(si.productId, cur);
    }

    const bestSellers = Array.from(revenueByProduct.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    return {
      totalProducts,
      lowStockCount,
      stockOverviewByCategory,
      bestSellers,
    };
  }

  async updateStock(
    id: string,
    quantity: number,
    operation: 'add' | 'subtract',
    companyId: string,
  ): Promise<ProductResponseDto> {
    const product = await this.prisma.product.findFirst({
      where: {
        id,
        companyId, // Golden Rule: always filter by companyId
      },
      include: {
        category: true,
        brand: true,
        inventory: {
          include: {
            warehouse: true,
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Find warehouse for this company
    const defaultWarehouse = await this.prisma.warehouse.findFirst({
      where: { companyId }, // Golden Rule: filter by companyId
    });

    if (!defaultWarehouse) {
      throw new BadRequestException('No warehouse configured for your company');
    }

    const existingInventory = product.inventory.find(
      (inv) => inv.warehouseId === defaultWarehouse.id,
    );
    const currentStock = existingInventory?.quantity || 0;
    const newStock =
      operation === 'add' ? currentStock + quantity : currentStock - quantity;

    if (newStock < 0) {
      throw new BadRequestException('Insufficient stock');
    }

    // Upsert inventory
    await this.prisma.inventory.upsert({
      where: {
        productId_warehouseId: {
          productId: product.id,
          warehouseId: defaultWarehouse.id,
        },
      },
      update: {
        quantity: newStock,
      },
      create: {
        productId: product.id,
        warehouseId: defaultWarehouse.id,
        quantity: newStock,
      },
    });

    // Return updated product
    const updatedProduct = await this.prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        brand: true,
        inventory: {
          include: {
            warehouse: true,
          },
        },
      },
    });

    if (!updatedProduct) {
      throw new NotFoundException('Product not found after update');
    }

    const totalStock = updatedProduct.inventory.reduce(
      (sum, inv) => sum + inv.quantity,
      0,
    );
    return this.transformToDto(updatedProduct, totalStock);
  }

  async getLowStockProducts(companyId: string): Promise<ProductResponseDto[]> {
    const products = await this.prisma.product.findMany({
      where: {
        status: 'ACTIVE',
        companyId, // Golden Rule: always filter by companyId
      },
      include: {
        category: true,
        brand: true,
        inventory: {
          include: {
            warehouse: true,
          },
        },
      },
    });

    // Filter products where total stock is less than or equal to reorder level
    const lowStockProducts = products.filter((product) => {
      const totalStock = product.inventory.reduce(
        (sum, inv) => sum + inv.quantity,
        0,
      );
      return totalStock <= product.reorderLevel;
    });

    return lowStockProducts.map((product) => {
      const totalStock = product.inventory.reduce(
        (sum, inv) => sum + inv.quantity,
        0,
      );
      return this.transformToDto(product, totalStock);
    });
  }

  async getCategories(companyId: string): Promise<string[]> {
    const categories = await this.prisma.productCategory.findMany({
      where: { companyId }, // Golden Rule: always filter by companyId
      select: { name: true },
    });

    return categories.map((category) => category.name);
  }

  async getBrands(companyId: string): Promise<string[]> {
    const brands = await this.prisma.brand.findMany({
      where: { companyId }, // Golden Rule: always filter by companyId
      select: { name: true },
      orderBy: { name: 'asc' },
    });

    return brands.map((brand) => brand.name);
  }

  async getStats(companyId: string) {
    const products = await this.prisma.product.findMany({
      where: { companyId }, // Golden Rule: always filter by companyId
      include: {
        inventory: true,
      },
    });

    const totalProducts = products.length;
    let totalValue = 0;
    let lowStockCount = 0;

    for (const product of products) {
      // Calculate total stock across all warehouses for this product
      const totalStock = product.inventory.reduce(
        (sum, inv) => sum + inv.quantity,
        0,
      );

      if (totalStock <= product.reorderLevel) {
        lowStockCount += 1;
      }

      // Calculate inventory value at retail price (salePrice × total stock)
      const productValue = Number(product.salePrice) * totalStock;
      totalValue += productValue;
    }

    const categoriesCount = await this.prisma.productCategory.count({
      where: { companyId }, // Golden Rule: always filter by companyId
    });

    return {
      totalProducts,
      lowStockCount,
      totalValue,
      categoriesCount,
    };
  }

  private transformToDto(product: any, stock?: number): ProductResponseDto {
    return {
      id: product.id,
      name: product.name,
      sku: product.sku,
      description: product.description,
      category: product.category?.name || '',
      brand: product.brand?.name || undefined,
      salePrice: Number(product.salePrice),
      costPrice: Number(product.costPrice),
      stock: stock || 0, // Will be calculated from inventory
      reorderLevel: product.reorderLevel,
      status: product.status,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    };
  }

  async createStockAdjustment(
    createStockAdjustmentDto: CreateStockAdjustmentDto,
    userId: string,
    companyId: string,
  ): Promise<StockAdjustmentResponseDto> {
    const { items, notes } = createStockAdjustmentDto;

    if (!items || items.length === 0) {
      throw new BadRequestException('At least one adjustment item is required');
    }

    // Generate reference number for this company
    const adjustmentCount = await this.prisma.stockAdjustment.count({
      where: { companyId }, // Golden Rule: count only within company
    });
    const referenceNumber = `ADJ-${String(adjustmentCount + 1).padStart(6, '0')}`;

    // Validate all products and warehouses exist within this company (Golden Rule)
    const productIds = items.map((item) => item.productId);
    const warehouseIds = items.map((item) => item.warehouseId);

    const products = await this.prisma.product.findMany({
      where: {
        id: { in: productIds },
        companyId, // Golden Rule: filter by companyId
      },
    });

    if (products.length !== productIds.length) {
      throw new BadRequestException(
        'One or more products not found in your company',
      );
    }

    const warehouses = await this.prisma.warehouse.findMany({
      where: {
        id: { in: warehouseIds },
        companyId, // Golden Rule: filter by companyId
      },
    });

    if (warehouses.length !== new Set(warehouseIds).size) {
      throw new BadRequestException(
        'One or more warehouses not found in your company',
      );
    }

    // Calculate totals
    const totalItems = items.length;
    const netChange = items.reduce(
      (sum, item) => sum + (item.newQuantity - item.previousQuantity),
      0,
    );

    try {
      return await this.prisma.$transaction(async (prisma) => {
        // Create stock adjustment with companyId (Golden Rule)
        const adjustment = await prisma.stockAdjustment.create({
          data: {
            referenceNumber,
            notes,
            totalItems,
            netChange,
            userId,
            companyId, // Golden Rule: always include companyId
            items: {
              create: items.map((item) => ({
                productId: item.productId,
                warehouseId: item.warehouseId,
                previousQuantity: item.previousQuantity,
                newQuantity: item.newQuantity,
                difference: item.newQuantity - item.previousQuantity,
              })),
            },
          },
          include: {
            user: true,
            items: {
              include: {
                product: true,
                warehouse: true,
              },
            },
          },
        });

        // Update inventory for each item
        for (const item of items) {
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
        }

        // Format response
        return {
          id: adjustment.id,
          referenceNumber: adjustment.referenceNumber,
          adjustmentDate: adjustment.adjustmentDate.toISOString(),
          notes: adjustment.notes,
          totalItems: adjustment.totalItems,
          netChange: adjustment.netChange,
          createdAt: adjustment.createdAt.toISOString(),
          updatedAt: adjustment.updatedAt.toISOString(),
          userId: adjustment.userId,
          userName: adjustment.user.name,
          items: adjustment.items.map((item) => ({
            id: item.id,
            previousQuantity: item.previousQuantity,
            newQuantity: item.newQuantity,
            difference: item.difference,
            productId: item.productId,
            productName: item.product.name,
            warehouseId: item.warehouseId,
            warehouseName: item.warehouse.name,
          })),
        };
      });
    } catch (error) {
      throw new BadRequestException('Failed to create stock adjustment');
    }
  }

  async getStockAdjustments(
    companyId: string,
  ): Promise<StockAdjustmentResponseDto[]> {
    const adjustments = await this.prisma.stockAdjustment.findMany({
      where: { companyId }, // Golden Rule: filter by companyId
      include: {
        user: true,
        items: {
          include: {
            product: true,
            warehouse: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return adjustments.map((adjustment) => ({
      id: adjustment.id,
      referenceNumber: adjustment.referenceNumber,
      adjustmentDate: adjustment.adjustmentDate.toISOString(),
      notes: adjustment.notes,
      totalItems: adjustment.totalItems,
      netChange: adjustment.netChange,
      createdAt: adjustment.createdAt.toISOString(),
      updatedAt: adjustment.updatedAt.toISOString(),
      userId: adjustment.userId,
      userName: adjustment.user.name,
      items: adjustment.items.map((item) => ({
        id: item.id,
        previousQuantity: item.previousQuantity,
        newQuantity: item.newQuantity,
        difference: item.difference,
        productId: item.productId,
        productName: item.product.name,
        warehouseId: item.warehouseId,
        warehouseName: item.warehouse.name,
      })),
    }));
  }

  async getStockAdjustment(
    id: string,
    companyId: string,
  ): Promise<StockAdjustmentResponseDto> {
    const adjustment = await this.prisma.stockAdjustment.findFirst({
      where: {
        id,
        companyId, // Golden Rule: filter by companyId
      },
      include: {
        user: true,
        items: {
          include: {
            product: true,
            warehouse: true,
          },
        },
      },
    });

    if (!adjustment) {
      throw new NotFoundException('Stock adjustment not found');
    }

    return {
      id: adjustment.id,
      referenceNumber: adjustment.referenceNumber,
      adjustmentDate: adjustment.adjustmentDate.toISOString(),
      notes: adjustment.notes,
      totalItems: adjustment.totalItems,
      netChange: adjustment.netChange,
      createdAt: adjustment.createdAt.toISOString(),
      updatedAt: adjustment.updatedAt.toISOString(),
      userId: adjustment.userId,
      userName: adjustment.user.name,
      items: adjustment.items.map((item) => ({
        id: item.id,
        previousQuantity: item.previousQuantity,
        newQuantity: item.newQuantity,
        difference: item.difference,
        productId: item.productId,
        productName: item.product.name,
        warehouseId: item.warehouseId,
        warehouseName: item.warehouse.name,
      })),
    };
  }

  async getWarehouses(companyId: string) {
    const warehouses = await this.prisma.warehouse.findMany({
      where: { companyId }, // Golden Rule: filter by companyId
      orderBy: {
        name: 'asc',
      },
    });

    return warehouses.map((warehouse) => ({
      id: warehouse.id,
      name: warehouse.name,
      location: warehouse.location,
    }));
  }
}
