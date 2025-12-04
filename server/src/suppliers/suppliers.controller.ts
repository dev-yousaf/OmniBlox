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
import { AuthGuard } from '@thallesp/nestjs-better-auth';
import { GetCurrentCompanyId } from '../auth/decorators/current-user.decorator';
import { SuppliersService } from './suppliers.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';

@Controller('suppliers')
@UseGuards(AuthGuard)
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() dto: CreateSupplierDto,
    @GetCurrentCompanyId() companyId: string,
  ) {
    return this.suppliersService.create(dto, companyId);
  }

  @Get()
  async findAll(
    @GetCurrentCompanyId() companyId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.suppliersService.findAll(companyId, pageNum, limitNum, search);
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @GetCurrentCompanyId() companyId: string,
  ) {
    return this.suppliersService.findOne(id, companyId);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateSupplierDto,
    @GetCurrentCompanyId() companyId: string,
  ) {
    return this.suppliersService.update(id, dto, companyId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id') id: string,
    @GetCurrentCompanyId() companyId: string,
  ) {
    await this.suppliersService.remove(id, companyId);
  }
}
