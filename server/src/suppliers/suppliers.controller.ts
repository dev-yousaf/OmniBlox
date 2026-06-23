import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { AuthGuard } from '@thallesp/nestjs-better-auth';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CompanyId } from '../auth/decorators/company-id.decorator';
import { SuppliersService } from './suppliers.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';

@Controller('suppliers')
@UseGuards(AuthGuard, RolesGuard)
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  async create(
    @Body() dto: CreateSupplierDto,
    @CompanyId() companyId: string,
  ) {
    return this.suppliersService.create(dto, companyId);
  }

  @Get()
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.OBSERVER)
  async findAll(
    @CompanyId() companyId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.suppliersService.findAll(companyId, pageNum, limitNum, search);
  }

  @Get(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.OBSERVER)
  async findOne(
    @Param('id') id: string,
    @CompanyId() companyId: string,
  ) {
    return this.suppliersService.findOne(id, companyId);
  }

  @Put(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateSupplierDto,
    @CompanyId() companyId: string,
  ) {
    return this.suppliersService.update(id, dto, companyId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  async remove(
    @Param('id') id: string,
    @CompanyId() companyId: string,
  ) {
    await this.suppliersService.remove(id, companyId);
  }
}
