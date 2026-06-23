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
import { SalesReturnsService } from './sales-returns.service';
import { CreateSalesReturnDto } from './dto/create-sales-return.dto';
import { UpdateSalesReturnDto } from './dto/update-sales-return.dto';
import { AuthGuard } from '@thallesp/nestjs-better-auth';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { UserId } from '../auth/decorators/user-id.decorator';
import { CompanyId } from '../auth/decorators/company-id.decorator';

@Controller('sales-returns')
@UseGuards(AuthGuard, RolesGuard)
export class SalesReturnsController {
  constructor(private readonly salesReturnsService: SalesReturnsService) {}

  @Post()
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  create(
    @Body() createSalesReturnDto: CreateSalesReturnDto,
    @UserId() userId: string,
    @CompanyId() companyId: string,
  ) {
    return this.salesReturnsService.create(
      createSalesReturnDto,
      userId,
      companyId,
    );
  }

  @Get()
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.OBSERVER)
  findAll(@CompanyId() companyId: string) {
    return this.salesReturnsService.findAll(companyId);
  }

  @Get(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.OBSERVER)
  findOne(@Param('id') id: string, @CompanyId() companyId: string) {
    return this.salesReturnsService.findOne(id, companyId);
  }

  @Patch(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  update(
    @Param('id') id: string,
    @Body() updateSalesReturnDto: UpdateSalesReturnDto,
    @CompanyId() companyId: string,
  ) {
    return this.salesReturnsService.update(id, updateSalesReturnDto, companyId);
  }

  @Delete(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  remove(@Param('id') id: string, @CompanyId() companyId: string) {
    return this.salesReturnsService.remove(id, companyId);
  }
}
