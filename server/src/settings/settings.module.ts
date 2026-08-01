import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { CacheModule } from '../cache/cache.module';
import { SettingsService } from './settings.service';
import { SettingsController } from './settings.controller';
import { AuditLogModule } from '../audit-logs/audit-logs.module';

@Module({
  imports: [PrismaModule, CacheModule, AuditLogModule],
  controllers: [SettingsController],
  providers: [SettingsService],
  exports: [SettingsService],
})
export class SettingsModule {}
