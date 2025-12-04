import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductCategoryDto } from './dto/create-product-category.dto';
import { UpdateProductCategoryDto } from './dto/update-product-category.dto';

@Injectable()
export class ProductCategoriesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateProductCategoryDto, companyId: string) {
    // Check if category with same name already exists for this company
    const existing = await this.prisma.productCategory.findFirst({
      where: {
        name: dto.name,
        companyId,
      },
    });

    if (existing) {
      throw new ConflictException('A category with this name already exists');
    }

    return this.prisma.productCategory.create({
      data: {
        name: dto.name,
        companyId,
      },
    });
  }

  async findAll(companyId: string) {
    return this.prisma.productCategory.findMany({
      where: { companyId },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        companyId: true,
      },
    });
  }

  async findOne(id: string, companyId: string) {
    const category = await this.prisma.productCategory.findFirst({
      where: { id, companyId },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return category;
  }

  async update(id: string, dto: UpdateProductCategoryDto, companyId: string) {
    // Verify category exists and belongs to company
    await this.findOne(id, companyId);

    // Check if another category with same name exists (excluding current one)
    const existing = await this.prisma.productCategory.findFirst({
      where: {
        name: dto.name,
        companyId,
        id: { not: id },
      },
    });

    if (existing) {
      throw new ConflictException('A category with this name already exists');
    }

    return this.prisma.productCategory.update({
      where: { id },
      data: { name: dto.name },
    });
  }

  async remove(id: string, companyId: string) {
    // Verify category exists and belongs to company
    const category = await this.findOne(id, companyId);

    // Prevent deleting "Uncategorized" category
    if (category.name === 'Uncategorized') {
      throw new ConflictException('Cannot delete the "Uncategorized" category');
    }

    // Get products using this category
    const products = await this.prisma.product.findMany({
      where: { categoryId: id, companyId },
      select: { id: true, name: true, sku: true },
    });

    if (products.length > 0) {
      // Find or create an "Uncategorized" category
      let uncategorizedCategory = await this.prisma.productCategory.findFirst({
        where: {
          name: 'Uncategorized',
          companyId,
        },
      });

      if (!uncategorizedCategory) {
        uncategorizedCategory = await this.prisma.productCategory.create({
          data: {
            name: 'Uncategorized',
            companyId,
          },
        });
      }

      // Update all products to use "Uncategorized" category
      await this.prisma.product.updateMany({
        where: { categoryId: id, companyId },
        data: { categoryId: uncategorizedCategory.id },
      });

      // Return info about affected products
      await this.prisma.productCategory.delete({
        where: { id },
      });

      return {
        message: 'Category deleted successfully',
        affectedProducts: products.map((p) => ({
          id: p.id,
          name: p.name,
          sku: p.sku,
        })),
      };
    }

    await this.prisma.productCategory.delete({
      where: { id },
    });

    return { message: 'Category deleted successfully', affectedProducts: [] };
  }

  async bulkDelete(ids: string[], companyId: string) {
    const results = {
      deleted: [] as string[],
      failed: [] as { id: string; error: string }[],
      totalAffectedProducts: 0,
      affectedProductsList: [] as Array<{
        id: string;
        name: string;
        sku: string;
      }>,
    };

    // Get or create "Uncategorized" category once
    let uncategorizedCategory = await this.prisma.productCategory.findFirst({
      where: {
        name: 'Uncategorized',
        companyId,
      },
    });

    if (!uncategorizedCategory) {
      uncategorizedCategory = await this.prisma.productCategory.create({
        data: {
          name: 'Uncategorized',
          companyId,
        },
      });
    }

    for (const id of ids) {
      try {
        // Verify category exists and belongs to company
        const category = await this.prisma.productCategory.findFirst({
          where: { id, companyId },
        });

        if (!category) {
          results.failed.push({
            id,
            error: 'Category not found or access denied',
          });
          continue;
        }

        // Prevent deleting "Uncategorized" category
        if (category.name === 'Uncategorized') {
          results.failed.push({
            id,
            error: 'Cannot delete the "Uncategorized" category',
          });
          continue;
        }

        // Get products using this category
        const products = await this.prisma.product.findMany({
          where: { categoryId: id, companyId },
          select: { id: true, name: true, sku: true },
        });

        if (products.length > 0) {
          // Update all products to use "Uncategorized" category
          await this.prisma.product.updateMany({
            where: { categoryId: id, companyId },
            data: { categoryId: uncategorizedCategory.id },
          });

          results.totalAffectedProducts += products.length;
          results.affectedProductsList.push(...products);
        }

        // Delete the category
        await this.prisma.productCategory.delete({
          where: { id },
        });

        results.deleted.push(id);
      } catch (error) {
        results.failed.push({
          id,
          error: error.message || 'Failed to delete category',
        });
      }
    }

    return {
      message: `Successfully deleted ${results.deleted.length} out of ${ids.length} categories`,
      ...results,
    };
  }
}
