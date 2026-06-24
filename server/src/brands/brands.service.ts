import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';

@Injectable()
export class BrandsService {
  constructor(private prisma: PrismaService) {}

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

    return this.prisma.brand.create({
      data: {
        name: dto.name,
        slug,
        description: dto.description,
        status: dto.status || 'ACTIVE',
        imageUrl: dto.imageUrl || undefined,
        companyId,
      },
    });
  }

  async findAll(companyId: string) {
    return this.prisma.brand.findMany({
      where: { companyId },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string, companyId: string) {
    const brand = await this.prisma.brand.findFirst({
      where: { id, companyId },
    });

    if (!brand) {
      throw new NotFoundException('Brand not found');
    }

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

    return this.prisma.brand.update({
      where: { id },
      data,
    });
  }

  async remove(id: string, companyId: string) {
    await this.findOne(id, companyId);

    const products = await this.prisma.product.findMany({
      where: { brandId: id, companyId },
      select: { id: true, name: true, sku: true },
    });

    if (products.length > 0) {
      await this.prisma.product.updateMany({
        where: { brandId: id, companyId },
        data: { brandId: null },
      });

      await this.prisma.brand.delete({ where: { id } });

      return {
        message: 'Brand deleted successfully',
        affectedProducts: products.map((p) => ({
          id: p.id,
          name: p.name,
          sku: p.sku,
        })),
      };
    }

    await this.prisma.brand.delete({ where: { id } });

    return { message: 'Brand deleted successfully', affectedProducts: [] };
  }

  async bulkDelete(ids: string[], companyId: string) {
    const results = {
      deleted: [] as string[],
      failed: [] as { id: string; error: string }[],
      totalAffectedProducts: 0,
      affectedProductsList: [] as Array<{
        id: string;
        name: string;
        sku: string;
      }>,
    };

    for (const id of ids) {
      try {
        const brand = await this.prisma.brand.findFirst({
          where: { id, companyId },
        });

        if (!brand) {
          results.failed.push({ id, error: 'Brand not found or access denied' });
          continue;
        }

        const products = await this.prisma.product.findMany({
          where: { brandId: id, companyId },
          select: { id: true, name: true, sku: true },
        });

        if (products.length > 0) {
          await this.prisma.product.updateMany({
            where: { brandId: id, companyId },
            data: { brandId: null },
          });

          results.totalAffectedProducts += products.length;
          results.affectedProductsList.push(...products);
        }

        await this.prisma.brand.delete({ where: { id } });
        results.deleted.push(id);
      } catch (error) {
        results.failed.push({ id, error: error.message || 'Failed to delete brand' });
      }
    }

    return {
      message: `Successfully deleted ${results.deleted.length} out of ${ids.length} brands`,
      ...results,
    };
  }
}
