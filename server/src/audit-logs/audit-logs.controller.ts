import { Controller, Get, Post, Body, Query, UseGuards, Req } from '@nestjs/common';
import { AuditLogService } from './audit-logs.service';
import { CreateAuditLogDto } from './dto/audit-log.dto';
import { AuthGuard } from '@thallesp/nestjs-better-auth';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CompanyId } from '../auth/decorators/company-id.decorator';
import { GetCurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';
import type { Request } from 'express';

@Controller('audit-logs')
@UseGuards(AuthGuard, RolesGuard)
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Post()
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  create(
    @Body() dto: CreateAuditLogDto,
    @CompanyId() companyId: string,
    @GetCurrentUser() user: any,
    @Req() req: Request,
  ) {
    const ip = req.ip || req.socket?.remoteAddress;
    return this.auditLogService.create(dto, companyId, user.id, user.name || user.email, user.role, ip);
  }

  @Get()
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.OBSERVER)
  findAll(
    @CompanyId() companyId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.auditLogService.findAll(
      companyId,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 50,
    );
  }
}
