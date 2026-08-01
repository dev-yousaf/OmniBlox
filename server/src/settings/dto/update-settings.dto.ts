import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class UpdateSettingsDto {
  @IsOptional()
  @IsString()
  @IsIn(['utc', 'est', 'pst', 'cst'])
  timezone?: string;

  @IsOptional()
  @IsString()
  @IsIn(['en', 'es', 'fr', 'de'])
  language?: string;

  @IsOptional()
  @IsString()
  @IsIn(['mdy', 'dmy', 'ymd'])
  dateFormat?: string;

  @IsOptional()
  @IsString()
  @IsIn(['12', '24'])
  timeFormat?: string;

  @IsOptional()
  @IsString()
  @IsIn(['usd', 'eur', 'gbp', 'jpy'])
  currencyCode?: string;

  @IsOptional()
  @IsString()
  @Max(4)
  currencySymbol?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(3)
  decimalPlaces?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  lowStockThreshold?: number;

  @IsOptional()
  @IsBoolean()
  lowStockAlerts?: boolean;

  @IsOptional()
  @IsString()
  defaultWarehouseId?: string | null;

  @IsOptional()
  @IsBoolean()
  autoBackup?: boolean;

  @IsOptional()
  @IsString()
  backupTime?: string;

  @IsOptional()
  @IsString()
  @IsIn(['6months', '1year', '2years', 'forever'])
  dataRetention?: string;
}
