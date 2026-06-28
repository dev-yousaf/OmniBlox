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
    @UserId() userId: string,
  ) {
    return this.productService.create(createProductDto, companyId, userId);
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
    @Query('warehouseId') warehouseId?: string,
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
      warehouseId,
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

  @Get('low-stock/details')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.OBSERVER)
  async getLowStockDetails(
    @CompanyId() companyId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page) : 1;
    const limitNum = limit ? parseInt(limit) : 10;
    return this.productService.getLowStockDetails(companyId, pageNum, limitNum);
  }

  @Get('expired')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.OBSERVER)
  async getExpiredProducts(
    @CompanyId() companyId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page) : 1;
    const limitNum = limit ? parseInt(limit) : 10;
    return this.productService.getExpiredProducts(companyId, pageNum, limitNum);
  }

  @Get('stats')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.OBSERVER)
  async getStats(@CompanyId() companyId: string) {
    return this.productService.getStats(companyId);
  }

  @Get('export')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.OBSERVER)
  async exportCsv(@CompanyId() companyId: string) {
    const csv = await this.productService.exportCsv(companyId);
    return csv;
  }

  @Post('import')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  @HttpCode(HttpStatus.CREATED)
  async importCsv(
    @Body() products: CreateProductDto[],
    @CompanyId() companyId: string,
  ) {
    return this.productService.importCsv(products, companyId);
  }

  @Post('bulk-update-price')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  @HttpCode(HttpStatus.OK)
  async bulkUpdatePrice(
    @Body() body: { updates: { id: string; salePrice: number; costPrice?: number }[] },
    @CompanyId() companyId: string,
  ) {
    return this.productService.bulkUpdatePrice(body.updates, companyId);
  }

  @Get('export-excel')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.OBSERVER)
  async exportExcel(@CompanyId() companyId: string) {
    return this.productService.exportExcel(companyId);
  }

  @Get('sku/:sku')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.OBSERVER)
  async findBySku(@Param('sku') sku: string, @CompanyId() companyId: string) {
    return this.productService.findBySku(sku, companyId);
  }

  // STOCK ADJUSTMENTS - must be before :id routes
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

  @Get(':id/combo-items')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.OBSERVER)
  async getComboItems(@Param('id') id: string, @CompanyId() companyId: string) {
    return this.productService.getComboItems(id, companyId);
  }

  @Get(':id/sales')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.OBSERVER)
  async getProductSales(@Param('id') id: string, @CompanyId() companyId: string) {
    return this.productService.getProductSales(id, companyId);
  }

  @Get(':id/quotations')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.OBSERVER)
  async getProductQuotations(@Param('id') id: string, @CompanyId() companyId: string) {
    return this.productService.getProductQuotations(id, companyId);
  }

  @Get(':id/purchases')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.OBSERVER)
  async getProductPurchases(@Param('id') id: string, @CompanyId() companyId: string) {
    return this.productService.getProductPurchases(id, companyId);
  }

  @Get('warehouses')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.OBSERVER)
  async getWarehouses(@CompanyId() companyId: string) {
    return this.productService.getWarehouses(companyId);
  }
}
