import {
  IsString,
  IsOptional,
  IsArray,
  ValidateNested,
  IsInt,
  Min,
  IsUUID,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateStockAdjustmentItemDto {
  @IsString()
  @IsUUID()
  productId: string;

  @IsString()
  @IsUUID()
  warehouseId: string;

  @IsInt()
  @Min(0)
  previousQuantity: number;

  @IsInt()
  @Min(0)
  newQuantity: number;
}

export class CreateStockAdjustmentDto {
  @IsOptional()
  @IsString()
  notes?: string;

  @IsString()
  @IsOptional()
  documentUrl?: string;

  @IsIn(['ADDITION', 'REMOVAL'])
  @IsOptional()
  type?: string = 'ADDITION';

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateStockAdjustmentItemDto)
  items: CreateStockAdjustmentItemDto[];
}
