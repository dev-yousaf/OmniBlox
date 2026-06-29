import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogEntryDto, AuditLogListResponseDto, CreateAuditLogDto } from './dto/audit-log.dto';

@Injectable()
export class AuditLogService {
  constructor(private prisma: PrismaService) {}

  async create(
    dto: CreateAuditLogDto,
    companyId: string,
    userId: string,
    userName: string,
    userRole: string,
    ipAddress?: string,
  ): Promise<AuditLogEntryDto> {
    const log = await this.prisma.auditLog.create({
      data: {
        action: dto.action,
        entity: dto.entity,
        entityId: dto.entityId ?? null,
        details: dto.details ?? null,
        companyId,
        userId,
        userName,
        userRole,
        ipAddress: ipAddress ?? null,
      },
    });
    return this.toDto(log);
  }

  async findAll(
    companyId: string,
    page: number = 1,
    limit: number = 50,
  ): Promise<AuditLogListResponseDto> {
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where: { companyId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.auditLog.count({ where: { companyId } }),
    ]);

    return {
      logs: logs.map((l) => this.toDto(l)),
      total,
      page,
      limit,
    };
  }

  private toDto(l: any): AuditLogEntryDto {
    return {
      id: l.id,
      userId: l.userId,
      userName: l.userName,
      userRole: l.userRole,
      action: l.action,
      entity: l.entity,
      entityId: l.entityId || undefined,
      details: l.details || undefined,
      createdAt: l.createdAt.toISOString(),
    };
  }
}
