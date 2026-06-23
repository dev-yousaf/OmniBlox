import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsInt,
  IsIn,
  Min,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import type { ProductStatus } from '@prisma/client';

class ComboItemDto {
  @IsString()
  @IsNotEmpty()
  productId: string;

  @IsInt()
  @Min(1)
  quantity: number;
}

export class UpdateProductDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  sku?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsString()
  @IsOptional()
  brand?: string;

  @IsString()
  @IsOptional()
  unit?: string;

  @IsString()
  @IsOptional()
  imageUrl?: string;

  @IsString()
  @IsOptional()
  barcodeSymbology?: string;

  @Transform(({value}) => parseFloat(value))
  @IsNumber({maxDecimalPlaces:2})
  @Min(0)
  @IsOptional()
  taxRate?: number;

  @Transform(({value}) => parseInt(value))
  @IsInt()
  @Min(0)
  @IsOptional()
  alertQuantity?: number;

  @Transform(({ value }) => parseFloat(value))
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  salePrice?: number;

  @Transform(({ value }) => parseFloat(value))
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  costPrice?: number;

  @Transform(({ value }) => parseInt(value))
  @IsInt()
  @Min(0)
  @IsOptional()
  stock?: number;

  @Transform(({ value }) => parseInt(value))
  @IsInt()
  @Min(0)
  @IsOptional()
  reorderLevel?: number;

  @IsIn(['ACTIVE', 'INACTIVE', 'DISCONTINUED'])
  @IsOptional()
  status?: ProductStatus;

  @IsIn(['STANDARD', 'DIGITAL', 'SERVICE', 'COMBO'])
  @IsOptional()
  type?: string;

  hasVariants?: boolean;

  attributes?: Record<string, string>;

  parentId?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ComboItemDto)
  comboItems?: ComboItemDto[];
}
