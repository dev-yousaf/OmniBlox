import { IsString, IsNotEmpty, IsOptional, IsInt, Min, MaxLength } from 'class-validator';
export class CreateWarrantyDto {
  @IsString() @IsNotEmpty() @MaxLength(100)
  name: string;
  @IsInt() @Min(1)
  duration: number;
  @IsString() @IsOptional()
  durationType?: string;
  @IsString() @IsOptional() @MaxLength(500)
  description?: string;
  @IsString() @IsOptional()
  status?: string;
}
