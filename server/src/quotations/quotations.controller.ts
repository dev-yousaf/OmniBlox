import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Put,
  UseGuards,
} from '@nestjs/common';
import { QuotationsService } from './quotations.service';
import { CreateQuotationDto } from './dto/create-quotation.dto';
import { UpdateQuotationDto } from './dto/update-quotation.dto';
import { UpdateQuotationStatusDto } from './dto/update-quotation-status.dto';
import { AuthGuard } from '@thallesp/nestjs-better-auth';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { UserId } from '../auth/decorators/user-id.decorator';
import { CompanyId } from '../auth/decorators/company-id.decorator';

@Controller('quotations')
@UseGuards(AuthGuard, RolesGuard)
export class QuotationsController {
  constructor(private readonly quotationsService: QuotationsService) {}

  @Post()
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.STAFF)
  create(
    @Body() createQuotationDto: CreateQuotationDto,
    @UserId() userId: string,
    @CompanyId() companyId: string,
  ) {
    return this.quotationsService.create(createQuotationDto, userId, companyId);
  }

  @Get()
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.STAFF)
  findAll(@CompanyId() companyId: string) {
    return this.quotationsService.findAll(companyId);
  }

  @Get(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.STAFF)
  findOne(@Param('id') id: string, @CompanyId() companyId: string) {
    return this.quotationsService.findOne(id, companyId);
  }

  @Put(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  update(
    @Param('id') id: string,
    @Body() updateQuotationDto: UpdateQuotationDto,
    @CompanyId() companyId: string,
  ) {
    return this.quotationsService.update(id, updateQuotationDto, companyId);
  }

  @Patch(':id/status')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.STAFF)
  updateStatus(
    @Param('id') id: string,
    @Body() updateStatusDto: UpdateQuotationStatusDto,
    @CompanyId() companyId: string,
  ) {
    return this.quotationsService.updateStatus(id, updateStatusDto, companyId);
  }

  @Delete(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  remove(@Param('id') id: string, @CompanyId() companyId: string) {
    return this.quotationsService.remove(id, companyId);
  }

  @Post(':id/convert-to-sale')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.STAFF)
  convertToSale(
    @Param('id') id: string,
    @Body() body: { warehouseId?: string },
    @UserId() userId: string,
    @CompanyId() companyId: string,
  ) {
    return this.quotationsService.convertToSale(
      id,
      userId,
      companyId,
      body.warehouseId,
    );
  }

  @Get(':id/stock-levels')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.STAFF)
  getStockLevels(@Param('id') id: string, @CompanyId() companyId: string) {
    return this.quotationsService.getStockLevels(id, companyId);
  }
}
