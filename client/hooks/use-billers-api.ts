import { useAuthenticatedApi } from "./use-authenticated-api";
import { useCallback } from "react";

export interface Biller {
  id: string;
  code: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  contactPerson?: string;
  gstNumber?: string;
  status: "ACTIVE" | "INACTIVE";
  createdAt: string;
  updatedAt: string;
}

export interface CreateBillerData {
  code: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  contactPerson?: string;
  gstNumber?: string;
  status?: "ACTIVE" | "INACTIVE";
}

export interface UpdateBillerData {
  code?: string;
  name?: string;
  address?: string;
  phone?: string;
  email?: string;
  contactPerson?: string;
  gstNumber?: string;
  status?: "ACTIVE" | "INACTIVE";
}

export interface BillersListResponse {
  billers: Biller[];
  total: number;
  pages: number;
}

export interface BillersStats {
  totalBillers: number;
  activeBillers: number;
  inactiveBillers: number;
  recentlyAdded: number;
}

interface BillersFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
}

export function useBillersApi() {
  const { post, get, put, delete: del } = useAuthenticatedApi();

  const createBiller = useCallback(
    async (data: CreateBillerData): Promise<Biller> => {
      return post("/billers", data) as Promise<Biller>;
    },
    [post]
  );

  const getBillers = useCallback(
    async (
      filters: BillersFilters = {}
    ): Promise<BillersListResponse | Biller[]> => {
      const params = new URLSearchParams();
      if (filters.page) params.set("page", filters.page.toString());
      if (filters.limit) params.set("limit", filters.limit.toString());
      if (filters.search) params.set("search", filters.search);
      if (filters.status) params.set("status", filters.status);

      const query = params.toString();
      return get(`/billers${query ? `?${query}` : ""}`) as Promise<
        BillersListResponse | Biller[]
      >;
    },
    [get]
  );

  const getAllBillers = useCallback(async (): Promise<Biller[]> => {
    return get("/billers/all") as Promise<Biller[]>;
  }, [get]);

  const getBiller = useCallback(
    async (id: string): Promise<Biller> => {
      return get(`/billers/${id}`) as Promise<Biller>;
    },
    [get]
  );

  const updateBiller = useCallback(
    async (id: string, data: UpdateBillerData): Promise<Biller> => {
      return put(`/billers/${id}`, data) as Promise<Biller>;
    },
    [put]
  );

  const deleteBiller = useCallback(
    async (id: string): Promise<{ message: string }> => {
      return del(`/billers/${id}`) as Promise<{ message: string }>;
    },
    [del]
  );

  const getBillersStats = useCallback(async (): Promise<BillersStats> => {
    return get("/billers/stats") as Promise<BillersStats>;
  }, [get]);

  const checkCodeAvailability = useCallback(
    async (
      code: string,
      excludeId?: string
    ): Promise<{ available: boolean }> => {
      const params = new URLSearchParams({ code });
      if (excludeId) params.set("excludeId", excludeId);

      return get(`/billers/check-code?${params.toString()}`) as Promise<{
        available: boolean;
      }>;
    },
    [get]
  );

  return {
    createBiller,
    getBillers,
    getAllBillers,
    getBiller,
    updateBiller,
    deleteBiller,
    getBillersStats,
    checkCodeAvailability,
  };
}
