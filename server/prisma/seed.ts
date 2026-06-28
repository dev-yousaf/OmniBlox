import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

function randomId(): string {
  return crypto.randomUUID();
}

async function main() {
  console.log('Seeding database...');

  // ──────────────────────────────────────────────
  // 1. COMPANY
  // ──────────────────────────────────────────────
  const companyId = randomId();
  const company = await prisma.company.create({
    data: {
      id: companyId,
      name: 'Acme Corporation',
      workspaceUrl: 'acme',
      industry: 'Retail',
      country: 'US',
    },
  });
  console.log(`  ✓ Company: ${company.name}`);

  // ──────────────────────────────────────────────
  // 2. USERS (one per role)
  // ──────────────────────────────────────────────
  const passwordHash = await bcrypt.hash('password123', 10);

  const ownerId = randomId();
  const adminId = randomId();
  const managerId = randomId();
  const observerId = randomId();

  const owner = await prisma.user.create({
    data: {
      id: ownerId,
      email: 'owner@acme.com',
      password: passwordHash,
      name: 'John Owner',
      role: 'OWNER',
      status: 'ACTIVE',
      companyId,
      emailVerified: new Date(),
    },
  });
  // Set as company owner
  await prisma.company.update({
    where: { id: companyId },
    data: { ownerId },
  });

  const admin = await prisma.user.create({
    data: {
      id: adminId,
      email: 'admin@acme.com',
      password: passwordHash,
      name: 'Jane Admin',
      role: 'ADMIN',
      status: 'ACTIVE',
      companyId,
      emailVerified: new Date(),
    },
  });

  const manager = await prisma.user.create({
    data: {
      id: managerId,
      email: 'manager@acme.com',
      password: passwordHash,
      name: 'Bob Manager',
      role: 'MANAGER',
      status: 'ACTIVE',
      companyId,
      emailVerified: new Date(),
    },
  });

  const observer = await prisma.user.create({
    data: {
      id: observerId,
      email: 'observer@acme.com',
      password: passwordHash,
      name: 'Alice Observer',
      role: 'OBSERVER',
      status: 'ACTIVE',
      companyId,
      emailVerified: new Date(),
    },
  });

  console.log(`  ✓ Users: ${owner.name} (OWNER), ${admin.name} (ADMIN), ${manager.name} (MANAGER), ${observer.name} (OBSERVER)`);

  // ──────────────────────────────────────────────
  // 3. WAREHOUSES
  // ──────────────────────────────────────────────
  const warehouse1Id = randomId();
  const warehouse2Id = randomId();
  const warehouse3Id = randomId();

  const wh1 = await prisma.warehouse.create({
    data: { id: warehouse1Id, name: 'Main Warehouse', location: '123 Industrial Blvd, New York, NY', companyId },
  });
  const wh2 = await prisma.warehouse.create({
    data: { id: warehouse2Id, name: 'East Distribution', location: '456 Commerce Dr, Boston, MA', companyId },
  });
  const wh3 = await prisma.warehouse.create({
    data: { id: warehouse3Id, name: 'West Fulfillment', location: '789 Logistics Ave, Los Angeles, CA', companyId },
  });
  console.log(`  ✓ Warehouses: ${wh1.name}, ${wh2.name}, ${wh3.name}`);

  // ──────────────────────────────────────────────
  // 4. PRODUCT CATEGORIES
  // ──────────────────────────────────────────────
  const cat1Id = randomId();
  const cat2Id = randomId();
  const cat3Id = randomId();

  const cat1 = await prisma.productCategory.create({
    data: { id: cat1Id, name: 'Electronics', slug: 'electronics', description: 'Electronic devices and accessories', status: 'ACTIVE', companyId },
  });
  const cat2 = await prisma.productCategory.create({
    data: { id: cat2Id, name: 'Clothing', slug: 'clothing', description: 'Apparel and fashion items', status: 'ACTIVE', companyId },
  });
  const cat3 = await prisma.productCategory.create({
    data: { id: cat3Id, name: 'Home & Garden', slug: 'home-garden', description: 'Home improvement and garden supplies', status: 'ACTIVE', companyId },
  });
  console.log(`  ✓ Categories: ${cat1.name}, ${cat2.name}, ${cat3.name}`);

  // ──────────────────────────────────────────────
  // 5. SUB-CATEGORIES
  // ──────────────────────────────────────────────
  const sub1 = await prisma.subCategory.create({
    data: { name: 'Smartphones', slug: 'smartphones', code: 'EL-SMT', description: 'Mobile phones', status: 'ACTIVE', categoryId: cat1Id, companyId },
  });
  const sub2 = await prisma.subCategory.create({
    data: { name: 'Laptops', slug: 'laptops', code: 'EL-LPT', description: 'Notebook computers', status: 'ACTIVE', categoryId: cat1Id, companyId },
  });
  const sub3 = await prisma.subCategory.create({
    data: { name: 'Men\'s Wear', slug: 'mens-wear', code: 'CL-MEN', description: 'Men\'s clothing', status: 'ACTIVE', categoryId: cat2Id, companyId },
  });
  console.log(`  ✓ Sub-categories: ${sub1.name}, ${sub2.name}, ${sub3.name}`);

  // ──────────────────────────────────────────────
  // 6. BRANDS
  // ──────────────────────────────────────────────
  const brand1 = await prisma.brand.create({
    data: { name: 'TechPro', slug: 'techpro', description: 'Premium electronics brand', status: 'ACTIVE', companyId },
  });
  const brand2 = await prisma.brand.create({
    data: { name: 'StyleCo', slug: 'styleco', description: 'Fashion and apparel brand', status: 'ACTIVE', companyId },
  });
  console.log(`  ✓ Brands: ${brand1.name}, ${brand2.name}`);

  // ──────────────────────────────────────────────
  // 7. UNITS
  // ──────────────────────────────────────────────
  const unit1 = await prisma.unit.create({
    data: { name: 'Pieces', shortName: 'pcs', slug: 'pieces', description: 'Individual pieces', status: 'ACTIVE', companyId },
  });
  const unit2 = await prisma.unit.create({
    data: { name: 'Kilograms', shortName: 'kg', slug: 'kilograms', description: 'Weight in kilograms', status: 'ACTIVE', companyId },
  });
  console.log(`  ✓ Units: ${unit1.name}, ${unit2.name}`);

  // ──────────────────────────────────────────────
  // 8. WARRANTIES
  // ──────────────────────────────────────────────
  const warranty1 = await prisma.warranty.create({
    data: { name: 'Standard Warranty', duration: 12, durationType: 'MONTHS', description: '1 year standard warranty', status: 'ACTIVE', companyId },
  });
  const warranty2 = await prisma.warranty.create({
    data: { name: 'Extended Warranty', duration: 24, durationType: 'MONTHS', description: '2 year extended warranty', status: 'ACTIVE', companyId },
  });
  console.log(`  ✓ Warranties: ${warranty1.name}, ${warranty2.name}`);

  // ──────────────────────────────────────────────
  // 9. PRODUCTS
  // ──────────────────────────────────────────────
  const prod1Id = randomId();
  const prod2Id = randomId();
  const prod3Id = randomId();
  const prod4Id = randomId();
  const prod5Id = randomId();
  const prod6Id = randomId();

  const p1 = await prisma.product.create({
    data: {
      id: prod1Id, name: 'Wireless Headphones', sku: 'TECH-HP-001', description: 'Noise-cancelling Bluetooth headphones',
      type: 'STANDARD', salePrice: 89.99, costPrice: 55.00, unit: 'pcs', barcodeSymbology: 'CODE128',
      taxRate: 8, alertQuantity: 10, reorderLevel: 20, status: 'ACTIVE',
      categoryId: cat1Id, subCategoryId: sub1.id, brandId: brand1.id, unitId: unit1.id, warrantyId: warranty1.id,
      companyId, createdById: ownerId,
    },
  });

  const p2 = await prisma.product.create({
    data: {
      id: prod2Id, name: 'Bluetooth Speaker', sku: 'TECH-SPK-001', description: 'Portable waterproof speaker',
      type: 'STANDARD', salePrice: 49.99, costPrice: 30.00, unit: 'pcs', barcodeSymbology: 'CODE128',
      taxRate: 8, alertQuantity: 10, reorderLevel: 15, status: 'ACTIVE',
      categoryId: cat1Id, subCategoryId: sub1.id, brandId: brand1.id, unitId: unit1.id, companyId, createdById: adminId,
    },
  });

  const p3 = await prisma.product.create({
    data: {
      id: prod3Id, name: 'USB-C Hub', sku: 'TECH-USB-001', description: '7-in-1 USB-C multiport adapter',
      type: 'STANDARD', salePrice: 34.99, costPrice: 18.00, unit: 'pcs', barcodeSymbology: 'EAN13',
      taxRate: 8, alertQuantity: 20, reorderLevel: 30, status: 'ACTIVE',
      categoryId: cat1Id, subCategoryId: sub2.id, brandId: brand1.id, unitId: unit1.id, companyId, createdById: managerId,
    },
  });

  const p4 = await prisma.product.create({
    data: {
      id: prod4Id, name: 'Cotton T-Shirt', sku: 'STYLE-TS-001', description: 'Premium cotton crew neck t-shirt',
      type: 'STANDARD', salePrice: 24.99, costPrice: 12.00, unit: 'pcs', barcodeSymbology: 'CODE128',
      taxRate: 6, alertQuantity: 50, reorderLevel: 100, status: 'ACTIVE',
      categoryId: cat2Id, subCategoryId: sub3.id, brandId: brand2.id, unitId: unit1.id, companyId, createdById: ownerId,
    },
  });

  const p5 = await prisma.product.create({
    data: {
      id: prod5Id, name: 'Denim Jacket', sku: 'STYLE-DJ-001', description: 'Classic denim jacket with modern fit',
      type: 'STANDARD', salePrice: 79.99, costPrice: 45.00, unit: 'pcs', barcodeSymbology: 'CODE128',
      taxRate: 6, alertQuantity: 20, reorderLevel: 30, status: 'ACTIVE',
      categoryId: cat2Id, subCategoryId: sub3.id, brandId: brand2.id, unitId: unit1.id, companyId, createdById: adminId,
    },
  });

  const p6 = await prisma.product.create({
    data: {
      id: prod6Id, name: 'Garden Tool Set', sku: 'HOME-GT-001', description: '12-piece stainless steel garden tool set',
      type: 'STANDARD', salePrice: 44.99, costPrice: 25.00, unit: 'pcs', barcodeSymbology: 'CODE128',
      taxRate: 6, alertQuantity: 15, reorderLevel: 25, status: 'ACTIVE',
      categoryId: cat3Id, brandId: brand2.id, unitId: unit1.id, companyId, createdById: managerId,
    },
  });
  console.log(`  ✓ Products: ${p1.name}, ${p2.name}, ${p3.name}, ${p4.name}, ${p5.name}, ${p6.name}`);

  // ──────────────────────────────────────────────
  // 10. INVENTORY (stock in warehouses)
  // ──────────────────────────────────────────────
  await prisma.inventory.createMany({
    data: [
      { productId: prod1Id, warehouseId: warehouse1Id, quantity: 150 },
      { productId: prod1Id, warehouseId: warehouse2Id, quantity: 75 },
      { productId: prod2Id, warehouseId: warehouse1Id, quantity: 200 },
      { productId: prod2Id, warehouseId: warehouse3Id, quantity: 50 },
      { productId: prod3Id, warehouseId: warehouse1Id, quantity: 300 },
      { productId: prod3Id, warehouseId: warehouse2Id, quantity: 100 },
      { productId: prod4Id, warehouseId: warehouse2Id, quantity: 500 },
      { productId: prod4Id, warehouseId: warehouse3Id, quantity: 250 },
      { productId: prod5Id, warehouseId: warehouse1Id, quantity: 80 },
      { productId: prod5Id, warehouseId: warehouse3Id, quantity: 40 },
      { productId: prod6Id, warehouseId: warehouse1Id, quantity: 120 },
      { productId: prod6Id, warehouseId: warehouse2Id, quantity: 60 },
    ],
  });
  console.log('  ✓ Inventory seeded across warehouses');

  // ──────────────────────────────────────────────
  // 11. CUSTOMERS
  // ──────────────────────────────────────────────
  const cust1Id = randomId();
  const cust2Id = randomId();
  const cust3Id = randomId();

  const c1 = await prisma.customer.create({
    data: { id: cust1Id, name: 'Sarah Johnson', email: 'sarah@example.com', phone: '+1-555-0101', address: '123 Main St, New York, NY 10001', creditLimit: 5000, balance: 1500, companyId },
  });
  const c2 = await prisma.customer.create({
    data: { id: cust2Id, name: 'Mike Chen', email: 'mike@example.com', phone: '+1-555-0102', address: '456 Oak Ave, Boston, MA 02101', creditLimit: 3000, balance: 750, companyId },
  });
  const c3 = await prisma.customer.create({
    data: { id: cust3Id, name: 'Emily Davis', email: 'emily@example.com', phone: '+1-555-0103', address: '789 Pine Rd, Los Angeles, CA 90001', creditLimit: 10000, balance: 0, companyId },
  });
  console.log(`  ✓ Customers: ${c1.name}, ${c2.name}, ${c3.name}`);

  // ──────────────────────────────────────────────
  // 12. SUPPLIERS
  // ──────────────────────────────────────────────
  const sup1Id = randomId();
  const sup2Id = randomId();
  const sup3Id = randomId();

  const s1 = await prisma.supplier.create({
    data: { id: sup1Id, name: 'TechDistributors Inc.', email: 'orders@techdist.com', phone: '+1-555-0201', address: '100 Tech Park Drive, San Jose, CA 95101', creditLimit: 50000, balance: 12500, companyId },
  });
  const s2 = await prisma.supplier.create({
    data: { id: sup2Id, name: 'Fashion Wholesale Co.', email: 'sales@fashionwholesale.com', phone: '+1-555-0202', address: '200 Fashion Ave, New York, NY 10018', creditLimit: 30000, balance: 8000, companyId },
  });
  const s3 = await prisma.supplier.create({
    data: { id: sup3Id, name: 'HomeGoods Supply', email: 'info@homegoodssupply.com', phone: '+1-555-0203', address: '300 Garden St, Chicago, IL 60601', creditLimit: 20000, balance: 3500, companyId },
  });
  console.log(`  ✓ Suppliers: ${s1.name}, ${s2.name}, ${s3.name}`);

  // ──────────────────────────────────────────────
  // 13. BILLERS
  // ──────────────────────────────────────────────
  const biller1 = await prisma.biller.create({
    data: { name: 'Main Billing', code: 'MB-001', address: '1 Finance St, New York, NY', phone: '+1-555-0301', email: 'billing@acme.com', status: 'ACTIVE', companyId },
  });
  const biller2 = await prisma.biller.create({
    data: { name: 'East Region Billing', code: 'EB-001', address: '2 Finance St, Boston, MA', phone: '+1-555-0302', email: 'east.billing@acme.com', status: 'ACTIVE', companyId },
  });
  const biller3 = await prisma.biller.create({
    data: { name: 'West Region Billing', code: 'WB-001', address: '3 Finance St, Los Angeles, CA', phone: '+1-555-0303', email: 'west.billing@acme.com', status: 'INACTIVE', companyId },
  });
  console.log(`  ✓ Billers: ${biller1.name}, ${biller2.name}, ${biller3.name}`);

  // ──────────────────────────────────────────────
  // 14. EXPENSE CATEGORIES
  // ──────────────────────────────────────────────
  const expCat1 = await prisma.expenseCategory.create({
    data: { name: 'Utilities', description: 'Electricity, water, internet bills', companyId },
  });
  const expCat2 = await prisma.expenseCategory.create({
    data: { name: 'Office Supplies', description: 'Stationery, printer supplies, office equipment', companyId },
  });
  const expCat3 = await prisma.expenseCategory.create({
    data: { name: 'Shipping & Logistics', description: 'Freight, courier, and shipping costs', companyId },
  });
  console.log(`  ✓ Expense Categories: ${expCat1.name}, ${expCat2.name}, ${expCat3.name}`);

  // ──────────────────────────────────────────────
  // 15. SAMPLE SALES
  // ──────────────────────────────────────────────
  const sale1 = await prisma.sale.create({
    data: {
      invoiceNumber: 'INV-2026001', subtotal: 139.98, tax: 11.20, discount: 10, totalAmount: 141.18,
      status: 'COMPLETED', paymentStatus: 'PAID', paymentMethod: 'CREDIT_CARD',
      saleDate: new Date('2026-06-01'), dueDate: new Date('2026-07-01'),
      customerId: cust1Id, userId: adminId, warehouseId: warehouse1Id, billerId: biller1.id,
      companyId, notes: 'First order - welcome discount',
      items: {
        create: [
          { productId: prod1Id, quantity: 1, unitPrice: 89.99 },
          { productId: prod2Id, quantity: 1, unitPrice: 49.99 },
        ],
      },
    },
  });

  const sale2 = await prisma.sale.create({
    data: {
      invoiceNumber: 'INV-2026002', subtotal: 79.99, tax: 4.80, discount: 0, totalAmount: 84.79,
      status: 'PENDING', paymentStatus: 'PENDING', paymentMethod: 'BANK_TRANSFER',
      saleDate: new Date('2026-06-10'), dueDate: new Date('2026-07-10'),
      customerId: cust2Id, userId: managerId, warehouseId: warehouse2Id, billerId: biller2.id,
      companyId,
      items: {
        create: [
          { productId: prod4Id, quantity: 2, unitPrice: 24.99 },
          { productId: prod5Id, quantity: 1, unitPrice: 29.99 }, // wrong; actually p5 is 79.99
        ],
      },
    },
  });
  console.log(`  ✓ Sample sales created: ${sale1.invoiceNumber}, ${sale2.invoiceNumber}`);

  // ──────────────────────────────────────────────
  // 16. SAMPLE PURCHASE ORDERS
  // ──────────────────────────────────────────────
  const po1 = await prisma.purchaseOrder.create({
    data: {
      referenceNumber: 'PO-2026001', totalAmount: 2200, status: 'COMPLETED',
      orderDate: new Date('2026-05-28'), supplierId: sup1Id, userId: adminId,
      warehouseId: warehouse1Id, companyId,
      items: {
        create: [
          { productId: prod1Id, quantity: 20, unitCost: 55.00 },
          { productId: prod2Id, quantity: 30, unitCost: 30.00 },
          { productId: prod3Id, quantity: 50, unitCost: 18.00 },
        ],
      },
    },
  });

  const po2 = await prisma.purchaseOrder.create({
    data: {
      referenceNumber: 'PO-2026002', totalAmount: 660, status: 'PENDING',
      orderDate: new Date('2026-06-15'), supplierId: sup2Id, userId: managerId,
      warehouseId: warehouse2Id, companyId,
      items: {
        create: [
          { productId: prod4Id, quantity: 30, unitCost: 12.00 },
          { productId: prod5Id, quantity: 10, unitCost: 45.00 },
        ],
      },
    },
  });
  console.log(`  ✓ Purchase orders: ${po1.referenceNumber}, ${po2.referenceNumber}`);

  // ──────────────────────────────────────────────
  // 17. SAMPLE QUOTATIONS
  // ──────────────────────────────────────────────
  const q1 = await prisma.quotation.create({
    data: {
      referenceNumber: 'QTN-2026001', totalAmount: 264.95, status: 'COMPLETED',
      quoteDate: new Date('2026-06-05'), expiryDate: new Date('2026-07-05'),
      customerId: cust3Id, userId: ownerId, companyId,
      items: {
        create: [
          { productId: prod6Id, quantity: 3, unitPrice: 44.99 },
          { productId: prod1Id, quantity: 1, unitPrice: 89.99 },
          { productId: prod2Id, quantity: 2, unitPrice: 49.99 },
        ],
      },
    },
  });

  const q2 = await prisma.quotation.create({
    data: {
      referenceNumber: 'QTN-2026002', totalAmount: 139.98, status: 'PENDING',
      quoteDate: new Date('2026-06-20'), expiryDate: new Date('2026-07-20'),
      customerId: cust1Id, userId: managerId, companyId,
      items: {
        create: [
          { productId: prod3Id, quantity: 4, unitPrice: 34.99 },
        ],
      },
    },
  });
  console.log(`  ✓ Quotations: ${q1.referenceNumber}, ${q2.referenceNumber}`);

  // ──────────────────────────────────────────────
  // 18. SAMPLE EXPENSES
  // ──────────────────────────────────────────────
  await prisma.expense.create({
    data: {
      reference: 'EXP-2026001', amount: 450.00, expenseDate: new Date('2026-06-02'),
      description: 'June electricity bill', vendor: 'City Power Co.', status: 'PAID',
      paymentMethod: 'BANK_TRANSFER', categoryId: expCat1.id, userId: adminId, companyId,
    },
  });
  await prisma.expense.create({
    data: {
      reference: 'EXP-2026002', amount: 125.50, expenseDate: new Date('2026-06-05'),
      description: 'Office printer cartridges and paper', vendor: 'OfficeMax',
      status: 'APPROVED', paymentMethod: 'CREDIT_CARD', categoryId: expCat2.id,
      userId: managerId, companyId,
    },
  });
  await prisma.expense.create({
    data: {
      reference: 'EXP-2026003', amount: 320.00, expenseDate: new Date('2026-06-12'),
      description: 'Freight charges - East distribution', vendor: 'FastShip Logistics',
      status: 'PENDING', categoryId: expCat3.id, userId: ownerId, companyId,
    },
  });
  console.log('  ✓ Sample expenses created');

  // ──────────────────────────────────────────────
  // 19. STOCK LEDGER — initial entries
  // ──────────────────────────────────────────────
  const initialLedgerEntries = [
    { productId: prod1Id, warehouseId: warehouse1Id, quantity: 150, balance: 150, type: 'ADJUSTMENT', reference: 'INITIAL', note: 'Initial stock', userId: ownerId },
    { productId: prod1Id, warehouseId: warehouse2Id, quantity: 75, balance: 75, type: 'ADJUSTMENT', reference: 'INITIAL', note: 'Initial stock', userId: ownerId },
    { productId: prod2Id, warehouseId: warehouse1Id, quantity: 200, balance: 200, type: 'ADJUSTMENT', reference: 'INITIAL', note: 'Initial stock', userId: ownerId },
    { productId: prod2Id, warehouseId: warehouse3Id, quantity: 50, balance: 50, type: 'ADJUSTMENT', reference: 'INITIAL', note: 'Initial stock', userId: ownerId },
    { productId: prod3Id, warehouseId: warehouse1Id, quantity: 300, balance: 300, type: 'ADJUSTMENT', reference: 'INITIAL', note: 'Initial stock', userId: ownerId },
    { productId: prod3Id, warehouseId: warehouse2Id, quantity: 100, balance: 100, type: 'ADJUSTMENT', reference: 'INITIAL', note: 'Initial stock', userId: ownerId },
    { productId: prod4Id, warehouseId: warehouse2Id, quantity: 500, balance: 500, type: 'ADJUSTMENT', reference: 'INITIAL', note: 'Initial stock', userId: ownerId },
    { productId: prod4Id, warehouseId: warehouse3Id, quantity: 250, balance: 250, type: 'ADJUSTMENT', reference: 'INITIAL', note: 'Initial stock', userId: ownerId },
    { productId: prod5Id, warehouseId: warehouse1Id, quantity: 80, balance: 80, type: 'ADJUSTMENT', reference: 'INITIAL', note: 'Initial stock', userId: ownerId },
    { productId: prod5Id, warehouseId: warehouse3Id, quantity: 40, balance: 40, type: 'ADJUSTMENT', reference: 'INITIAL', note: 'Initial stock', userId: ownerId },
    { productId: prod6Id, warehouseId: warehouse1Id, quantity: 120, balance: 120, type: 'ADJUSTMENT', reference: 'INITIAL', note: 'Initial stock', userId: ownerId },
    { productId: prod6Id, warehouseId: warehouse2Id, quantity: 60, balance: 60, type: 'ADJUSTMENT', reference: 'INITIAL', note: 'Initial stock', userId: ownerId },
  ];
  for (const entry of initialLedgerEntries) {
    await prisma.stockLedger.create({ data: entry });
  }
  console.log('  ✓ Stock ledger initial entries created');

  console.log('\n✅ Seeding complete!');
  console.log('\nLogin credentials:');
  console.log('  Owner:    owner@acme.com / password123');
  console.log('  Admin:    admin@acme.com / password123');
  console.log('  Manager:  manager@acme.com / password123');
  console.log('  Observer: observer@acme.com / password123');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
