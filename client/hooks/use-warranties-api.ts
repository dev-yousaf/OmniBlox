import { useAuthenticatedApi } from "./use-authenticated-api";
import { useCallback } from "react";

export interface Warranty {
  id: string;
  name: string;
  duration: number;
  durationType: string;
  description?: string;
  status: string;
  companyId: string;
  createdAt: string;
  updatedAt: string;
  _count?: { products: number };
}

export interface CreateWarrantyDto {
  name: string;
  duration: number;
  durationType?: string;
  description?: string;
  status?: string;
}

export interface UpdateWarrantyDto {
  name?: string;
  duration?: number;
  durationType?: string;
  description?: string;
  status?: string;
}

export interface BulkDeleteResponse {
  message: string;
  deleted: string[];
  failed: Array<{ id: string; error: string }>;
}

export function useWarrantiesApi() {
  const { get, post, put, delete: del } = useAuthenticatedApi();

  const getWarranties = useCallback(async (): Promise<Warranty[]> => {
    return get("/warranties") as Promise<Warranty[]>;
  }, [get]);

  const getWarranty = useCallback(async (id: string): Promise<Warranty> => {
    return get(`/warranties/${id}`) as Promise<Warranty>;
  }, [get]);

  const createWarranty = useCallback(async (data: CreateWarrantyDto): Promise<Warranty> => {
    return post("/warranties", data) as Promise<Warranty>;
  }, [post]);

  const updateWarranty = useCallback(async (id: string, data: UpdateWarrantyDto): Promise<Warranty> => {
    return put(`/warranties/${id}`, data) as Promise<Warranty>;
  }, [put]);

  const deleteWarranty = useCallback(async (id: string): Promise<void> => {
    await del(`/warranties/${id}`);
  }, [del]);

  const bulkDeleteWarranties = useCallback(async (ids: string[]): Promise<BulkDeleteResponse> => {
    return post("/warranties/bulk-delete", { ids }) as Promise<BulkDeleteResponse>;
  }, [post]);

  return { getWarranties, getWarranty, createWarranty, updateWarranty, deleteWarranty, bulkDeleteWarranties };
}
