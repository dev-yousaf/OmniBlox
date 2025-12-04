import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verify() {
  console.log('🔍 Verifying multi-tenancy setup...');

  // Check if companies table exists and has data
  const companies = await prisma.company.findMany({
    include: {
      owner: true,
      users: true,
      warehouses: true,
    },
  });

  console.log('\n📊 Companies:');
  companies.forEach((company) => {
    console.log(`  - ${company.name} (${company.workspaceUrl})`);
    console.log(`    Owner: ${company.owner.name} (${company.owner.email})`);
    console.log(`    Users: ${company.users.length}`);
    console.log(`    Warehouses: ${company.warehouses.length}`);
  });

  // Check if all business data has companyId
  const users = await prisma.user.findMany();
  const warehouses = await prisma.warehouse.findMany();

  console.log('\n👥 Users:');
  users.forEach((user) => {
    console.log(
      `  - ${user.name} (${user.email}) - Company: ${user.companyId}`,
    );
  });

  console.log('\n🏭 Warehouses:');
  warehouses.forEach((warehouse) => {
    console.log(`  - ${warehouse.name} - Company: ${warehouse.companyId}`);
  });

  // Verify Golden Rule: Query filtering by companyId
  const company1Data = await prisma.user.findMany({
    where: { companyId: 'company-1' },
    include: { company: true },
  });

  console.log('\n🎯 Golden Rule Test - Users for company-1:');
  company1Data.forEach((user) => {
    console.log(`  - ${user.name} belongs to ${user.company.name}`);
  });

  console.log('\n✅ Multi-tenancy verification complete!');
}

verify()
  .catch((e) => {
    console.error('❌ Verification failed:');
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
