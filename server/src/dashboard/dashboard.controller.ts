import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { AuthGuard } from '@thallesp/nestjs-better-auth';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CompanyId } from '../auth/decorators/company-id.decorator';
import { UserRole } from '@prisma/client';

@Controller('dashboard')
@UseGuards(AuthGuard, RolesGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.OBSERVER)
  async getDashboard(
    @CompanyId() companyId: string,
    @Query('period') period?: string,
  ) {
    return this.dashboardService.getData(companyId, period || '1Y');
  }

  @Get('top-selling')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.OBSERVER)
  async getTopSelling(
    @CompanyId() companyId: string,
    @Query('period') period?: string,
  ) {
    return this.dashboardService.getTopSellingForPeriod(companyId, period || '1Y');
  }

  @Get('recent-sales')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.OBSERVER)
  async getRecentSales(
    @CompanyId() companyId: string,
    @Query('period') period?: string,
  ) {
    return this.dashboardService.getRecentSalesForPeriod(companyId, period || '1Y');
  }

  @Get('sales-stats')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.OBSERVER)
  async getSalesStats(
    @CompanyId() companyId: string,
    @Query('period') period?: string,
  ) {
    return this.dashboardService.getChartForPeriod(companyId, period || '1Y');
  }
}
