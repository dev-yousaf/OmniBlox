import { IsIn, IsNotEmpty } from 'class-validator';

const EXPENSE_STATUS_VALUES = [
  'PENDING',
  'APPROVED',
  'PAID',
  'REJECTED',
] as const;

type ExpenseStatus = (typeof EXPENSE_STATUS_VALUES)[number];

export class UpdateExpenseStatusDto {
  @IsNotEmpty()
  @IsIn(EXPENSE_STATUS_VALUES, { message: 'Invalid expense status' })
  readonly status!: ExpenseStatus;
}
