import { useAuthenticatedApi } from "./use-authenticated-api";
import { useCallback } from "react";

export interface Supplier {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  creditLimit?: number;
  balance?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSupplierData {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  creditLimit?: number;
  balance?: number;
}

export interface UpdateSupplierData {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  creditLimit?: number;
  balance?: number;
}

export interface SuppliersListResponse {
  suppliers: Supplier[];
  total: number;
  pages: number;
}

export interface SuppliersStats {
  totalSuppliers: number;
  totalPurchases: number;
  totalPayable: number;
  avgPurchase: number;
}

interface SuppliersFilters {
  page?: number;
  limit?: number;
  search?: string;
}

export function useSuppliersApi() {
  const { post, get, put, delete: del } = useAuthenticatedApi();

  const createSupplier = useCallback(
    async (data: CreateSupplierData): Promise<Supplier> => {
      return post("/suppliers", data) as Promise<Supplier>;
    },
    [post]
  );

  const getSuppliers = useCallback(
    async (
      filters: SuppliersFilters = {}
    ): Promise<SuppliersListResponse | Supplier[]> => {
      const params = new URLSearchParams();
      if (filters.page) params.set("page", filters.page.toString());
      if (filters.limit) params.set("limit", filters.limit.toString());
      if (filters.search) params.set("search", filters.search);

      const query = params.toString();
      return get(`/suppliers${query ? `?${query}` : ""}`) as Promise<
        SuppliersListResponse | Supplier[]
      >;
    },
    [get]
  );

  const getSupplier = useCallback(
    async (id: string): Promise<Supplier> => {
      return get(`/suppliers/${id}`) as Promise<Supplier>;
    },
    [get]
  );

  const updateSupplier = useCallback(
    async (id: string, data: UpdateSupplierData): Promise<Supplier> => {
      return put(`/suppliers/${id}`, data) as Promise<Supplier>;
    },
    [put]
  );

  const deleteSupplier = useCallback(
    async (id: string): Promise<{ message: string }> => {
      return del(`/suppliers/${id}`) as Promise<{ message: string }>;
    },
    [del]
  );

  const getSuppliersStats = useCallback(async (): Promise<SuppliersStats> => {
    return get("/suppliers/stats") as Promise<SuppliersStats>;
  }, [get]);

  return {
    createSupplier,
    getSuppliers,
    getSupplier,
    updateSupplier,
    deleteSupplier,
    getSuppliersStats,
  };
}
