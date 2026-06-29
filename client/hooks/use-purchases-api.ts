"use client";

import { useAuthenticatedApi } from "./use-authenticated-api";
import { useCallback, useMemo } from "react";

export type OrderStatus = "PENDING" | "COMPLETED" | "CANCELLED" | string;

export interface PurchaseOrderItem {
  id: string;
  productId: string;
  productName?: string;
  productSku?: string;
  quantity: number;
  returnedQuantity: number;
  unitCost: number;
  total?: number;
  product?: {
    id: string;
    name: string;
    sku?: string;
  };
}

export type ReturnStatus = 'NONE' | 'PARTIAL' | 'ALL';

export interface PurchaseOrder {
  id: string;
  referenceNumber: string;
  billNumber?: string | null;
  billDate?: string | null;
  dueDate?: string | null;
  paymentStatus: string;
  paymentMethod?: string | null;
  orderDate: string;
  status: OrderStatus;
  hasReturns: boolean;
  pendingReturnCount?: number;
  processingReturnCount?: number;
  completedReturnCount?: number;
  returnStatus?: ReturnStatus;
  returnedValue?: number;
  netTotal?: number;
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
  billNumber?: string;
  billDate?: string;
  dueDate?: string;
  paymentStatus?: string;
  paymentMethod?: string;
  status?: OrderStatus;
  notes?: string;
  warehouseId?: string;
  items: Array<{
    productId: string;
    quantity: number;
    unitCost: number;
  }>;
}

export interface UpdatePurchaseOrderDto {
  supplierId: string;
  orderDate: string;
  billNumber?: string;
  billDate?: string;
  dueDate?: string;
  paymentStatus?: string;
  paymentMethod?: string;
  warehouseId?: string | null;
  notes?: string;
  items: Array<{
    productId: string;
    quantity: number;
    unitCost: number;
  }>;
}

export function usePurchasesApi() {
  const { get, post, put, patch } = useAuthenticatedApi();

  const list = useCallback(async (): Promise<PurchaseOrder[]> => {
    const res = (await get("/purchases")) as PurchaseOrder[];
    return Array.isArray(res) ? res : [];
  }, [get]);

  const getById = useCallback(async (id: string): Promise<PurchaseOrder> => {
    return (await get(`/purchases/${id}`)) as PurchaseOrder;
  }, [get]);

  const create = useCallback(async (data: CreatePurchaseOrderDto): Promise<PurchaseOrder> => {
    return (await post("/purchases", data)) as PurchaseOrder;
  }, [post]);

  const update = useCallback(
    async (id: string, data: UpdatePurchaseOrderDto): Promise<PurchaseOrder> => {
      return (await put(`/purchases/${id}`, data)) as PurchaseOrder;
    },
    [put],
  );

  const receive = useCallback(
    async (id: string, warehouseId: string): Promise<PurchaseOrder> => {
      return (await patch(`/purchases/${id}/receive`, { warehouseId })) as PurchaseOrder;
    },
    [patch],
  );

  const markAsPaid = useCallback(
    async (id: string): Promise<PurchaseOrder> => {
      return (await patch(`/purchases/${id}/mark-paid`)) as PurchaseOrder;
    },
    [patch],
  );

  return useMemo(
    () => ({ list, getById, create, update, receive, markAsPaid }),
    [list, getById, create, update, receive, markAsPaid],
  );
}
