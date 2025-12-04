import { IsDateString, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class GenerateExpenseReportDto {
  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsString()
  vendor?: string;
}
