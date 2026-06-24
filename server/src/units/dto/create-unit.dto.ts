import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';
export class CreateUnitDto {
  @IsString() @IsNotEmpty() @MaxLength(100)
  name: string;
  @IsString() @IsNotEmpty() @MaxLength(50)
  shortName: string;
  @IsString() @IsOptional() @MaxLength(100)
  slug?: string;
  @IsString() @IsOptional() @MaxLength(500)
  description?: string;
  @IsString() @IsOptional()
  status?: string;
}
