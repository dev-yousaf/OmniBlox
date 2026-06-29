import { IsString, IsOptional, IsInt, Min, MaxLength } from 'class-validator';
export class UpdateWarrantyDto {
  @IsString()
  @IsOptional()
  @MaxLength(100)
  name?: string;
  @IsInt()
  @IsOptional()
  @Min(1)
  duration?: number;
  @IsString()
  @IsOptional()
  durationType?: string;
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;
  @IsString()
  @IsOptional()
  status?: string;
}
