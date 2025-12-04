import { useAuthenticatedApi } from "./use-authenticated-api";
import { useCallback } from "react";

export interface Customer {
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

export interface CreateCustomerData {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  creditLimit?: number;
}

export interface UpdateCustomerData {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  creditLimit?: number;
}

export interface CustomersListResponse {
  customers: Customer[];
  total: number;
  pages: number;
}

export interface CustomersStats {
  totalCustomers: number;
  totalRevenue: number;
  totalCredit: number;
  avgPurchase: number;
}

interface CustomersFilters {
  page?: number;
  limit?: number;
  search?: string;
}

export function useCustomersApi() {
  const { post, get, put, delete: del } = useAuthenticatedApi();

  const createCustomer = useCallback(
    async (data: CreateCustomerData): Promise<Customer> => {
      return post("/customers", data) as Promise<Customer>;
    },
    [post]
  );

  const getCustomers = useCallback(
    async (
      filters: CustomersFilters = {}
    ): Promise<CustomersListResponse | Customer[]> => {
      const params = new URLSearchParams();
      if (filters.page) params.set("page", filters.page.toString());
      if (filters.limit) params.set("limit", filters.limit.toString());
      if (filters.search) params.set("search", filters.search);

      const query = params.toString();
      return get(`/customers${query ? `?${query}` : ""}`) as Promise<
        CustomersListResponse | Customer[]
      >;
    },
    [get]
  );

  const getCustomer = useCallback(
    async (id: string): Promise<Customer> => {
      return get(`/customers/${id}`) as Promise<Customer>;
    },
    [get]
  );

  const updateCustomer = useCallback(
    async (id: string, data: UpdateCustomerData): Promise<Customer> => {
      return put(`/customers/${id}`, data) as Promise<Customer>;
    },
    [put]
  );

  const deleteCustomer = useCallback(
    async (id: string): Promise<{ message: string }> => {
      return del(`/customers/${id}`) as Promise<{ message: string }>;
    },
    [del]
  );

  const getCustomersStats = useCallback(async (): Promise<CustomersStats> => {
    return get("/customers/stats") as Promise<CustomersStats>;
  }, [get]);

  return {
    createCustomer,
    getCustomers,
    getCustomer,
    updateCustomer,
    deleteCustomer,
    getCustomersStats,
  };
}
