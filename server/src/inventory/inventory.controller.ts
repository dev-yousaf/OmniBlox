import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@thallesp/nestjs-better-auth';
import {
  GetCurrentUserId,
  GetCurrentCompanyId,
} from '../auth/decorators/current-user.decorator';
import { InventoryService } from './inventory.service';
import {
  CreateWarehouseDto,
  UpdateWarehouseDto,
  InventoryQueryDto,
  UpdateInventoryDto,
  StockTransferDto,
  CreateStockAdjustmentDto,
} from './dto/inventory.dto';

@Controller('inventory')
@UseGuards(AuthGuard)
export class InventoryController {
  constructor(private inventoryService: InventoryService) {}

  // === WAREHOUSE ENDPOINTS ===
  @Post('warehouses')
  createWarehouse(
    @GetCurrentCompanyId() companyId: string,
    @Body() dto: CreateWarehouseDto,
  ) {
    return this.inventoryService.createWarehouse(companyId, dto);
  }

  @Get('warehouses')
  getWarehouses(@GetCurrentCompanyId() companyId: string) {
    return this.inventoryService.getWarehouses(companyId);
  }

  @Get('warehouses/:id')
  getWarehouse(
    @GetCurrentCompanyId() companyId: string,
    @Param('id') id: string,
  ) {
    return this.inventoryService.getWarehouse(companyId, id);
  }

  @Put('warehouses/:id')
  updateWarehouse(
    @GetCurrentCompanyId() companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateWarehouseDto,
  ) {
    return this.inventoryService.updateWarehouse(companyId, id, dto);
  }

  @Delete('warehouses/:id')
  deleteWarehouse(
    @GetCurrentCompanyId() companyId: string,
    @Param('id') id: string,
  ) {
    return this.inventoryService.deleteWarehouse(companyId, id);
  }

  @Get('warehouses/:id/inventory')
  getWarehouseInventory(
    @GetCurrentCompanyId() companyId: string,
    @Param('id') warehouseId: string,
  ) {
    return this.inventoryService.getWarehouseInventory(companyId, warehouseId);
  }

  // === INVENTORY ENDPOINTS ===
  @Get()
  getInventory(
    @GetCurrentCompanyId() companyId: string,
    @Query() query: InventoryQueryDto,
  ) {
    return this.inventoryService.getInventory(companyId, query);
  }

  @Put(':productId/:warehouseId')
  updateInventory(
    @GetCurrentCompanyId() companyId: string,
    @Param('productId') productId: string,
    @Param('warehouseId') warehouseId: string,
    @Body() dto: UpdateInventoryDto,
  ) {
    return this.inventoryService.updateInventory(
      companyId,
      productId,
      warehouseId,
      dto,
    );
  }

  @Get('stats')
  getInventoryStats(@GetCurrentCompanyId() companyId: string) {
    return this.inventoryService.getInventoryStats(companyId);
  }

  @Get('product/:productId')
  getProductInventory(
    @GetCurrentCompanyId() companyId: string,
    @Param('productId') productId: string,
  ) {
    return this.inventoryService.getProductInventory(companyId, productId);
  }

  // === STOCK TRANSFER ENDPOINTS ===
  @Post('transfers')
  transferStock(
    @GetCurrentCompanyId() companyId: string,
    @GetCurrentUserId() userId: string,
    @Body() dto: StockTransferDto,
  ) {
    return this.inventoryService.transferStock(companyId, userId, dto);
  }

  // === STOCK ADJUSTMENT ENDPOINTS ===
  @Post('adjustments')
  createStockAdjustment(
    @GetCurrentCompanyId() companyId: string,
    @GetCurrentUserId() userId: string,
    @Body() dto: CreateStockAdjustmentDto,
  ) {
    return this.inventoryService.createStockAdjustment(companyId, userId, dto);
  }

  @Get('adjustments')
  getStockAdjustments(
    @GetCurrentCompanyId() companyId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const parsedPage = page ? parseInt(page, 10) : 1;
    const parsedLimit = limit ? parseInt(limit, 10) : 10;
    return this.inventoryService.getStockAdjustments(
      companyId,
      parsedPage,
      parsedLimit,
    );
  }
}
