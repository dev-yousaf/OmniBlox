import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../cache/cache.service';
import { CreateWarrantyDto } from './dto/create-warranty.dto';
import { UpdateWarrantyDto } from './dto/update-warranty.dto';

const CACHE_TTL = 60 * 30;
const LIST_KEY = (cid: string) => `warranties:${cid}:list`;
const ITEM_KEY = (cid: string, id: string) => `warranties:${cid}:${id}`;

@Injectable()
export class WarrantiesService {
  constructor(
    private prisma: PrismaService,
    private cache: CacheService,
  ) {}

  async create(dto: CreateWarrantyDto, companyId: string) {
    const existing = await this.prisma.warranty.findFirst({
      where: { name: dto.name, companyId },
    });
    if (existing) {
      throw new ConflictException('A warranty with this name already exists');
    }

    const warranty = await this.prisma.warranty.create({
      data: {
        name: dto.name,
        duration: dto.duration,
        durationType: dto.durationType || 'MONTHS',
        description: dto.description,
        status: dto.status || 'ACTIVE',
        companyId,
      },
    });

    await this.cache.del(LIST_KEY(companyId));
    return warranty;
  }

  async findAll(companyId: string) {
    const cacheKey = LIST_KEY(companyId);
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    const data = await this.prisma.warranty.findMany({
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

    const warranty = await this.prisma.warranty.findFirst({
      where: { id, companyId },
    });
    if (!warranty) {
      throw new NotFoundException('Warranty not found');
    }

    await this.cache.set(cacheKey, warranty, CACHE_TTL);
    return warranty;
  }

  async update(id: string, dto: UpdateWarrantyDto, companyId: string) {
    await this.findOne(id, companyId);

    if (dto.name) {
      const existing = await this.prisma.warranty.findFirst({
        where: { name: dto.name, companyId, id: { not: id } },
      });
      if (existing) {
        throw new ConflictException('A warranty with this name already exists');
      }
    }

    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.duration !== undefined) data.duration = dto.duration;
    if (dto.durationType !== undefined) data.durationType = dto.durationType;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.status !== undefined) data.status = dto.status;

    const warranty = await this.prisma.warranty.update({
      where: { id },
      data,
    });

    await Promise.all([
      this.cache.del(LIST_KEY(companyId)),
      this.cache.del(ITEM_KEY(companyId, id)),
    ]);
    return warranty;
  }

  async remove(id: string, companyId: string) {
    await this.findOne(id, companyId);
    await this.prisma.warranty.delete({ where: { id } });

    await Promise.all([
      this.cache.del(LIST_KEY(companyId)),
      this.cache.del(ITEM_KEY(companyId, id)),
    ]);
    return { message: 'Warranty deleted successfully' };
  }

  async bulkDelete(ids: string[], companyId: string) {
    const found = await this.prisma.warranty.findMany({
      where: { id: { in: ids }, companyId },
      select: { id: true },
    });
    const foundIds = found.map((w) => w.id);
    const notFound = ids.filter((id) => !foundIds.includes(id));

    if (foundIds.length > 0) {
      await this.prisma.warranty.deleteMany({
        where: { id: { in: foundIds }, companyId },
      });
    }

    await this.cache.del(LIST_KEY(companyId));

    return {
      message: `Successfully deleted ${foundIds.length} out of ${ids.length} warranties`,
      deleted: foundIds,
      failed: notFound.map((id) => ({
        id,
        error: 'Warranty not found or access denied',
      })),
    };
  }
}
