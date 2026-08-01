import { Module } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { StockService } from './stock.service';
import { InventoryController } from './inventory.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [PrismaModule, SettingsModule],
  controllers: [InventoryController],
  providers: [InventoryService, StockService],
  exports: [InventoryService, StockService],
})
export class InventoryModule {}
