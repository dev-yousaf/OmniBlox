import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../cache/cache.service';
import { CreateWarehouseDto } from './dto/create-warehouse.dto';
import { UpdateWarehouseDto } from './dto/update-warehouse.dto';
import { WarehouseResponseDto, WarehousesListResponseDto } from './dto/warehouse-response.dto';

const CACHE_TTL = 60 * 15;
const LIST_KEY = (cid: string, page?: number, search?: string) =>
  `warehouses:${cid}:list:${page ?? 1}:${search ?? ''}`;
const ITEM_KEY = (cid: string, id: string) => `warehouses:${cid}:${id}`;

@Injectable()
export class WarehousesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  async create(dto: CreateWarehouseDto, companyId: string): Promise<WarehouseResponseDto> {
    const existingWarehouse = await this.prisma.warehouse.findFirst({
      where: { name: dto.name, companyId },
    });
    if (existingWarehouse) {
      throw new ConflictException('Warehouse with this name already exists');
    }

    const warehouse = await this.prisma.warehouse.create({
      data: { name: dto.name, location: dto.location, companyId },
    });

    await this.cache.del(LIST_KEY(companyId));
    return this.transformWarehouse(warehouse);
  }

  async findAll(
    companyId: string, page = 1, limit = 10, search?: string,
  ): Promise<WarehousesListResponseDto> {
    const cacheKey = LIST_KEY(companyId, page, search);
    const cached = await this.cache.get<WarehousesListResponseDto>(cacheKey);
    if (cached) return cached;

    const skip = (page - 1) * limit;
    const where: any = { companyId };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { location: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [warehouses, total] = await Promise.all([
      this.prisma.warehouse.findMany({ where, skip, take: limit, orderBy: { name: 'asc' } }),
      this.prisma.warehouse.count({ where }),
    ]);

    const data: WarehousesListResponseDto = {
      warehouses: warehouses.map((w) => this.transformWarehouse(w)),
      total,
      pages: limit === 0 ? 1 : Math.max(1, Math.ceil(total / limit)),
    };

    await this.cache.set(cacheKey, data, CACHE_TTL);
    return data;
  }

  async findOne(id: string, companyId: string): Promise<WarehouseResponseDto> {
    const cacheKey = ITEM_KEY(companyId, id);
    const cached = await this.cache.get<WarehouseResponseDto>(cacheKey);
    if (cached) return cached;

    const warehouse = await this.prisma.warehouse.findUnique({
      where: { id, companyId },
    });
    if (!warehouse) {
      throw new NotFoundException('Warehouse not found');
    }

    const data = this.transformWarehouse(warehouse);
    await this.cache.set(cacheKey, data, CACHE_TTL);
    return data;
  }

  async update(id: string, dto: UpdateWarehouseDto, companyId: string): Promise<WarehouseResponseDto> {
    const existingWarehouse = await this.prisma.warehouse.findUnique({
      where: { id, companyId },
    });
    if (!existingWarehouse) {
      throw new NotFoundException('Warehouse not found');
    }

    if (dto.name && dto.name !== existingWarehouse.name) {
      const duplicateWarehouse = await this.prisma.warehouse.findFirst({
        where: { name: dto.name, companyId, id: { not: id } },
      });
      if (duplicateWarehouse) {
        throw new ConflictException('Warehouse with this name already exists');
      }
    }

    const updatedWarehouse = await this.prisma.warehouse.update({
      where: { id },
      data: { name: dto.name, location: dto.location },
    });

    await Promise.all([
      this.cache.del(LIST_KEY(companyId)),
      this.cache.del(ITEM_KEY(companyId, id)),
    ]);
    return this.transformWarehouse(updatedWarehouse);
  }

  async remove(id: string, companyId: string): Promise<void> {
    const warehouse = await this.prisma.warehouse.findUnique({
      where: { id, companyId },
    });
    if (!warehouse) {
      throw new NotFoundException('Warehouse not found');
    }

    const inventoryCount = await this.prisma.inventory.count({
      where: { warehouseId: id },
    });
    if (inventoryCount > 0) {
      throw new BadRequestException(
        'Cannot delete warehouse with existing inventory. Move inventory first.',
      );
    }

    await this.prisma.warehouse.delete({ where: { id } });

    await Promise.all([
      this.cache.del(LIST_KEY(companyId)),
      this.cache.del(ITEM_KEY(companyId, id)),
    ]);
  }

  private transformWarehouse(warehouse: any): WarehouseResponseDto {
    return {
      id: warehouse.id, name: warehouse.name, location: warehouse.location,
      companyId: warehouse.companyId,
      createdAt: warehouse.createdAt.toISOString(),
      updatedAt: warehouse.updatedAt.toISOString(),
    };
  }
}
