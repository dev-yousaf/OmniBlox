import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../cache/cache.service';
import {
  CreateBillerDto,
  UpdateBillerDto,
  BillerResponseDto,
  BillerListResponseDto,
  BillerStatsDto,
} from './dto/billers.dto';

const CACHE_TTL = 60 * 15;
const LIST_KEY = (cid: string) => `billers:${cid}:list`;
const PAGED_KEY = (
  cid: string,
  page: number,
  limit: number,
  search?: string,
  status?: string,
) => `billers:${cid}:page:${page}:${limit}:${search ?? ''}:${status ?? ''}`;
const ITEM_KEY = (cid: string, id: string) => `billers:${cid}:${id}`;
const STATS_KEY = (cid: string) => `billers:${cid}:stats`;

@Injectable()
export class BillersService {
  constructor(
    private prisma: PrismaService,
    private cache: CacheService,
  ) {}

  async create(
    dto: CreateBillerDto,
    companyId: string,
  ): Promise<BillerResponseDto> {
    const existingBiller = await this.prisma.biller.findFirst({
      where: { code: dto.code, companyId },
    });
    if (existingBiller) {
      throw new ConflictException('Biller with this code already exists');
    }

    const biller = await this.prisma.biller.create({
      data: { ...dto, companyId },
    });

    await Promise.all([
      this.cache.del(LIST_KEY(companyId)),
      this.cache.del(STATS_KEY(companyId)),
    ]);
    return this.mapToBillerResponse(biller);
  }

  async findAll(companyId: string): Promise<BillerResponseDto[]> {
    const cacheKey = LIST_KEY(companyId);
    const cached = await this.cache.get<BillerResponseDto[]>(cacheKey);
    if (cached) return cached;

    const billers = await this.prisma.biller.findMany({
      where: { companyId },
      include: { _count: { select: { sales: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const data = billers.map((b) =>
      this.mapToBillerResponse(b, b._count.sales),
    );
    await this.cache.set(cacheKey, data, CACHE_TTL);
    return data;
  }

  async findAllPaginated(
    companyId: string,
    page: number = 1,
    limit: number = 10,
    search?: string,
    status?: string,
  ): Promise<BillerListResponseDto> {
    const cacheKey = PAGED_KEY(companyId, page, limit, search, status);
    const cached = await this.cache.get<BillerListResponseDto>(cacheKey);
    if (cached) return cached;

    const skip = (page - 1) * limit;
    const where: any = { companyId };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' as const } },
        { code: { contains: search, mode: 'insensitive' as const } },
        { email: { contains: search, mode: 'insensitive' as const } },
      ];
    }
    if (status) where.status = status;

    const [billers, total] = await Promise.all([
      this.prisma.biller.findMany({
        where,
        include: { _count: { select: { sales: true } } },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.biller.count({ where }),
    ]);

    const data: BillerListResponseDto = {
      billers: billers.map((b) => this.mapToBillerResponse(b, b._count.sales)),
      total,
      pages: Math.ceil(total / limit),
    };

    await this.cache.set(cacheKey, data, 60 * 5);
    return data;
  }

  async findOne(id: string, companyId: string): Promise<BillerResponseDto> {
    const cacheKey = ITEM_KEY(companyId, id);
    const cached = await this.cache.get<BillerResponseDto>(cacheKey);
    if (cached) return cached;

    const biller = await this.prisma.biller.findFirst({
      where: { id, companyId },
      include: { _count: { select: { sales: true } } },
    });
    if (!biller) {
      throw new NotFoundException('Biller not found');
    }

    const data = this.mapToBillerResponse(biller, biller._count.sales);
    await this.cache.set(cacheKey, data, CACHE_TTL);
    return data;
  }

  async update(
    id: string,
    dto: UpdateBillerDto,
    companyId: string,
  ): Promise<BillerResponseDto> {
    const existingBiller = await this.prisma.biller.findFirst({
      where: { id, companyId },
    });
    if (!existingBiller) {
      throw new NotFoundException('Biller not found');
    }

    if (dto.code && dto.code !== existingBiller.code) {
      const duplicateBiller = await this.prisma.biller.findFirst({
        where: { code: dto.code, companyId, id: { not: id } },
      });
      if (duplicateBiller) {
        throw new ConflictException('Biller with this code already exists');
      }
    }

    const updatedBiller = await this.prisma.biller.update({
      where: { id },
      data: dto,
      include: { _count: { select: { sales: true } } },
    });

    await Promise.all([
      this.cache.del(LIST_KEY(companyId)),
      this.cache.del(ITEM_KEY(companyId, id)),
      this.cache.del(STATS_KEY(companyId)),
    ]);
    return this.mapToBillerResponse(updatedBiller, updatedBiller._count.sales);
  }

  async remove(id: string, companyId: string): Promise<{ message: string }> {
    const biller = await this.prisma.biller.findFirst({
      where: { id, companyId },
      include: { _count: { select: { sales: true } } },
    });
    if (!biller) {
      throw new NotFoundException('Biller not found');
    }
    if (biller._count.sales > 0) {
      throw new BadRequestException(
        'Cannot delete biller with existing sales. Please reassign sales to another biller first.',
      );
    }

    await this.prisma.biller.delete({ where: { id } });

    await Promise.all([
      this.cache.del(LIST_KEY(companyId)),
      this.cache.del(ITEM_KEY(companyId, id)),
      this.cache.del(STATS_KEY(companyId)),
    ]);
    return { message: 'Biller deleted successfully' };
  }

  async getStats(companyId: string): Promise<BillerStatsDto> {
    const cacheKey = STATS_KEY(companyId);
    const cached = await this.cache.get<BillerStatsDto>(cacheKey);
    if (cached) return cached;

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const [billers, recentlyAdded] = await Promise.all([
      this.prisma.biller.findMany({
        where: { companyId },
        select: { status: true },
      }),
      this.prisma.biller.count({
        where: { companyId, createdAt: { gte: thirtyDaysAgo } },
      }),
    ]);

    const data: BillerStatsDto = {
      totalBillers: billers.length,
      activeBillers: billers.filter((b) => b.status === 'ACTIVE').length,
      inactiveBillers: billers.filter((b) => b.status === 'INACTIVE').length,
      recentlyAdded,
    };

    await this.cache.set(cacheKey, data, 60 * 5);
    return data;
  }

  async checkCodeAvailability(
    code: string,
    companyId: string,
    excludeId?: string,
  ): Promise<{ available: boolean }> {
    const where: any = { code, companyId };
    if (excludeId) where.id = { not: excludeId };
    const existingBiller = await this.prisma.biller.findFirst({ where });
    return { available: !existingBiller };
  }

  private mapToBillerResponse(
    biller: any,
    salesCount?: number,
  ): BillerResponseDto {
    return {
      id: biller.id,
      name: biller.name,
      code: biller.code,
      address: biller.address,
      phone: biller.phone,
      email: biller.email,
      contactPerson: biller.contactPerson,
      gstNumber: biller.gstNumber,
      status: biller.status,
      createdAt: biller.createdAt,
      updatedAt: biller.updatedAt,
      salesCount,
    };
  }
}
