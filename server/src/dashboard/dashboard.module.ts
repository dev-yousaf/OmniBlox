import { Module } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { ProductModule } from '../products/product.module';
import { SalesModule } from '../sales/sales.module';
import { PurchasesModule } from '../purchases/purchases.module';
import { CustomersModule } from '../customers/customers.module';

@Module({
  imports: [ProductModule, SalesModule, PurchasesModule, CustomersModule],
  providers: [DashboardService],
  controllers: [DashboardController],
})
export class DashboardModule {}
