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

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/[\s_]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  async create(dto: CreateProductCategoryDto, companyId: string) {
    const existing = await this.prisma.productCategory.findFirst({
      where: { name: dto.name, companyId },
    });

    if (existing) {
      throw new ConflictException('A category with this name already exists');
    }

    const slug = dto.slug || this.generateSlug(dto.name);

    return this.prisma.productCategory.create({
      data: {
        name: dto.name,
        slug,
        description: dto.description,
        status: dto.status || 'ACTIVE',
        companyId,
      },
    });
  }

  async findAll(companyId: string) {
    return this.prisma.productCategory.findMany({
      where: { companyId },
      orderBy: { name: 'asc' },
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
    await this.findOne(id, companyId);

    if (dto.name) {
      const existing = await this.prisma.productCategory.findFirst({
        where: { name: dto.name, companyId, id: { not: id } },
      });

      if (existing) {
        throw new ConflictException('A category with this name already exists');
      }
    }

    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.slug !== undefined) data.slug = dto.slug;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.status !== undefined) data.status = dto.status;

    return this.prisma.productCategory.update({
      where: { id },
      data,
    });
  }

  async remove(id: string, companyId: string) {
    const category = await this.findOne(id, companyId);

    if (category.name === 'Uncategorized') {
      throw new ConflictException('Cannot delete the "Uncategorized" category');
    }

    const products = await this.prisma.product.findMany({
      where: { categoryId: id, companyId },
      select: { id: true, name: true, sku: true },
    });

    if (products.length > 0) {
      let uncategorizedCategory = await this.prisma.productCategory.findFirst({
        where: { name: 'Uncategorized', companyId },
      });

      if (!uncategorizedCategory) {
        uncategorizedCategory = await this.prisma.productCategory.create({
          data: { name: 'Uncategorized', slug: 'uncategorized', companyId },
        });
      }

      await this.prisma.product.updateMany({
        where: { categoryId: id, companyId },
        data: { categoryId: uncategorizedCategory.id, subCategoryId: null },
      });

      await this.prisma.productCategory.delete({ where: { id } });

      return {
        message: 'Category deleted successfully',
        affectedProducts: products.map((p) => ({
          id: p.id,
          name: p.name,
          sku: p.sku,
        })),
      };
    }

    await this.prisma.productCategory.delete({ where: { id } });

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

    let uncategorizedCategory = await this.prisma.productCategory.findFirst({
      where: { name: 'Uncategorized', companyId },
    });

    if (!uncategorizedCategory) {
      uncategorizedCategory = await this.prisma.productCategory.create({
        data: { name: 'Uncategorized', slug: 'uncategorized', companyId },
      });
    }

    for (const id of ids) {
      try {
        const category = await this.prisma.productCategory.findFirst({
          where: { id, companyId },
        });

        if (!category) {
          results.failed.push({ id, error: 'Category not found or access denied' });
          continue;
        }

        if (category.name === 'Uncategorized') {
          results.failed.push({ id, error: 'Cannot delete the "Uncategorized" category' });
          continue;
        }

        const products = await this.prisma.product.findMany({
          where: { categoryId: id, companyId },
          select: { id: true, name: true, sku: true },
        });

        if (products.length > 0) {
          await this.prisma.product.updateMany({
            where: { categoryId: id, companyId },
            data: { categoryId: uncategorizedCategory.id, subCategoryId: null },
          });

          results.totalAffectedProducts += products.length;
          results.affectedProductsList.push(...products);
        }

        await this.prisma.productCategory.delete({ where: { id } });
        results.deleted.push(id);
      } catch (error) {
        results.failed.push({ id, error: error.message || 'Failed to delete category' });
      }
    }

    return {
      message: `Successfully deleted ${results.deleted.length} out of ${ids.length} categories`,
      ...results,
    };
  }
}
