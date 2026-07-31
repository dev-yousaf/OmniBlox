import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GenerateExpenseReportDto } from './dto/generate-expense-report.dto';

const REPORT_KEY = (companyId: string, filters: GenerateExpenseReportDto) =>
  `reports:expenses:${companyId}:${filters.startDate}:${filters.endDate}:${filters.categoryId ?? ''}:${filters.vendor ?? ''}`;

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async generateExpenseReport(
    companyId: string,
    dto: GenerateExpenseReportDto,
  ) {
    const start = new Date(dto.startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(dto.endDate);
    end.setHours(23, 59, 59, 999);

    if (start > end) {
      throw new Error('Start date must be before end date');
    }

    const where: any = {
      companyId,
      expenseDate: { gte: start, lte: end },
    };
    if (dto.categoryId) {
      where.categoryId = dto.categoryId;
    }
    if (dto.vendor && dto.vendor.trim()) {
      where.vendor = { contains: dto.vendor.trim(), mode: 'insensitive' };
    }

    const [expenses, aggResult, breakdownRows] = await Promise.all([
      this.prisma.expense.findMany({
        where,
        include: { category: true },
        orderBy: { expenseDate: 'desc' },
      }),
      this.prisma.expense.aggregate({
        where,
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.expense.groupBy({
        by: ['categoryId'],
        where,
        _sum: { amount: true },
        _count: true,
      }),
    ]);

    const categoryNames = await this.prisma.expenseCategory.findMany({
      where: {
        id: { in: breakdownRows.map((r) => r.categoryId) },
        companyId,
      },
      select: { id: true, name: true },
    });
    const nameById = new Map(categoryNames.map((c) => [c.id, c.name]));

    const categoryBreakdown = breakdownRows.map((row) => ({
      categoryId: row.categoryId,
      categoryName: nameById.get(row.categoryId) ?? 'Unknown',
      totalAmount: Number(row._sum.amount ?? 0),
      count: row._count,
    }));

    return {
      summary: {
        totalAmount: Number(aggResult._sum.amount ?? 0),
        totalExpenses: aggResult._count,
        startDate: dto.startDate,
        endDate: dto.endDate,
        categoryFilter: dto.categoryId ?? null,
        vendorFilter: dto.vendor ?? null,
      },
      expenses: expenses.map((expense) => ({
        ...expense,
        amount: parseFloat(expense.amount.toString()),
      })),
      categoryBreakdown,
    };
  }
}
