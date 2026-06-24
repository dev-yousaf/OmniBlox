import { IsString, IsOptional, MaxLength } from 'class-validator';
export class UpdateSubCategoryDto {
  @IsString() @IsOptional() @MaxLength(100)
  name?: string;
  @IsString() @IsOptional()
  categoryId?: string;
  @IsString() @IsOptional() @MaxLength(100)
  slug?: string;
  @IsString() @IsOptional()
  imageUrl?: string;
  @IsString() @IsOptional() @MaxLength(500)
  description?: string;
  @IsString() @IsOptional()
  status?: string;
}
