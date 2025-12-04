import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { PurchaseReturnsService } from './purchase-returns.service';
import { CreatePurchaseReturnDto } from './dto/create-purchase-return.dto';
import { UpdatePurchaseReturnDto } from './dto/update-purchase-return.dto';
import { AuthGuard } from '@thallesp/nestjs-better-auth';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { UserId } from '../auth/decorators/user-id.decorator';
import { CompanyId } from '../auth/decorators/company-id.decorator';

@Controller('purchase-returns')
@UseGuards(AuthGuard, RolesGuard)
export class PurchaseReturnsController {
  constructor(
    private readonly purchaseReturnsService: PurchaseReturnsService,
  ) {}

  @Post()
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  create(
    @Body() createPurchaseReturnDto: CreatePurchaseReturnDto,
    @UserId() userId: string,
    @CompanyId() companyId: string,
  ) {
    return this.purchaseReturnsService.create(
      createPurchaseReturnDto,
      userId,
      companyId,
    );
  }

  @Get()
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.STAFF)
  findAll(@CompanyId() companyId: string) {
    return this.purchaseReturnsService.findAll(companyId);
  }

  @Get(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.STAFF)
  findOne(@Param('id') id: string, @CompanyId() companyId: string) {
    return this.purchaseReturnsService.findOne(id, companyId);
  }

  @Patch(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  update(
    @Param('id') id: string,
    @Body() updatePurchaseReturnDto: UpdatePurchaseReturnDto,
    @CompanyId() companyId: string,
  ) {
    return this.purchaseReturnsService.update(
      id,
      updatePurchaseReturnDto,
      companyId,
    );
  }

  @Delete(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  remove(@Param('id') id: string, @CompanyId() companyId: string) {
    return this.purchaseReturnsService.remove(id, companyId);
  }
}
