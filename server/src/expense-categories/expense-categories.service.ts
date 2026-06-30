import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../cache/cache.service';
import { CreateExpenseCategoryDto } from './dto/create-expense-category.dto';
import { UpdateExpenseCategoryDto } from './dto/update-expense-category.dto';

const CACHE_TTL = 60 * 30;
const LIST_KEY = (cid: string) => `expensecats:${cid}:list`;
const ITEM_KEY = (cid: string, id: string) => `expensecats:${cid}:${id}`;

@Injectable()
export class ExpenseCategoriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  async create(companyId: string, dto: CreateExpenseCategoryDto) {
    const cat = await this.prisma.expenseCategory.create({
      data: { name: dto.name, description: dto.description, companyId },
    });
    await this.cache.del(LIST_KEY(companyId));
    return cat;
  }

  async findAll(companyId: string) {
    const cacheKey = LIST_KEY(companyId);
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    const data = await this.prisma.expenseCategory.findMany({
      where: { companyId },
      orderBy: { name: 'asc' },
    });

    await this.cache.set(cacheKey, data, CACHE_TTL);
    return data;
  }

  async findOne(id: string, companyId: string) {
    const cacheKey = ITEM_KEY(companyId, id);
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    const category = await this.prisma.expenseCategory.findUnique({
      where: { id, companyId },
    });
    if (!category) {
      throw new NotFoundException('Expense category not found');
    }

    await this.cache.set(cacheKey, category, CACHE_TTL);
    return category;
  }

  async update(id: string, companyId: string, dto: UpdateExpenseCategoryDto) {
    await this.findOne(id, companyId);

    const cat = await this.prisma.expenseCategory.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
      },
    });

    await Promise.all([
      this.cache.del(LIST_KEY(companyId)),
      this.cache.del(ITEM_KEY(companyId, id)),
    ]);
    return cat;
  }

  async remove(id: string, companyId: string) {
    await this.findOne(id, companyId);
    await this.prisma.expenseCategory.delete({ where: { id } });

    await Promise.all([
      this.cache.del(LIST_KEY(companyId)),
      this.cache.del(ITEM_KEY(companyId, id)),
    ]);
  }

  async bulkRemove(ids: string[], companyId: string) {
    const result = await this.prisma.expenseCategory.deleteMany({
      where: { id: { in: ids }, companyId },
    });

    await this.cache.del(LIST_KEY(companyId));
    return { deleted: ids, count: result.count };
  }
}
