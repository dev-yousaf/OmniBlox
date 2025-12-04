import { Module } from '@nestjs/common';
import { ReturnsService } from './returns.service';
import { ReturnsController } from './returns.controller';
import { SalesReturnsModule } from '../sales-returns/sales-returns.module';
import { PurchaseReturnsModule } from '../purchase-returns/purchase-returns.module';

@Module({
  imports: [SalesReturnsModule, PurchaseReturnsModule],
  controllers: [ReturnsController],
  providers: [ReturnsService],
})
export class ReturnsModule {}
