import { IsString, IsOptional, MaxLength } from 'class-validator';
export class UpdateProductCategoryDto {
  @IsString()
  @IsOptional()
  @MaxLength(100)
  name?: string;
  @IsString()
  @IsOptional()
  @MaxLength(100)
  slug?: string;
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;
  @IsString()
  @IsOptional()
  status?: string;
}
