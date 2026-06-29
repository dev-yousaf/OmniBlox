"use client";

import { useAuthenticatedApi } from "./use-authenticated-api";
import { useCallback, useMemo } from "react";

export interface SaleItem {
  id: string;
  productId: string;
  quantity: number;
  returnedQuantity: number;
  unitPrice: number;
  product: {
    id: string;
    name: string;
    sku: string;
  };
}

export interface Sale {
  id: string;
  invoiceNumber: string;
  saleDate: string;
  dueDate: string;
  totalAmount: number;
  subtotal: number;
  tax: number;
  discount: number;
  balanceDue: number;
  status: string;
  paymentStatus: string;
  paymentMethod?: string;
  hasReturns: boolean;
  pendingReturnCount?: number;
  processingReturnCount?: number;
  completedReturnCount?: number;
  returnStatus?: 'NONE' | 'PARTIAL' | 'ALL';
  returnedValue?: number;
  netTotal?: number;
  warehouseId?: string;
  warehouse?: {
    id: string;
    name: string;
  };
  customer?: {
    id: string;
    name: string;
    email?: string;
  };
  customerName?: string;
  items: SaleItem[];
}

export function useSalesApi() {
  const { get, post, patch, put, delete: del } = useAuthenticatedApi();

  const getSales = useCallback(
    async (params?: {
      page?: number;
      limit?: number;
      search?: string;
      status?: string;
      paymentStatus?: string;
    }): Promise<{ sales: Sale[]; total: number; pages: number }> => {
      const query = new URLSearchParams();
      if (params?.page) query.set("page", params.page.toString());
      if (params?.limit) query.set("limit", params.limit.toString());
      if (params?.search) query.set("search", params.search);
      if (params?.status) query.set("status", params.status);
      if (params?.paymentStatus)
        query.set("paymentStatus", params.paymentStatus);

      const queryStr = query.toString();
      return get(`/sales${queryStr ? `?${queryStr}` : ""}`) as Promise<{
        sales: Sale[];
        total: number;
        pages: number;
      }>;
    },
    [get]
  );

  const getSale = useCallback(
    async (id: string): Promise<Sale> => {
      return get(`/sales/${id}`) as Promise<Sale>;
    },
    [get]
  );

  return useMemo(() => ({ getSales, getSale }), [getSales, getSale]);
}
