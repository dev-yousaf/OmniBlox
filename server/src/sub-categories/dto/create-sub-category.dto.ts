import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';
export class CreateSubCategoryDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;
  @IsString()
  @IsNotEmpty()
  categoryId: string;
  @IsString()
  @IsOptional()
  @MaxLength(100)
  slug?: string;
  @IsString()
  @IsOptional()
  imageUrl?: string;
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;
  @IsString()
  @IsOptional()
  status?: string;
}
