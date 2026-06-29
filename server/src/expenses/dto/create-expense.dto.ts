import {
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';

export class CreateExpenseDto {
  @IsString()
  @IsNotEmpty()
  readonly reference!: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  readonly amount!: number;

  @IsDateString()
  readonly expenseDate!: string;

  @IsOptional()
  @IsString()
  readonly description?: string;

  @IsString()
  @IsNotEmpty()
  readonly vendor!: string;

  @IsString()
  @IsNotEmpty()
  readonly categoryId!: string;

  @IsOptional()
  @IsString()
  readonly purchaseOrderId?: string;

  @IsOptional()
  @IsString()
  readonly saleId?: string;
}
