import { PartialType } from '@nestjs/mapped-types';
import { CreateSalesReturnDto } from './create-sales-return.dto';
import { IsIn, IsOptional } from 'class-validator';
const RETURN_STATUS_VALUES = [
  'PENDING',
  'PROCESSING',
  'COMPLETED',
  'CANCELLED',
] as const;

export class UpdateSalesReturnDto extends PartialType(CreateSalesReturnDto) {
  @IsOptional()
  @IsIn(RETURN_STATUS_VALUES)
  status?: (typeof RETURN_STATUS_VALUES)[number];
}
