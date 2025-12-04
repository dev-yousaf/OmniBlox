import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateExpenseCategoryDto } from './dto/create-expense-category.dto';
import { UpdateExpenseCategoryDto } from './dto/update-expense-category.dto';

@Injectable()
export class ExpenseCategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(companyId: string, dto: CreateExpenseCategoryDto) {
    return this.prisma.expenseCategory.create({
      data: {
        name: dto.name,
        description: dto.description,
        companyId,
      },
    });
  }

  async findAll(companyId: string) {
    return this.prisma.expenseCategory.findMany({
      where: { companyId },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string, companyId: string) {
    const category = await this.prisma.expenseCategory.findUnique({
      where: { id, companyId },
    });

    if (!category) {
      throw new NotFoundException('Expense category not found');
    }

    return category;
  }

  async update(id: string, companyId: string, dto: UpdateExpenseCategoryDto) {
    const category = await this.findOne(id, companyId);

    return this.prisma.expenseCategory.update({
      where: { id: category.id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
      },
    });
  }

  async remove(id: string, companyId: string) {
    const category = await this.findOne(id, companyId);

    await this.prisma.expenseCategory.delete({
      where: { id: category.id },
    });
  }
}
