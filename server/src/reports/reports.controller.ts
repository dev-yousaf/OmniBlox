import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { GenerateExpenseReportDto } from './dto/generate-expense-report.dto';
import { DateRangeDto } from './dto/date-range.dto';
import { AuthGuard } from '@thallesp/nestjs-better-auth';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CompanyId } from '../auth/decorators/company-id.decorator';
import { UserRole } from '@prisma/client';

@Controller('reports')
@UseGuards(AuthGuard, RolesGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Post('expenses')
  generateExpenseReport(
    @Body() dto: GenerateExpenseReportDto,
    @CompanyId() companyId: string,
  ) {
    return this.reportsService.generateExpenseReport(dto, companyId);
  }

  /**
   * Financial Summary Report - Profit & Loss Statement
   * Restricted to OWNER, ADMIN, and MANAGER roles
   */
  @Post('financial-summary')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  async getFinancialSummary(
    @Body() dto: DateRangeDto,
    @CompanyId() companyId: string,
  ) {
    return this.reportsService.getFinancialSummary(dto, companyId);
  }

  /**
   * Inventory Summary Report
   * Restricted to MANAGER and above
   */
  @Post('inventory-summary')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  async getInventorySummary(
    @Body() dto: DateRangeDto,
    @CompanyId() companyId: string,
  ) {
    return this.reportsService.getInventorySummary(dto, companyId);
  }

  /**
   * Sales Summary Report
   * Restricted to MANAGER and above
   */
  @Post('sales-summary')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  async getSalesSummary(
    @Body() dto: DateRangeDto,
    @CompanyId() companyId: string,
  ) {
    return this.reportsService.getSalesSummary(dto, companyId);
  }

  /**
   * Staff Performance Report
   * Restricted to OWNER and ADMIN only (contains sensitive performance data)
   */
  @Post('staff-performance')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async getStaffPerformance(
    @Body() dto: DateRangeDto,
    @CompanyId() companyId: string,
  ) {
    return this.reportsService.getStaffPerformance(dto, companyId);
  }

  /**
   * Tax Summary Report
   * Restricted to MANAGER and above
   */
  @Post('tax-summary')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  async getTaxSummary(
    @Body() dto: DateRangeDto,
    @CompanyId() companyId: string,
  ) {
    return this.reportsService.getTaxSummary(dto, companyId);
  }
}
