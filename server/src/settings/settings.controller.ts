import {
  Body,
  Controller,
  Get,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { AuthGuard } from '@thallesp/nestjs-better-auth';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CompanyId } from '../auth/decorators/company-id.decorator';
import { GetCurrentUser } from '../auth/decorators/current-user.decorator';
import { SettingsService } from './settings.service';
import { AuditLogService } from '../audit-logs/audit-logs.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import type { Request } from 'express';

@Controller('settings')
@UseGuards(AuthGuard, RolesGuard)
export class SettingsController {
  constructor(
    private readonly settingsService: SettingsService,
    private readonly auditLogService: AuditLogService,
  ) {}

  @Get()
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.OBSERVER)
  async get(@CompanyId() companyId: string) {
    return this.settingsService.getOrCreate(companyId);
  }

  @Put()
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  async update(
    @Body() dto: UpdateSettingsDto,
    @CompanyId() companyId: string,
    @GetCurrentUser() user: any,
    @Req() req: Request,
  ) {
    const updated = await this.settingsService.update(companyId, dto);
    const ip = req.ip || req.socket?.remoteAddress;
    await this.auditLogService.create(
      {
        action: 'UPDATE',
        entity: 'Settings',
        entityId: updated.id,
        details: JSON.stringify(dto),
      },
      companyId,
      user.id,
      user.name || user.email,
      user.role,
      ip,
    );
    return updated;
  }
}
