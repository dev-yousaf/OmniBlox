import { PartialType } from '@nestjs/mapped-types';
import { CreatePurchaseReturnDto } from './create-purchase-return.dto';
import { IsIn, IsOptional } from 'class-validator';
// Note: Avoid importing Prisma enums directly for runtime validation.

// Prisma enums are types at compile-time; for runtime validation use the allowed values array
const RETURN_STATUS_VALUES = [
  'PENDING',
  'PROCESSING',
  'COMPLETED',
  'CANCELLED',
] as const;

type ReturnStatusType = (typeof RETURN_STATUS_VALUES)[number];

export class UpdatePurchaseReturnDto extends PartialType(
  CreatePurchaseReturnDto,
) {
  @IsOptional()
  @IsIn(RETURN_STATUS_VALUES)
  status?: ReturnStatusType;
}
