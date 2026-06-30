import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../cache/cache.service';
import { CreateProductCategoryDto } from './dto/create-product-category.dto';
import { UpdateProductCategoryDto } from './dto/update-product-category.dto';

const CACHE_TTL = 60 * 30;
const LIST_KEY = (cid: string) => `categories:${cid}:list`;
const ITEM_KEY = (cid: string, id: string) => `categories:${cid}:${id}`;

@Injectable()
export class ProductCategoriesService {
  constructor(
    private prisma: PrismaService,
    private cache: CacheService,
  ) {}

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
    const cat = await this.prisma.productCategory.create({
      data: {
        name: dto.name,
        slug,
        description: dto.description,
        status: dto.status || 'ACTIVE',
        companyId,
      },
    });

    await this.cache.del(LIST_KEY(companyId));
    return cat;
  }

  async findAll(companyId: string) {
    const cacheKey = LIST_KEY(companyId);
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    const data = await this.prisma.productCategory.findMany({
      where: { companyId },
      orderBy: { name: 'asc' },
    });

    await this.cache.set(cacheKey, data, CACHE_TTL);
    return data;
  }

  async findOne(id: string, companyId: string) {
    const cacheKey = ITEM_KEY(companyId, id);
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    const category = await this.prisma.productCategory.findFirst({
      where: { id, companyId },
    });
    if (!category) {
      throw new NotFoundException('Category not found');
    }

    await this.cache.set(cacheKey, category, CACHE_TTL);
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

    const cat = await this.prisma.productCategory.update({
      where: { id },
      data,
    });

    await Promise.all([
      this.cache.del(LIST_KEY(companyId)),
      this.cache.del(ITEM_KEY(companyId, id)),
    ]);
    return cat;
  }

  async remove(id: string, companyId: string) {
    const category = await this.findOne(id, companyId);
    if (category.name === 'Uncategorized') {
      throw new ConflictException('Cannot delete the "Uncategorized" category');
    }

    const productCount = await this.prisma.product.count({
      where: { categoryId: id, companyId },
    });

    if (productCount > 0) {
      let uncat = await this.prisma.productCategory.findFirst({
        where: { name: 'Uncategorized', companyId },
      });
      if (!uncat) {
        uncat = await this.prisma.productCategory.create({
          data: { name: 'Uncategorized', slug: 'uncategorized', companyId },
        });
      }

      await this.prisma.product.updateMany({
        where: { categoryId: id, companyId },
        data: { categoryId: uncat.id, subCategoryId: null },
      });
    }

    await this.prisma.productCategory.delete({ where: { id } });

    await Promise.all([
      this.cache.del(LIST_KEY(companyId)),
      this.cache.del(ITEM_KEY(companyId, id)),
    ]);

    return { message: 'Category deleted successfully', affectedProducts: [] };
  }

  async bulkDelete(ids: string[], companyId: string) {
    const categories = await this.prisma.productCategory.findMany({
      where: { id: { in: ids }, companyId },
      select: { id: true, name: true },
    });

    const foundIds = categories.map((c) => c.id);
    const notFound = ids.filter((id) => !foundIds.includes(id));

    let uncat = await this.prisma.productCategory.findFirst({
      where: { name: 'Uncategorized', companyId },
    });
    if (!uncat) {
      uncat = await this.prisma.productCategory.create({
        data: { name: 'Uncategorized', slug: 'uncategorized', companyId },
      });
    }

    const deletableIds = categories
      .filter((c) => c.name !== 'Uncategorized')
      .map((c) => c.id);
    const blocked = categories
      .filter((c) => c.name === 'Uncategorized')
      .map((c) => c.id);

    if (deletableIds.length > 0) {
      await this.prisma.product.updateMany({
        where: { categoryId: { in: deletableIds }, companyId },
        data: { categoryId: uncat.id, subCategoryId: null },
      });
      await this.prisma.productCategory.deleteMany({
        where: { id: { in: deletableIds }, companyId },
      });
    }

    await this.cache.del(LIST_KEY(companyId));

    return {
      message: `Successfully deleted ${deletableIds.length} out of ${ids.length} categories`,
      deleted: deletableIds,
      failed: [
        ...notFound.map((id) => ({
          id,
          error: 'Category not found or access denied',
        })),
        ...blocked.map((id) => ({
          id,
          error: 'Cannot delete the "Uncategorized" category',
        })),
      ],
      totalAffectedProducts: 0,
      affectedProductsList: [],
    };
  }
}
