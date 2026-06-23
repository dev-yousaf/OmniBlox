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
import { UserRole } from '@prisma/client';
import { AuthGuard } from '@thallesp/nestjs-better-auth';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CompanyId } from '../auth/decorators/company-id.decorator';
import { UserId } from '../auth/decorators/user-id.decorator';
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
@UseGuards(AuthGuard, RolesGuard)
export class InventoryController {
  constructor(private inventoryService: InventoryService) {}

  // === WAREHOUSE ENDPOINTS ===
  @Post('warehouses')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  createWarehouse(
    @CompanyId() companyId: string,
    @Body() dto: CreateWarehouseDto,
  ) {
    return this.inventoryService.createWarehouse(companyId, dto);
  }

  @Get('warehouses')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.STAFF)
  getWarehouses(@CompanyId() companyId: string) {
    return this.inventoryService.getWarehouses(companyId);
  }

  @Get('warehouses/:id')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.STAFF)
  getWarehouse(
    @CompanyId() companyId: string,
    @Param('id') id: string,
  ) {
    return this.inventoryService.getWarehouse(companyId, id);
  }

  @Put('warehouses/:id')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  updateWarehouse(
    @CompanyId() companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateWarehouseDto,
  ) {
    return this.inventoryService.updateWarehouse(companyId, id, dto);
  }

  @Delete('warehouses/:id')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  deleteWarehouse(
    @CompanyId() companyId: string,
    @Param('id') id: string,
  ) {
    return this.inventoryService.deleteWarehouse(companyId, id);
  }

  @Get('warehouses/:id/inventory')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.STAFF)
  getWarehouseInventory(
    @CompanyId() companyId: string,
    @Param('id') warehouseId: string,
  ) {
    return this.inventoryService.getWarehouseInventory(companyId, warehouseId);
  }

  // === INVENTORY ENDPOINTS ===
  @Get()
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.STAFF)
  getInventory(
    @CompanyId() companyId: string,
    @Query() query: InventoryQueryDto,
  ) {
    return this.inventoryService.getInventory(companyId, query);
  }

  @Put(':productId/:warehouseId')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  updateInventory(
    @CompanyId() companyId: string,
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
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.STAFF)
  getInventoryStats(@CompanyId() companyId: string) {
    return this.inventoryService.getInventoryStats(companyId);
  }

  @Get('product/:productId')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.STAFF)
  getProductInventory(
    @CompanyId() companyId: string,
    @Param('productId') productId: string,
  ) {
    return this.inventoryService.getProductInventory(companyId, productId);
  }

  // === STOCK TRANSFER ENDPOINTS ===
  @Post('transfers')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  transferStock(
    @CompanyId() companyId: string,
    @UserId() userId: string,
    @Body() dto: StockTransferDto,
  ) {
    return this.inventoryService.transferStock(companyId, userId, dto);
  }

  // === STOCK ADJUSTMENT ENDPOINTS ===
  @Post('adjustments')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  createStockAdjustment(
    @CompanyId() companyId: string,
    @UserId() userId: string,
    @Body() dto: CreateStockAdjustmentDto,
  ) {
    return this.inventoryService.createStockAdjustment(companyId, userId, dto);
  }

  @Get('adjustments')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.STAFF)
  getStockAdjustments(
    @CompanyId() companyId: string,
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
