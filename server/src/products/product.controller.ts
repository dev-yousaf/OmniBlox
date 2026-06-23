import {
  Controller,
  Get,
  Post,
  Body,
  Put,
  Param,
  Delete,
  Query,
  UseGuards,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { ProductService } from './product.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { CreateStockAdjustmentDto } from './dto/create-stock-adjustment.dto';
import { AuthGuard } from '@thallesp/nestjs-better-auth';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CompanyId } from '../auth/decorators/company-id.decorator';
import { UserRole } from '@prisma/client';
import { UserId } from '../auth/decorators/user-id.decorator';

@Controller('products')
@UseGuards(AuthGuard, RolesGuard)
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  // CREATE - Management roles only
  @Post()
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createProductDto: CreateProductDto,
    @CompanyId() companyId: string,
  ) {
    return this.productService.create(createProductDto, companyId);
  }

  // READ - All authenticated users
  @Get('/')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.OBSERVER)
  async findAll(
    @CompanyId() companyId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('category') category?: string,
    @Query('status') status?: string,
  ) {
    const pageNum = page ? parseInt(page) : 1;
    const limitNum = limit ? parseInt(limit) : 10;

    return this.productService.findAll(
      companyId,
      pageNum,
      limitNum,
      search,
      category,
      status,
    );
  }

  @Get('categories')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.OBSERVER)
  async getCategories(@CompanyId() companyId: string) {
    return this.productService.getCategories(companyId);
  }

  @Get('brands')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.OBSERVER)
  async getBrands(@CompanyId() companyId: string) {
    return this.productService.getBrands(companyId);
  }

  @Get('low-stock')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.OBSERVER)
  async getLowStockProducts(@CompanyId() companyId: string) {
    return this.productService.getLowStockProducts(companyId);
  }

  @Get('stats')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.OBSERVER)
  async getStats(@CompanyId() companyId: string) {
    return this.productService.getStats(companyId);
  }

  @Get('sku/:sku')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.OBSERVER)
  async findBySku(@Param('sku') sku: string, @CompanyId() companyId: string) {
    return this.productService.findBySku(sku, companyId);
  }

  @Get(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.OBSERVER)
  async findOne(@Param('id') id: string, @CompanyId() companyId: string) {
    return this.productService.findOne(id, companyId);
  }

  // UPDATE - Management roles only
  @Put(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  async update(
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
    @CompanyId() companyId: string,
  ) {
    return this.productService.update(id, updateProductDto, companyId);
  }

  @Put(':id/stock')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  async updateStock(
    @Param('id') id: string,
    @Body() body: { quantity: number; operation: 'add' | 'subtract' },
    @CompanyId() companyId: string,
  ) {
    return this.productService.updateStock(
      id,
      body.quantity,
      body.operation,
      companyId,
    );
  }

  // DELETE - Management roles only
  @Delete(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string, @CompanyId() companyId: string) {
    return this.productService.remove(id, companyId);
  }

  // STOCK ADJUSTMENTS - Management roles only
  @Post('adjustments')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  @HttpCode(HttpStatus.CREATED)
  async createStockAdjustment(
    @Body() createStockAdjustmentDto: CreateStockAdjustmentDto,
    @UserId() userId: string,
    @CompanyId() companyId: string,
  ) {
    return this.productService.createStockAdjustment(
      createStockAdjustmentDto,
      userId,
      companyId,
    );
  }

  @Get('adjustments')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.OBSERVER)
  async getStockAdjustments(@CompanyId() companyId: string) {
    return this.productService.getStockAdjustments(companyId);
  }

  @Get('adjustments/:id')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.OBSERVER)
  async getStockAdjustment(
    @Param('id') id: string,
    @CompanyId() companyId: string,
  ) {
    return this.productService.getStockAdjustment(id, companyId);
  }

  @Get(':id/ledger')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.OBSERVER)
  async getStockLedger(@Param('id') id: string, @CompanyId() companyId: string) {
    return this.productService.getStockLedger(id, companyId);
  }

  @Get(':id/variants')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.OBSERVER)
  async getVariants(@Param('id') id: string, @CompanyId() companyId: string) {
    return this.productService.getVariants(id, companyId);
  }

  @Get('warehouses')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.OBSERVER)
  async getWarehouses(@CompanyId() companyId: string) {
    return this.productService.getWarehouses(companyId);
  }
}
