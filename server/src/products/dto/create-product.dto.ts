import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsInt,
  IsIn,
  Min,
} from 'class-validator';
import { Transform } from 'class-transformer';
import type { ProductStatus } from '@prisma/client';

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
  brand?: string;

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
  stock: number;

  @Transform(({ value }) => parseInt(value))
  @IsInt()
  @Min(0)
  reorderLevel: number;

  @IsIn(['ACTIVE', 'INACTIVE', 'DISCONTINUED'])
  @IsOptional()
  status?: ProductStatus = 'ACTIVE' as ProductStatus;
}
