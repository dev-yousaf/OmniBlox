import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../cache/cache.service';
import { CreateUnitDto } from './dto/create-unit.dto';
import { UpdateUnitDto } from './dto/update-unit.dto';

const CACHE_TTL = 60 * 30;
const LIST_KEY = (cid: string) => `units:${cid}:list`;
const ITEM_KEY = (cid: string, id: string) => `units:${cid}:${id}`;

@Injectable()
export class UnitsService {
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

  async create(dto: CreateUnitDto, companyId: string) {
    const [existingByName, existingByShortName] = await Promise.all([
      this.prisma.unit.findFirst({
        where: { name: dto.name, companyId },
      }),
      this.prisma.unit.findFirst({
        where: { shortName: dto.shortName, companyId },
      }),
    ]);

    if (existingByName) {
      throw new ConflictException('A unit with this name already exists');
    }
    if (existingByShortName) {
      throw new ConflictException('A unit with this short name already exists');
    }

    const slug = dto.slug || this.generateSlug(dto.name);
    const unit = await this.prisma.unit.create({
      data: {
        name: dto.name,
        shortName: dto.shortName,
        slug,
        description: dto.description,
        status: dto.status || 'ACTIVE',
        companyId,
      },
    });

    await this.cache.del(LIST_KEY(companyId));
    return unit;
  }

  async findAll(companyId: string) {
    const cacheKey = LIST_KEY(companyId);
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    const data = await this.prisma.unit.findMany({
      where: { companyId },
      orderBy: { name: 'asc' },
      include: { _count: { select: { products: true } } },
    });

    await this.cache.set(cacheKey, data, CACHE_TTL);
    return data;
  }

  async findOne(id: string, companyId: string) {
    const cacheKey = ITEM_KEY(companyId, id);
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    const unit = await this.prisma.unit.findFirst({
      where: { id, companyId },
    });
    if (!unit) {
      throw new NotFoundException('Unit not found');
    }

    await this.cache.set(cacheKey, unit, CACHE_TTL);
    return unit;
  }

  async update(id: string, dto: UpdateUnitDto, companyId: string) {
    await this.findOne(id, companyId);

    const [existingName, existingShortName] = await Promise.all([
      dto.name
        ? this.prisma.unit.findFirst({
            where: { name: dto.name, companyId, id: { not: id } },
          })
        : null,
      dto.shortName
        ? this.prisma.unit.findFirst({
            where: { shortName: dto.shortName, companyId, id: { not: id } },
          })
        : null,
    ]);

    if (existingName) {
      throw new ConflictException('A unit with this name already exists');
    }
    if (existingShortName) {
      throw new ConflictException('A unit with this short name already exists');
    }

    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.shortName !== undefined) data.shortName = dto.shortName;
    if (dto.slug !== undefined) data.slug = dto.slug;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.status !== undefined) data.status = dto.status;

    const unit = await this.prisma.unit.update({ where: { id }, data });

    await Promise.all([
      this.cache.del(LIST_KEY(companyId)),
      this.cache.del(ITEM_KEY(companyId, id)),
    ]);
    return unit;
  }

  async remove(id: string, companyId: string) {
    await this.findOne(id, companyId);
    await this.prisma.unit.delete({ where: { id } });

    await Promise.all([
      this.cache.del(LIST_KEY(companyId)),
      this.cache.del(ITEM_KEY(companyId, id)),
    ]);
    return { message: 'Unit deleted successfully' };
  }

  async bulkDelete(ids: string[], companyId: string) {
    const found = await this.prisma.unit.findMany({
      where: { id: { in: ids }, companyId },
      select: { id: true },
    });
    const foundIds = found.map((u) => u.id);
    const notFound = ids.filter((id) => !foundIds.includes(id));

    if (foundIds.length > 0) {
      await this.prisma.unit.deleteMany({
        where: { id: { in: foundIds }, companyId },
      });
    }

    await this.cache.del(LIST_KEY(companyId));

    return {
      message: `Successfully deleted ${foundIds.length} out of ${ids.length} units`,
      deleted: foundIds,
      failed: notFound.map((id) => ({
        id,
        error: 'Unit not found or access denied',
      })),
    };
  }
}
