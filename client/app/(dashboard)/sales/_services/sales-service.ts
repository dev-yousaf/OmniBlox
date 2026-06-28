"use client";

import { useCallback } from "react";

import { useAuthenticatedApi } from "@/hooks/use-authenticated-api";

import type {
  CreateSalePayload,
  SaleDetail,
  SalePaymentStatus,
  SaleStatus,
  SalesFilters,
  SalesListResponse,
  SalesStats,
  UpdateSalePayload,
} from "../_types";

type NormalizedFilters = Omit<SalesFilters, "status" | "paymentStatus"> & {
  status?: SaleStatus;
  paymentStatus?: SalePaymentStatus;
};

const buildQueryString = (filters: Partial<NormalizedFilters> = {}) => {
  const params = new URLSearchParams();

  if (filters.page) params.set("page", filters.page.toString());
  if (filters.limit) params.set("limit", filters.limit.toString());
  if (filters.search) params.set("search", filters.search);
  if (filters.status) params.set("status", filters.status);
  if (filters.paymentStatus) params.set("paymentStatus", filters.paymentStatus);
  if (filters.warehouseId) params.set("warehouseId", filters.warehouseId);
  if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
  if (filters.dateTo) params.set("dateTo", filters.dateTo);
  if (filters.productId) params.set("productId", filters.productId);

  return params.toString();
};

export function useSalesService() {
  const { get, post, put, patch, delete: del } = useAuthenticatedApi();

  const getSales = useCallback(
    async (filters: SalesFilters = {}): Promise<SalesListResponse> => {
      const { status, paymentStatus, ...rest } = filters;
      const normalized: NormalizedFilters = {
        ...rest,
        status: status && status !== "ALL" ? status : undefined,
        paymentStatus:
          paymentStatus && paymentStatus !== "ALL" ? paymentStatus : undefined,
      };
      const query = buildQueryString(normalized);
      return get(
        `/sales${query ? `?${query}` : ""}`
      ) as Promise<SalesListResponse>;
    },
    [get]
  );

  const getSale = useCallback(
    async (id: string): Promise<SaleDetail> => {
      return get(`/sales/${id}`) as Promise<SaleDetail>;
    },
    [get]
  );

  const getSalesStats = useCallback(async (): Promise<SalesStats> => {
    return get(`/sales/stats`) as Promise<SalesStats>;
  }, [get]);

  const createSale = useCallback(
    async (payload: CreateSalePayload): Promise<SaleDetail> => {
      return post(`/sales`, payload) as Promise<SaleDetail>;
    },
    [post]
  );

  const updateSale = useCallback(
    async (id: string, payload: UpdateSalePayload): Promise<SaleDetail> => {
      return put(`/sales/${id}`, payload) as Promise<SaleDetail>;
    },
    [put]
  );

  const deleteSale = useCallback(
    async (id: string): Promise<void> => {
      await del(`/sales/${id}`);
    },
    [del]
  );

  const markSalePaid = useCallback(
    async (id: string): Promise<SaleDetail> => {
      return patch(`/sales/${id}/mark-paid`) as Promise<SaleDetail>;
    },
    [patch]
  );

  return {
    getSales,
    getSale,
    getSalesStats,
    createSale,
    updateSale,
    deleteSale,
    markSalePaid,
  };
}
