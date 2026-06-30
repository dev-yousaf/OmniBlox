import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../cache/cache.service';
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';

const CACHE_TTL = 60 * 30;
const LIST_KEY = (cid: string) => `brands:${cid}:list`;
const ITEM_KEY = (cid: string, id: string) => `brands:${cid}:${id}`;

@Injectable()
export class BrandsService {
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

  async create(dto: CreateBrandDto, companyId: string) {
    const existing = await this.prisma.brand.findFirst({
      where: { name: dto.name, companyId },
    });
    if (existing) {
      throw new ConflictException('A brand with this name already exists');
    }

    const slug = dto.slug || this.generateSlug(dto.name);
    const brand = await this.prisma.brand.create({
      data: {
        name: dto.name,
        slug,
        description: dto.description,
        status: dto.status || 'ACTIVE',
        imageUrl: dto.imageUrl || undefined,
        companyId,
      },
    });

    await this.cache.del(LIST_KEY(companyId));
    return brand;
  }

  async findAll(companyId: string) {
    const cacheKey = LIST_KEY(companyId);
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    const data = await this.prisma.brand.findMany({
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

    const brand = await this.prisma.brand.findFirst({
      where: { id, companyId },
    });
    if (!brand) {
      throw new NotFoundException('Brand not found');
    }

    await this.cache.set(cacheKey, brand, CACHE_TTL);
    return brand;
  }

  async update(id: string, dto: UpdateBrandDto, companyId: string) {
    await this.findOne(id, companyId);

    if (dto.name) {
      const existing = await this.prisma.brand.findFirst({
        where: { name: dto.name, companyId, id: { not: id } },
      });
      if (existing) {
        throw new ConflictException('A brand with this name already exists');
      }
    }

    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.slug !== undefined) data.slug = dto.slug;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.imageUrl !== undefined) data.imageUrl = dto.imageUrl;

    const brand = await this.prisma.brand.update({ where: { id }, data });

    await Promise.all([
      this.cache.del(LIST_KEY(companyId)),
      this.cache.del(ITEM_KEY(companyId, id)),
    ]);
    return brand;
  }

  async remove(id: string, companyId: string) {
    await this.findOne(id, companyId);

    await this.prisma.product.updateMany({
      where: { brandId: id, companyId },
      data: { brandId: null },
    });
    await this.prisma.brand.delete({ where: { id } });

    await Promise.all([
      this.cache.del(LIST_KEY(companyId)),
      this.cache.del(ITEM_KEY(companyId, id)),
    ]);

    return { message: 'Brand deleted successfully', affectedProducts: [] };
  }

  async bulkDelete(ids: string[], companyId: string) {
    const brands = await this.prisma.brand.findMany({
      where: { id: { in: ids }, companyId },
      select: { id: true },
    });
    const foundIds = brands.map((b) => b.id);
    const notFound = ids.filter((id) => !foundIds.includes(id));

    if (foundIds.length > 0) {
      await this.prisma.product.updateMany({
        where: { brandId: { in: foundIds }, companyId },
        data: { brandId: null },
      });
      await this.prisma.brand.deleteMany({
        where: { id: { in: foundIds }, companyId },
      });
    }

    await this.cache.del(LIST_KEY(companyId));

    return {
      message: `Successfully deleted ${foundIds.length} out of ${ids.length} brands`,
      deleted: foundIds,
      failed: notFound.map((id) => ({ id, error: 'Brand not found or access denied' })),
      totalAffectedProducts: 0,
      affectedProductsList: [],
    };
  }
}
