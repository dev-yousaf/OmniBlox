import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function addDefaultCategories() {
  console.log('🌱 Adding default product categories...');

  try {
    // Get all companies
    const companies = await prisma.company.findMany();

    if (companies.length === 0) {
      console.log('❌ No companies found. Please run the main seed first.');
      return;
    }

    const defaultCategories = [
      'Uncategorized',
      'Electronics',
      'Accessories',
      'Furniture',
      'Office Supplies',
      'Food & Beverages',
      'Health & Beauty',
      'Clothing',
      'Books',
    ];

    for (const company of companies) {
      console.log(`\n📦 Adding categories for company: ${company.name}`);

      for (const categoryName of defaultCategories) {
        // Check if category already exists
        const existing = await prisma.productCategory.findFirst({
          where: {
            name: categoryName,
            companyId: company.id,
          },
        });

        if (existing) {
          console.log(`  ⏭️  ${categoryName} already exists, skipping...`);
        } else {
          await prisma.productCategory.create({
            data: {
              name: categoryName,
              companyId: company.id,
            },
          });
          console.log(`  ✅ Created ${categoryName}`);
        }
      }
    }

    console.log('\n✅ Default categories added successfully!');
  } catch (error) {
    console.error('❌ Error adding categories:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

addDefaultCategories().catch((error) => {
  console.error(error);
  process.exit(1);
});
