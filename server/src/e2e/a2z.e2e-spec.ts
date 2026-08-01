import 'dotenv/config';
import { createCache } from 'cache-manager';
import type { Cache } from 'cache-manager';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { OrderStatus, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../cache/cache.service';
import { StockService } from '../inventory/stock.service';
import { AuditLogService } from '../audit-logs/audit-logs.service';
import { SettingsService } from '../settings/settings.service';
import { ProductService } from '../products/product.service';
import { SalesService } from '../sales/sales.service';
import { PurchasesService } from '../purchases/purchases.service';
import { InventoryService } from '../inventory/inventory.service';
import { CustomersService } from '../customers/customers.service';
import { SuppliersService } from '../suppliers/suppliers.service';
import { QuotationsService } from '../quotations/quotations.service';
import { DeliveriesService } from '../deliveries/deliveries.service';
import { ExpensesService } from '../expenses/expenses.service';
import { ExpenseCategoriesService } from '../expense-categories/expense-categories.service';
import { WarehousesService } from '../warehouses/warehouses.service';
import { ProductCategoriesService } from '../product-categories/product-categories.service';
import { TeamService } from '../team/team.service';
import { DashboardService } from '../dashboard/dashboard.service';
import { SuperadminService } from '../superadmin/superadmin.service';
import { EmailService } from '../email/email.service';

// better-auth/crypto pulls pure-ESM @noble/ciphers which jest (CJS) cannot parse.
// Stub only the crypto helpers; the real team role/permission logic still runs.
jest.mock('better-auth/crypto', () => ({
  hashPassword: async (password: string) => `hashed:${password}`,
  verifyPassword: async () => true,
}));

jest.setTimeout(300_000);
jest.retryTimes(1);

// Cap this suite's Prisma client at 3 connections: Supabase's session-mode
// pooler (DIRECT_URL :5432) allows 15 clients TOTAL (shared with the dev
// server's own pool). With 22 parallel dashboard queries, an uncapped client
// opens more connections than the pooler permits -> EMAXCONNSESSION. Prisma
// queues excess queries client-side instead, which is exactly what we want.
if (process.env.DIRECT_URL && !process.env.DIRECT_URL.includes('connection_limit')) {
  const u = new URL(process.env.DIRECT_URL);
  u.searchParams.set('connection_limit', '3');
  process.env.DIRECT_URL = u.toString();
}

const log = (msg: string) => console.log(`[A2Z] ${msg}`);
const nowIso = () => new Date().toISOString();
const uniq = (p: string) => `${p}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

describe('A2Z multi-module flow on live DB', () => {
  const prisma = new PrismaService();
  const cacheManager: Cache = createCache({ ttl: 300_000 });
  const cache = new CacheService(cacheManager);
  const stockService = new StockService(prisma, cache);
  const auditLogs = new AuditLogService(prisma, cache);
  const settingsService = new SettingsService(prisma, cache);
  const productService = new ProductService(prisma, cache, stockService, settingsService);
  const salesService = new SalesService(prisma, cache, auditLogs, stockService);
  const purchasesService = new PurchasesService(prisma, auditLogs, cache, stockService);
  const inventoryService = new InventoryService(prisma, cache, stockService, settingsService);
  const customersService = new CustomersService(prisma, cache);
  const suppliersService = new SuppliersService(prisma, cache);
  const mailerStub = { sendMail: async () => undefined } as any;
  const emailService = new EmailService(mailerStub);
  const quotationsService = new QuotationsService(prisma, cache, salesService);
  const deliveriesService = new DeliveriesService(prisma, cache);
  const expensesService = new ExpensesService(prisma, cache);
  const expenseCategoriesService = new ExpenseCategoriesService(prisma, cache);
  const warehousesService = new WarehousesService(prisma, cache);
  const productCategoriesService = new ProductCategoriesService(prisma, cache);
  const teamService = new TeamService(prisma, emailService, cache);
  const dashboardService = new DashboardService(prisma, cache, settingsService);
  const superadminService = new SuperadminService(prisma, cache);

  let companyA: string;
  let companyB: string;
  let ownerA: string;
  let adminA: string;
  let managerA: string;
  let userB: string;
  let whA1: string;
  let whB1: string;

  let customerId: string;
  let supplierId: string;
  let lowProduct: string;
  let reorderProduct: string;
  let safeProduct: string;

  beforeAll(async () => {
    await prisma.$connect();

    const makeCompany = async (tag: string) => {
      const c = await prisma.company.create({
        data: {
          name: `E2E A2Z ${tag} ${Date.now()}`,
          workspaceUrl: `e2e-a2z-${tag}-${Date.now()}`,
        },
      });
      const u = await prisma.user.create({
        data: {
          email: `e2e-${tag}-${Date.now()}@test.local`,
          password: 'e2e-password',
          name: `E2E ${tag}`,
          companyId: c.id,
          role: tag === 'A' ? UserRole.OWNER : UserRole.ADMIN,
        },
      });
      return { c, u };
    };

    const a = await makeCompany('A');
    const b = await makeCompany('B');
    companyA = a.c.id;
    ownerA = a.u.id;
    companyB = b.c.id;
    userB = b.u.id;

    const whA = await warehousesService.create(
      { name: uniq('E2E-A-WH1'), location: 'E2E Loc' },
      companyA,
    );
    const whB = await warehousesService.create(
      { name: uniq('E2E-B-WH1'), location: 'E2E Loc' },
      companyB,
    );
    whA1 = (whA as any).id;
    whB1 = (whB as any).id;

    adminA = (
      await teamService.createUser(
        { email: `e2e-admin-${Date.now()}@test.local`, name: 'E2E Admin', role: UserRole.ADMIN },
        companyA,
        UserRole.OWNER,
        ownerA,
      )
    ).id;
    managerA = (
      await teamService.createUser(
        { email: `e2e-mgr-${Date.now()}@test.local`, name: 'E2E Manager', role: UserRole.MANAGER },
        companyA,
        UserRole.OWNER,
        ownerA,
      )
    ).id;

    log(`setup: A=${companyA} B=${companyB} whA1=${whA1} owner=${ownerA} admin=${adminA} manager=${managerA}`);
  });

  test('STEP 1: auth & roles - role gates on team ops', async () => {
    // MANAGER cannot create users
    await expect(
      teamService.createUser(
        { email: `e2e-nope-${Date.now()}@test.local`, name: 'No', role: UserRole.MANAGER },
        companyA,
        UserRole.MANAGER,
        managerA,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    // ADMIN cannot create ADMIN users (only owner)
    await expect(
      teamService.createUser(
        { email: `e2e-x-${Date.now()}@test.local`, name: 'X', role: UserRole.ADMIN },
        companyA,
        UserRole.ADMIN,
        adminA,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    // ADMIN can create MANAGER
    const m2 = await teamService.createUser(
      { email: `e2e-m2-${Date.now()}@test.local`, name: 'E2E M2', role: UserRole.MANAGER },
      companyA,
      UserRole.ADMIN,
      adminA,
    );
    expect(m2.role).toBe(UserRole.MANAGER);

    // Only owner can promote to ADMIN
    await expect(
      teamService.updateUser(
        m2.id,
        { role: UserRole.ADMIN },
        companyA,
        UserRole.ADMIN,
        adminA,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    const promoted = await teamService.updateUser(
      m2.id,
      { role: UserRole.ADMIN },
      companyA,
      UserRole.OWNER,
      ownerA,
    );
    expect(promoted.role).toBe(UserRole.ADMIN);

    // Duplicate email rejected
    await expect(
      teamService.createUser(
        { email: m2.email, name: 'Dup', role: UserRole.MANAGER },
        companyA,
        UserRole.OWNER,
        ownerA,
      ),
    ).rejects.toBeInstanceOf(ConflictException);

    // Cross-company: user B cannot be found/updated by A
    await expect(
      teamService.findOne(userB, companyA),
    ).rejects.toBeInstanceOf(NotFoundException);

    const stats = await teamService.getStats(companyA);
    expect(stats.totalUsers).toBeGreaterThanOrEqual(5);
    log(`STEP1: role gates ok; team totalUsers=${stats.totalUsers}`);
  });

  test('STEP 2: tenancy isolation - no cross-company leakage', async () => {
    const skuA = uniq('E2E-A-SKU');
    const skuB = uniq('E2E-B-SKU');
    const pA = await productService.create(
      {
        name: 'E2E A Product',
        sku: skuA,
        category: 'E2E',
        reorderLevel: 0,
        salePrice: 10,
        costPrice: 5,
        stock: 50,
        warehouseId: whA1,
        type: 'STANDARD',
      },
      companyA,
      ownerA,
    );
    const pB = await productService.create(
      {
        name: 'E2E B Product',
        sku: skuB,
        category: 'E2E',
        reorderLevel: 0,
        salePrice: 10,
        costPrice: 5,
        stock: 50,
        warehouseId: whB1,
        type: 'STANDARD',
      },
      companyB,
      userB,
    );

    const listA = await productService.findAll(companyA, 1, 200, 'E2E-A-SKU');
    expect(listA.products.some((p: any) => p.sku === skuA)).toBe(true);
    const listB = await productService.findAll(companyB, 1, 200, skuA);
    expect(listB.products.some((p: any) => p.sku === skuA)).toBe(false);

    await expect(
      productService.findOne((pA as any).id, companyB),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      productService.findBySku(skuA, companyB),
    ).rejects.toBeInstanceOf(NotFoundException);

    const whByB = warehousesService.findOne((whA1 as string), companyB);
    await expect(whByB).rejects.toBeInstanceOf(NotFoundException);

    const custB = await customersService.create(
      { name: 'E2E B Customer', email: uniq('e2e-b-cust@test.local') },
      companyB,
    );
    const custListA = await customersService.findAll(companyA);
    expect(
      (custListA as unknown as { customers: any[] }).customers.some(
        (c: any) => c.email === (custB as any).email,
      ),
    ).toBe(false);
    log('STEP2: product/warehouse/customer isolation verified both directions');
  });

  test('STEP 3: catalog + settings-driven low stock', async () => {
    await productCategoriesService.create(
      { name: uniq('E2E-Cat') },
      companyA,
    );

    lowProduct = (await productService.create(
      {
        name: 'E2E Low',
        sku: uniq('E2E-LOW'),
        category: 'E2E',
        reorderLevel: 0,
        salePrice: 10,
        costPrice: 5,
        stock: 10,
        warehouseId: whA1,
        type: 'STANDARD',
      },
      companyA,
      ownerA,
    ) as any).id;
    reorderProduct = (await productService.create(
      {
        name: 'E2E Reorder',
        sku: uniq('E2E-RED'),
        category: 'E2E',
        reorderLevel: 20,
        salePrice: 10,
        costPrice: 5,
        stock: 10,
        warehouseId: whA1,
        type: 'STANDARD',
      },
      companyA,
      ownerA,
    ) as any).id;
    safeProduct = (await productService.create(
      {
        name: 'E2E Safe',
        sku: uniq('E2E-SAFE'),
        category: 'E2E',
        reorderLevel: 0,
        salePrice: 10,
        costPrice: 5,
        stock: 50,
        warehouseId: whA1,
        type: 'STANDARD',
      },
      companyA,
      ownerA,
    ) as any).id;

    // Fallback threshold: company settings at 15 => lowProduct(10) + reorderProduct(20>10) flagged, safeProduct not
    await settingsService.update(companyA, { lowStockThreshold: 15 });
    const low15 = await productService.getLowStockProducts(companyA);
    const low15Skus = low15.map((p: any) => p.sku);
    expect(low15Skus.some((s: string) => s.includes('E2E-LOW'))).toBe(true);
    expect(low15Skus.some((s: string) => s.includes('E2E-RED'))).toBe(true);
    expect(low15Skus.some((s: string) => s.includes('E2E-SAFE'))).toBe(false);

    // Threshold 5 => lowProduct (10) no longer flagged; per-product reorderLevel still applies
    await settingsService.update(companyA, { lowStockThreshold: 5 });
    const low5 = await productService.getLowStockProducts(companyA);
    const low5Skus = low5.map((p: any) => p.sku);
    expect(low5Skus.some((s: string) => s.includes('E2E-LOW'))).toBe(false);
    expect(low5Skus.some((s: string) => s.includes('E2E-RED'))).toBe(true);

    await settingsService.update(companyA, { lowStockThreshold: 10 });
    const stats = await productService.getDashboardStats(companyA);
    const low10 = await productService.getLowStockProducts(companyA);
    expect((stats as any).lowStockCount).toBe(low10.length);

    // Update + findBySku round trip
    await productService.update(
      lowProduct,
      { salePrice: 12.5, name: 'E2E Low Renamed' },
      companyA,
    );
    const found = await productService.findBySku((await productService.findOne(lowProduct, companyA)).sku, companyA);
    expect(found.salePrice).toBe(12.5);
    expect(found.name).toBe('E2E Low Renamed');
    log(`STEP3: low stock fallback logic verified (threshold 15/5/10); lowStockCount=${(stats as any).lowStockCount}`);
  });

  test('STEP 4: people - customers & suppliers', async () => {
    const email = uniq('e2e-cust@test.local');
    const c1 = await customersService.create({ name: 'E2E Customer 1', email }, companyA);
    customerId = (c1 as any).id;

    await expect(
      customersService.create({ name: 'E2E Duplicate', email }, companyA),
    ).rejects.toBeInstanceOf(ConflictException);

    const s1 = await suppliersService.create(
      { name: 'E2E Supplier 1', email: uniq('e2e-sup@test.local') },
      companyA,
    );
    supplierId = (s1 as any).id;
    await expect(
      suppliersService.create(
        { name: 'E2E Sup Dup', email: (s1 as any).email },
        companyA,
      ),
    ).rejects.toBeInstanceOf(ConflictException);

    const customers = await customersService.findAll(companyA);
    expect((customers as unknown as { customers: any[] }).customers.some((c: any) => c.id === customerId)).toBe(true);
    log(`STEP4: customer+supplier CRUD + duplicate guards ok (customers=${(customers as unknown as { total: number }).total})`);
  });

  test('STEP 5: PO lifecycle - receive books stock AND auto-creates expense', async () => {
    const po = await purchasesService.create(
      {
        supplierId,
        orderDate: nowIso(),
        warehouseId: whA1,
        items: [
          { productId: lowProduct, quantity: 20, unitCost: 5 },
          { productId: safeProduct, quantity: 10, unitCost: 6 },
        ],
      },
      ownerA,
      companyA,
    );
    expect(po.status).toBe(OrderStatus.PENDING);

    const received = await purchasesService.receive((po as any).id, whA1, ownerA, companyA);
    expect(received.status).toBe(OrderStatus.COMPLETED);

    // Stock surfaced
    const inv = await inventoryService.getInventory(companyA, {
      page: 1,
      limit: 200,
      search: undefined,
      warehouseId: whA1,
      filter: 'all',
    });
    const lowRow = (inv as any).inventory.find((i: any) => i.productId === lowProduct);
    expect(lowRow.quantity).toBe(30);

    // REGRESSION: auto-expense must exist with the PO creator's userId
    const expenses = await prisma.expense.findMany({
      where: { purchaseOrderId: (po as any).id },
    });
    expect(expenses.length).toBe(1);
    expect(expenses[0].userId).toBe(ownerA);
    expect(Number(expenses[0].amount)).toBeCloseTo(160, 2);

    // Duplicate receive rejected
    await expect(
      purchasesService.receive((po as any).id, whA1, ownerA, companyA),
    ).rejects.toBeInstanceOf(BadRequestException);
    log(`STEP5: PO ${(po as any).referenceNumber} received; expense id=${expenses[0].id} amount=${Number(expenses[0].amount)} userId=${expenses[0].userId}`);
  });

  test('STEP 6: quotation -> accepted -> sale -> delivery dispatch/complete', async () => {
    const quote = await quotationsService.create(
      {
        customerId,
        quoteDate: nowIso(),
        items: [{ productId: safeProduct, quantity: 5, unitPrice: 30 }],
      },
      ownerA,
      companyA,
    );
    expect((quote as any).status).toBe(OrderStatus.PENDING);

    await quotationsService.updateStatus(
      (quote as any).id,
      { status: OrderStatus.COMPLETED },
      companyA,
    );

    // Stock before the sale: 50 initial + 10 from STEP5's PO = 60
    const before = await prisma.inventory.findUnique({
      where: {
        productId_warehouseId: { productId: safeProduct, warehouseId: whA1 },
      },
    });
    expect(before!.quantity).toBe(60);

    const converted = await quotationsService.convertToSale(
      (quote as any).id,
      ownerA,
      companyA,
      whA1,
    );
    // convertToSale returns { sale, quotation, message } - resolve the sale
    // row from the DB via sourceQuotationId rather than trusting the shape.
    const saleRow = await prisma.sale.findFirst({
      where: { sourceQuotationId: (quote as any).id, companyId: companyA },
    });
    expect(saleRow).not.toBeNull();
    expect(saleRow!.status).toBe(OrderStatus.COMPLETED);
    expect(saleRow!.customerId).toBe(customerId);
    expect(saleRow!.sourceQuotationId).toBe((quote as any).id);
    expect((converted as any).sale?.id).toBe(saleRow!.id);

    // Stock decremented by the sale; read the DB row directly - getInventory
    // serves the same cache key STEP5 already read, so it is stale here.
    const safeRow = await prisma.inventory.findUnique({
      where: {
        productId_warehouseId: { productId: safeProduct, warehouseId: whA1 },
      },
    });
    expect(safeRow!.quantity).toBe(55);

    // Duplicate conversion rejected
    await expect(
      quotationsService.convertToSale((quote as any).id, ownerA, companyA, whA1),
    ).rejects.toBeInstanceOf(BadRequestException);

    // Delivery auto-created with the sale, then dispatch + complete
    const delivery = await prisma.delivery.findFirst({ where: { saleId: saleRow!.id, companyId: companyA } });
    expect(delivery).not.toBeNull();
    const d1 = await deliveriesService.dispatch(delivery!.id, companyA, { trackingNumber: 'TRK-E2E-1' });
    expect((d1 as any).status).toBe('IN_TRANSIT');
    const d2 = await deliveriesService.complete(delivery!.id, companyA);
    expect((d2 as any).status).toBe('DELIVERED');

    const all = await deliveriesService.findAll(companyA);
    expect((all as any[]).length).toBeGreaterThanOrEqual(1);
    log(`STEP6: quote->sale->delivery chain ok (delivery ${delivery!.id})`);
  });

  test('STEP 7: expenses module + dashboard aggregates', async () => {
    const cat = await expenseCategoriesService.create(companyA, { name: uniq('E2E Ops') });
    const exp = await expensesService.create(
      {
        reference: uniq('EXP-'),
        amount: 123.45,
        expenseDate: nowIso(),
        vendor: 'E2E Vendor',
        categoryId: (cat as any).id,
      },
      ownerA,
      companyA,
    );
    expect((exp as any).companyId).toBe(companyA);

    const dash = await dashboardService.getData(companyA);
    // PO expense 160 + manual 123.45 (returns Decimal-based numbers)
    expect(dash.totalExpenses).toBeGreaterThanOrEqual(283);
    expect(dash.totalPurchaseAmount).toBeGreaterThanOrEqual(160);
    expect(dash.totalSalesAmount).toBeGreaterThanOrEqual(150);
    expect(dash.suppliersCount).toBeGreaterThanOrEqual(1);
    expect(dash.customersCount).toBeGreaterThanOrEqual(1);

    // Cross-check dashboard against raw aggregates
    const [expSum, saleSum] = await Promise.all([
      prisma.expense.aggregate({ where: { companyId: companyA }, _sum: { amount: true } }),
      prisma.sale.aggregate({ where: { companyId: companyA }, _sum: { totalAmount: true } }),
    ]);
    expect(Math.abs(dash.totalExpenses - Number(expSum._sum.amount!))).toBeLessThan(0.01);
    expect(Math.abs(dash.totalSalesAmount - Number(saleSum._sum.totalAmount!))).toBeLessThan(0.01);
    log(`STEP7: expenses=${dash.totalExpenses} purchases=${dash.totalPurchaseAmount} sales=${dash.totalSalesAmount} match raw sums`);
  });

  test('STEP 8: audit trail - actions logged, scoped per company', async () => {
    const logs = await prisma.auditLog.findMany({
      where: { companyId: companyA },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    expect(logs.length).toBeGreaterThan(0);
    // NOTE: product create/update/delete is NOT audited (audit gap, see
    // product.service.ts - no AuditLogService usage). Assert the actions
    // that ARE logged: PO receive + sale create.
    expect(logs.some((l) => l.action === 'RECEIVE' && l.entity === 'Purchase')).toBe(true);
    expect(logs.some((l) => l.action === 'CREATE' && l.entity === 'Sale')).toBe(true);
    log('STEP8: product-creation audit missing (GAP), but RECEIVE/CREATE Sale rows present');

    // No B rows leaked into A, and B has its own scoped rows
    const bLogs = await prisma.auditLog.findMany({ where: { companyId: companyB } });
    for (const row of bLogs) {
      expect(row.companyId).toBe(companyB);
      expect(JSON.stringify(row.details)).not.toContain('E2E-A-SKU');
    }
    log(`STEP8: audit rows A=${logs.length} B=${bLogs.length}, scoping verified`);
  });

  test('STEP 9: superadmin dashboard - per-company numbers', async () => {
    // Company B is intentionally quiet; give it one customer so its
    // dashboard reflects real (small) numbers instead of empty zeros.
    await customersService.create(
      { name: 'E2E B Customer 2', email: uniq('e2e-b-cust2@test.local') },
      companyB,
    );

    const dashA = await superadminService.getDashboard(companyA);
    expect(dashA.totalCompanies).toBeGreaterThanOrEqual(1);
    expect(dashA.totalSubscribers).toBeGreaterThanOrEqual(4);
    expect(dashA.totalEarnings).toBeGreaterThanOrEqual(150);
    expect(dashA.revenueAmount).toBeGreaterThanOrEqual(283);

    const dashB = await superadminService.getDashboard(companyB);
    expect(dashB.totalCompanies).toBeGreaterThanOrEqual(1);
    expect(dashB.totalEarnings).toBe(0);
    expect(dashB.revenueAmount).toBe(0);
    log(`STEP9: superadmin A(earnings=${dashA.totalEarnings}, rev=${dashA.revenueAmount}) B(earnings=${dashB.totalEarnings}) isolated`);
  });

  afterAll(async () => {
    for (const cid of [companyA, companyB]) {
      try {
        await prisma.companySettings.deleteMany({ where: { companyId: cid } });
        await prisma.auditLog.deleteMany({ where: { companyId: cid } });
        await prisma.expense.deleteMany({ where: { companyId: cid } });
        await prisma.expenseCategory.deleteMany({ where: { companyId: cid } });
        await prisma.delivery.deleteMany({ where: { companyId: cid } });
        await prisma.quotation.deleteMany({ where: { companyId: cid } });
        await prisma.salesReturn.deleteMany({ where: { companyId: cid } });
        await prisma.purchaseReturn.deleteMany({ where: { companyId: cid } });
        await prisma.sale.deleteMany({ where: { companyId: cid } });
        await prisma.purchaseOrder.deleteMany({ where: { companyId: cid } });
        await prisma.stockAdjustment.deleteMany({ where: { companyId: cid } });
        const pids = await prisma.product.findMany({
          where: { companyId: cid },
          select: { id: true },
        });
        await prisma.stockLedger.deleteMany({
          where: { productId: { in: pids.map((p) => p.id) } },
        });
        await prisma.inventory.deleteMany({
          where: { productId: { in: pids.map((p) => p.id) } },
        });
        // ComboItem has no companyId - scope via the company's product ids
        // (covers both component side and combo side)
        await prisma.comboItem.deleteMany({
          where: {
            OR: [
              { comboId: { in: pids.map((p) => p.id) } },
              { productId: { in: pids.map((p) => p.id) } },
            ],
          },
        });
        await prisma.product.deleteMany({ where: { companyId: cid } });
        await prisma.productCategory.deleteMany({ where: { companyId: cid } });
        await prisma.brand.deleteMany({ where: { companyId: cid } });
        await prisma.subCategory.deleteMany({ where: { companyId: cid } });
        await prisma.customer.deleteMany({ where: { companyId: cid } });
        await prisma.supplier.deleteMany({ where: { companyId: cid } });
        await prisma.warehouse.deleteMany({ where: { companyId: cid } });
        const uids = await prisma.user.findMany({
          where: { companyId: cid },
          select: { id: true },
        });
        await prisma.authToken.deleteMany({ where: { userId: { in: uids.map((u) => u.id) } } });
        await prisma.account.deleteMany({ where: { userId: { in: uids.map((u) => u.id) } } });
        await prisma.user.deleteMany({ where: { companyId: cid } });
        await prisma.company.delete({ where: { id: cid } });
      } catch (e: any) {
        console.warn(`[A2Z] cleanup partial for ${cid}: ${e.message}`);
      }
    }
    await prisma.$disconnect();
    log('cleanup: ok');
  });
});
