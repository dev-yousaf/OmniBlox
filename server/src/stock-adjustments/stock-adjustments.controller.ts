import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { StockAdjustmentsService } from './stock-adjustments.service';
import { CreateStockAdjustmentDto } from './dto/create-stock-adjustment.dto';
import { AuthGuard } from '@thallesp/nestjs-better-auth';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CompanyId } from '../auth/decorators/company-id.decorator';
import { GetCurrentUserId } from '../auth/decorators/current-user.decorator';

@Controller('stock-adjustments')
@UseGuards(AuthGuard, RolesGuard)
export class StockAdjustmentsController {
  constructor(
    private readonly stockAdjustmentsService: StockAdjustmentsService,
  ) {}

  @Post()
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  async create(
    @Body() dto: CreateStockAdjustmentDto,
    @GetCurrentUserId() userId: string,
    @CompanyId() companyId: string,
  ) {
    return this.stockAdjustmentsService.create(dto, userId, companyId);
  }

  @Get()
  async findAll(@CompanyId() companyId: string) {
    return this.stockAdjustmentsService.findAll(companyId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @CompanyId() companyId: string) {
    return this.stockAdjustmentsService.findOne(id, companyId);
  }
}
