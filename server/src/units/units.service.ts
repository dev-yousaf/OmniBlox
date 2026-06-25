import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUnitDto } from './dto/create-unit.dto';
import { UpdateUnitDto } from './dto/update-unit.dto';

@Injectable()
export class UnitsService {
  constructor(private prisma: PrismaService) {}

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/[\s_]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  async create(dto: CreateUnitDto, companyId: string) {
    const existingByName = await this.prisma.unit.findFirst({
      where: { name: dto.name, companyId },
    });

    if (existingByName) {
      throw new ConflictException('A unit with this name already exists');
    }

    const existingByShortName = await this.prisma.unit.findFirst({
      where: { shortName: dto.shortName, companyId },
    });

    if (existingByShortName) {
      throw new ConflictException('A unit with this short name already exists');
    }

    const slug = dto.slug || this.generateSlug(dto.name);

    return this.prisma.unit.create({
      data: {
        name: dto.name,
        shortName: dto.shortName,
        slug,
        description: dto.description,
        status: dto.status || 'ACTIVE',
        companyId,
      },
    });
  }

  async findAll(companyId: string) {
    return this.prisma.unit.findMany({
      where: { companyId },
      orderBy: { name: 'asc' },
      include: { _count: { select: { products: true } } },
    });
  }

  async findOne(id: string, companyId: string) {
    const unit = await this.prisma.unit.findFirst({
      where: { id, companyId },
    });

    if (!unit) {
      throw new NotFoundException('Unit not found');
    }

    return unit;
  }

  async update(id: string, dto: UpdateUnitDto, companyId: string) {
    await this.findOne(id, companyId);

    if (dto.name) {
      const existing = await this.prisma.unit.findFirst({
        where: { name: dto.name, companyId, id: { not: id } },
      });

      if (existing) {
        throw new ConflictException('A unit with this name already exists');
      }
    }

    if (dto.shortName) {
      const existing = await this.prisma.unit.findFirst({
        where: { shortName: dto.shortName, companyId, id: { not: id } },
      });

      if (existing) {
        throw new ConflictException('A unit with this short name already exists');
      }
    }

    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.shortName !== undefined) data.shortName = dto.shortName;
    if (dto.slug !== undefined) data.slug = dto.slug;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.status !== undefined) data.status = dto.status;

    return this.prisma.unit.update({
      where: { id },
      data,
    });
  }

  async remove(id: string, companyId: string) {
    await this.findOne(id, companyId);

    await this.prisma.unit.delete({ where: { id } });

    return { message: 'Unit deleted successfully' };
  }

  async bulkDelete(ids: string[], companyId: string) {
    const results = {
      deleted: [] as string[],
      failed: [] as { id: string; error: string }[],
    };

    for (const id of ids) {
      try {
        const unit = await this.prisma.unit.findFirst({
          where: { id, companyId },
        });

        if (!unit) {
          results.failed.push({ id, error: 'Unit not found or access denied' });
          continue;
        }

        await this.prisma.unit.delete({ where: { id } });
        results.deleted.push(id);
      } catch (error) {
        results.failed.push({ id, error: error.message || 'Failed to delete unit' });
      }
    }

    return {
      message: `Successfully deleted ${results.deleted.length} out of ${ids.length} units`,
      ...results,
    };
  }
}
