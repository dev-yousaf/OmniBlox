import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../cache/cache.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import {
  SupplierResponseDto,
  SuppliersListResponseDto,
} from './dto/supplier-response.dto';

const CACHE_TTL = 60 * 5;
const LIST_KEY = (cid: string, page?: number, search?: string) =>
  `suppliers:${cid}:list:${page ?? 1}:${search ?? ''}`;
const ITEM_KEY = (cid: string, id: string) => `suppliers:${cid}:${id}`;

@Injectable()
export class SuppliersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  async create(
    dto: CreateSupplierDto,
    companyId: string,
  ): Promise<SupplierResponseDto> {
    if (dto.email) {
      const existingSupplier = await this.prisma.supplier.findFirst({
        where: { email: dto.email, companyId },
      });
      if (existingSupplier) {
        throw new ConflictException('Supplier with this email already exists');
      }
    }

    const supplier = await this.prisma.supplier.create({
      data: {
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        address: dto.address,
        creditLimit: dto.creditLimit,
        balance: dto.balance,
        companyId,
      },
    });

    await this.cache.del(LIST_KEY(companyId));
    return this.transformSupplier(supplier);
  }

  async findAll(
    companyId: string,
    page = 1,
    limit = 10,
    search?: string,
  ): Promise<SuppliersListResponseDto> {
    const cacheKey = LIST_KEY(companyId, page, search);
    const cached = await this.cache.get<SuppliersListResponseDto>(cacheKey);
    if (cached) return cached;

    const skip = (page - 1) * limit;
    const where: any = { companyId };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [suppliers, total] = await Promise.all([
      this.prisma.supplier.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
      }),
      this.prisma.supplier.count({ where }),
    ]);

    const data: SuppliersListResponseDto = {
      suppliers: suppliers.map((s) => this.transformSupplier(s)),
      total,
      pages: limit === 0 ? 1 : Math.max(1, Math.ceil(total / limit)),
    };

    await this.cache.set(cacheKey, data, CACHE_TTL);
    return data;
  }

  async findOne(id: string, companyId: string): Promise<SupplierResponseDto> {
    const cacheKey = ITEM_KEY(companyId, id);
    const cached = await this.cache.get<SupplierResponseDto>(cacheKey);
    if (cached) return cached;

    const supplier = await this.prisma.supplier.findUnique({
      where: { id, companyId },
    });
    if (!supplier) {
      throw new NotFoundException('Supplier not found');
    }

    const data = this.transformSupplier(supplier);
    await this.cache.set(cacheKey, data, CACHE_TTL);
    return data;
  }

  async update(
    id: string,
    dto: UpdateSupplierDto,
    companyId: string,
  ): Promise<SupplierResponseDto> {
    const existingSupplier = await this.prisma.supplier.findUnique({
      where: { id, companyId },
    });
    if (!existingSupplier) {
      throw new NotFoundException('Supplier not found');
    }

    if (dto.email && dto.email !== existingSupplier.email) {
      const duplicateSupplier = await this.prisma.supplier.findFirst({
        where: { email: dto.email, companyId, id: { not: id } },
      });
      if (duplicateSupplier) {
        throw new ConflictException('Supplier with this email already exists');
      }
    }

    const updatedSupplier = await this.prisma.supplier.update({
      where: { id },
      data: {
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        address: dto.address,
        creditLimit: dto.creditLimit,
        balance: dto.balance,
      },
    });

    await Promise.all([
      this.cache.del(LIST_KEY(companyId)),
      this.cache.del(ITEM_KEY(companyId, id)),
    ]);
    return this.transformSupplier(updatedSupplier);
  }

  async remove(id: string, companyId: string): Promise<void> {
    const supplier = await this.prisma.supplier.findUnique({
      where: { id, companyId },
    });
    if (!supplier) {
      throw new NotFoundException('Supplier not found');
    }

    const purchaseOrderCount = await this.prisma.purchaseOrder.count({
      where: { supplierId: id, companyId },
    });
    if (purchaseOrderCount > 0) {
      throw new BadRequestException(
        'Cannot delete supplier with existing purchase orders. Archive the supplier instead.',
      );
    }

    await this.prisma.supplier.delete({ where: { id } });

    await Promise.all([
      this.cache.del(LIST_KEY(companyId)),
      this.cache.del(ITEM_KEY(companyId, id)),
    ]);
  }

  private transformSupplier(supplier: any): SupplierResponseDto {
    return {
      id: supplier.id,
      name: supplier.name,
      email: supplier.email,
      phone: supplier.phone,
      address: supplier.address,
      creditLimit: supplier.creditLimit
        ? Number(supplier.creditLimit)
        : undefined,
      balance: supplier.balance ? Number(supplier.balance) : undefined,
      companyId: supplier.companyId,
      createdAt: supplier.createdAt.toISOString(),
      updatedAt: supplier.updatedAt.toISOString(),
    };
  }
}
