import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWarrantyDto } from './dto/create-warranty.dto';
import { UpdateWarrantyDto } from './dto/update-warranty.dto';

@Injectable()
export class WarrantiesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateWarrantyDto, companyId: string) {
    const existing = await this.prisma.warranty.findFirst({
      where: { name: dto.name, companyId },
    });

    if (existing) {
      throw new ConflictException('A warranty with this name already exists');
    }

    return this.prisma.warranty.create({
      data: {
        name: dto.name,
        duration: dto.duration,
        durationType: dto.durationType || 'MONTHS',
        description: dto.description,
        status: dto.status || 'ACTIVE',
        companyId,
      },
    });
  }

  async findAll(companyId: string) {
    return this.prisma.warranty.findMany({
      where: { companyId },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string, companyId: string) {
    const warranty = await this.prisma.warranty.findFirst({
      where: { id, companyId },
    });

    if (!warranty) {
      throw new NotFoundException('Warranty not found');
    }

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

    return this.prisma.warranty.update({
      where: { id },
      data,
    });
  }

  async remove(id: string, companyId: string) {
    await this.findOne(id, companyId);

    await this.prisma.warranty.delete({ where: { id } });

    return { message: 'Warranty deleted successfully' };
  }

  async bulkDelete(ids: string[], companyId: string) {
    const results = {
      deleted: [] as string[],
      failed: [] as { id: string; error: string }[],
    };

    for (const id of ids) {
      try {
        const warranty = await this.prisma.warranty.findFirst({
          where: { id, companyId },
        });

        if (!warranty) {
          results.failed.push({ id, error: 'Warranty not found or access denied' });
          continue;
        }

        await this.prisma.warranty.delete({ where: { id } });
        results.deleted.push(id);
      } catch (error) {
        results.failed.push({ id, error: error.message || 'Failed to delete warranty' });
      }
    }

    return {
      message: `Successfully deleted ${results.deleted.length} out of ${ids.length} warranties`,
      ...results,
    };
  }
}
