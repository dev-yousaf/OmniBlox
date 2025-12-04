import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsIn,
  IsInt,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
const ORDER_STATUS_VALUES = [
  'DRAFT',
  'PENDING',
  'COMPLETED',
  'CANCELLED',
] as const;
const PAYMENT_STATUS_VALUES = ['PAID', 'PENDING', 'PARTIAL'] as const;
const PAYMENT_METHOD_VALUES = [
  'CASH',
  'CREDIT_CARD',
  'BANK_TRANSFER',
  'CHECK',
] as const;

type OrderStatus = (typeof ORDER_STATUS_VALUES)[number];
type PaymentStatus = (typeof PAYMENT_STATUS_VALUES)[number];
type PaymentMethod = (typeof PAYMENT_METHOD_VALUES)[number];

export class SaleCustomerDto {
  @IsOptional()
  @IsString()
  readonly id?: string;

  @IsString()
  @IsNotEmpty()
  readonly name!: string;

  @IsOptional()
  @IsEmail()
  readonly email?: string;

  @IsOptional()
  @IsString()
  readonly phone?: string;

  @IsOptional()
  @IsString()
  readonly address?: string;
}

export class CreateSaleItemDto {
  @IsString()
  @IsNotEmpty()
  readonly productId!: string;

  @IsInt()
  @Min(1)
  readonly quantity!: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  readonly unitPrice!: number;
}

export class CreateSaleDto {
  @IsOptional()
  @IsString()
  readonly invoiceNumber?: string;

  @ValidateNested()
  @Type(() => SaleCustomerDto)
  readonly customer!: SaleCustomerDto;

  @IsString()
  @IsNotEmpty()
  readonly warehouseId!: string;

  @IsDateString()
  readonly saleDate!: string;

  @IsDateString()
  readonly dueDate!: string;

  @IsOptional()
  @IsIn(ORDER_STATUS_VALUES, {
    message: 'Invalid sale status',
  })
  readonly status?: OrderStatus;

  @IsOptional()
  @IsIn(PAYMENT_STATUS_VALUES, {
    message: 'Invalid payment status',
  })
  readonly paymentStatus?: PaymentStatus;

  @IsOptional()
  @IsIn(PAYMENT_METHOD_VALUES, {
    message: 'Invalid payment method',
  })
  readonly paymentMethod?: PaymentMethod;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  readonly taxRate?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  readonly discount?: number;

  @IsOptional()
  @IsString()
  readonly notes?: string;

  // Optional snapshotted shipping address to store on Sale
  @IsOptional()
  @IsString()
  readonly shippingAddress?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateSaleItemDto)
  readonly items!: CreateSaleItemDto[];
}
