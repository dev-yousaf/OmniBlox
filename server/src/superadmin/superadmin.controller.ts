import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { SuperadminService } from './superadmin.service';
import { SuperadminGuard } from './guards/superadmin.guard';
import { CompanyId } from '../auth/decorators/company-id.decorator';

@Controller('superadmin')
@UseGuards(SuperadminGuard)
export class SuperadminController {
  constructor(private readonly superadminService: SuperadminService) {}

  @Get('dashboard')
  async getDashboard(
    @CompanyId() companyId: string,
    @Query('period') period?: string,
  ) {
    return this.superadminService.getDashboard(companyId, period || '1Y');
  }
}
