import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../cache/cache.service';
import { CreateSubCategoryDto } from './dto/create-sub-category.dto';
import { UpdateSubCategoryDto } from './dto/update-sub-category.dto';

const CACHE_TTL = 60 * 30;
const LIST_KEY = (cid: string, catId?: string) =>
  `subcats:${cid}:list${catId ? `:${catId}` : ''}`;
const ITEM_KEY = (cid: string, id: string) => `subcats:${cid}:${id}`;

const INVALIDATE_KEYS = async (
  cache: CacheService,
  cid: string,
  catId?: string,
) => {
  await cache.del(LIST_KEY(cid));
  if (catId) await cache.del(LIST_KEY(cid, catId));
};

@Injectable()
export class SubCategoriesService {
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

  async create(dto: CreateSubCategoryDto, companyId: string) {
    const [category] = await Promise.all([
      this.prisma.productCategory.findFirst({
        where: { id: dto.categoryId, companyId },
      }),
      dto.name
        ? this.prisma.subCategory.findFirst({
            where: { name: dto.name, categoryId: dto.categoryId, companyId },
          })
        : Promise.resolve(null),
    ]);

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    const existing = dto.name
      ? await this.prisma.subCategory.findFirst({
          where: { name: dto.name, categoryId: dto.categoryId, companyId },
        })
      : null;

    if (existing) {
      throw new ConflictException(
        'A sub-category with this name already exists in this category',
      );
    }

    const slug = dto.slug || this.generateSlug(dto.name);

    const lastSubCategory = await this.prisma.subCategory.findFirst({
      where: { companyId },
      orderBy: { code: 'desc' },
    });

    let code = dto.slug ? dto.slug.toUpperCase().replace(/-/g, '_') : null;
    if (!code) {
      const nextNum = lastSubCategory?.code
        ? String(Number(lastSubCategory.code.replace(/\D/g, '')) + 1).padStart(
            3,
            '0',
          )
        : '001';
      code = `SC${nextNum}`;
    }

    const sub = await this.prisma.subCategory.create({
      data: {
        name: dto.name,
        slug,
        code,
        imageUrl: dto.imageUrl,
        description: dto.description,
        status: dto.status || 'ACTIVE',
        categoryId: dto.categoryId,
        companyId,
      },
      include: { category: { select: { id: true, name: true } } },
    });

    await INVALIDATE_KEYS(this.cache, companyId, dto.categoryId);
    return sub;
  }

  async findAll(companyId: string, categoryId?: string) {
    const cacheKey = LIST_KEY(companyId, categoryId);
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    const where: any = { companyId };
    if (categoryId) where.categoryId = categoryId;

    const data = await this.prisma.subCategory.findMany({
      where,
      orderBy: { name: 'asc' },
      include: { category: { select: { id: true, name: true } } },
    });

    await this.cache.set(cacheKey, data, CACHE_TTL);
    return data;
  }

  async findOne(id: string, companyId: string) {
    const cacheKey = ITEM_KEY(companyId, id);
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    const subCategory = await this.prisma.subCategory.findFirst({
      where: { id, companyId },
      include: { category: { select: { id: true, name: true } } },
    });
    if (!subCategory) {
      throw new NotFoundException('Sub-category not found');
    }

    await this.cache.set(cacheKey, subCategory, CACHE_TTL);
    return subCategory;
  }

  async update(id: string, dto: UpdateSubCategoryDto, companyId: string) {
    await this.findOne(id, companyId);

    if (dto.categoryId) {
      const category = await this.prisma.productCategory.findFirst({
        where: { id: dto.categoryId, companyId },
      });
      if (!category) {
        throw new NotFoundException('Category not found');
      }
    }

    if (dto.name) {
      const categoryId =
        dto.categoryId ||
        (await this.prisma.subCategory.findUnique({ where: { id } }))
          .categoryId;
      const existing = await this.prisma.subCategory.findFirst({
        where: { name: dto.name, categoryId, companyId, id: { not: id } },
      });
      if (existing) {
        throw new ConflictException(
          'A sub-category with this name already exists in this category',
        );
      }
    }

    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.slug !== undefined) data.slug = dto.slug;
    if (dto.imageUrl !== undefined) data.imageUrl = dto.imageUrl;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.categoryId !== undefined) data.categoryId = dto.categoryId;

    const sub = await this.prisma.subCategory.update({
      where: { id },
      data,
      include: { category: { select: { id: true, name: true } } },
    });

    await Promise.all([
      this.cache.del(LIST_KEY(companyId)),
      this.cache.del(ITEM_KEY(companyId, id)),
    ]);
    return sub;
  }

  async remove(id: string, companyId: string) {
    const sub = await this.findOne(id, companyId);

    await Promise.all([
      this.prisma.product.updateMany({
        where: { subCategoryId: id, companyId },
        data: { subCategoryId: null },
      }),
      this.prisma.subCategory.delete({ where: { id } }),
    ]);

    await Promise.all([
      this.cache.del(LIST_KEY(companyId)),
      this.cache.del(ITEM_KEY(companyId, id)),
    ]);

    return { message: 'Sub-category deleted successfully' };
  }

  async bulkDelete(ids: string[], companyId: string) {
    const found = await this.prisma.subCategory.findMany({
      where: { id: { in: ids }, companyId },
      select: { id: true },
    });
    const foundIds = found.map((s) => s.id);
    const notFound = ids.filter((id) => !foundIds.includes(id));

    if (foundIds.length > 0) {
      await Promise.all([
        this.prisma.product.updateMany({
          where: { subCategoryId: { in: foundIds }, companyId },
          data: { subCategoryId: null },
        }),
        this.prisma.subCategory.deleteMany({
          where: { id: { in: foundIds }, companyId },
        }),
      ]);
    }

    await this.cache.del(LIST_KEY(companyId));

    return {
      message: `Successfully deleted ${foundIds.length} out of ${ids.length} sub-categories`,
      deleted: foundIds,
      failed: notFound.map((id) => ({
        id,
        error: 'Sub-category not found or access denied',
      })),
    };
  }
}
