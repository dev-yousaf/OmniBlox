import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '.prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../cache/cache.service';
import { InsufficientStockException } from './insufficient-stock.exception';

/** Interactive transaction client type (as passed to $transaction callbacks). */
export type Tx = Prisma.TransactionClient;

export interface StockMutationParams {
  productId: string;
  warehouseId: string;
  /**
   * Positive number of units to move. Not used by `adjustStock`, which
   * derives the change from `newQuantity`/`delta` instead.
   */
  quantity?: number;
  /** Reference number shown in the ledger (invoice #, PO #, SKU, ...). */
  reference: string;
  /** Ledger entry type: SALE, PURCHASE, RETURN, TRANSFER, ADJUSTMENT, ... */
  type: string;
  note?: string;
  userId?: string | null;
  companyId: string;
}

export interface AdjustStockParams extends StockMutationParams {
  /** Absolute target quantity. Mutually exclusive with `delta`. */
  newQuantity?: number;
  /** Signed change (positive = add, negative = remove). Mutually exclusive with `newQuantity`. */
  delta?: number;
}

export interface TransferStockParams {
  productId: string;
  fromWarehouseId: string;
  toWarehouseId: string;
  quantity: number;
  reference: string;
  type?: string;
  note?: string;
  userId?: string | null;
  companyId: string;
}

export interface StockResult {
  productId: string;
  warehouseId: string;
  /** Signed change applied to the inventory row. */
  quantity: number;
  /** Resulting balance for the inventory row. */
  balance: number;
}

interface ComponentLike {
  quantity: number;
  productId: string;
}

interface ProductLike {
  id: string;
  type: string;
  name: string;
  sku: string;
  comboComponents?: ComponentLike[];
}

/**
 * THE single code path allowed to write `Inventory` and `StockLedger`.
 *
 * Design rules:
 *  - Every mutation runs inside a caller-provided transaction (`tx`) so the
 *    surrounding business operation (sale creation, PO receive, ...) commits
 *    atomically with the stock change. Cache invalidation is deliberately NOT
 *    done here: it happens in `invalidateStockCaches()` after the caller's
 *    transaction commits.
 *  - Rows are locked with `SELECT ... FOR UPDATE` before read-modify-write;
 *    concurrent sales of the same product/warehouse serialize on the lock and
 *    can never drive a quantity negative (`InsufficientStockException`).
 *  - Combos (type === 'COMBO') hold NO inventory of their own. Availability is
 *    DERIVED at read time as `min(floor(componentQty / ratio))` per warehouse
 *    (missing component row => 0). Mutations on a combo expand into its
 *    components (issue/receive/reverse), and `adjustStock`/`transferStock`
 *    reject combos. This is a documented behavior change: previously combos
 *    could hold independently-editable Inventory rows; those rows are now
 *    inert and the write path never creates or touches them.
 *  - All queries are scoped by companyId (multi-tenancy Golden Rule).
 */
@Injectable()
export class StockService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  // ------------------------------------------------------------------
  // Intent-based mutations. All take a transaction client from the caller.
  // ------------------------------------------------------------------

  /** Stock in: purchase receive, initial stock, purchase-return reversal. */
  async receiveStock(tx: Tx, p: StockMutationParams): Promise<StockResult[]> {
    const quantity = this.assertPositiveInt(p.quantity, 'quantity');
    await this.resolveWarehouse(tx, p.companyId, p.warehouseId);
    const product = await this.resolveProduct(tx, p.companyId, p.productId);
    return this.applyMutation(
      tx,
      product,
      p.warehouseId,
      quantity,
      p.reference,
      p.type,
      p.note,
      p.userId,
      p.companyId,
    );
  }

  /** Stock out: sale fulfillment (components decremented for combos). */
  async issueStock(tx: Tx, p: StockMutationParams): Promise<StockResult[]> {
    const quantity = this.assertPositiveInt(p.quantity, 'quantity');
    await this.resolveWarehouse(tx, p.companyId, p.warehouseId);
    const product = await this.resolveProduct(tx, p.companyId, p.productId);
    return this.applyMutation(
      tx,
      product,
      p.warehouseId,
      -quantity,
      p.reference,
      p.type,
      p.note,
      p.userId,
      p.companyId,
    );
  }

  /** Restock: sales return (reverse of issueStock). */
  async reverseIssue(tx: Tx, p: StockMutationParams): Promise<StockResult[]> {
    return this.receiveStock(tx, p);
  }

  /** Remove stock: purchase return (reverse of receiveStock). */
  async reverseReceive(tx: Tx, p: StockMutationParams): Promise<StockResult[]> {
    return this.issueStock(tx, p);
  }

  /**
   * Absolute or delta adjustment. Pass exactly one of `newQuantity`/`delta`.
   * Rejected for combos: their stock is derived from components.
   */
  async adjustStock(tx: Tx, p: AdjustStockParams): Promise<StockResult[]> {
    if (p.newQuantity === undefined && p.delta === undefined) {
      throw new BadRequestException(
        'adjustStock requires either newQuantity or delta',
      );
    }
    if (p.newQuantity !== undefined && p.delta !== undefined) {
      throw new BadRequestException(
        'adjustStock accepts either newQuantity or delta, not both',
      );
    }

    await this.resolveWarehouse(tx, p.companyId, p.warehouseId);
    const product = await this.resolveProduct(tx, p.companyId, p.productId);
    if (product.type === 'COMBO') {
      throw new BadRequestException(
        'Cannot adjust stock of a combo product directly; its stock is derived from its components. Adjust the components instead.',
      );
    }

    if (p.newQuantity !== undefined) {
      const newQuantity = this.assertInt(p.newQuantity, 'newQuantity');
      if (newQuantity < 0) {
        throw new BadRequestException('Stock quantity cannot be negative');
      }
      const current = await this.lockInventory(
        tx,
        product.id,
        p.warehouseId,
      );
      const delta = newQuantity - (current ?? 0);
      return this.changeQuantity(
        tx,
        product,
        p.warehouseId,
        delta,
        p.reference,
        p.type,
        p.note,
        p.userId,
        p.companyId,
      );
    }

    return this.applyMutation(
      tx,
      product,
      p.warehouseId,
      this.assertInt(p.delta, 'delta'),
      p.reference,
      p.type,
      p.note,
      p.userId,
      p.companyId,
    );
  }

  /**
   * Atomic warehouse transfer: source decremented and destination incremented
   * in the same transaction. Rejected for combos.
   */
  async transferStock(
    tx: Tx,
    p: TransferStockParams,
  ): Promise<{ from: StockResult; to: StockResult }> {
    if (p.fromWarehouseId === p.toWarehouseId) {
      throw new BadRequestException('Cannot transfer to the same warehouse');
    }
    const quantity = this.assertPositiveInt(p.quantity, 'quantity');

    await Promise.all([
      this.resolveWarehouse(tx, p.companyId, p.fromWarehouseId),
      this.resolveWarehouse(tx, p.companyId, p.toWarehouseId),
    ]);
    const product = await this.resolveProduct(tx, p.companyId, p.productId);
    if (product.type === 'COMBO') {
      throw new BadRequestException(
        'Cannot transfer a combo product; its stock is derived from its components. Transfer the components instead.',
      );
    }

    const type = p.type ?? 'TRANSFER';
    const [fromResult] = await this.changeQuantity(
      tx,
      product,
      p.fromWarehouseId,
      -quantity,
      p.reference,
      type,
      p.note,
      p.userId,
      p.companyId,
    );
    const [toResult] = await this.changeQuantity(
      tx,
      product,
      p.toWarehouseId,
      +quantity,
      p.reference,
      type,
      p.note,
      p.userId,
      p.companyId,
    );
    return { from: fromResult, to: toResult };
  }

  // ------------------------------------------------------------------
  // Reads
  // ------------------------------------------------------------------

  /**
   * Available stock for one product: derived (component-min) for combos,
   * summed Inventory otherwise. Scoped to one warehouse when given.
   */
  async getAvailableStock(
    companyId: string,
    productId: string,
    warehouseId?: string,
  ): Promise<number> {
    const map = await this.getAvailableStockMap(companyId, [productId], warehouseId);
    return map.get(productId) ?? 0;
  }

  /**
   * Bulk availability for a set of products in one round trip (used by the
   * products list/detail so combos and variants read the same numbers).
   */
  async getAvailableStockMap(
    companyId: string,
    productIds: string[],
    warehouseId?: string,
    db: any = this.prisma,
  ): Promise<Map<string, number>> {
    const uniqueIds = Array.from(new Set(productIds));
    if (!uniqueIds.length) return new Map();

    const products = await db.product.findMany({
      where: { id: { in: uniqueIds }, companyId },
      select: {
        id: true,
        type: true,
        comboComponents: { select: { quantity: true, productId: true } },
      },
    });

    const componentIds = Array.from(
      new Set(
        products.flatMap(
          (p) => p.comboComponents?.map((c) => c.productId) ?? [],
        ),
      ),
    );

    const inventory = await db.inventory.findMany({
      where: {
        productId: { in: [...uniqueIds, ...componentIds] },
        ...(warehouseId ? { warehouseId } : {}),
      },
      select: { productId: true, quantity: true },
    });

    const sumBy = new Map<string, number>();
    for (const row of inventory) {
      sumBy.set(row.productId, (sumBy.get(row.productId) ?? 0) + row.quantity);
    }

    const result = new Map<string, number>();
    const compute = (product: ProductLike): number => {
      if (product.type !== 'COMBO') {
        return sumBy.get(product.id) ?? 0;
      }
      const components = product.comboComponents ?? [];
      if (!components.length) return 0;
      return Math.min(
        ...components.map((c) =>
          Math.floor(
            (sumBy.get(c.productId) ?? 0) / Math.max(1, c.quantity),
          ),
        ),
      );
    };

    for (const p of products) {
      result.set(p.id, compute(p));
    }
    return result;
  }

  // ------------------------------------------------------------------
  // Cache invalidation — THE central place. Call once after the caller's
  // transaction commits; no other module invalidates stock-related keys.
  // ------------------------------------------------------------------

  async invalidateStockCaches(
    companyId: string,
    productIds: string[],
    warehouseIds: string[] = [],
  ): Promise<void> {
    const jobs: Promise<void>[] = [
      this.cache.delByPattern(`products:${companyId}:list:*`),
      this.cache.delByPattern(`products:${companyId}:sku:*`),
      this.cache.del(`products:${companyId}:stats`),
      this.cache.delByPattern(`inventory:${companyId}:list:*`),
      this.cache.del(`inventory:${companyId}:stats`),
      this.cache.delByPattern(`inventory:${companyId}:adj:*`),
      this.cache.delByPattern(`inventory:${companyId}:transfers:*`),
      this.cache.delByPattern(`inventory:${companyId}:transfer:*`),
      this.cache.del(`stock-adjustments:list:${companyId}`),
      this.cache.delByPattern(`stock-adjustments:item:${companyId}:*`),
      this.cache.delByPattern(`dashboard:${companyId}:data:*`),
      this.cache.delByPattern(`dashboard:${companyId}:topselling:*`),
      this.cache.delByPattern(`dashboard:${companyId}:recentsales:*`),
      this.cache.delByPattern(`dashboard:${companyId}:chart:*`),
      this.cache.del(`sales:${companyId}:dashboard`),
      this.cache.del(`purchases:${companyId}:dashboard`),
    ];

    for (const productId of new Set(productIds)) {
      jobs.push(this.cache.del(`products:${companyId}:${productId}`));
      jobs.push(this.cache.del(`inventory:${companyId}:prod:${productId}`));
    }
    for (const warehouseId of new Set(warehouseIds)) {
      jobs.push(this.cache.del(`inventory:${companyId}:whinv:${warehouseId}`));
      jobs.push(this.cache.del(`inventory:${companyId}:wh:${warehouseId}`));
    }

    await Promise.all(jobs);
  }

  // ------------------------------------------------------------------
  // Internals
  // ------------------------------------------------------------------

  /**
   * Uniform input validation for unit quantities: a positive whole number.
   * Guards every intent method against sign/direction inversion (a negative
   * "receive" would silently remove stock) and fractional units that would
   * be truncated by the `Int` columns.
   */
  private assertPositiveInt(q: number | undefined, label: string): number {
    if (q === undefined || !Number.isInteger(q) || q <= 0) {
      throw new BadRequestException(
        `${label} must be a positive whole number`,
      );
    }
    return q;
  }

  /** Signed whole number (adjustment deltas may be negative). */
  private assertInt(q: number | undefined, label: string): number {
    if (q === undefined || !Number.isInteger(q)) {
      throw new BadRequestException(`${label} must be a whole number`);
    }
    return q;
  }

  private async resolveProduct(
    tx: Tx,
    companyId: string,
    productId: string,
  ): Promise<ProductLike> {
    const product = await tx.product.findFirst({
      where: { id: productId, companyId },
      select: {
        id: true,
        type: true,
        name: true,
        sku: true,
        comboComponents: { select: { quantity: true, productId: true } },
      },
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    return product;
  }

  private async resolveWarehouse(
    tx: Tx,
    companyId: string,
    warehouseId: string,
  ): Promise<void> {
    const warehouse = await tx.warehouse.findFirst({
      where: { id: warehouseId, companyId },
      select: { id: true },
    });
    if (!warehouse) {
      throw new NotFoundException('Warehouse not found');
    }
  }

  /**
   * Applies a signed delta to a product (expanding combos into components)
   * and returns per-row results.
   */
  private async applyMutation(
    tx: Tx,
    product: ProductLike,
    warehouseId: string,
    delta: number,
    reference: string,
    type: string,
    note: string | undefined,
    userId: string | null | undefined,
    companyId: string,
  ): Promise<StockResult[]> {
    if (delta === 0) {
      return [];
    }

    if (product.type === 'COMBO') {
      return this.applyComboMutation(
        tx,
        product,
        warehouseId,
        delta,
        reference,
        type,
        note,
        userId,
        companyId,
      );
    }

    return this.changeQuantity(
      tx,
      product,
      warehouseId,
      delta,
      reference,
      type,
      note,
      userId,
      companyId,
    );
  }

  /**
   * Combo expansion: moves stock on components by `delta * ratio`.
   * Availability semantics: a combo of N requires N * ratio of each component,
   * so issuing throws InsufficientStockException when any component runs dry.
   */
  private async applyComboMutation(
    tx: Tx,
    combo: ProductLike,
    warehouseId: string,
    delta: number,
    reference: string,
    type: string,
    note: string | undefined,
    userId: string | null | undefined,
    companyId: string,
  ): Promise<StockResult[]> {
    const components = combo.comboComponents ?? [];
    if (!components.length) {
      throw new BadRequestException(
        `Combo product "${combo.name}" has no components`,
      );
    }

    const results: StockResult[] = [];
    for (const component of components) {
      const componentProduct = await this.resolveProduct(
        tx,
        companyId,
        component.productId,
      );
      if (componentProduct.type === 'COMBO') {
        throw new BadRequestException(
          `Combo "${combo.name}" cannot contain another combo ("${componentProduct.name}")`,
        );
      }
      const componentDelta = delta * component.quantity;
      const [result] = await this.changeQuantity(
        tx,
        componentProduct,
        warehouseId,
        componentDelta,
        reference,
        type,
        note ?? `Combo "${combo.name}" (${reference})`,
        userId,
        companyId,
      );
      results.push(result);
    }
    return results;
  }

  /**
   * Locks the inventory row (SELECT ... FOR UPDATE) and applies a signed
   * delta atomically, writing the ledger with the resulting balance.
   * Throws InsufficientStockException rather than allowing negatives.
   */
  private async changeQuantity(
    tx: Tx,
    product: ProductLike,
    warehouseId: string,
    delta: number,
    reference: string,
    type: string,
    note: string | undefined,
    userId: string | null | undefined,
    companyId: string,
  ): Promise<StockResult[]> {
    const current = await this.lockInventory(tx, product.id, warehouseId);
    const currentQty = current ?? 0;
    const newQty = currentQty + delta;

    if (newQty < 0) {
      throw new InsufficientStockException(
        product.id,
        currentQty,
        -delta,
        product.name,
      );
    }

    if (delta === 0) {
      return [
        { productId: product.id, warehouseId, quantity: 0, balance: currentQty },
      ];
    }

    // Atomic upsert: on conflict (a concurrent create beat us), increment the
    // existing row by the same delta instead of overwriting it. The FOR UPDATE
    // lock above already serializes concurrent writers of existing rows.
    const rows = await tx.$queryRawUnsafe<{ quantity: number }[]>(
      `INSERT INTO "inventory" ("productId", "warehouseId", "quantity", "createdAt", "updatedAt")
        VALUES ($1, $2, $3, now(), now())
        ON CONFLICT ("productId", "warehouseId")
        DO UPDATE SET "quantity" = "inventory"."quantity" + $4, "updatedAt" = now()
        RETURNING "quantity"`,
      product.id,
      warehouseId,
      newQty,
      delta,
    );
    const balance = rows[0]?.quantity ?? newQty;

    await tx.stockLedger.create({
      data: {
        productId: product.id,
        warehouseId,
        userId: userId ?? null,
        quantity: delta,
        balance,
        type,
        reference,
        note: note ?? null,
      },
    });

    return [
      { productId: product.id, warehouseId, quantity: delta, balance },
    ];
  }

  private async lockInventory(
    tx: Tx,
    productId: string,
    warehouseId: string,
  ): Promise<number | null> {
    const rows = await tx.$queryRawUnsafe<{ quantity: number }[]>(
      `SELECT "quantity" FROM "inventory"
        WHERE "productId" = $1 AND "warehouseId" = $2
        FOR UPDATE`,
      productId,
      warehouseId,
    );
    return rows[0]?.quantity ?? null;
  }
}
