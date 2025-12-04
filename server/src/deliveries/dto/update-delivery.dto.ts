import { IsOptional, IsString, IsIn } from 'class-validator';

const DELIVERY_STATUS_VALUES = ['PENDING', 'IN_TRANSIT', 'DELIVERED'] as const;
type DeliveryStatus = (typeof DELIVERY_STATUS_VALUES)[number];

export class UpdateDeliveryDto {
  @IsOptional()
  @IsString()
  readonly trackingNumber?: string;

  @IsOptional()
  @IsString()
  readonly deliveryAddress?: string;

  @IsOptional()
  @IsIn(DELIVERY_STATUS_VALUES, {
    message: 'Invalid delivery status',
  })
  readonly status?: DeliveryStatus;
}
