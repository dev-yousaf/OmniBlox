import { Controller, Get, UseGuards } from '@nestjs/common';
import { ReturnsService } from './returns.service';
import { AuthGuard } from '@thallesp/nestjs-better-auth';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { CompanyId } from '../auth/decorators/company-id.decorator';

@Controller('returns')
@UseGuards(AuthGuard, RolesGuard)
export class ReturnsController {
  constructor(private readonly returnsService: ReturnsService) {}

  @Get()
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.OBSERVER)
  findAll(@CompanyId() companyId: string) {
    return this.returnsService.findAllReturns(companyId);
  }
}
