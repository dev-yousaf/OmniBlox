import { IsString, IsNotEmpty } from 'class-validator';

export class ReceivePurchaseOrderDto {
  @IsString()
  @IsNotEmpty()
  readonly warehouseId!: string;
}
