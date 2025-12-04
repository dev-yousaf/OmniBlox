import {
  IsString,
  IsNotEmpty,
  IsInt,
  Min,
  IsOptional,
  IsDateString,
  IsArray,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

export class AdjustmentItemDto {
  @IsString()
  @IsNotEmpty()
  readonly productId!: string;

  @IsInt()
  @Min(0)
  readonly newQuantity!: number;
}

export class CreateStockAdjustmentDto {
  @IsString()
  @IsNotEmpty()
  readonly warehouseId!: string;

  @IsOptional()
  @IsString()
  readonly notes?: string;

  @IsDateString()
  readonly adjustmentDate!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AdjustmentItemDto)
  @ArrayMinSize(1)
  readonly items!: AdjustmentItemDto[];
}
