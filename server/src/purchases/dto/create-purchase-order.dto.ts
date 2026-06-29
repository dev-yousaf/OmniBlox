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
import { OrderStatus, PaymentStatus } from '@prisma/client';

const ORDER_STATUS_VALUES = Object.values(OrderStatus);
const PAYMENT_STATUS_VALUES = Object.values(PaymentStatus);
const PAYMENT_METHOD_VALUES = ['CASH', 'CREDIT_CARD', 'BANK_TRANSFER', 'CHECK'] as const;

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
  @IsString()
  readonly billNumber?: string;

  @IsOptional()
  @IsDateString()
  readonly billDate?: string;

  @IsOptional()
  @IsDateString()
  readonly dueDate?: string;

  @IsOptional()
  @IsIn(PAYMENT_STATUS_VALUES, {
    message: 'Invalid payment status',
  })
  readonly paymentStatus?: PaymentStatus;

  @IsOptional()
  @IsIn(PAYMENT_METHOD_VALUES, {
    message: 'Invalid payment method',
  })
  readonly paymentMethod?: typeof PAYMENT_METHOD_VALUES[number];

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
