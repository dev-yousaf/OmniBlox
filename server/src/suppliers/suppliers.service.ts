import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import {
  SupplierResponseDto,
  SuppliersListResponseDto,
} from './dto/supplier-response.dto';

@Injectable()
export class SuppliersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    dto: CreateSupplierDto,
    companyId: string,
  ): Promise<SupplierResponseDto> {
    // Check for duplicate email within company
    if (dto.email) {
      const existingSupplier = await this.prisma.supplier.findFirst({
        where: {
          email: dto.email,
          companyId,
        },
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
        companyId,
      },
    });

    return this.transformSupplier(supplier);
  }

  async findAll(
    companyId: string,
    page = 1,
    limit = 10,
    search?: string,
  ): Promise<SuppliersListResponseDto> {
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

    return {
      suppliers: suppliers.map((supplier) => this.transformSupplier(supplier)),
      total,
      pages: limit === 0 ? 1 : Math.max(1, Math.ceil(total / limit)),
    };
  }

  async findOne(id: string, companyId: string): Promise<SupplierResponseDto> {
    const supplier = await this.prisma.supplier.findUnique({
      where: { id, companyId },
    });

    if (!supplier) {
      throw new NotFoundException('Supplier not found');
    }

    return this.transformSupplier(supplier);
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

    // Check for duplicate email within company (excluding current supplier)
    if (dto.email && dto.email !== existingSupplier.email) {
      const duplicateSupplier = await this.prisma.supplier.findFirst({
        where: {
          email: dto.email,
          companyId,
          id: { not: id },
        },
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
      },
    });

    return this.transformSupplier(updatedSupplier);
  }

  async remove(id: string, companyId: string): Promise<void> {
    const supplier = await this.prisma.supplier.findUnique({
      where: { id, companyId },
    });

    if (!supplier) {
      throw new NotFoundException('Supplier not found');
    }

    // Check if supplier has any purchase orders
    const purchaseOrderCount = await this.prisma.purchaseOrder.count({
      where: { supplierId: id, companyId },
    });

    if (purchaseOrderCount > 0) {
      throw new BadRequestException(
        'Cannot delete supplier with existing purchase orders. Archive the supplier instead.',
      );
    }

    await this.prisma.supplier.delete({
      where: { id },
    });
  }

  private transformSupplier(supplier: any): SupplierResponseDto {
    return {
      id: supplier.id,
      name: supplier.name,
      email: supplier.email,
      phone: supplier.phone,
      address: supplier.address,
      companyId: supplier.companyId,
      createdAt: supplier.createdAt.toISOString(),
      updatedAt: supplier.updatedAt.toISOString(),
    };
  }
}
