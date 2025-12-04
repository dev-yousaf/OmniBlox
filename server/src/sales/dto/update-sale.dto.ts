import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  CreateSaleDto,
  CreateSaleItemDto,
  SaleCustomerDto,
} from './create-sale.dto';

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

export class UpdateSaleDto implements Partial<CreateSaleDto> {
  @IsOptional()
  @IsString()
  readonly invoiceNumber?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => SaleCustomerDto)
  readonly customer?: SaleCustomerDto;

  @IsOptional()
  @IsDateString()
  readonly saleDate?: string;

  @IsOptional()
  @IsDateString()
  readonly dueDate?: string;

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

  @IsOptional()
  @IsString()
  readonly warehouseId?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateSaleItemDto)
  readonly items?: CreateSaleItemDto[];
}
