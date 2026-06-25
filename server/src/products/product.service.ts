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

export interface LowStockDetailItem {
  productId: string;
  productName: string;
  sku: string;
  imageUrl: string | null;
  category: string;
  warehouseId: string;
  warehouseName: string;
  storeName: string;
  quantity: number;
  alertQuantity: number;
}

@Injectable()
export class ProductService {
  constructor(private prisma: PrismaService) {}

  async create(
    createProductDto: CreateProductDto,
    companyId: string,
    userId?: string,
  ): Promise<ProductResponseDto> {
    const { sku, category, brand, stock = 0, comboItems, ...productData } = createProductDto;

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
            companyId,
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
              companyId,
            },
          });
        }
      }

      // Validate combo items if provided
      const productType = createProductDto.type || 'STANDARD';
      if (productType === 'COMBO' && comboItems && comboItems.length > 0) {
        const comboProductIds = comboItems.map(i => i.productId);
        const existingComponents = await this.prisma.product.findMany({
          where: { id: { in: comboProductIds }, companyId },
          select: { id: true, name: true },
        });
        if (existingComponents.length !== comboProductIds.length) {
          throw new BadRequestException('One or more combo component products not found');
        }
      }

      // Create product with companyId (Golden Rule applied)
      const { type, manufacturedDate, expiryDate, unit, warranty, ...restProductData } = productData;
      const dateData: Record<string, Date> = {};
      if (manufacturedDate) dateData.manufacturedDate = new Date(manufacturedDate);
      if (expiryDate) dateData.expiryDate = new Date(expiryDate);

      let unitId: string | undefined;
      if (unit) {
        const unitRecord = await this.prisma.unit.findFirst({
          where: { shortName: unit, companyId },
        });
        if (unitRecord) unitId = unitRecord.id;
      }

      let warrantyId: string | undefined;
      if (warranty) {
        const warrantyRecord = await this.prisma.warranty.findFirst({
          where: { name: warranty, companyId },
        });
        if (warrantyRecord) warrantyId = warrantyRecord.id;
      }

      const product = await this.prisma.product.create({
        data: {
          sku,
          type: type || 'STANDARD',
          unit,
          warranty,
          ...restProductData,
          ...dateData,
          unitId: unitId || null,
          warrantyId: warrantyId || null,
          categoryId: categoryRecord.id,
          brandId: brandRecord?.id || null,
          companyId,
          createdById: userId || null,
          ...(comboItems?.length ? {
            comboComponents: {
              create: comboItems.map(ci => ({
                productId: ci.productId,
                quantity: ci.quantity,
              })),
            },
          } : {}),
        },
        include: {
          category: true,
          brand: true,
          createdBy: { select: { id: true, name: true, image: true } },
          comboComponents: {
            include: { product: { select: { id: true, name: true, sku: true } } },
          },
        },
      });

      // Only create inventory for physical products (STANDARD or COMBO)
      if (createProductDto.type !== 'DIGITAL' && createProductDto.type !== 'SERVICE') {
        const defaultWarehouse = await this.prisma.warehouse.findFirst({
          where: { companyId },
        });

        if (!defaultWarehouse) {
          const warehouse = await this.prisma.warehouse.create({
            data: {
              name: 'Default Warehouse',
              location: 'Default Location',
              companyId,
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
    warehouseId?: string,
  ): Promise<{ products: ProductResponseDto[]; total: number; pages: number }> {
    const skip = (page - 1) * limit;

    const where: any = {
      companyId, // Golden Rule: always filter by companyId
    };

    if (warehouseId) {
      where.inventory = {
        some: {
          warehouseId,
        },
      };
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { itemCode: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (category) {
      where.category = {
        name: category,
        companyId, // Golden Rule: filter category by companyId too
      };
    }

    if (status) {
      if (status === 'expired') {
        where.expiryDate = { lt: new Date() };
      } else {
        where.status = status as any;
      }
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
          createdBy: { select: { id: true, name: true, image: true } },
          inventory: {
            include: {
              warehouse: true,
            },
          },
          variants: {
            include: {
              category: true,
              brand: true,
              createdBy: { select: { id: true, name: true, image: true } },
              inventory: {
                include: {
                  warehouse: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      products: products.map((product) => {
        let stock: number;
        if (warehouseId) {
          const warehouseInv = product.inventory.find(
            (inv) => inv.warehouseId === warehouseId,
          );
          stock = warehouseInv ? warehouseInv.quantity : 0;
        } else {
          stock = product.inventory.reduce(
            (sum, inv) => sum + inv.quantity,
            0,
          );
        }
        return this.transformToDto(product, stock);
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
        variants: {
          include: {
            category: true,
            brand: true,
            inventory: {
              include: {
                warehouse: true,
              },
            },
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
        companyId,
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
      const { category, brand, stock, comboItems, manufacturedDate, expiryDate, ...productData } = updateProductDto;
      const updateData: any = { ...productData };
      if (manufacturedDate !== undefined) updateData.manufacturedDate = manufacturedDate ? new Date(manufacturedDate) : null;
      if (expiryDate !== undefined) updateData.expiryDate = expiryDate ? new Date(expiryDate) : null;

      if (category !== undefined) {
        let categoryRecord = await this.prisma.productCategory.findUnique({
          where: {
            companyId_name: { companyId, name: category },
          },
        });
        if (!categoryRecord) {
          categoryRecord = await this.prisma.productCategory.create({
            data: { name: category, companyId },
          });
        }
        updateData.categoryId = categoryRecord.id;
      }

      if (brand !== undefined) {
        if (brand === null || brand === '') {
          updateData.brandId = null;
        } else {
          let brandRecord = await this.prisma.brand.findUnique({
            where: { companyId_name: { companyId, name: brand } },
          });
          if (!brandRecord) {
            brandRecord = await this.prisma.brand.create({
              data: { name: brand, companyId },
            });
          }
          updateData.brandId = brandRecord.id;
        }
      }

      if (updateData.unit !== undefined) {
        const unitRecord = await this.prisma.unit.findFirst({
          where: { shortName: updateData.unit, companyId },
        });
        updateData.unitId = unitRecord?.id || null;
      }

      if (updateData.warranty !== undefined) {
        const warrantyRecord = await this.prisma.warranty.findFirst({
          where: { name: updateData.warranty, companyId },
        });
        updateData.warrantyId = warrantyRecord?.id || null;
      }

      // Handle combo items update
      if (comboItems !== undefined) {
        const comboProductIds = comboItems.map(i => i.productId);
        const existingComponents = await this.prisma.product.findMany({
          where: { id: { in: comboProductIds }, companyId },
          select: { id: true },
        });
        if (existingComponents.length !== comboProductIds.length) {
          throw new BadRequestException('One or more combo component products not found');
        }

        await this.prisma.comboItem.deleteMany({ where: { comboId: id } });
        if (comboItems.length > 0) {
          await this.prisma.comboItem.createMany({
            data: comboItems.map(ci => ({
              comboId: id,
              productId: ci.productId,
              quantity: ci.quantity,
            })),
          });
        }
      }

      const product = await this.prisma.product.update({
        where: { id },
        data: updateData,
        include: {
          category: true,
          brand: true,
          inventory: { include: { warehouse: true } },
          comboComponents: {
            include: { product: { select: { id: true, name: true, sku: true } } },
          },
        },
      });

      if (stock !== undefined) {
        const defaultWarehouse = await this.prisma.warehouse.findFirst({
          where: { companyId },
        });
        if (defaultWarehouse) {
          await this.prisma.inventory.upsert({
            where: {
              productId_warehouseId: {
                productId: product.id,
                warehouseId: defaultWarehouse.id,
              },
            },
            update: { quantity: stock },
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
      include: {
        variants: { select: { id: true } },
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
        ...(existingProduct.variants?.length
          ? [
              this.prisma.inventory.deleteMany({
                where: { productId: { in: existingProduct.variants.map(v => v.id) } },
              }),
              this.prisma.product.deleteMany({
                where: { parentId: id },
              }),
            ]
          : []),
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

  async getLowStockDetails(
    companyId: string,
    page = 1,
    limit = 10,
  ): Promise<{ items: LowStockDetailItem[]; total: number; pages: number }> {
    const skip = (page - 1) * limit;

    const allProducts = await this.prisma.product.findMany({
      where: { status: 'ACTIVE', companyId },
      include: {
        category: true,
        brand: true,
        inventory: {
          include: { warehouse: true },
        },
      },
    });

    const items: LowStockDetailItem[] = [];
    for (const product of allProducts) {
      for (const inv of product.inventory) {
        const reorderLevel = product.reorderLevel;
        if (inv.quantity <= reorderLevel) {
          items.push({
            productId: product.id,
            productName: product.name,
            sku: product.sku,
            imageUrl: product.imageUrl,
            category: product.category?.name || '',
            warehouseId: inv.warehouseId,
            warehouseName: inv.warehouse.name,
            storeName: inv.warehouse.location || inv.warehouse.name,
            quantity: inv.quantity,
            alertQuantity: product.alertQuantity ?? product.reorderLevel,
          });
        }
      }
    }

    const total = items.length;
    const paged = items.slice(skip, skip + limit);

    return { items: paged, total, pages: Math.ceil(total / limit) };
  }

  async getExpiredProducts(
    companyId: string,
    page = 1,
    limit = 10,
  ): Promise<{ products: ProductResponseDto[]; total: number; pages: number }> {
    const skip = (page - 1) * limit;
    const now = new Date();
    const where = {
      companyId,
      expiryDate: { lt: now } as const,
    };

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { expiryDate: 'asc' },
        include: {
          category: true,
          brand: true,
          createdBy: { select: { id: true, name: true, image: true } },
          inventory: {
            include: { warehouse: true },
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
      unit: product.unit || 'pcs',
      imageUrl: product.imageUrl || null,
      barcodeSymbology: product.barcodeSymbology || 'CODE128',
      subCategory: product.subCategory || null,
      itemCode: product.itemCode || null,
      manufacturer: product.manufacturer || null,
      warranty: product.warranty || null,
      manufacturedDate: product.manufacturedDate ? product.manufacturedDate.toISOString() : null,
      expiryDate: product.expiryDate ? product.expiryDate.toISOString() : null,
      taxRate: Number(product.taxRate || 0),
      alertQuantity: product.alertQuantity || 0,
      salePrice: Number(product.salePrice),
      costPrice: Number(product.costPrice),
      stock: stock || 0,
      reorderLevel: product.reorderLevel,
      status: product.status,
      type: product.type || 'STANDARD',
      hasVariants: product.hasVariants ?? false,
      attributes: product.attributes || null,
      parentId: product.parentId || null,
      variants: product.variants
        ? product.variants.map((v: any) => {
            const variantStock = v.inventory
              ? v.inventory.reduce((sum: number, inv: any) => sum + inv.quantity, 0)
              : 0;
            return {
              id: v.id,
              name: v.name,
              sku: v.sku,
              description: v.description,
              category: v.category?.name || '',
              brand: v.brand?.name || undefined,
              unit: v.unit || 'pcs',
              imageUrl: v.imageUrl || null,
              barcodeSymbology: v.barcodeSymbology || 'CODE128',
              subCategory: v.subCategory || null,
              itemCode: v.itemCode || null,
              manufacturer: v.manufacturer || null,
              warranty: v.warranty || null,
              manufacturedDate: v.manufacturedDate ? v.manufacturedDate.toISOString() : null,
              expiryDate: v.expiryDate ? v.expiryDate.toISOString() : null,
              taxRate: Number(v.taxRate || 0),
              alertQuantity: v.alertQuantity || 0,
              salePrice: Number(v.salePrice),
              costPrice: Number(v.costPrice),
              stock: variantStock,
              reorderLevel: v.reorderLevel,
              status: v.status,
              type: v.type || 'STANDARD',
              hasVariants: v.hasVariants ?? false,
              attributes: v.attributes || null,
              parentId: v.parentId || null,
              createdAt: v.createdAt,
              updatedAt: v.updatedAt,
            };
          })
        : undefined,
      comboItems: product.comboComponents
        ? product.comboComponents.map((ci: any) => ({
            productId: ci.productId,
            productName: ci.product?.name || '',
            productSku: ci.product?.sku || '',
            quantity: ci.quantity,
          }))
        : undefined,
      createdBy: product.createdBy
        ? { id: product.createdBy.id, name: product.createdBy.name, image: product.createdBy.image }
        : undefined,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    };
  }

  async createStockAdjustment(
    createStockAdjustmentDto: CreateStockAdjustmentDto,
    userId: string,
    companyId: string,
  ): Promise<StockAdjustmentResponseDto> {
    const { items, notes, type, documentUrl } = createStockAdjustmentDto;

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
            documentUrl,
            type: type || 'ADDITION',
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
          documentUrl: adjustment.documentUrl || undefined,
          type: adjustment.type,
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
      documentUrl: adjustment.documentUrl || undefined,
      type: adjustment.type,
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
      documentUrl: adjustment.documentUrl || undefined,
      type: adjustment.type,
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

  async getStockLedger(productId: string, companyId: string) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, companyId },
    });
    if (!product) throw new NotFoundException('Product not found');

    return this.prisma.stockLedger.findMany({
      where: { productId },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        warehouse: { select: { id: true, name: true } },
        user: { select: { id: true, name: true } },
      },
    });
  }

  async getVariants(productId: string, companyId: string) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, companyId },
    });
    if (!product) throw new NotFoundException('Product not found');

    const variants = await this.prisma.product.findMany({
      where: { parentId: productId, companyId },
      include: {
        category: true,
        brand: true,
        inventory: { include: { warehouse: true } },
      },
    });

    return variants.map((v) => {
      const totalStock = v.inventory.reduce((sum, inv) => sum + inv.quantity, 0);
      return this.transformToDto(v, totalStock);
    });
  }

  async getComboItems(comboId: string, companyId: string) {
    const combo = await this.prisma.product.findFirst({
      where: { id: comboId, companyId, type: 'COMBO' },
    });
    if (!combo) throw new NotFoundException('Combo product not found');

    return this.prisma.comboItem.findMany({
      where: { comboId },
      include: {
        product: {
          select: { id: true, name: true, sku: true, salePrice: true },
        },
      },
    });
  }

  async importCsv(
    products: CreateProductDto[],
    companyId: string,
  ): Promise<{ imported: number; errors: string[] }> {
    const errors: string[] = [];
    let imported = 0;

    for (let i = 0; i < products.length; i++) {
      try {
        await this.create(products[i], companyId);
        imported++;
      } catch (err: any) {
        errors.push(`Row ${i + 1}: ${err.message || 'Failed to import'}`);
      }
    }

    return { imported, errors };
  }

  async exportCsv(companyId: string): Promise<string> {
    const products = await this.prisma.product.findMany({
      where: { companyId, parentId: null },
      include: {
        category: true,
        brand: true,
        inventory: true,
        comboComponents: {
          include: { product: { select: { name: true, sku: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const header = 'SKU,Name,Description,Type,Category,Brand,Unit,SalePrice,CostPrice,Stock,ReorderLevel,Status,BarcodeSymbology,TaxRate,AlertQuantity,ComboItems';
    const rows = products.map((p) => {
      const totalStock = p.inventory.reduce((sum, inv) => sum + inv.quantity, 0);
      const comboInfo = p.comboComponents?.length
        ? p.comboComponents.map(c => `${c.product.sku}:${c.quantity}`).join(';')
        : '';
      return [
        p.sku,
        `"${p.name.replace(/"/g, '""')}"`,
        `"${(p.description || '').replace(/"/g, '""')}"`,
        p.type,
        p.category?.name || '',
        p.brand?.name || '',
        p.unit || 'pcs',
        Number(p.salePrice).toFixed(2),
        Number(p.costPrice).toFixed(2),
        totalStock,
        p.reorderLevel,
        p.status,
        p.barcodeSymbology || 'CODE128',
        Number(p.taxRate || 0).toFixed(2),
        p.alertQuantity || 0,
        comboInfo,
      ].join(',');
    });

    return [header, ...rows].join('\n');
  }

  async bulkUpdatePrice(
    updates: { id: string; salePrice: number; costPrice?: number }[],
    companyId: string,
  ): Promise<{ updated: number }> {
    let updated = 0;
    for (const item of updates) {
      const product = await this.prisma.product.findFirst({
        where: { id: item.id, companyId },
      });
      if (!product) continue;

      const data: any = { salePrice: item.salePrice };
      if (item.costPrice !== undefined) {
        data.costPrice = item.costPrice;
      }

      await this.prisma.product.update({
        where: { id: item.id },
        data,
      });
      updated++;
    }
    return { updated };
  }

  async exportExcel(companyId: string): Promise<string> {
    const products = await this.prisma.product.findMany({
      where: { companyId, parentId: null },
      include: {
        category: true,
        brand: true,
        inventory: true,
        comboComponents: {
          include: { product: { select: { name: true, sku: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const header = 'SKU,Name,Description,Type,Category,Brand,Unit,SalePrice,CostPrice,Stock,ReorderLevel,Status,BarcodeSymbology,TaxRate,AlertQuantity,ComboItems';
    const rows = products.map((p) => {
      const totalStock = p.inventory.reduce((sum, inv) => sum + inv.quantity, 0);
      const comboInfo = p.comboComponents?.length
        ? p.comboComponents.map(c => `${c.product.sku}:${c.quantity}`).join(';')
        : '';
      return [
        p.sku,
        `"${p.name.replace(/"/g, '""')}"`,
        `"${(p.description || '').replace(/"/g, '""')}"`,
        p.type,
        p.category?.name || '',
        p.brand?.name || '',
        p.unit || 'pcs',
        Number(p.salePrice).toFixed(2),
        Number(p.costPrice).toFixed(2),
        totalStock,
        p.reorderLevel,
        p.status,
        p.barcodeSymbology || 'CODE128',
        Number(p.taxRate || 0).toFixed(2),
        p.alertQuantity || 0,
        comboInfo,
      ].join(',');
    });

    return [header, ...rows].join('\n');
  }

  async getProductSales(productId: string, companyId: string) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, companyId },
    });
    if (!product) throw new NotFoundException('Product not found');

    const saleItems = await this.prisma.saleItem.findMany({
      where: { productId },
      include: {
        sale: {
          include: {
            customer: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { sale: { saleDate: 'desc' } },
    });

    return saleItems.map((item) => ({
      id: item.id,
      quantity: item.quantity,
      unitPrice: Number(item.unitPrice),
      totalPrice: Number(item.unitPrice) * item.quantity,
      saleId: item.saleId,
      invoiceNumber: item.sale.invoiceNumber,
      saleDate: item.sale.saleDate,
      customerId: item.sale.customer.id,
      customerName: item.sale.customer.name,
    }));
  }

  async getProductQuotations(productId: string, companyId: string) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, companyId },
    });
    if (!product) throw new NotFoundException('Product not found');

    const quotationItems = await this.prisma.quotationItem.findMany({
      where: { productId },
      include: {
        quotation: {
          include: {
            customer: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { quotation: { quoteDate: 'desc' } },
    });

    return quotationItems.map((item) => ({
      id: item.id,
      quantity: item.quantity,
      unitPrice: Number(item.unitPrice),
      totalPrice: Number(item.unitPrice) * item.quantity,
      quotationId: item.quotationId,
      referenceNumber: item.quotation.referenceNumber,
      quoteDate: item.quotation.quoteDate,
      customerId: item.quotation.customer.id,
      customerName: item.quotation.customer.name,
    }));
  }

  async getProductPurchases(productId: string, companyId: string) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, companyId },
    });
    if (!product) throw new NotFoundException('Product not found');

    const purchaseItems = await this.prisma.purchaseOrderItem.findMany({
      where: { productId },
      include: {
        purchaseOrder: {
          include: {
            supplier: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { purchaseOrder: { orderDate: 'desc' } },
    });

    return purchaseItems.map((item) => ({
      id: item.id,
      quantity: item.quantity,
      unitCost: Number(item.unitCost),
      totalCost: Number(item.unitCost) * item.quantity,
      purchaseOrderId: item.purchaseOrderId,
      referenceNumber: item.purchaseOrder.referenceNumber,
      orderDate: item.purchaseOrder.orderDate,
      supplierId: item.purchaseOrder.supplier.id,
      supplierName: item.purchaseOrder.supplier.name,
    }));
  }
}
