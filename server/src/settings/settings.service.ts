import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../cache/cache.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';

const SETTINGS_KEY = (cid: string) => `settings:${cid}`;

const DEFAULT_SETTINGS = {
  timezone: 'utc',
  language: 'en',
  dateFormat: 'mdy',
  timeFormat: '12',
  currencyCode: 'usd',
  currencySymbol: '$',
  decimalPlaces: 2,
  lowStockThreshold: 10,
  lowStockAlerts: true,
  defaultWarehouseId: null,
  autoBackup: true,
  backupTime: '02:00',
  dataRetention: '1year',
};

@Injectable()
export class SettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  async getOrCreate(companyId: string): Promise<any> {
    const cacheKey = SETTINGS_KEY(companyId);
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    const existing = await this.prisma.companySettings.findUnique({
      where: { companyId },
    });
    if (existing) {
      const data = this.toDto(existing);
      await this.cache.set(cacheKey, data, 60 * 15);
      return data;
    }

    const settings = await this.prisma.companySettings.create({
      data: {
        companyId,
        defaultWarehouseId: null,
      },
    });

    const data = this.toDto(settings);
    await this.cache.set(cacheKey, data, 60 * 15);
    return data;
  }

  async update(
    companyId: string,
    dto: UpdateSettingsDto,
  ): Promise<any> {
    await this.getOrCreate(companyId);

    if (dto.defaultWarehouseId) {
      const warehouse = await this.prisma.warehouse.findUnique({
        where: { id: dto.defaultWarehouseId, companyId },
      });
      if (!warehouse) {
        throw new NotFoundException(
          'Default warehouse not found for this company',
        );
      }
    }

    const settings = await this.prisma.companySettings.update({
      where: { companyId },
      data: {
        timezone: dto.timezone,
        language: dto.language,
        dateFormat: dto.dateFormat,
        timeFormat: dto.timeFormat,
        currencyCode: dto.currencyCode,
        currencySymbol: dto.currencySymbol,
        decimalPlaces: dto.decimalPlaces,
        lowStockThreshold: dto.lowStockThreshold,
        lowStockAlerts: dto.lowStockAlerts,
        defaultWarehouseId: dto.defaultWarehouseId ?? undefined,
        autoBackup: dto.autoBackup,
        backupTime: dto.backupTime,
        dataRetention: dto.dataRetention,
      },
    });

    const data = this.toDto(settings);
    await this.cache.del(SETTINGS_KEY(companyId));
    return data;
  }

  private toDto(s: any) {
    return {
      id: s.id,
      companyId: s.companyId,
      timezone: s.timezone,
      language: s.language,
      dateFormat: s.dateFormat,
      timeFormat: s.timeFormat,
      currencyCode: s.currencyCode,
      currencySymbol: s.currencySymbol,
      decimalPlaces: s.decimalPlaces,
      lowStockThreshold: s.lowStockThreshold,
      lowStockAlerts: s.lowStockAlerts,
      defaultWarehouseId: s.defaultWarehouseId,
      autoBackup: s.autoBackup,
      backupTime: s.backupTime,
      dataRetention: s.dataRetention,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
    };
  }
}
