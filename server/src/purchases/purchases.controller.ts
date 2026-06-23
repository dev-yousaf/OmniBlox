import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PurchasesService } from './purchases.service';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { ReceivePurchaseOrderDto } from './dto/receive-purchase-order.dto';
import { AuthGuard } from '@thallesp/nestjs-better-auth';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CompanyId } from '../auth/decorators/company-id.decorator';
import { UserId } from '../auth/decorators/user-id.decorator';

@Controller('purchases')
@UseGuards(AuthGuard, RolesGuard)
export class PurchasesController {
  constructor(private readonly purchasesService: PurchasesService) {}

  @Post()
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  async create(
    @Body() dto: CreatePurchaseOrderDto,
    @UserId() userId: string,
    @CompanyId() companyId: string,
  ) {
    return this.purchasesService.create(dto, userId, companyId);
  }

  @Get()
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.STAFF)
  async findAll(@CompanyId() companyId: string) {
    return this.purchasesService.findAll(companyId);
  }

  @Get(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.STAFF)
  async findOne(@Param('id') id: string, @CompanyId() companyId: string) {
    return this.purchasesService.findOne(id, companyId);
  }

  @Patch(':id/receive')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  async receive(
    @Param('id') id: string,
    @Body() dto: ReceivePurchaseOrderDto,
    @CompanyId() companyId: string,
  ) {
    return this.purchasesService.receive(id, dto.warehouseId, companyId);
  }
}
