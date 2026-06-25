import {
  Controller,
  Get,
  Put,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { InboxService } from './inbox.service';
import { AuthGuard } from '@thallesp/nestjs-better-auth';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CompanyId } from '../auth/decorators/company-id.decorator';
import { UserRole } from '@prisma/client';

@Controller('inbox')
@UseGuards(AuthGuard, RolesGuard)
export class InboxController {
  constructor(private readonly inboxService: InboxService) {}

  @Get()
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.OBSERVER)
  findAll(
    @CompanyId() companyId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.inboxService.findAll(
      companyId,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
    );
  }

  @Put(':id/read')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.OBSERVER)
  markAsRead(@Param('id') id: string, @CompanyId() companyId: string) {
    return this.inboxService.markAsRead(id, companyId);
  }

  @Put('mark-all-read')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.OBSERVER)
  markAllAsRead(@CompanyId() companyId: string) {
    return this.inboxService.markAllAsRead(companyId);
  }
}
