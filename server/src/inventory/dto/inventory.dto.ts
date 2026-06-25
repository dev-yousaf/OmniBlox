import {
  IsString,
  IsOptional,
  IsInt,
  IsUUID,
  Min,
  IsEnum,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateWarehouseDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  location?: string;
}

export class UpdateWarehouseDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  location?: string;
}

export class InventoryQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsUUID()
  warehouseId?: string;

  @IsOptional()
  @IsEnum(['low_stock', 'out_of_stock', 'all'])
  filter?: 'low_stock' | 'out_of_stock' | 'all' = 'all';
}

export class UpdateInventoryDto {
  @IsInt()
  @Min(0)
  quantity: number;
}

export class StockTransferDto {
  @IsUUID()
  productId: string;

  @IsUUID()
  fromWarehouseId: string;

  @IsUUID()
  toWarehouseId: string;

  @IsInt()
  @Min(1)
  quantity: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class BulkStockTransferItemDto {
  @IsUUID()
  productId: string;

  @IsInt()
  @Min(1)
  quantity: number;
}

export class BulkStockTransferDto {
  @IsUUID()
  fromWarehouseId: string;

  @IsUUID()
  toWarehouseId: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkStockTransferItemDto)
  items: BulkStockTransferItemDto[];
}

export class CreateStockAdjustmentDto {
  @IsString()
  notes?: string;

  adjustmentItems: StockAdjustmentItemDto[];
}

export class StockAdjustmentItemDto {
  @IsUUID()
  productId: string;

  @IsUUID()
  warehouseId: string;

  @IsInt()
  @Min(0)
  newQuantity: number;
}

export interface InventoryStatsDto {
  totalProducts: number;
  totalWarehouses: number;
  lowStockProducts: number;
  outOfStockProducts: number;
  totalStockValue: number;
  recentAdjustments: number;
}

export interface InventoryItemDto {
  productId: string;
  productName: string;
  productSku: string;
  imageUrl: string | null;
  warehouseId: string;
  warehouseName: string;
  quantity: number;
  salePrice: number;
  costPrice: number;
  reorderLevel: number;
  stockValue: number;
  status: 'in_stock' | 'low_stock' | 'out_of_stock';
  category: string;
  brand?: string;
  updatedAt: string;
}

export interface WarehouseInventoryDto {
  warehouseId: string;
  warehouseName: string;
  location?: string;
  totalProducts: number;
  totalStockValue: number;
  lowStockCount: number;
  outOfStockCount: number;
  inventory: InventoryItemDto[];
}
