/**
 * Reconciliation report: combo products' existing `Inventory` rows vs the
 * new derived (virtual) availability computed from their component products.
 *
 * New model (documented behavior change):
 *   - A COMBO product's "available stock" is DERIVED, not stored:
 *       available(combo, warehouse) = floor(min over components of componentQty / ratio)
 *     (componentQty missing in a warehouse => 0 for that warehouse)
 *   - Combo Inventory rows become inert: reads ignore them, writes never touch them.
 *   - At sale time, component stock is decremented per ratio instead.
 *
 * This script reports what the stored rows say vs. what the new read path will
 * report, so the diff can be reviewed before switching the read path.
 *
 * Usage:
 *   dotenv -e .env -o -- npx ts-node prisma/reconcile-combo-stock.ts
 *   (requires DATABASE_URL_POOLED / DIRECT_URL in the environment)
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const combos = await prisma.product.findMany({
    where: { type: 'COMBO' },
    include: {
      company: { select: { name: true } },
      inventory: true,
      comboComponents: {
        include: {
          product: {
            include: { inventory: true },
          },
        },
      },
    },
  });

  let totalRows = 0;
  let differingRows = 0;

  const lines: string[] = [];
  lines.push(
    [
      'company',
      'combo_sku',
      'combo_name',
      'warehouse_id',
      'stored_qty',
      'derived_qty',
      'diff',
    ].join('\t'),
  );

  for (const combo of combos) {
    const warehouseIds = new Set<string>(
      combo.inventory.map((i) => i.warehouseId),
    );
    for (const comp of combo.comboComponents) {
      for (const inv of comp.product.inventory) {
        warehouseIds.add(inv.warehouseId);
      }
    }

    for (const warehouseId of warehouseIds) {
      const derived = Math.min(
        ...combo.comboComponents.map((comp) => {
          const qty =
            comp.product.inventory.find(
              (i) => i.warehouseId === warehouseId,
            )?.quantity ?? 0;
          return Math.floor(qty / comp.quantity);
        }),
      );

      const storedRow = combo.inventory.find(
        (i) => i.warehouseId === warehouseId,
      );
      const stored = storedRow?.quantity ?? 0;
      const diff = derived - stored;

      totalRows++;
      if (diff !== 0) differingRows++;

      lines.push(
        [
          combo.company.name,
          combo.sku,
          combo.name,
          warehouseId,
          String(stored),
          String(derived),
          String(diff),
        ].join('\t'),
      );
    }
  }

  console.log(lines.join('\n'));
  console.log('\n--- SUMMARY ---');
  console.log(`combo products found:      ${combos.length}`);
  console.log(`combo/warehouse rows:      ${totalRows}`);
  console.log(`rows where derived != stored: ${differingRows}`);

  const anyStoredRows = combos.some((c) => c.inventory.length > 0);
  if (!anyStoredRows) {
    console.log(
      '\nNo COMBO product currently holds its own Inventory rows; the switch to derived availability is a pure read-path change.',
    );
  } else {
    console.log(
      '\nSome COMBO products hold stored Inventory rows. After switching, those rows are inert:',
    );
    console.log(
      '  - reads will show derived availability;',
      ' - writes (sales/returns/transfers/adjustments) never mutate combo rows;',
      '  - optionally delete/zero the stored rows after reviewing the diff above.',
    );
  }
}

main()
  .catch((err) => {
    console.error('Reconciliation failed:', err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
