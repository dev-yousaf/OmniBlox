import { useAuthenticatedApi } from "./use-authenticated-api";
import { useCallback } from "react";

// ========== TYPES ==========

export interface ReturnItem {
  id: string;
  productId: string;
  quantity: number;
  unitPrice: number | string;
  product: {
    id: string;
    name: string;
    sku: string;
  };
}

export interface SalesReturn {
  id: string;
  referenceNumber: string;
  totalAmount: number | string;
  reason?: string;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "CANCELLED";
  warehouseId: string;
  saleId?: string; // Reference to original sale
  returnDate: string;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
  warehouse: {
    id: string;
    name: string;
    location?: string;
  };
  items: ReturnItem[];
}

export interface PurchaseReturn {
  id: string;
  referenceNumber: string;
  totalAmount: number | string;
  reason?: string;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "CANCELLED";
  warehouseId: string;
  supplierId: string;
  purchaseOrderId?: string; // Reference to original purchase order
  returnDate: string;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
  warehouse: {
    id: string;
    name: string;
    location?: string;
  };
  supplier: {
    id: string;
    name: string;
    email?: string;
  };
  items: ReturnItem[];
}

export interface UnifiedReturn
  extends Omit<SalesReturn | PurchaseReturn, "type"> {
  type: "customer" | "supplier";
  entityName: string;
  supplier?: {
    id: string;
    name: string;
    email?: string;
  };
}

export interface CreateSalesReturnDto {
  warehouseId: string;
  saleId?: string;
  reason?: string;
  items: Array<{
    productId: string;
    quantity: number;
    unitPrice: number;
    saleItemId?: string;
  }>;
}

export interface CreatePurchaseReturnDto {
  warehouseId: string;
  supplierId: string;
  purchaseOrderId?: string;
  reason?: string;
  items: Array<{
    productId: string;
    quantity: number;
    unitPrice: number;
    purchaseOrderItemId?: string;
  }>;
}

export interface UpdateReturnDto {
  warehouseId?: string;
  supplierId?: string;
  reason?: string;
  status?: "PENDING" | "PROCESSING" | "COMPLETED" | "CANCELLED";
  items?: Array<{
    productId: string;
    quantity: number;
    unitPrice: number;
  }>;
}

// ========== HOOKS ==========

export function useReturnsApi() {
  const { get, post, patch, delete: del } = useAuthenticatedApi();

  // Unified endpoint - gets all returns
  const getAllReturns = useCallback(async (): Promise<UnifiedReturn[]> => {
    return get("/returns") as Promise<UnifiedReturn[]>;
  }, [get]);

  // ===== SALES RETURNS =====
  const getSalesReturns = useCallback(async (): Promise<SalesReturn[]> => {
    return get("/sales-returns") as Promise<SalesReturn[]>;
  }, [get]);

  const getSalesReturn = useCallback(
    async (id: string): Promise<SalesReturn> => {
      return get(`/sales-returns/${id}`) as Promise<SalesReturn>;
    },
    [get]
  );

  const createSalesReturn = useCallback(
    async (data: CreateSalesReturnDto): Promise<SalesReturn> => {
      return post("/sales-returns", data) as Promise<SalesReturn>;
    },
    [post]
  );

  const updateSalesReturn = useCallback(
    async (id: string, data: UpdateReturnDto): Promise<SalesReturn> => {
      return patch(`/sales-returns/${id}`, data) as Promise<SalesReturn>;
    },
    [patch]
  );

  const deleteSalesReturn = useCallback(
    async (id: string): Promise<{ message: string }> => {
      return del(`/sales-returns/${id}`) as Promise<{ message: string }>;
    },
    [del]
  );

  // ===== PURCHASE RETURNS =====
  const getPurchaseReturns = useCallback(async (): Promise<
    PurchaseReturn[]
  > => {
    return get("/purchase-returns") as Promise<PurchaseReturn[]>;
  }, [get]);

  const getPurchaseReturn = useCallback(
    async (id: string): Promise<PurchaseReturn> => {
      return get(`/purchase-returns/${id}`) as Promise<PurchaseReturn>;
    },
    [get]
  );

  const createPurchaseReturn = useCallback(
    async (data: CreatePurchaseReturnDto): Promise<PurchaseReturn> => {
      return post("/purchase-returns", data) as Promise<PurchaseReturn>;
    },
    [post]
  );

  const updatePurchaseReturn = useCallback(
    async (id: string, data: UpdateReturnDto): Promise<PurchaseReturn> => {
      return patch(`/purchase-returns/${id}`, data) as Promise<PurchaseReturn>;
    },
    [patch]
  );

  const deletePurchaseReturn = useCallback(
    async (id: string): Promise<{ message: string }> => {
      return del(`/purchase-returns/${id}`) as Promise<{ message: string }>;
    },
    [del]
  );

  return {
    // Unified
    getAllReturns,

    // Sales Returns
    getSalesReturns,
    getSalesReturn,
    createSalesReturn,
    updateSalesReturn,
    deleteSalesReturn,

    // Purchase Returns
    getPurchaseReturns,
    getPurchaseReturn,
    createPurchaseReturn,
    updatePurchaseReturn,
    deletePurchaseReturn,
  };
}
