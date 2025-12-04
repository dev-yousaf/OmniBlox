import { IsOptional, IsString } from 'class-validator';

export class DispatchDeliveryDto {
  @IsOptional()
  @IsString()
  readonly trackingNumber?: string;
}
