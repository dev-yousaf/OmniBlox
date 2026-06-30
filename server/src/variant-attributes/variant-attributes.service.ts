import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../cache/cache.service';
import { CreateVariantAttributeDto } from './dto/create-variant-attribute.dto';
import { UpdateVariantAttributeDto } from './dto/update-variant-attribute.dto';

const CACHE_TTL = 60 * 30;
const LIST_KEY = (cid: string) => `varattrs:${cid}:list`;
const ITEM_KEY = (cid: string, id: string) => `varattrs:${cid}:${id}`;

@Injectable()
export class VariantAttributesService {
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

  async create(dto: CreateVariantAttributeDto, companyId: string) {
    const existing = await this.prisma.variantAttribute.findFirst({
      where: { name: dto.name, companyId },
    });
    if (existing) {
      throw new ConflictException(
        'A variant attribute with this name already exists',
      );
    }

    const slug = dto.slug || this.generateSlug(dto.name);
    const attr = await this.prisma.variantAttribute.create({
      data: {
        name: dto.name,
        slug,
        values: dto.values || undefined,
        description: dto.description,
        status: dto.status || 'ACTIVE',
        companyId,
      },
    });

    await this.cache.del(LIST_KEY(companyId));
    return attr;
  }

  async findAll(companyId: string) {
    const cacheKey = LIST_KEY(companyId);
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    const data = await this.prisma.variantAttribute.findMany({
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

    const attribute = await this.prisma.variantAttribute.findFirst({
      where: { id, companyId },
    });
    if (!attribute) {
      throw new NotFoundException('Variant attribute not found');
    }

    await this.cache.set(cacheKey, attribute, CACHE_TTL);
    return attribute;
  }

  async update(id: string, dto: UpdateVariantAttributeDto, companyId: string) {
    await this.findOne(id, companyId);

    if (dto.name) {
      const existing = await this.prisma.variantAttribute.findFirst({
        where: { name: dto.name, companyId, id: { not: id } },
      });
      if (existing) {
        throw new ConflictException(
          'A variant attribute with this name already exists',
        );
      }
    }

    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.slug !== undefined) data.slug = dto.slug;
    if (dto.values !== undefined) data.values = dto.values;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.status !== undefined) data.status = dto.status;

    const attr = await this.prisma.variantAttribute.update({
      where: { id },
      data,
    });

    await Promise.all([
      this.cache.del(LIST_KEY(companyId)),
      this.cache.del(ITEM_KEY(companyId, id)),
    ]);
    return attr;
  }

  async remove(id: string, companyId: string) {
    await this.findOne(id, companyId);
    await this.prisma.variantAttribute.delete({ where: { id } });

    await Promise.all([
      this.cache.del(LIST_KEY(companyId)),
      this.cache.del(ITEM_KEY(companyId, id)),
    ]);
    return { message: 'Variant attribute deleted successfully' };
  }

  async bulkDelete(ids: string[], companyId: string) {
    const found = await this.prisma.variantAttribute.findMany({
      where: { id: { in: ids }, companyId },
      select: { id: true },
    });
    const foundIds = found.map((a) => a.id);
    const notFound = ids.filter((id) => !foundIds.includes(id));

    if (foundIds.length > 0) {
      await this.prisma.variantAttribute.deleteMany({
        where: { id: { in: foundIds }, companyId },
      });
    }

    await this.cache.del(LIST_KEY(companyId));

    return {
      message: `Successfully deleted ${foundIds.length} out of ${ids.length} variant attributes`,
      deleted: foundIds,
      failed: notFound.map((id) => ({
        id,
        error: 'Variant attribute not found or access denied',
      })),
    };
  }
}
