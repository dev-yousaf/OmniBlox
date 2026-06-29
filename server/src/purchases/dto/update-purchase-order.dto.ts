import {
  IsString,
  IsOptional,
  IsArray,
  ValidateNested,
  IsDateString,
  IsUUID,
  IsInt,
  Min,
  IsNumber,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentStatus } from '@prisma/client';

const PAYMENT_STATUS_VALUES = Object.values(PaymentStatus);
const PAYMENT_METHOD_VALUES = ['CASH', 'CREDIT_CARD', 'BANK_TRANSFER', 'CHECK'] as const;

export class UpdatePurchaseOrderItemDto {
  @IsUUID()
  productId: string;

  @IsInt()
  @Min(1)
  quantity: number;

  @IsNumber()
  @Min(0)
  unitCost: number;
}

export class UpdatePurchaseOrderDto {
  @IsUUID()
  supplierId: string;

  @IsDateString()
  orderDate: string;

  @IsOptional()
  @IsString()
  billNumber?: string;

  @IsOptional()
  @IsDateString()
  billDate?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsIn(PAYMENT_STATUS_VALUES, {
    message: 'Invalid payment status',
  })
  paymentStatus?: PaymentStatus;

  @IsOptional()
  @IsIn(PAYMENT_METHOD_VALUES, {
    message: 'Invalid payment method',
  })
  paymentMethod?: typeof PAYMENT_METHOD_VALUES[number];

  @IsOptional()
  @IsUUID()
  warehouseId?: string | null;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdatePurchaseOrderItemDto)
  items: UpdatePurchaseOrderItemDto[];
}
