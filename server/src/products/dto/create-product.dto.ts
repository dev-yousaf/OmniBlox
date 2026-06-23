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

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  sku: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsNotEmpty()
  category: string;

  @IsString()
  @IsOptional()
  subCategory?: string;

  @IsString()
  @IsOptional()
  brand?: string;

  @IsString()
  @IsOptional()
  unit?: string = 'pcs';

  @IsString()
  @IsOptional()
  imageUrl?: string;

  @IsString()
  @IsOptional()
  barcodeSymbology?: string = 'CODE128';

  @IsString()
  @IsOptional()
  itemCode?: string;

  @IsString()
  @IsOptional()
  manufacturer?: string;

  @IsString()
  @IsOptional()
  warranty?: string;

  @IsOptional()
  manufacturedDate?: string;

  @IsOptional()
  expiryDate?: string;

  @Transform(({value}) => parseFloat(value))
  @IsNumber({maxDecimalPlaces:2})
  @Min(0)
  @IsOptional()
  taxRate?: number = 0;

  @Transform(({value}) => parseInt(value))
  @IsInt()
  @Min(0)
  @IsOptional()
  alertQuantity?: number = 0;

  @Transform(({ value }) => parseFloat(value))
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  salePrice: number;

  @Transform(({ value }) => parseFloat(value))
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  costPrice: number;

  @Transform(({ value }) => parseInt(value))
  @IsInt()
  @Min(0)
  @IsOptional()
  stock: number = 0;

  @Transform(({ value }) => parseInt(value))
  @IsInt()
  @Min(0)
  @IsOptional()
  reorderLevel: number = 0;

  @IsIn(['ACTIVE', 'INACTIVE', 'DISCONTINUED'])
  @IsOptional()
  status?: ProductStatus = 'ACTIVE' as ProductStatus;

  @IsIn(['STANDARD', 'DIGITAL', 'SERVICE', 'COMBO'])
  @IsOptional()
  type?: string = 'STANDARD';

  hasVariants?: boolean;

  attributes?: Record<string, string>;

  parentId?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ComboItemDto)
  comboItems?: ComboItemDto[];
}
