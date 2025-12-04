import { Injectable } from '@nestjs/common';
import { ProductService } from '../products/product.service';
import { SalesService } from '../sales/sales.service';
import { PurchasesService } from '../purchases/purchases.service';
import { CustomersService } from '../customers/customers.service';
import { DashboardStatsDto } from './dto/dashboard-stats.dto';

@Injectable()
export class DashboardService {
  constructor(
    private readonly productService: ProductService,
    private readonly salesService: SalesService,
    private readonly purchasesService: PurchasesService,
    private readonly customersService: CustomersService,
  ) {}

  async getStats(companyId: string): Promise<DashboardStatsDto> {
    const [products, sales, purchases, customers] = await Promise.all([
      this.productService.getDashboardStats(companyId),
      this.salesService.getDashboardStats(companyId),
      this.purchasesService.getDashboardStats(companyId),
      this.customersService.getDashboardStats(companyId),
    ]);

    return {
      products,
      sales,
      purchases,
      customers,
    } as DashboardStatsDto;
  }
}
