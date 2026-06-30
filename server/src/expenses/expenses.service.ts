import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../cache/cache.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { UpdateExpenseStatusDto } from './dto/update-expense-status.dto';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';

const writeFile = promisify(fs.writeFile);
const mkdir = promisify(fs.mkdir);
const unlink = promisify(fs.unlink);

const LIST_KEY = (cid: string, page?: number, search?: string) =>
  `expenses:${cid}:list:${page ?? 1}:${search ?? ''}`;
const ITEM_KEY = (cid: string, id: string) => `expenses:${cid}:${id}`;
const STATS_KEY = (cid: string) => `expenses:${cid}:stats`;

@Injectable()
export class ExpensesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  async create(dto: CreateExpenseDto, userId: string, companyId: string) {
    const category = await this.prisma.expenseCategory.findUnique({
      where: { id: dto.categoryId, companyId },
    });
    if (!category) {
      throw new NotFoundException('Expense category not found');
    }

    const expense = await this.prisma.expense.create({
      data: {
        reference: dto.reference, amount: dto.amount,
        expenseDate: new Date(dto.expenseDate),
        description: dto.description, vendor: dto.vendor,
        status: 'PENDING', categoryId: dto.categoryId,
        purchaseOrderId: dto.purchaseOrderId, saleId: dto.saleId,
        userId, companyId,
      },
      include: {
        category: true,
        user: { select: { id: true, email: true } },
      },
    });

    await Promise.all([
      this.cache.del(LIST_KEY(companyId)),
      this.cache.del(STATS_KEY(companyId)),
    ]);
    return { ...expense, amount: parseFloat(expense.amount.toString()) };
  }

  async findAll(companyId: string, page = 1, limit = 50, search?: string) {
    const cacheKey = LIST_KEY(companyId, page, search);
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    const skip = (page - 1) * limit;
    const where: any = { companyId };
    if (search) {
      where.OR = [
        { reference: { contains: search, mode: 'insensitive' } },
        { vendor: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const expenses = await this.prisma.expense.findMany({
      where,
      include: {
        category: true,
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { expenseDate: 'desc' },
      skip,
      take: limit,
    });

    const data = expenses.map((exp) => ({
      ...exp,
      amount: parseFloat(exp.amount.toString()),
    }));

    await this.cache.set(cacheKey, data, 60 * 2);
    return data;
  }

  async findOne(id: string, companyId: string) {
    const cacheKey = ITEM_KEY(companyId, id);
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    const expense = await this.prisma.expense.findUnique({
      where: { id, companyId },
      include: {
        category: true,
        user: { select: { id: true, name: true, email: true } },
        attachments: true,
      },
    });
    if (!expense) {
      throw new NotFoundException('Expense not found');
    }

    const data = { ...expense, amount: parseFloat(expense.amount.toString()) };
    await this.cache.set(cacheKey, data, 60 * 5);
    return data;
  }

  async update(id: string, companyId: string, dto: UpdateExpenseDto) {
    const expense = await this.findOne(id, companyId);

    if (dto.categoryId) {
      const category = await this.prisma.expenseCategory.findUnique({
        where: { id: dto.categoryId, companyId },
      });
      if (!category) {
        throw new NotFoundException('Expense category not found');
      }
    }

    const updated = await this.prisma.expense.update({
      where: { id: expense.id },
      data: {
        ...(dto.reference !== undefined && { reference: dto.reference }),
        ...(dto.amount !== undefined && { amount: dto.amount }),
        ...(dto.expenseDate !== undefined && { expenseDate: new Date(dto.expenseDate) }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.vendor !== undefined && { vendor: dto.vendor }),
        ...(dto.categoryId !== undefined && { categoryId: dto.categoryId }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.paymentMethod !== undefined && { paymentMethod: dto.paymentMethod }),
        ...(dto.purchaseOrderId !== undefined && { purchaseOrderId: dto.purchaseOrderId }),
      },
      include: {
        category: true,
        user: { select: { id: true, name: true, email: true } },
      },
    });

    await Promise.all([
      this.cache.del(LIST_KEY(companyId)),
      this.cache.del(ITEM_KEY(companyId, id)),
      this.cache.del(STATS_KEY(companyId)),
    ]);

    return { ...updated, amount: parseFloat(updated.amount.toString()) };
  }

  async updateStatus(id: string, companyId: string, dto: UpdateExpenseStatusDto) {
    await this.findOne(id, companyId);

    const updated = await this.prisma.expense.update({
      where: { id },
      data: { status: dto.status },
      include: {
        category: true,
        user: { select: { id: true, name: true, email: true } },
      },
    });

    await Promise.all([
      this.cache.del(LIST_KEY(companyId)),
      this.cache.del(ITEM_KEY(companyId, id)),
      this.cache.del(STATS_KEY(companyId)),
    ]);

    return { ...updated, amount: parseFloat(updated.amount.toString()) };
  }

  async remove(id: string, companyId: string) {
    await this.findOne(id, companyId);
    await this.prisma.expense.delete({ where: { id } });

    await Promise.all([
      this.cache.del(LIST_KEY(companyId)),
      this.cache.del(ITEM_KEY(companyId, id)),
      this.cache.del(STATS_KEY(companyId)),
    ]);
  }

  async getStats(companyId: string) {
    const cacheKey = STATS_KEY(companyId);
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    const [aggResult, statusCounts] = await Promise.all([
      this.prisma.expense.aggregate({
        where: { companyId },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.expense.groupBy({
        by: ['status'],
        where: { companyId },
        _count: true,
        _sum: { amount: true },
      }),
    ]);

    const data = {
      totalExpenses: aggResult._count,
      totalAmount: Number(aggResult._sum.amount ?? 0),
      pendingExpenses: 0, pendingAmount: 0,
      approvedExpenses: 0, approvedAmount: 0,
      paidExpenses: 0, paidAmount: 0,
      rejectedExpenses: 0,
    };

    for (const s of statusCounts) {
      const amount = Number(s._sum.amount ?? 0);
      if (s.status === 'PENDING') { data.pendingExpenses = s._count; data.pendingAmount = amount; }
      if (s.status === 'APPROVED') { data.approvedExpenses = s._count; data.approvedAmount = amount; }
      if (s.status === 'PAID') { data.paidExpenses = s._count; data.paidAmount = amount; }
      if (s.status === 'REJECTED') { data.rejectedExpenses = s._count; }
    }

    await this.cache.set(cacheKey, data, 60 * 5);
    return data;
  }

  async uploadAttachment(expenseId: string, companyId: string, file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file provided');
    await this.findOne(expenseId, companyId);

    const uploadsDir = path.join(process.cwd(), 'uploads', 'expenses');
    await mkdir(uploadsDir, { recursive: true }).catch(() => {});

    const fileExtension = path.extname(file.originalname);
    const fileName = `${expenseId}-${Date.now()}${fileExtension}`;
    const filePath = path.join(uploadsDir, fileName);
    await writeFile(filePath, file.buffer);

    const attachment = await this.prisma.expenseAttachment.create({
      data: {
        url: `/uploads/expenses/${fileName}`,
        fileName: file.originalname,
        fileType: file.mimetype,
        expenseId: expenseId,
      },
    });

    await this.cache.del(ITEM_KEY(companyId, expenseId));
    return attachment;
  }

  async deleteAttachment(expenseId: string, attachmentId: string, companyId: string) {
    await this.findOne(expenseId, companyId);

    const attachment = await this.prisma.expenseAttachment.findFirst({
      where: { id: attachmentId, expenseId },
    });
    if (!attachment) throw new NotFoundException('Attachment not found');

    const filePath = path.join(process.cwd(), attachment.url);
    await unlink(filePath).catch(() => {});

    await this.prisma.expenseAttachment.delete({ where: { id: attachment.id } });

    await this.cache.del(ITEM_KEY(companyId, expenseId));
    return { message: 'Attachment deleted successfully' };
  }
}
