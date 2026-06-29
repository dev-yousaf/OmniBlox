import { IsEmail, IsIn, IsOptional, IsString } from 'class-validator';

// Temporary constants until Prisma client is fully updated
const BILLER_STATUSES = ['ACTIVE', 'INACTIVE'] as const;
type BillerStatus = (typeof BILLER_STATUSES)[number];

export class CreateBillerDto {
  @IsString()
  name: string;

  @IsString()
  code: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  contactPerson?: string;

  @IsString()
  @IsOptional()
  gstNumber?: string;

  @IsIn(BILLER_STATUSES)
  @IsOptional()
  status?: BillerStatus = 'ACTIVE';
}

export class UpdateBillerDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  code?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  contactPerson?: string;

  @IsString()
  @IsOptional()
  gstNumber?: string;

  @IsIn(BILLER_STATUSES)
  @IsOptional()
  status?: BillerStatus;
}

export class BillerResponseDto {
  id: string;
  name: string;
  code: string;
  address?: string;
  phone?: string;
  email?: string;
  contactPerson?: string;
  gstNumber?: string;
  status: BillerStatus;
  createdAt: Date;
  updatedAt: Date;
  salesCount?: number;
}

export class BillerListResponseDto {
  billers: BillerResponseDto[];
  total: number;
  pages: number;
}

export class BillerStatsDto {
  totalBillers: number;
  activeBillers: number;
  inactiveBillers: number;
  recentlyAdded: number;
}
