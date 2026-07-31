import 'dotenv/config';
import { createCache } from 'cache-manager';
import type { Cache } from 'cache-manager';
import { BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../cache/cache.service';
import { StockService } from '../inventory/stock.service';
import { AuditLogService } from '../audit-logs/audit-logs.service';
import { ProductService } from '../products/product.service';
import { SalesService } from '../sales/sales.service';
import { SalesReturnsService } from '../sales-returns/sales-returns.service';
import { PurchasesService } from '../purchases/purchases.service';
import { PurchaseReturnsService } from '../purchase-returns/purchase-returns.service';
import { InventoryService } from '../inventory/inventory.service';
import { StockAdjustmentsService } from '../stock-adjustments/stock-adjustments.service';
import { InsufficientStockException } from '../inventory/insufficient-stock.exception';

jest.setTimeout(180_000);

const log = (msg: string) => console.log(`[E2E] ${msg}`);
const nowIso = () => new Date().toISOString();

describe('Stock E2E on live DB', () => {
  const prisma = new PrismaService();
  const cacheManager: Cache = createCache({ ttl: 300_000, max: 5000 });
  const cache = new CacheService(cacheManager);
  const stockService = new StockService(prisma, cache);
  const auditLogs = new AuditLogService(prisma, cache);
  const productService = new ProductService(prisma, cache, stockService);
  const salesService = new SalesService(prisma, cache, auditLogs, stockService);
  const salesReturnsService = new SalesReturnsService(
    prisma,
    cache,
    stockService,
  );
  const purchasesService = new PurchasesService(
    prisma,
    auditLogs,
    cache,
    stockService,
  );
  const purchaseReturnsService = new PurchaseReturnsService(
    prisma,
    cache,
    stockService,
  );
  const inventoryService = new InventoryService(prisma, cache, stockService);
  const stockAdjustmentsService = new StockAdjustmentsService(
    prisma,
    cache,
    stockService,
  );

  let companyId: string;
  let userId: string;
  let wh1: string;
  let wh2: string;
  const productIds: string[] = [];

  const productsTable = async (
    sku: string,
  ): Promise<{ id: string; stock: number }> => {
    const res = await productService.findAll(companyId, 1, 100, sku);
    const p = res.products.find((x: any) => x.sku === sku);
    return { id: p?.id, stock: (p as any)?.stock ?? -1 };
  };

  const inventoryTable = async (
    productId: string,
    warehouseId?: string,
  ): Promise<number> => {
    const res = await inventoryService.getInventory(companyId, {
      page: 1,
      limit: 200,
      search: undefined,
      warehouseId,
      filter: 'all',
    });
    const row = res.inventory.find(
      (i: any) => i.productId === productId && (warehouseId ? i.warehouseId === warehouseId : true),
    );
    return row ? (row as any).quantity : -1;
  };

  const warehouseDetail = async (
    warehouseId: string,
    productId: string,
  ): Promise<number> => {
    const res = await inventoryService.getWarehouseInventory(
      companyId,
      warehouseId,
    );
    const row = res.inventory.find((i: any) => i.productId === productId);
    return row ? (row as any).quantity : -1;
  };

  const comboAvailability = (productId: string, warehouseId?: string) =>
    stockService.getAvailableStock(companyId, productId, warehouseId);

  const ledger = async (productId: string, warehouseId: string) =>
    prisma.stockLedger.findMany({
      where: { productId, warehouseId },
      orderBy: { createdAt: 'asc' },
      select: { quantity: true, balance: true, type: true, reference: true },
    });

  beforeAll(async () => {
    await prisma.$connect();
    const company = await prisma.company.create({
      data: {
        name: `E2E Stock Test ${Date.now()}`,
        workspaceUrl: `e2e-stock-${Date.now()}`,
      },
    });
    companyId = company.id;
    const user = await prisma.user.create({
      data: {
        email: `e2e-${Date.now()}@test.local`,
        password: 'e2e-password',
        name: 'E2E Tester',
        companyId,
      },
    });
    userId = user.id;
    const w1 = await inventoryService.createWarehouse(companyId, {
      name: 'E2E-WH1',
      location: 'Test',
    });
    const w2 = await inventoryService.createWarehouse(companyId, {
      name: 'E2E-WH2',
      location: 'Test',
    });
    wh1 = (w1 as any).id;
    wh2 = (w2 as any).id;
    log(
      `setup: company=${companyId} user=${userId} wh1=${wh1} wh2=${wh2}`,
    );
  });

  afterAll(async () => {
    try {
      await prisma.auditLog.deleteMany({ where: { companyId } });
      await prisma.expense.deleteMany({ where: { companyId } });
      await prisma.expenseCategory.deleteMany({ where: { companyId } });
      await prisma.delivery.deleteMany({ where: { companyId } });
      await prisma.salesReturn.deleteMany({ where: { companyId } });
      await prisma.purchaseReturn.deleteMany({ where: { companyId } });
      await prisma.sale.deleteMany({ where: { companyId } });
      await prisma.purchaseOrder.deleteMany({ where: { companyId } });
      await prisma.stockAdjustment.deleteMany({ where: { companyId } });
      await prisma.stockLedger.deleteMany({
        where: { warehouseId: { in: [wh1, wh2] } },
      });
      await prisma.inventory.deleteMany({
        where: { warehouseId: { in: [wh1, wh2] } },
      });
      await prisma.comboItem.deleteMany({
        where: { combo: { companyId } },
      });
      await prisma.product.deleteMany({ where: { companyId } });
      await prisma.productCategory.deleteMany({ where: { companyId } });
      await prisma.brand.deleteMany({ where: { companyId } });
      await prisma.subCategory.deleteMany({ where: { companyId } });
      await prisma.customer.deleteMany({ where: { companyId } });
      await prisma.supplier.deleteMany({ where: { companyId } });
      await prisma.warehouse.deleteMany({ where: { companyId } });
      await prisma.user.deleteMany({ where: { companyId } });
      await prisma.company.delete({ where: { id: companyId } });
      log('cleanup: ok');
    } catch (err) {
      log(`cleanup: FAILED -> ${(err as Error).message}`);
    } finally {
      await prisma.$disconnect();
    }
  });

  test('STEP 1: standard product stock lifecycle', async () => {
    const p = await productService.create(
      {
        name: 'E2E Standard',
        sku: `E2E-STD-${Date.now()}`,
        category: 'E2E',
        salePrice: 10,
        costPrice: 5,
        stock: 100,
        warehouseId: wh1,
        type: 'STANDARD',
      },
      companyId,
      userId,
    );
    const productId = (p as any).id;
    productIds.push(productId);
    const sku = (p as any).sku;
    log(`STEP1: created ${sku} qty=100 wh1`);

    // populate caches, then verify surfaces
    expect((await productsTable(sku)).stock).toBe(100);
    expect(await inventoryTable(productId, wh1)).toBe(100);
    expect(await warehouseDetail(wh1, productId)).toBe(100);
    log('STEP1: surfaces after create => products=100 inventory=100 wh1=100');

    // Sell 40 from WH1
    const sale = await salesService.create(
      {
        customer: { name: 'E2E Customer' },
        warehouseId: wh1,
        saleDate: nowIso(),
        dueDate: nowIso(),
        status: 'COMPLETED',
        paymentStatus: 'PAID',
        items: [{ productId, quantity: 40, unitPrice: 10 }],
      },
      userId,
      companyId,
    );
    log(`STEP1: sold 40 (${(sale as any).invoiceNumber})`);

    expect((await productsTable(sku)).stock).toBe(60);
    expect(await inventoryTable(productId, wh1)).toBe(60);
    expect(await warehouseDetail(wh1, productId)).toBe(60);
    log('STEP1: surfaces after sale => products=60 inventory=60 wh1=60');

    // Adjust +40 (absolute target via updateStock 'add')
    const afterAdjust = await productService.updateStock(
      productId,
      40,
      'add',
      companyId,
      wh1,
    );
    expect((afterAdjust as any).stock ?? (afterAdjust as any).totalStock).toBe(
      100,
    );
    expect((await productsTable(sku)).stock).toBe(100);
    expect(await inventoryTable(productId, wh1)).toBe(100);
    expect(await warehouseDetail(wh1, productId)).toBe(100);
    log('STEP1: surfaces after adjust +40 => products=100 inventory=100 wh1=100');

    // Sale-return 20 -> COMPLETED
    const sr = await salesReturnsService.create(
      {
        warehouseId: wh1,
        reason: 'E2E',
        items: [{ productId, quantity: 20, unitPrice: 10 }],
      },
      userId,
      companyId,
    );
    log(`STEP1: sr created (${(sr as any).id})`);
    await salesReturnsService.update(
      (sr as any).id,
      { status: 'COMPLETED' },
      companyId,
    );
    log('STEP1: sr updated -> COMPLETED');

    // 100 initial - 40 sale + 40 adjust + 20 return = 120
    expect((await productsTable(sku)).stock).toBe(120);
    expect(await inventoryTable(productId, wh1)).toBe(120);
    expect(await warehouseDetail(wh1, productId)).toBe(120);
    log('STEP1: surfaces after sale-return 20 => products=120 inventory=120 wh1=120');

    const rows = await ledger(productId, wh1);
    log(
      `STEP1: ledger rows=${rows.length} -> ${rows
        .map((r) => `${r.type} ${r.quantity >= 0 ? '+' : ''}${r.quantity} (bal ${r.balance})`)
        .join(' | ')}`,
    );
    expect(rows.map((r) => r.type)).toEqual([
      'INITIAL',
      'SALE',
      'ADJUSTMENT',
      'RETURN',
    ]);
    expect(rows.map((r) => r.quantity)).toEqual([100, -40, 40, 20]);
    expect(rows.map((r) => r.balance)).toEqual([100, 60, 100, 120]);
  });

  test('STEP 2: purchase / purchase-return symmetry', async () => {
    const supplier = await prisma.supplier.create({
      data: { name: 'E2E Supplier', companyId },
    });
    const p = await productService.create(
      {
        name: 'E2E Purchased',
        sku: `E2E-PUR-${Date.now()}`,
        category: 'E2E',
        salePrice: 10,
        costPrice: 5,
        stock: 0,
        warehouseId: wh1,
        type: 'STANDARD',
      },
      companyId,
      userId,
    );
    const productId = (p as any).id;
    const sku = (p as any).sku;
    productIds.push(productId);
    log(`STEP2: created ${sku} qty=0`);

    const po = await purchasesService.create(
      {
        supplierId: supplier.id,
        orderDate: nowIso(),
        status: 'PENDING',
        paymentStatus: 'PENDING',
        items: [{ productId, quantity: 40, unitCost: 5 }],
      },
      userId,
      companyId,
    );
    log(`STEP2: PO created ${(po as any).referenceNumber}`);
    // No Inventory row yet (stock was 0) -> -1 sentinel
    expect(await inventoryTable(productId, wh1)).toBe(-1);

    await purchasesService.receive(
      (po as any).id,
      wh1,
      userId,
      companyId,
    );
    log('STEP2: receive done');
    expect((await productsTable(sku)).stock).toBe(40);
    expect(await inventoryTable(productId, wh1)).toBe(40);
    expect(await warehouseDetail(wh1, productId)).toBe(40);
    log('STEP2: surfaces after receive => products=40 inventory=40 wh1=40');

    // Purchase return 20 -> COMPLETED
    const prRet = await purchaseReturnsService.create(
      {
        warehouseId: wh1,
        supplierId: supplier.id,
        purchaseOrderId: (po as any).id,
        reason: 'E2E',
        items: [{ productId, quantity: 20, unitPrice: 5 }],
      },
      userId,
      companyId,
    );
    log(`STEP2: purchase-return created (${(prRet as any).id})`);
    await purchaseReturnsService.update(
      (prRet as any).id,
      { status: 'COMPLETED' },
      companyId,
    );
    log('STEP2: purchase-return updated -> COMPLETED');

    expect((await productsTable(sku)).stock).toBe(20);
    expect(await inventoryTable(productId, wh1)).toBe(20);
    expect(await warehouseDetail(wh1, productId)).toBe(20);
    log('STEP2: surfaces after purchase-return => products=20 inventory=20 wh1=20');

    const rows = await ledger(productId, wh1);
    log(
      `STEP2: ledger rows=${rows.length} -> ${rows
        .map((r) => `${r.type} ${r.quantity >= 0 ? '+' : ''}${r.quantity} (bal ${r.balance})`)
        .join(' | ')}`,
    );
    expect(rows.map((r) => r.type)).toEqual(['PURCHASE', 'RETURN']);
    expect(rows.map((r) => r.quantity)).toEqual([40, -20]);
    expect(rows.map((r) => r.balance)).toEqual([40, 20]);
  });

  test('STEP 3: warehouse transfer is atomic', async () => {
    // P1 currently: 120 in WH1, 0 in WH2
    const p1 = productIds[0];
    await inventoryService.transferStock(companyId, userId, {
      productId: p1,
      fromWarehouseId: wh1,
      toWarehouseId: wh2,
      quantity: 10,
      notes: 'E2E transfer',
    });

    expect(await inventoryTable(p1, wh1)).toBe(110);
    expect(await inventoryTable(p1, wh2)).toBe(10);
    expect(await warehouseDetail(wh1, p1)).toBe(110);
    expect(await warehouseDetail(wh2, p1)).toBe(10);
    log('STEP3: transfer 10 => wh1=110 wh2=10');

    // Atomicity: force a failure mid-transfer (insufficient source) and
    // verify NEITHER side moved.
    await expect(
      inventoryService.transferStock(companyId, userId, {
        productId: p1,
        fromWarehouseId: wh1,
        toWarehouseId: wh2,
        quantity: 9999,
        notes: 'E2E should fail',
      }),
    ).rejects.toThrow(BadRequestException);

    expect(await inventoryTable(p1, wh1)).toBe(110);
    expect(await inventoryTable(p1, wh2)).toBe(10);
    log('STEP3: failed transfer => wh1=110 wh2=10 (unchanged, atomic rollback ok)');

    const rows = await ledger(p1, wh1);
    const last = rows[rows.length - 1];
    expect(last.type).toBe('TRANSFER');
    expect(last.quantity).toBe(-10);
    expect(last.balance).toBe(110);
  });

  test('STEP 4: combo product - derived availability, sale, oversell block', async () => {
    // Components: A: 20 WH1 / 8 WH2 ; B: 10 WH1 / 6 WH2
    const a = await productService.create(
      {
        name: 'E2E Combo-A',
        sku: `E2E-CA-${Date.now()}`,
        category: 'E2E',
        salePrice: 3,
        costPrice: 1,
        stock: 20,
        warehouseId: wh1,
        type: 'STANDARD',
      },
      companyId,
      userId,
    );
    const b = await productService.create(
      {
        name: 'E2E Combo-B',
        sku: `E2E-CB-${Date.now()}`,
        category: 'E2E',
        salePrice: 5,
        costPrice: 2,
        stock: 10,
        warehouseId: wh1,
        type: 'STANDARD',
      },
      companyId,
      userId,
    );
    const aId = (a as any).id;
    const bId = (b as any).id;
    productIds.push(aId, bId);
    await inventoryService.updateInventory(companyId, userId, aId, wh2, {
      quantity: 8,
      notes: 'E2E setup',
    });
    await inventoryService.updateInventory(companyId, userId, bId, wh2, {
      quantity: 6,
      notes: 'E2E setup',
    });

    const combo = await productService.create(
      {
        name: 'E2E Combo',
        sku: `E2E-COMBO-${Date.now()}`,
        category: 'E2E',
        salePrice: 9,
        costPrice: 4,
        stock: 0,
        warehouseId: wh1,
        type: 'COMBO',
        comboItems: [
          { productId: aId, quantity: 2 },
          { productId: bId, quantity: 1 },
        ],
      },
      companyId,
      userId,
    );
    const comboId = (combo as any).id;
    const comboSku = (combo as any).sku;
    log(`STEP4: combo=${comboId} (2xA + 1xB), A=20wh1/8wh2 B=10wh1/6wh2`);

    // Derived availability must appear on all surfaces
    const derivedWh1 = Math.min(Math.floor(20 / 2), Math.floor(10 / 1)); // 10
    const derivedWh2 = Math.min(Math.floor(8 / 2), Math.floor(6 / 1)); // 4
    expect(await comboAvailability(comboId, wh1)).toBe(derivedWh1);
    expect(await comboAvailability(comboId, wh2)).toBe(derivedWh2);
    expect((await productsTable(comboSku)).stock).toBe(derivedWh1 + derivedWh2);
    expect(await warehouseDetail(wh1, comboId)).toBe(derivedWh1);
    log(`STEP4: derived availability => wh1=${derivedWh1} wh2=${derivedWh2}`);

    // Sell 1 combo at WH1
    const sale = await salesService.create(
      {
        customer: { name: 'E2E Customer' },
        warehouseId: wh1,
        saleDate: nowIso(),
        dueDate: nowIso(),
        status: 'COMPLETED',
        paymentStatus: 'PAID',
        items: [{ productId: comboId, quantity: 1, unitPrice: 9 }],
      },
      userId,
      companyId,
    );
    log(`STEP4: sold 1 combo (${(sale as any).invoiceNumber})`);

    expect(await inventoryTable(aId, wh1)).toBe(18);
    expect(await inventoryTable(bId, wh1)).toBe(9);
    expect(await comboAvailability(comboId, wh1)).toBe(9);
    expect((await productsTable(comboSku)).stock).toBe(13); // 9 + 4
    log('STEP4: after sale => A=18 B=9 combo avail=9 (wh1)');

    // Combo must NOT hold its own inventory rows
    const comboInvRows = await prisma.inventory.count({
      where: { productId: comboId },
    });
    expect(comboInvRows).toBe(0);
    log(`STEP4: combo own inventory rows = ${comboInvRows} (expected 0)`);

    // Ledger: entries for components, not the combo
    const aLedger = await ledger(aId, wh1);
    const bLedger = await ledger(bId, wh1);
    const comboLedger = await ledger(comboId, wh1);
    expect(comboLedger.length).toBe(0);
    const aSale = aLedger.filter((r) => r.type === 'SALE');
    const bSale = bLedger.filter((r) => r.type === 'SALE');
    expect(aSale.map((r) => r.quantity)).toEqual([-2]);
    expect(bSale.map((r) => r.quantity)).toEqual([-1]);
    expect(aSale[0].balance).toBe(18);
    expect(bSale[0].balance).toBe(9);
    log(
      `STEP4: ledger => A:${aSale
        .map((r) => `${r.quantity} bal ${r.balance}`)
        .join(',')} B:${bSale
        .map((r) => `${r.quantity} bal ${r.balance}`)
        .join(',')} combo:${comboLedger.length} rows`,
    );

    // Oversell: needs B=10 but only 9 left -> blocked
    const oversell = salesService.create(
      {
        customer: { name: 'E2E Customer' },
        warehouseId: wh1,
        saleDate: nowIso(),
        dueDate: nowIso(),
        status: 'COMPLETED',
        paymentStatus: 'PAID',
        items: [{ productId: comboId, quantity: 10, unitPrice: 9 }],
      },
      userId,
      companyId,
    );
    await expect(oversell).rejects.toThrow(/[Ii]nsufficient stock/);
    // components unchanged, combo availability unchanged
    expect(await inventoryTable(aId, wh1)).toBe(18);
    expect(await inventoryTable(bId, wh1)).toBe(9);
    expect(await comboAvailability(comboId, wh1)).toBe(9);
    log('STEP4: oversell of 10 combos blocked; stock unchanged (A=18 B=9)');
  });

  test('STEP 5: concurrent oversell - one wins, stock never negative', async () => {
    const p = await productService.create(
      {
        name: 'E2E Race',
        sku: `E2E-RACE-${Date.now()}`,
        category: 'E2E',
        salePrice: 10,
        costPrice: 5,
        stock: 5,
        warehouseId: wh2,
        type: 'STANDARD',
      },
      companyId,
      userId,
    );
    const productId = (p as any).id;
    productIds.push(productId);
    log(`STEP5: race product qty=5 in wh2`);

    const saleDto = (qty: number) => ({
      customer: { name: 'E2E Customer' },
      warehouseId: wh2,
      saleDate: nowIso(),
      dueDate: nowIso(),
      status: 'COMPLETED',
      paymentStatus: 'PAID',
      items: [{ productId, quantity: qty, unitPrice: 10 }],
    });

    const [r1, r2] = await Promise.allSettled([
      salesService.create(saleDto(4), userId, companyId),
      salesService.create(saleDto(4), userId, companyId),
    ]);

    const successes = [r1, r2].filter((r) => r.status === 'fulfilled');
    const failures = [r1, r2].filter((r) => r.status === 'rejected');
    expect(successes.length).toBe(1);
    expect(failures.length).toBe(1);
    const err = (failures[0] as PromiseRejectedResult).reason;
    expect(err).toBeInstanceOf(BadRequestException);
    expect((err as Error).message).toMatch(/[Ii]nsufficient stock/);
    log(
      `STEP5: 1 sale ok, 1 rejected: "${(err as Error).message}"`,
    );

    const finalQty = await inventoryTable(productId, wh2);
    expect(finalQty).toBe(1);
    expect(finalQty).toBeGreaterThanOrEqual(0);
    log(`STEP5: final wh2 qty = ${finalQty} (never negative)`);

    const rows = await ledger(productId, wh2);
    const sales = rows.filter((r) => r.type === 'SALE');
    expect(sales.length).toBe(1);
    expect(sales[0].quantity).toBe(-4);
    expect(sales[0].balance).toBe(1);
    log(`STEP5: ledger SALE -4 bal 1; total ledger rows=${rows.length}`);
  });
});
