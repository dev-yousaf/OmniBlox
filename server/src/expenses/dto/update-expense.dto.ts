import {
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';

const EXPENSE_STATUS_VALUES = [
  'PENDING',
  'APPROVED',
  'PAID',
  'REJECTED',
] as const;
const PAYMENT_METHOD_VALUES = [
  'CASH',
  'CREDIT_CARD',
  'BANK_TRANSFER',
  'CHECK',
] as const;

type ExpenseStatus = (typeof EXPENSE_STATUS_VALUES)[number];
type PaymentMethod = (typeof PAYMENT_METHOD_VALUES)[number];

export class UpdateExpenseDto {
  @IsOptional()
  @IsString()
  readonly reference?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  readonly amount?: number;

  @IsOptional()
  @IsDateString()
  readonly expenseDate?: string;

  @IsOptional()
  @IsString()
  readonly description?: string;

  @IsOptional()
  @IsString()
  readonly vendor?: string;

  @IsOptional()
  @IsString()
  readonly categoryId?: string;

  @IsOptional()
  @IsIn(EXPENSE_STATUS_VALUES, { message: 'Invalid expense status' })
  readonly status?: ExpenseStatus;

  @IsOptional()
  @IsIn(PAYMENT_METHOD_VALUES, { message: 'Invalid payment method' })
  readonly paymentMethod?: PaymentMethod;
}
