import { IsString, IsOptional, MaxLength } from 'class-validator';
export class UpdateVariantAttributeDto {
  @IsString()
  @IsOptional()
  @MaxLength(100)
  name?: string;
  @IsString()
  @IsOptional()
  @MaxLength(100)
  slug?: string;
  @IsOptional()
  values?: any;
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;
  @IsString()
  @IsOptional()
  status?: string;
}
