import { Test, TestingModule } from '@nestjs/testing';
import { OrderStatus } from '@prisma/client';
import { SalesService } from './sales.service';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../cache/cache.service';
import { StockService } from '../inventory/stock.service';
import { AuditLogService } from '../audit-logs/audit-logs.service';

describe('SalesService remove() stock reversal', () => {
  let service: SalesService;
  let stockService: StockService;

  const tx = {
    sale: {
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
  };

  const baseSale = {
    id: 'sale-1',
    companyId: 'company-1',
    invoiceNumber: 'INV-001',
    userId: 'user-1',
    warehouseId: 'wh-1',
    status: OrderStatus.COMPLETED,
    items: [
      { id: 'i1', productId: 'p1', quantity: 4 },
      { id: 'i2', productId: 'p2', quantity: 2 },
    ],
  };

  const prismaMock = {
    $transaction: jest.fn(async (fn: any) => fn(tx)),
  };
  const cacheMock = { del: jest.fn().mockResolvedValue(undefined) };
  const auditLogMock = {};
  const stockServiceMock = {
    reverseIssue: jest.fn().mockResolvedValue([]),
    invalidateStockCaches: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    tx.sale.findUnique.mockReset();
    tx.sale.delete.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SalesService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: CacheService, useValue: cacheMock },
        { provide: AuditLogService, useValue: auditLogMock },
        { provide: StockService, useValue: stockServiceMock },
      ],
    }).compile();

    service = module.get<SalesService>(SalesService);
    stockService = module.get<StockService>(StockService);
  });

  it('reverses stock exactly once per item when deleting a COMPLETED sale', async () => {
    tx.sale.findUnique.mockResolvedValue({ ...baseSale });
    tx.sale.delete.mockResolvedValue(undefined);

    await service.remove('sale-1', 'company-1');

    expect(stockService.reverseIssue).toHaveBeenCalledTimes(2);
    expect(stockService.reverseIssue).toHaveBeenNthCalledWith(
      1,
      tx,
      expect.objectContaining({
        productId: 'p1',
        warehouseId: 'wh-1',
        quantity: 4,
        type: 'SALE',
        companyId: 'company-1',
      }),
    );
    expect(stockService.reverseIssue).toHaveBeenNthCalledWith(
      2,
      tx,
      expect.objectContaining({
        productId: 'p2',
        warehouseId: 'wh-1',
        quantity: 2,
        type: 'SALE',
        companyId: 'company-1',
      }),
    );
    expect(stockService.invalidateStockCaches).toHaveBeenCalledWith(
      'company-1',
      ['p1', 'p2'],
      ['wh-1'],
    );
    expect(tx.sale.delete).toHaveBeenCalledWith({ where: { id: 'sale-1' } });
  });

  it('does NOT reverse stock when deleting a PENDING sale (regression: double-increment bug)', async () => {
    tx.sale.findUnique.mockResolvedValue({
      ...baseSale,
      status: OrderStatus.PENDING,
    });
    tx.sale.delete.mockResolvedValue(undefined);

    await service.remove('sale-1', 'company-1');

    expect(stockService.reverseIssue).not.toHaveBeenCalled();
    expect(stockService.invalidateStockCaches).not.toHaveBeenCalled();
    expect(tx.sale.delete).toHaveBeenCalledWith({ where: { id: 'sale-1' } });
  });

  it('does NOT reverse stock when deleting a COMPLETED sale without a warehouse', async () => {
    tx.sale.findUnique.mockResolvedValue({
      ...baseSale,
      warehouseId: null,
    });
    tx.sale.delete.mockResolvedValue(undefined);

    await service.remove('sale-1', 'company-1');

    expect(stockService.reverseIssue).not.toHaveBeenCalled();
    expect(tx.sale.delete).toHaveBeenCalledWith({ where: { id: 'sale-1' } });
  });
});
