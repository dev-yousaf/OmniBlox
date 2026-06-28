import { useCallback } from "react";
import { useAuthenticatedApi } from "@/hooks/use-authenticated-api";

export interface StockAdjustmentItemInput {
  productId: string;
  warehouseId: string;
  previousQuantity: number;
  newQuantity: number;
}

export interface CreateStockAdjustmentPayload {
  notes?: string;
  type?: "ADDITION" | "REMOVAL";
  items: StockAdjustmentItemInput[];
}

export interface StockAdjustmentItemResponse {
  id: string;
  previousQuantity: number;
  newQuantity: number;
  difference: number;
  productId: string;
  productName: string;
  productSku: string;
  productImage: string | null;
  warehouseId: string;
  warehouseName: string;
}

export interface StockAdjustmentResponse {
  id: string;
  referenceNumber: string;
  adjustmentDate: string;
  notes?: string;
  type: string;
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

  const createStockAdjustment = useCallback(async (
    payload: CreateStockAdjustmentPayload
  ): Promise<StockAdjustmentResponse> => {
    const response = await post("/products/adjustments", payload);
    return response as StockAdjustmentResponse;
  }, [post]);

  const getStockAdjustments = useCallback(async (): Promise<StockAdjustmentResponse[]> => {
    const response = await get("/products/adjustments");
    return response as StockAdjustmentResponse[];
  }, [get]);

  const getStockAdjustment = useCallback(async (
    id: string
  ): Promise<StockAdjustmentResponse> => {
    const response = await get(`/products/adjustments/${id}`);
    return response as StockAdjustmentResponse;
  }, [get]);

  return {
    createStockAdjustment,
    getStockAdjustments,
    getStockAdjustment,
  };
}
