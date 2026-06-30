import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../cache/cache.service';
import {
  AuditLogEntryDto,
  AuditLogListResponseDto,
  CreateAuditLogDto,
} from './dto/audit-log.dto';

const LIST_KEY = (cid: string, page?: number, limit?: number) =>
  `auditlogs:${cid}:${page ?? 1}:${limit ?? 50}`;

@Injectable()
export class AuditLogService {
  constructor(
    private prisma: PrismaService,
    private cache: CacheService,
  ) {}

  async create(
    dto: CreateAuditLogDto, companyId: string, userId: string,
    userName: string, userRole: string, ipAddress?: string,
  ): Promise<AuditLogEntryDto> {
    const log = await this.prisma.auditLog.create({
      data: {
        action: dto.action, entity: dto.entity, entityId: dto.entityId ?? null,
        details: dto.details ?? null, companyId, userId, userName, userRole,
        ipAddress: ipAddress ?? null,
      },
    });
    await this.cache.del(LIST_KEY(companyId));
    return this.toDto(log);
  }

  async findAll(
    companyId: string, page: number = 1, limit: number = 50,
  ): Promise<AuditLogListResponseDto> {
    const cacheKey = LIST_KEY(companyId, page, limit);
    const cached = await this.cache.get<AuditLogListResponseDto>(cacheKey);
    if (cached) return cached;

    const skip = (page - 1) * limit;
    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where: { companyId }, orderBy: { createdAt: 'desc' }, skip, take: limit,
      }),
      this.prisma.auditLog.count({ where: { companyId } }),
    ]);

    const data: AuditLogListResponseDto = {
      logs: logs.map((l) => this.toDto(l)), total, page, limit,
    };

    await this.cache.set(cacheKey, data, 60 * 2);
    return data;
  }

  private toDto(l: any): AuditLogEntryDto {
    return {
      id: l.id, userId: l.userId, userName: l.userName, userRole: l.userRole,
      action: l.action, entity: l.entity, entityId: l.entityId || undefined,
      details: l.details || undefined, createdAt: l.createdAt.toISOString(),
    };
  }
}
