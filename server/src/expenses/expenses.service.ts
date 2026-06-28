import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { UpdateExpenseStatusDto } from './dto/update-expense-status.dto';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';

const writeFile = promisify(fs.writeFile);
const mkdir = promisify(fs.mkdir);
const unlink = promisify(fs.unlink);

@Injectable()
export class ExpensesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateExpenseDto, userId: string, companyId: string) {
    // Verify category exists and belongs to company
    const category = await this.prisma.expenseCategory.findUnique({
      where: { id: dto.categoryId, companyId },
    });

    if (!category) {
      throw new NotFoundException('Expense category not found');
    }

    return this.prisma.expense.create({
      data: {
        reference: dto.reference,
        amount: dto.amount,
        expenseDate: new Date(dto.expenseDate),
        description: dto.description,
        vendor: dto.vendor,
        status: 'PENDING',
        categoryId: dto.categoryId,
        purchaseOrderId: dto.purchaseOrderId,
        userId,
        companyId,
      },
      include: {
        category: true,
        user: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });
  }

  async findAll(companyId: string, page = 1, limit = 50, search?: string) {
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
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { expenseDate: 'desc' },
      skip,
      take: limit,
    });

    return expenses.map((exp) => ({
      ...exp,
      amount: parseFloat(exp.amount.toString()),
    }));
  }

  async findOne(id: string, companyId: string) {
    const expense = await this.prisma.expense.findUnique({
      where: { id, companyId },
      include: {
        category: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        attachments: true,
      },
    });

    if (!expense) {
      throw new NotFoundException('Expense not found');
    }

    return {
      ...expense,
      amount: parseFloat(expense.amount.toString()),
    };
  }

  async update(id: string, companyId: string, dto: UpdateExpenseDto) {
    const expense = await this.findOne(id, companyId);

    // If categoryId is being updated, verify it exists
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
        ...(dto.expenseDate !== undefined && {
          expenseDate: new Date(dto.expenseDate),
        }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.vendor !== undefined && { vendor: dto.vendor }),
        ...(dto.categoryId !== undefined && { categoryId: dto.categoryId }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.paymentMethod !== undefined && {
          paymentMethod: dto.paymentMethod,
        }),
        ...(dto.purchaseOrderId !== undefined && {
          purchaseOrderId: dto.purchaseOrderId,
        }),
      },
      include: {
        category: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return {
      ...updated,
      amount: parseFloat(updated.amount.toString()),
    };
  }

  async updateStatus(
    id: string,
    companyId: string,
    dto: UpdateExpenseStatusDto,
  ) {
    const expense = await this.findOne(id, companyId);

    const updated = await this.prisma.expense.update({
      where: { id: expense.id },
      data: { status: dto.status },
      include: {
        category: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return {
      ...updated,
      amount: parseFloat(updated.amount.toString()),
    };
  }

  async remove(id: string, companyId: string) {
    const expense = await this.findOne(id, companyId);

    await this.prisma.expense.delete({
      where: { id: expense.id },
    });
  }

  async getStats(companyId: string) {
    const expenses = await this.prisma.expense.findMany({
      where: { companyId },
      select: {
        amount: true,
        status: true,
      },
    });

    const stats = expenses.reduce(
      (acc, exp) => {
        const amount = Number(exp.amount);
        acc.totalExpenses += 1;
        acc.totalAmount += amount;

        if (exp.status === 'PENDING') {
          acc.pendingExpenses += 1;
          acc.pendingAmount += amount;
        }
        if (exp.status === 'APPROVED') {
          acc.approvedExpenses += 1;
          acc.approvedAmount += amount;
        }
        if (exp.status === 'PAID') {
          acc.paidExpenses += 1;
          acc.paidAmount += amount;
        }
        if (exp.status === 'REJECTED') {
          acc.rejectedExpenses += 1;
        }
        return acc;
      },
      {
        totalExpenses: 0,
        pendingExpenses: 0,
        approvedExpenses: 0,
        paidExpenses: 0,
        rejectedExpenses: 0,
        totalAmount: 0,
        pendingAmount: 0,
        approvedAmount: 0,
        paidAmount: 0,
      },
    );

    return stats;
  }

  async uploadAttachment(
    expenseId: string,
    companyId: string,
    file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Verify expense exists and belongs to company
    const expense = await this.findOne(expenseId, companyId);

    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(process.cwd(), 'uploads', 'expenses');
    try {
      await mkdir(uploadsDir, { recursive: true });
    } catch (error) {
      // Directory already exists
    }

    // Generate unique filename
    const fileExtension = path.extname(file.originalname);
    const fileName = `${expenseId}-${Date.now()}${fileExtension}`;
    const filePath = path.join(uploadsDir, fileName);

    // Save file to disk
    await writeFile(filePath, file.buffer);

    // Create attachment record in database
    const attachment = await this.prisma.expenseAttachment.create({
      data: {
        url: `/uploads/expenses/${fileName}`,
        fileName: file.originalname,
        fileType: file.mimetype,
        expenseId: expense.id,
      },
    });

    return attachment;
  }

  async deleteAttachment(
    expenseId: string,
    attachmentId: string,
    companyId: string,
  ) {
    // Verify expense exists and belongs to company
    await this.findOne(expenseId, companyId);

    // Find attachment
    const attachment = await this.prisma.expenseAttachment.findFirst({
      where: {
        id: attachmentId,
        expenseId,
      },
    });

    if (!attachment) {
      throw new NotFoundException('Attachment not found');
    }

    // Delete file from disk
    const filePath = path.join(process.cwd(), attachment.url);
    try {
      await unlink(filePath);
    } catch (error) {
      // File might not exist, continue with database deletion
    }

    // Delete attachment record
    await this.prisma.expenseAttachment.delete({
      where: { id: attachment.id },
    });

    return { message: 'Attachment deleted successfully' };
  }
}
