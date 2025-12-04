import { useAuthenticatedApi } from "@/hooks/use-authenticated-api";

export interface StockAdjustmentItem {
  productId: string;
  newQuantity: number;
}

export interface CreateStockAdjustmentPayload {
  warehouseId: string;
  adjustmentDate: string;
  notes?: string;
  items: StockAdjustmentItem[];
}

export interface StockAdjustmentItemResponse {
  id: string;
  previousQuantity: number;
  newQuantity: number;
  difference: number;
  productId: string;
  productName: string;
  warehouseId: string;
  warehouseName: string;
}

export interface StockAdjustmentResponse {
  id: string;
  referenceNumber: string;
  adjustmentDate: string;
  notes?: string;
  totalItems: number;
  netChange: number;
  createdAt: string;
  updatedAt: string;
  userId: string;
  userName: string;
  items: StockAdjustmentItemResponse[];
}

export function useStockAdjustmentService() {
  const { post, get } = useAuthenticatedApi();

  const createStockAdjustment = async (
    payload: CreateStockAdjustmentPayload
  ): Promise<StockAdjustmentResponse> => {
    const response = await post("/stock-adjustments", payload);
    return response as StockAdjustmentResponse;
  };

  const getStockAdjustments = async (): Promise<StockAdjustmentResponse[]> => {
    const response = await get("/products/adjustments");
    return response as StockAdjustmentResponse[];
  };

  const getStockAdjustment = async (
    id: string
  ): Promise<StockAdjustmentResponse> => {
    const response = await get(`/products/adjustments/${id}`);
    return response as StockAdjustmentResponse;
  };

  return {
    createStockAdjustment,
    getStockAdjustments,
    getStockAdjustment,
  };
}
