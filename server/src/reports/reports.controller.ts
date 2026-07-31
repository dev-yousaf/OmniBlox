import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { AuthGuard } from '@thallesp/nestjs-better-auth';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CompanyId } from '../auth/decorators/company-id.decorator';
import { ReportsService } from './reports.service';
import { GenerateExpenseReportDto } from './dto/generate-expense-report.dto';

@Controller('reports')
@UseGuards(AuthGuard, RolesGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Post('expenses')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.OBSERVER)
  generateExpenseReport(
    @CompanyId() companyId: string,
    @Body() dto: GenerateExpenseReportDto,
  ) {
    return this.reportsService.generateExpenseReport(companyId, dto);
  }
}
