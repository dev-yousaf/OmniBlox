import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVariantAttributeDto } from './dto/create-variant-attribute.dto';
import { UpdateVariantAttributeDto } from './dto/update-variant-attribute.dto';

@Injectable()
export class VariantAttributesService {
  constructor(private prisma: PrismaService) {}

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
      throw new ConflictException('A variant attribute with this name already exists');
    }

    const slug = dto.slug || this.generateSlug(dto.name);

    return this.prisma.variantAttribute.create({
      data: {
        name: dto.name,
        slug,
        values: dto.values || undefined,
        description: dto.description,
        status: dto.status || 'ACTIVE',
        companyId,
      },
    });
  }

  async findAll(companyId: string) {
    return this.prisma.variantAttribute.findMany({
      where: { companyId },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string, companyId: string) {
    const attribute = await this.prisma.variantAttribute.findFirst({
      where: { id, companyId },
    });

    if (!attribute) {
      throw new NotFoundException('Variant attribute not found');
    }

    return attribute;
  }

  async update(id: string, dto: UpdateVariantAttributeDto, companyId: string) {
    await this.findOne(id, companyId);

    if (dto.name) {
      const existing = await this.prisma.variantAttribute.findFirst({
        where: { name: dto.name, companyId, id: { not: id } },
      });

      if (existing) {
        throw new ConflictException('A variant attribute with this name already exists');
      }
    }

    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.slug !== undefined) data.slug = dto.slug;
    if (dto.values !== undefined) data.values = dto.values;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.status !== undefined) data.status = dto.status;

    return this.prisma.variantAttribute.update({
      where: { id },
      data,
    });
  }

  async remove(id: string, companyId: string) {
    await this.findOne(id, companyId);

    await this.prisma.variantAttribute.delete({ where: { id } });

    return { message: 'Variant attribute deleted successfully' };
  }

  async bulkDelete(ids: string[], companyId: string) {
    const results = {
      deleted: [] as string[],
      failed: [] as { id: string; error: string }[],
    };

    for (const id of ids) {
      try {
        const attribute = await this.prisma.variantAttribute.findFirst({
          where: { id, companyId },
        });

        if (!attribute) {
          results.failed.push({ id, error: 'Variant attribute not found or access denied' });
          continue;
        }

        await this.prisma.variantAttribute.delete({ where: { id } });
        results.deleted.push(id);
      } catch (error) {
        results.failed.push({ id, error: error.message || 'Failed to delete variant attribute' });
      }
    }

    return {
      message: `Successfully deleted ${results.deleted.length} out of ${ids.length} variant attributes`,
      ...results,
    };
  }
}
