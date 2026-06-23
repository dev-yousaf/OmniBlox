export class StockAdjustmentItemResponseDto {
  id: string;
  previousQuantity: number;
  newQuantity: number;
  difference: number;
  productId: string;
  productName: string;
  warehouseId: string;
  warehouseName: string;
}

export class StockAdjustmentResponseDto {
  id: string;
  referenceNumber: string;
  adjustmentDate: string;
  notes?: string;
  documentUrl?: string;
  type: string;
  totalItems: number;
  netChange: number;
  createdAt: string;
  updatedAt: string;
  userId: string;
  userName: string;
  items: StockAdjustmentItemResponseDto[];
}
