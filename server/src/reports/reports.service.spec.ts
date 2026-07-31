import { Test, TestingModule } from '@nestjs/testing';
import { ReportsService } from './reports.service';
import { PrismaService } from '../prisma/prisma.service';

describe('ReportsService generateExpenseReport()', () => {
  let service: ReportsService;
  let prisma: {
    expense: { findMany: jest.Mock; aggregate: jest.Mock; groupBy: jest.Mock };
    expenseCategory: { findMany: jest.Mock };
  };

  const expenses = [
    {
      id: 'e1',
      reference: 'EXP-001',
      amount: { toString: () => '100.00' },
      expenseDate: new Date('2026-07-05'),
      description: 'Office rent',
      vendor: 'Landlord',
      status: 'PAID',
      paymentMethod: 'BANK_TRANSFER',
      receiptNumber: 'R-1',
      notes: null,
      categoryId: 'cat-1',
      category: { id: 'cat-1', name: 'Rent' },
    },
    {
      id: 'e2',
      reference: 'EXP-002',
      amount: { toString: () => '50.50' },
      expenseDate: new Date('2026-07-12'),
      description: 'Paper',
      vendor: 'Stationery Co',
      status: 'PAID',
      paymentMethod: 'CASH',
      receiptNumber: null,
      notes: 'x2',
      categoryId: 'cat-2',
      category: { id: 'cat-2', name: 'Supplies' },
    },
  ];

  beforeEach(async () => {
    jest.clearAllMocks();

    prisma = {
      expense: {
        findMany: jest.fn(),
        aggregate: jest.fn(),
        groupBy: jest.fn(),
      },
      expenseCategory: { findMany: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<ReportsService>(ReportsService);

    prisma.expense.findMany.mockResolvedValue(expenses);
    prisma.expense.aggregate.mockResolvedValue({
      _sum: { amount: { toString: () => '150.50' } },
      _count: 2,
    });
    prisma.expense.groupBy.mockResolvedValue([
      { categoryId: 'cat-1', _sum: { amount: { toString: () => '100.00' } }, _count: 1 },
      { categoryId: 'cat-2', _sum: { amount: { toString: () => '50.50' } }, _count: 1 },
    ]);
    prisma.expenseCategory.findMany.mockResolvedValue([
      { id: 'cat-1', name: 'Rent' },
      { id: 'cat-2', name: 'Supplies' },
    ]);
  });

  it('scopes expenses to company + date range and returns summary, breakdown, and rows', async () => {
    const result = await service.generateExpenseReport('company-1', {
      startDate: '2026-07-01',
      endDate: '2026-07-31',
    });

    expect(prisma.expense.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          companyId: 'company-1',
          expenseDate: {
            gte: (() => {
              const d = new Date('2026-07-01');
              d.setHours(0, 0, 0, 0);
              return d;
            })(),
            lte: (() => {
              const d = new Date('2026-07-31');
              d.setHours(23, 59, 59, 999);
              return d;
            })(),
          },
        }),
      }),
    );

    expect(result.summary.totalExpenses).toBe(2);
    expect(result.summary.totalAmount).toBe(150.5);
    expect(result.expenses).toHaveLength(2);
    expect(result.expenses[0].amount).toBe(100);
    expect(result.categoryBreakdown).toHaveLength(2);
    expect(result.categoryBreakdown[0]).toEqual({
      categoryId: 'cat-1',
      categoryName: 'Rent',
      totalAmount: 100,
      count: 1,
    });
  });

  it('applies category and vendor filters to the query', async () => {
    await service.generateExpenseReport('company-1', {
      startDate: '2026-07-01',
      endDate: '2026-07-31',
      categoryId: 'cat-1',
      vendor: 'landlord',
    });

    const where = (prisma.expense.findMany as jest.Mock).mock.calls[0][0].where;
    expect(where.categoryId).toBe('cat-1');
    expect(where.vendor).toEqual({
      contains: 'landlord',
      mode: 'insensitive',
    });
  });

  it('rejects inverted date ranges', async () => {
    await expect(
      service.generateExpenseReport('company-1', {
        startDate: '2026-08-01',
        endDate: '2026-07-01',
      }),
    ).rejects.toThrow('Start date must be before end date');
    expect(prisma.expense.findMany).not.toHaveBeenCalled();
  });
});
