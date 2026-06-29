import { Module } from '@nestjs/common';
import { PurchasesController } from './purchases.controller';
import { PurchasesService } from './purchases.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditLogModule } from '../audit-logs/audit-logs.module';

@Module({
  imports: [PrismaModule, AuditLogModule],
  controllers: [PurchasesController],
  providers: [PurchasesService],
  exports: [PurchasesService],
})
export class PurchasesModule {}
