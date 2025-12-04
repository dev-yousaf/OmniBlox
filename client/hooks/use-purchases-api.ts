"use client";

import { useAuthenticatedApi } from "./use-authenticated-api";

export type OrderStatus = "PENDING" | "COMPLETED" | "CANCELLED" | string;

export interface PurchaseOrderItem {
  id: string;
  productId: string;
  quantity: number;
  returnedQuantity: number;
  unitCost: number;
  product?: {
    id: string;
    name: string;
    sku?: string;
  };
}

export interface PurchaseOrder {
  id: string;
  referenceNumber: string;
  orderDate: string;
  status: OrderStatus;
  hasReturns: boolean;
  subtotal?: number;
  totalAmount: number;
  supplier: { id: string; name: string };
  warehouseId?: string | null;
  warehouse?: { id: string; name: string } | null;
  items?: PurchaseOrderItem[];
}

export interface CreatePurchaseOrderDto {
  supplierId: string;
  orderDate: string; // ISO string
  referenceNumber?: string;
  status?: OrderStatus;
  notes?: string;
  items: Array<{
    productId: string;
    quantity: number;
    unitCost: number;
  }>;
}

export function usePurchasesApi() {
  const { get, post, patch } = useAuthenticatedApi();

  return {
    list: async (): Promise<PurchaseOrder[]> => {
      const res = (await get("/purchases")) as PurchaseOrder[];
      return Array.isArray(res) ? res : [];
    },
    getById: async (id: string): Promise<PurchaseOrder> => {
      return (await get(`/purchases/${id}`)) as PurchaseOrder;
    },
    create: async (data: CreatePurchaseOrderDto): Promise<PurchaseOrder> => {
      return (await post("/purchases", data)) as PurchaseOrder;
    },
    receive: async (
      id: string,
      warehouseId: string
    ): Promise<PurchaseOrder> => {
      return (await patch(`/purchases/${id}/receive`, {
        warehouseId,
      })) as PurchaseOrder;
    },
  };
}
