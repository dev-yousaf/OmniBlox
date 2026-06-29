import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateBillerDto,
  UpdateBillerDto,
  BillerResponseDto,
  BillerListResponseDto,
  BillerStatsDto,
} from './dto/billers.dto';

@Injectable()
export class BillersService {
  constructor(private prisma: PrismaService) {}

  // GOLDEN RULE: All methods require companyId and filter by it

  async create(
    dto: CreateBillerDto,
    companyId: string,
  ): Promise<BillerResponseDto> {
    // Check for duplicate code within company
    const existingBiller = await this.prisma.biller.findFirst({
      where: {
        code: dto.code,
        companyId,
      },
    });

    if (existingBiller) {
      throw new ConflictException('Biller with this code already exists');
    }

    const biller = await this.prisma.biller.create({
      data: {
        ...dto,
        companyId,
      },
    });

    return this.mapToBillerResponse(biller);
  }

  async findAll(companyId: string): Promise<BillerResponseDto[]> {
    const billers = await this.prisma.biller.findMany({
      where: { companyId },
      include: {
        _count: {
          select: { sales: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return billers.map((biller) =>
      this.mapToBillerResponse(biller, biller._count.sales),
    );
  }

  async findAllPaginated(
    companyId: string,
    page: number = 1,
    limit: number = 10,
    search?: string,
    status?: string,
  ): Promise<BillerListResponseDto> {
    const skip = (page - 1) * limit;

    const where = {
      companyId,
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { code: { contains: search, mode: 'insensitive' as const } },
          { email: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
      ...(status && { status }),
    };

    const [billers, total] = await Promise.all([
      this.prisma.biller.findMany({
        where,
        include: {
          _count: {
            select: { sales: true },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.biller.count({ where }),
    ]);

    return {
      billers: billers.map((biller) =>
        this.mapToBillerResponse(biller, biller._count.sales),
      ),
      total,
      pages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string, companyId: string): Promise<BillerResponseDto> {
    const biller = await this.prisma.biller.findFirst({
      where: { id, companyId },
      include: {
        _count: {
          select: { sales: true },
        },
      },
    });

    if (!biller) {
      throw new NotFoundException('Biller not found');
    }

    return this.mapToBillerResponse(biller, biller._count.sales);
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

    // Check for duplicate code within company (excluding current biller)
    if (dto.code && dto.code !== existingBiller.code) {
      const duplicateBiller = await this.prisma.biller.findFirst({
        where: {
          code: dto.code,
          companyId,
          id: { not: id },
        },
      });

      if (duplicateBiller) {
        throw new ConflictException('Biller with this code already exists');
      }
    }

    const updatedBiller = await this.prisma.biller.update({
      where: { id },
      data: dto,
      include: {
        _count: {
          select: { sales: true },
        },
      },
    });

    return this.mapToBillerResponse(updatedBiller, updatedBiller._count.sales);
  }

  async remove(id: string, companyId: string): Promise<{ message: string }> {
    const biller = await this.prisma.biller.findFirst({
      where: { id, companyId },
      include: {
        _count: {
          select: { sales: true },
        },
      },
    });

    if (!biller) {
      throw new NotFoundException('Biller not found');
    }

    // Check if biller has any sales
    if (biller._count.sales > 0) {
      throw new BadRequestException(
        'Cannot delete biller with existing sales. Please reassign sales to another biller first.',
      );
    }

    await this.prisma.biller.delete({
      where: { id },
    });

    return { message: 'Biller deleted successfully' };
  }

  async getStats(companyId: string): Promise<BillerStatsDto> {
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

    const totalBillers = billers.length;
    const activeBillers = billers.filter((b) => b.status === 'ACTIVE').length;
    const inactiveBillers = billers.filter(
      (b) => b.status === 'INACTIVE',
    ).length;

    return {
      totalBillers,
      activeBillers,
      inactiveBillers,
      recentlyAdded,
    };
  }

  async checkCodeAvailability(
    code: string,
    companyId: string,
    excludeId?: string,
  ): Promise<{ available: boolean }> {
    const where: any = {
      code,
      companyId,
    };

    if (excludeId) {
      where.id = { not: excludeId };
    }

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
