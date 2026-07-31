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

// The live Supabase pooler occasionally drops interactive transactions
// during long runs ("Transaction not found..."); retry once so infra
// hiccups don't fail the suite. Tests create unique data per attempt.
jest.retryTimes(1);

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

  test('STEP 4b: combo with own stock - 50->49 on sale, components follow, shortage names the component', async () => {
    // User scenario: combo qty 50, contains 12x A + 11x B per combo.
    const a = await productService.create(
      {
        name: 'E2E OwnCombo-A',
        sku: `E2E-OCA-${Date.now()}`,
        category: 'E2E',
        salePrice: 1,
        costPrice: 1,
        stock: 0,
        warehouseId: wh1,
        type: 'STANDARD',
      },
      companyId,
      userId,
    );
    const b = await productService.create(
      {
        name: 'E2E OwnCombo-B',
        sku: `E2E-OCB-${Date.now()}`,
        category: 'E2E',
        salePrice: 1,
        costPrice: 1,
        stock: 0,
        warehouseId: wh1,
        type: 'STANDARD',
      },
      companyId,
      userId,
    );
    const aId = (a as any).id;
    const bId = (b as any).id;
    productIds.push(aId, bId);

    const combo = await productService.create(
      {
        name: 'E2E Own Combo',
        sku: `E2E-OWN-COMBO-${Date.now()}`,
        category: 'E2E',
        salePrice: 50,
        costPrice: 25,
        stock: 50,
        warehouseId: wh1,
        type: 'COMBO',
        comboItems: [
          { productId: aId, quantity: 12 },
          { productId: bId, quantity: 11 },
        ],
      },
      companyId,
      userId,
    );
    const comboId = (combo as any).id;
    const comboSku = (combo as any).sku;
    productIds.push(comboId);
    log(`STEP4b: combo=${comboId} stock 50 (12xA + 11xB per combo)`);

    // Combo holds its OWN inventory + ledger; components seeded by ratio.
    expect(await inventoryTable(comboId, wh1)).toBe(50);
    expect(await inventoryTable(aId, wh1)).toBe(600);
    expect(await inventoryTable(bId, wh1)).toBe(550);
    const comboRows = await ledger(comboId, wh1);
    expect(comboRows.length).toBe(1);
    expect(comboRows[0].type).toBe('INITIAL');
    expect(comboRows[0].quantity).toBe(50);
    expect(comboRows[0].balance).toBe(50);
    expect((await productsTable(comboSku)).stock).toBe(50);
    expect(await comboAvailability(comboId, wh1)).toBe(50);
    expect(await comboAvailability(comboId, wh2)).toBe(0);
    log('STEP4b: combo own=50 ledger INITIAL +50; A=600 B=550; products table shows 50');

    // Sell 1 combo: combo 50->49, A -12, B -11.
    await salesService.create(
      {
        customer: { name: 'E2E Customer' },
        warehouseId: wh1,
        saleDate: nowIso(),
        dueDate: nowIso(),
        status: 'COMPLETED',
        paymentStatus: 'PAID',
        items: [{ productId: comboId, quantity: 1, unitPrice: 50 }],
      },
      userId,
      companyId,
    );
    expect(await inventoryTable(comboId, wh1)).toBe(49);
    expect(await inventoryTable(aId, wh1)).toBe(588);
    expect(await inventoryTable(bId, wh1)).toBe(539);
    expect((await productsTable(comboSku)).stock).toBe(49);
    expect(await comboAvailability(comboId, wh1)).toBe(49);
    const comboLedger = await ledger(comboId, wh1);
    const saleRow = comboLedger[comboLedger.length - 1];
    expect(saleRow.type).toBe('SALE');
    expect(saleRow.quantity).toBe(-1);
    expect(saleRow.balance).toBe(49);
    log('STEP4b: sold 1 combo => combo 49 (ledger SALE -1 bal 49), A 588, B 539');

    // Oversell beyond own stock: blocked, names the combo.
    const overOwn = salesService.create(
      {
        customer: { name: 'E2E Customer' },
        warehouseId: wh1,
        saleDate: nowIso(),
        dueDate: nowIso(),
        status: 'COMPLETED',
        paymentStatus: 'PAID',
        items: [{ productId: comboId, quantity: 50, unitPrice: 50 }],
      },
      userId,
      companyId,
    );
    await expect(overOwn).rejects.toThrow(/Insufficient stock for product "E2E Own Combo"/);
    expect(await inventoryTable(comboId, wh1)).toBe(49);
    log('STEP4b: oversell 50 blocked (own stock 49), combo unchanged');

    // Component shortage: B drops below what the combo needs -> blocked and
    // the message names the component.
    await inventoryService.updateInventory(companyId, userId, bId, wh1, {
      quantity: 1,
      notes: 'E2E setup',
    });
    const shortComponent = salesService.create(
      {
        customer: { name: 'E2E Customer' },
        warehouseId: wh1,
        saleDate: nowIso(),
        dueDate: nowIso(),
        status: 'COMPLETED',
        paymentStatus: 'PAID',
        items: [{ productId: comboId, quantity: 1, unitPrice: 50 }],
      },
      userId,
      companyId,
    );
    await expect(shortComponent).rejects.toThrow(
      /component "E2E OwnCombo-B" has only 1 available .*needs 11 per combo/,
    );
    expect(await inventoryTable(comboId, wh1)).toBe(49);
    expect(await inventoryTable(aId, wh1)).toBe(588);
    expect(await inventoryTable(bId, wh1)).toBe(1);
    log('STEP4b: sale blocked when component B short => message names B, stock untouched');
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

  test('STEP 6: variant product - batch create via attributes, ledgered INITIAL per variant', async () => {
    const parent = await productService.create(
      {
        name: 'E2E Variant Parent',
        sku: `E2E-VP-${Date.now()}`,
        category: 'E2E',
        salePrice: 12,
        costPrice: 6,
        stock: 0,
        warehouseId: wh1,
        type: 'STANDARD',
        hasVariants: true,
        attributes: { Color: 'Red,Blue', Size: 'S,M' },
        variants: [
          {
            sku: `E2E-VR-${Date.now()}`,
            name: 'E2E Variant Parent - Red / S',
            salePrice: 12.5,
            costPrice: 6.5,
            stock: 10,
            warehouseId: wh2,
            reorderLevel: 3,
            taxRate: 5,
            attributes: { Color: 'Red', Size: 'S' },
          },
          {
            sku: `E2E-VB-${Date.now()}`,
            name: 'E2E Variant Parent - Blue / S',
            salePrice: 12.5,
            costPrice: 6.5,
            stock: 10,
            attributes: { Color: 'Blue', Size: 'S' },
          },
          {
            sku: `E2E-VM-${Date.now()}`,
            name: 'E2E Variant Parent - Red / M',
            salePrice: 12.5,
            costPrice: 6.5,
            stock: 10,
            attributes: { Color: 'Red', Size: 'M' },
          },
          {
            sku: `E2E-VL-${Date.now()}`,
            name: 'E2E Variant Parent - Blue / M',
            salePrice: 12.5,
            costPrice: 6.5,
            stock: 10,
            attributes: { Color: 'Blue', Size: 'M' },
          },
        ],
      },
      companyId,
      userId,
    );
    const parentId = (parent as any).id;
    const parentSku = (parent as any).sku;
    productIds.push(parentId);
    log(`STEP6: parent=${parentId} (${parentSku}) + 4 variants x10 wh1`);

    const variants = await productService.getVariants(parentId, companyId);
    expect(variants.length).toBe(4);
    const ids = variants.map((v: any) => v.id);
    productIds.push(...ids);

    for (const v of variants as any[]) {
      expect(v.parentId).toBe(parentId);
      expect(v.attributes).toBeTruthy();
      const expectedWh = v.sku.startsWith('E2E-VR-') ? wh2 : wh1;
      expect(await inventoryTable(v.id, expectedWh)).toBe(10);
      const rows = await ledger(v.id, expectedWh);
      expect(rows.length).toBe(1);
      expect(rows[0].type).toBe('INITIAL');
      expect(rows[0].quantity).toBe(10);
      expect(rows[0].balance).toBe(10);
      if (v.sku.startsWith('E2E-VR-')) {
        expect(v.reorderLevel).toBe(3);
        expect(v.taxRate).toBe(5);
        expect(await inventoryTable(v.id, wh1)).toBe(-1);
      } else {
        expect(v.reorderLevel ?? 0).toBe(0);
        expect(v.taxRate ?? 0).toBe(0);
        expect(await inventoryTable(v.id, wh2)).toBe(-1);
      }
    }
    log('STEP6: 4 variants each: inventory 10 (1 on wh2, 3 on wh1) + ledger [INITIAL +10 bal 10]; per-variant warehouse/reorderLevel/taxRate persisted');

    // Parent must NOT hold its own inventory/ledger rows
    const parentInv = await prisma.inventory.count({ where: { productId: parentId } });
    const parentLedger = await prisma.stockLedger.count({ where: { productId: parentId } });
    expect(parentInv).toBe(0);
    expect(parentLedger).toBe(0);

    // Parent attributes round-trip
    const storedParent = await prisma.product.findUnique({
      where: { id: parentId },
      select: { hasVariants: true, attributes: true },
    });
    expect(storedParent?.hasVariants).toBe(true);
    expect(storedParent?.attributes).toEqual({ Color: 'Red,Blue', Size: 'S,M' });

    // All surfaces agree (derived totals on parent = 40)
    expect((await productsTable(parentSku)).stock).toBe(40);

    // SKU collisions must be rejected
    const v0 = (variants as any[])[0];
    const dup = productService.create(
      {
        name: 'E2E Dup',
        sku: `E2E-DUP-${Date.now()}`,
        category: 'E2E',
        salePrice: 1,
        costPrice: 1,
        warehouseId: wh1,
        variants: [{ sku: v0.sku, name: 'Dup Variant', salePrice: 1, costPrice: 1 }],
      },
      companyId,
      userId,
    );
    await expect(dup).rejects.toThrow(/already exists/);
    const dupInternal = productService.create(
      {
        name: 'E2E Dup2',
        sku: `E2E-DUP2-${Date.now()}`,
        category: 'E2E',
        salePrice: 1,
        costPrice: 1,
        warehouseId: wh1,
        variants: [
          { sku: `E2E-X-${Date.now()}`, name: 'X1', salePrice: 1, costPrice: 1 },
          { sku: `E2E-X-${Date.now()}`, name: 'X2', salePrice: 1, costPrice: 1 },
        ],
      },
      companyId,
      userId,
    );
    await expect(dupInternal).rejects.toThrow(/Duplicate variant SKUs/);
    log('STEP6: duplicate SKUs (db + in-request) rejected');
  });

  test('STEP 7: variant edit ops - add, stock save (ledgered), delete, soft-delete with sales', async () => {
    const parent = await productService.create(
      {
        name: 'E2E Variant Edit Parent',
        sku: `E2E-VEP-${Date.now()}`,
        category: 'E2E',
        salePrice: 20,
        costPrice: 10,
        stock: 0,
        warehouseId: wh1,
        hasVariants: true,
        variants: [
          { sku: `E2E-VE1-${Date.now()}`, name: 'Edit Var 1', salePrice: 20, costPrice: 10, stock: 10 },
          { sku: `E2E-VE2-${Date.now()}`, name: 'Edit Var 2', salePrice: 20, costPrice: 10, stock: 10 },
          { sku: `E2E-VE3-${Date.now()}`, name: 'Edit Var 3', salePrice: 20, costPrice: 10, stock: 10 },
        ],
      },
      companyId,
      userId,
    );
    const parentId = (parent as any).id;
    productIds.push(parentId);
    let variants = await productService.getVariants(parentId, companyId);
    const vIds = (variants as any[]).map((v) => v.id);
    productIds.push(...vIds);
    log('STEP7: parent + 3 variants x10');

    // Add a 5th variant the way the UI does (createProduct with parentId)
    const added = await productService.create(
      {
        name: 'Edit Var 4',
        sku: `E2E-VE4-${Date.now()}`,
        category: 'E2E',
        salePrice: 21,
        costPrice: 11,
        stock: 5,
        warehouseId: wh1,
        parentId,
        status: 'ACTIVE',
      },
      companyId,
      userId,
    );
    const v4Id = (added as any).id;
    productIds.push(v4Id);
    variants = await productService.getVariants(parentId, companyId);
    expect(variants.length).toBe(4);
    const v4Ledger = await ledger(v4Id, wh1);
    expect(v4Ledger.map((r) => r.type)).toEqual(['INITIAL']);
    expect(v4Ledger[0].quantity).toBe(5);
    expect(await inventoryTable(v4Id, wh1)).toBe(5);
    log('STEP7: added 4th variant -> INITIAL +5 bal 5');

    // Stock edit via StockService-backed endpoint (what VariantManager save uses)
    await productService.updateStock(v4Id, 3, 'add', companyId, wh1);
    expect(await inventoryTable(v4Id, wh1)).toBe(8);
    const v4LedgerAfter = await ledger(v4Id, wh1);
    expect(v4LedgerAfter.map((r) => r.type)).toEqual(['INITIAL', 'ADJUSTMENT']);
    expect(v4LedgerAfter[1].quantity).toBe(3);
    expect(v4LedgerAfter[1].balance).toBe(8);
    log('STEP7: stock edit +3 -> 8; ledger [INITIAL +5 bal5, ADJUSTMENT +3 bal8]');

    // Hard delete a variant with NO sale history
    const v3Id = (variants as any[])[2].id;
    const del = await productService.remove(v3Id, companyId);
    expect(del).toEqual({ softDeleted: false });
    variants = await productService.getVariants(parentId, companyId);
    expect(variants.length).toBe(3);
    expect(await prisma.inventory.count({ where: { productId: v3Id } })).toBe(0);
    expect(await prisma.stockLedger.count({ where: { productId: v3Id } })).toBe(0);
    log('STEP7: hard-deleted variant w/o sales; children=3');

    // Soft-delete a variant WITH sale history
    const v1Id = (variants as any[])[0].id;
    await salesService.create(
      {
        customer: { name: 'E2E Customer' },
        warehouseId: wh1,
        saleDate: nowIso(),
        dueDate: nowIso(),
        status: 'COMPLETED',
        paymentStatus: 'PAID',
        items: [{ productId: v1Id, quantity: 1, unitPrice: 20 }],
      },
      userId,
      companyId,
    );
    const softDel = await productService.remove(v1Id, companyId);
    expect(softDel).toEqual({ softDeleted: true });
    const stored = await prisma.product.findUnique({
      where: { id: v1Id },
      select: { status: true },
    });
    expect(stored?.status).toBe('DISCONTINUED');
    expect(await inventoryTable(v1Id, wh1)).toBe(9);
    variants = await productService.getVariants(parentId, companyId);
    expect(variants.some((v: any) => v.id === v1Id && v.status === 'DISCONTINUED')).toBe(true);
    log('STEP7: soft-deleted variant with sales -> DISCONTINUED, stock kept at 9');
  });

  test('STEP 8: sell one variant - only that variant decrements, surfaces agree', async () => {
    const parent = await productService.create(
      {
        name: 'E2E Variant Sale Parent',
        sku: `E2E-VSP-${Date.now()}`,
        category: 'E2E',
        salePrice: 15,
        costPrice: 7,
        stock: 0,
        warehouseId: wh1,
        hasVariants: true,
        variants: [
          { sku: `E2E-VS1-${Date.now()}`, name: 'Sale Var 1', salePrice: 15, costPrice: 7, stock: 10 },
          { sku: `E2E-VS2-${Date.now()}`, name: 'Sale Var 2', salePrice: 15, costPrice: 7, stock: 10 },
          { sku: `E2E-VS3-${Date.now()}`, name: 'Sale Var 3', salePrice: 15, costPrice: 7, stock: 10 },
        ],
      },
      companyId,
      userId,
    );
    const parentId = (parent as any).id;
    productIds.push(parentId);
    const variants = await productService.getVariants(parentId, companyId);
    const [v1, v2, v3] = variants as any[];
    productIds.push(v1.id, v2.id, v3.id);

    await salesService.create(
      {
        customer: { name: 'E2E Customer' },
        warehouseId: wh1,
        saleDate: nowIso(),
        dueDate: nowIso(),
        status: 'COMPLETED',
        paymentStatus: 'PAID',
        items: [{ productId: v2.id, quantity: 1, unitPrice: 15 }],
      },
      userId,
      companyId,
    );

    expect(await inventoryTable(v2.id, wh1)).toBe(9);
    expect(await inventoryTable(v1.id, wh1)).toBe(10);
    expect(await inventoryTable(v3.id, wh1)).toBe(10);
    expect((await productsTable((parent as any).sku)).stock).toBe(29);
    const v2Rows = await ledger(v2.id, wh1);
    expect(v2Rows.map((r) => r.type)).toEqual(['INITIAL', 'SALE']);
    expect(v2Rows[1].quantity).toBe(-1);
    expect(v2Rows[1].balance).toBe(9);
    const v1Rows = await ledger(v1.id, wh1);
    expect(v1Rows.length).toBe(1);
    log('STEP8: sold 1 of v2 -> v2=9 (SALE -1 bal 9), siblings untouched at 10');
  });

  test('STEP 9: multi-item cart - plain + variant + combo in one transaction', async () => {
    const plain = await productService.create(
      {
        name: 'E2E Cart Plain',
        sku: `E2E-CP-${Date.now()}`,
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
    const plainId = (plain as any).id;
    productIds.push(plainId);

    const c1 = await productService.create(
      {
        name: 'E2E Cart C1',
        sku: `E2E-CC1-${Date.now()}`,
        category: 'E2E',
        salePrice: 2,
        costPrice: 1,
        stock: 10,
        warehouseId: wh1,
        type: 'STANDARD',
      },
      companyId,
      userId,
    );
    const c2 = await productService.create(
      {
        name: 'E2E Cart C2',
        sku: `E2E-CC2-${Date.now()}`,
        category: 'E2E',
        salePrice: 3,
        costPrice: 1,
        stock: 10,
        warehouseId: wh1,
        type: 'STANDARD',
      },
      companyId,
      userId,
    );
    const c1Id = (c1 as any).id;
    const c2Id = (c2 as any).id;
    productIds.push(c1Id, c2Id);

    const combo = await productService.create(
      {
        name: 'E2E Cart Combo',
        sku: `E2E-CCOMBO-${Date.now()}`,
        category: 'E2E',
        salePrice: 4,
        costPrice: 2,
        stock: 0,
        warehouseId: wh1,
        type: 'COMBO',
        comboItems: [
          { productId: c1Id, quantity: 1 },
          { productId: c2Id, quantity: 1 },
        ],
      },
      companyId,
      userId,
    );
    const comboId = (combo as any).id;
    productIds.push(comboId);

    const parent = await productService.create(
      {
        name: 'E2E Cart Variant Parent',
        sku: `E2E-CVP-${Date.now()}`,
        category: 'E2E',
        salePrice: 8,
        costPrice: 4,
        stock: 0,
        warehouseId: wh1,
        hasVariants: true,
        variants: [
          { sku: `E2E-CV1-${Date.now()}`, name: 'Cart Var 1', salePrice: 8, costPrice: 4, stock: 8 },
        ],
      },
      companyId,
      userId,
    );
    const parentId = (parent as any).id;
    productIds.push(parentId);
    const variants = await productService.getVariants(parentId, companyId);
    const variantId = (variants as any[])[0].id;
    productIds.push(variantId);
    log('STEP9: plain=10, variant=8, combo (1xC1 +1xC2) C1=10 C2=10');

    await salesService.create(
      {
        customer: { name: 'E2E Customer' },
        warehouseId: wh1,
        saleDate: nowIso(),
        dueDate: nowIso(),
        status: 'COMPLETED',
        paymentStatus: 'PAID',
        items: [
          { productId: plainId, quantity: 2, unitPrice: 5 },
          { productId: variantId, quantity: 1, unitPrice: 8 },
          { productId: comboId, quantity: 1, unitPrice: 4 },
        ],
      },
      userId,
      companyId,
    );

    expect(await inventoryTable(plainId, wh1)).toBe(8);
    expect(await inventoryTable(variantId, wh1)).toBe(7);
    expect(await inventoryTable(c1Id, wh1)).toBe(9);
    expect(await inventoryTable(c2Id, wh1)).toBe(9);
    expect(await comboAvailability(comboId, wh1)).toBe(9);

    const plainLedger = await ledger(plainId, wh1);
    const variantLedger = await ledger(variantId, wh1);
    const c1Ledger = await ledger(c1Id, wh1);
    expect(plainLedger.filter((r) => r.type === 'SALE')[0].quantity).toBe(-2);
    expect(variantLedger.filter((r) => r.type === 'SALE')[0].quantity).toBe(-1);
    expect(c1Ledger.filter((r) => r.type === 'SALE')[0].quantity).toBe(-1);
    log('STEP9: one tx -> plain=8 (SALE -2), variant=7 (SALE -1), C1=9 C2=9, combo avail 9');
  });
});
