import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWarehouseDto } from './dto/create-warehouse.dto';
import { UpdateWarehouseDto } from './dto/update-warehouse.dto';
import {
  WarehouseResponseDto,
  WarehousesListResponseDto,
} from './dto/warehouse-response.dto';

@Injectable()
export class WarehousesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    dto: CreateWarehouseDto,
    companyId: string,
  ): Promise<WarehouseResponseDto> {
    // Check for duplicate warehouse name within company
    const existingWarehouse = await this.prisma.warehouse.findFirst({
      where: {
        name: dto.name,
        companyId,
      },
    });

    if (existingWarehouse) {
      throw new ConflictException('Warehouse with this name already exists');
    }

    const warehouse = await this.prisma.warehouse.create({
      data: {
        name: dto.name,
        location: dto.location,
        companyId,
      },
    });

    return this.transformWarehouse(warehouse);
  }

  async findAll(
    companyId: string,
    page = 1,
    limit = 10,
    search?: string,
  ): Promise<WarehousesListResponseDto> {
    const skip = (page - 1) * limit;
    const where: any = { companyId };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { location: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [warehouses, total] = await Promise.all([
      this.prisma.warehouse.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
      }),
      this.prisma.warehouse.count({ where }),
    ]);

    return {
      warehouses: warehouses.map((warehouse) =>
        this.transformWarehouse(warehouse),
      ),
      total,
      pages: limit === 0 ? 1 : Math.max(1, Math.ceil(total / limit)),
    };
  }

  async findOne(id: string, companyId: string): Promise<WarehouseResponseDto> {
    const warehouse = await this.prisma.warehouse.findUnique({
      where: { id, companyId },
    });

    if (!warehouse) {
      throw new NotFoundException('Warehouse not found');
    }

    return this.transformWarehouse(warehouse);
  }

  async update(
    id: string,
    dto: UpdateWarehouseDto,
    companyId: string,
  ): Promise<WarehouseResponseDto> {
    const existingWarehouse = await this.prisma.warehouse.findUnique({
      where: { id, companyId },
    });

    if (!existingWarehouse) {
      throw new NotFoundException('Warehouse not found');
    }

    // Check for duplicate warehouse name within company (excluding current warehouse)
    if (dto.name && dto.name !== existingWarehouse.name) {
      const duplicateWarehouse = await this.prisma.warehouse.findFirst({
        where: {
          name: dto.name,
          companyId,
          id: { not: id },
        },
      });

      if (duplicateWarehouse) {
        throw new ConflictException('Warehouse with this name already exists');
      }
    }

    const updatedWarehouse = await this.prisma.warehouse.update({
      where: { id },
      data: {
        name: dto.name,
        location: dto.location,
      },
    });

    return this.transformWarehouse(updatedWarehouse);
  }

  async remove(id: string, companyId: string): Promise<void> {
    const warehouse = await this.prisma.warehouse.findUnique({
      where: { id, companyId },
    });

    if (!warehouse) {
      throw new NotFoundException('Warehouse not found');
    }

    // Check if warehouse has any inventory
    const inventoryCount = await this.prisma.inventory.count({
      where: { warehouseId: id },
    });

    if (inventoryCount > 0) {
      throw new BadRequestException(
        'Cannot delete warehouse with existing inventory. Move inventory first.',
      );
    }

    await this.prisma.warehouse.delete({
      where: { id },
    });
  }

  private transformWarehouse(warehouse: any): WarehouseResponseDto {
    return {
      id: warehouse.id,
      name: warehouse.name,
      location: warehouse.location,
      companyId: warehouse.companyId,
      createdAt: warehouse.createdAt.toISOString(),
      updatedAt: warehouse.updatedAt.toISOString(),
    };
  }
}
