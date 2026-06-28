import {
  IsString,
  IsNotEmpty,
  IsInt,
  Min,
  IsNumber,
  IsPositive,
  IsOptional,
  IsDateString,
  IsIn,
  IsArray,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { OrderStatus } from '@prisma/client';

const ORDER_STATUS_VALUES = Object.values(OrderStatus);

export class CreatePurchaseItemDto {
  @IsString()
  @IsNotEmpty()
  readonly productId!: string;

  @IsInt()
  @Min(1)
  readonly quantity!: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  readonly unitCost!: number;
}

export class CreatePurchaseOrderDto {
  @IsString()
  @IsNotEmpty()
  readonly supplierId!: string;

  @IsDateString()
  readonly orderDate!: string;

  @IsOptional()
  @IsString()
  readonly referenceNumber?: string;

  @IsOptional()
  @IsIn(ORDER_STATUS_VALUES, {
    message: 'Invalid order status',
  })
  readonly status?: OrderStatus;

  @IsOptional()
  @IsString()
  readonly notes?: string;

  @IsOptional()
  @IsString()
  readonly warehouseId?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePurchaseItemDto)
  @ArrayMinSize(1)
  readonly items!: CreatePurchaseItemDto[];
}
