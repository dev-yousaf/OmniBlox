import { Injectable } from '@nestjs/common';
import { SalesReturnsService } from '../sales-returns/sales-returns.service';
import { PurchaseReturnsService } from '../purchase-returns/purchase-returns.service';

@Injectable()
export class ReturnsService {
  constructor(
    private readonly salesReturnsService: SalesReturnsService,
    private readonly purchaseReturnsService: PurchaseReturnsService,
  ) {}

  /**
   * Get all returns (both sales and purchase) for a company
   * Merges both types and adds a type field for frontend routing
   */
  async findAllReturns(companyId: string) {
    // Fetch both types in parallel
    const [salesReturns, purchaseReturns] = await Promise.all([
      this.salesReturnsService.findAll(companyId),
      this.purchaseReturnsService.findAll(companyId),
    ]);

    // Add type field and merge
    const salesWithType = salesReturns.map((ret) => ({
      ...ret,
      type: 'customer' as const,
      entityName: 'Customer Return', // For display purposes
    }));

    const purchasesWithType = purchaseReturns.map((ret) => ({
      ...ret,
      type: 'supplier' as const,
      entityName: 'Supplier Return',
      // Purchase returns have supplier field, sales returns don't
    }));

    // Merge and sort by date (most recent first)
    const allReturns = [...salesWithType, ...purchasesWithType].sort(
      (a, b) => b.returnDate.getTime() - a.returnDate.getTime(),
    );

    return allReturns;
  }
}
