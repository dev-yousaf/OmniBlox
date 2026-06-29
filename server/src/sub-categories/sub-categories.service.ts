import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSubCategoryDto } from './dto/create-sub-category.dto';
import { UpdateSubCategoryDto } from './dto/update-sub-category.dto';

@Injectable()
export class SubCategoriesService {
  constructor(private prisma: PrismaService) {}

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/[\s_]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  async create(dto: CreateSubCategoryDto, companyId: string) {
    const category = await this.prisma.productCategory.findFirst({
      where: { id: dto.categoryId, companyId },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    const existing = await this.prisma.subCategory.findFirst({
      where: { name: dto.name, categoryId: dto.categoryId, companyId },
    });

    if (existing) {
      throw new ConflictException(
        'A sub-category with this name already exists in this category',
      );
    }

    const slug = dto.slug || this.generateSlug(dto.name);

    const lastSubCategory = await this.prisma.subCategory.findFirst({
      where: { companyId },
      orderBy: { code: 'desc' },
    });

    let code = dto.slug ? dto.slug.toUpperCase().replace(/-/g, '_') : null;
    if (!code) {
      const nextNum = lastSubCategory?.code
        ? String(Number(lastSubCategory.code.replace(/\D/g, '')) + 1).padStart(
            3,
            '0',
          )
        : '001';
      code = `SC${nextNum}`;
    }

    return this.prisma.subCategory.create({
      data: {
        name: dto.name,
        slug,
        code,
        imageUrl: dto.imageUrl,
        description: dto.description,
        status: dto.status || 'ACTIVE',
        categoryId: dto.categoryId,
        companyId,
      },
      include: { category: { select: { id: true, name: true } } },
    });
  }

  findAll(companyId: string, categoryId?: string) {
    const where: any = { companyId };
    if (categoryId) where.categoryId = categoryId;

    return this.prisma.subCategory.findMany({
      where,
      orderBy: { name: 'asc' },
      include: { category: { select: { id: true, name: true } } },
    });
  }

  async findOne(id: string, companyId: string) {
    const subCategory = await this.prisma.subCategory.findFirst({
      where: { id, companyId },
      include: { category: { select: { id: true, name: true } } },
    });

    if (!subCategory) {
      throw new NotFoundException('Sub-category not found');
    }

    return subCategory;
  }

  async update(id: string, dto: UpdateSubCategoryDto, companyId: string) {
    await this.findOne(id, companyId);

    if (dto.categoryId) {
      const category = await this.prisma.productCategory.findFirst({
        where: { id: dto.categoryId, companyId },
      });
      if (!category) {
        throw new NotFoundException('Category not found');
      }
    }

    if (dto.name) {
      const categoryId =
        dto.categoryId ||
        (await this.prisma.subCategory.findUnique({ where: { id } }))
          .categoryId;
      const existing = await this.prisma.subCategory.findFirst({
        where: { name: dto.name, categoryId, companyId, id: { not: id } },
      });
      if (existing) {
        throw new ConflictException(
          'A sub-category with this name already exists in this category',
        );
      }
    }

    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.slug !== undefined) data.slug = dto.slug;
    if (dto.imageUrl !== undefined) data.imageUrl = dto.imageUrl;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.categoryId !== undefined) data.categoryId = dto.categoryId;

    return this.prisma.subCategory.update({
      where: { id },
      data,
      include: { category: { select: { id: true, name: true } } },
    });
  }

  async remove(id: string, companyId: string) {
    await this.findOne(id, companyId);

    await this.prisma.product.updateMany({
      where: { subCategoryId: id, companyId },
      data: { subCategoryId: null },
    });

    await this.prisma.subCategory.delete({ where: { id } });

    return { message: 'Sub-category deleted successfully' };
  }

  async bulkDelete(ids: string[], companyId: string) {
    const results = {
      deleted: [] as string[],
      failed: [] as { id: string; error: string }[],
    };

    for (const id of ids) {
      try {
        const subCategory = await this.prisma.subCategory.findFirst({
          where: { id, companyId },
        });

        if (!subCategory) {
          results.failed.push({
            id,
            error: 'Sub-category not found or access denied',
          });
          continue;
        }

        await this.prisma.product.updateMany({
          where: { subCategoryId: id, companyId },
          data: { subCategoryId: null },
        });

        await this.prisma.subCategory.delete({ where: { id } });
        results.deleted.push(id);
      } catch (error) {
        results.failed.push({
          id,
          error: error.message || 'Failed to delete sub-category',
        });
      }
    }

    return {
      message: `Successfully deleted ${results.deleted.length} out of ${ids.length} sub-categories`,
      ...results,
    };
  }
}
