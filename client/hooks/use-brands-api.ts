import { useAuthenticatedApi } from "./use-authenticated-api";
import { useCallback } from "react";

export interface Brand {
  id: string;
  name: string;
  slug: string;
  imageUrl?: string;
  description?: string;
  status: string;
  companyId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBrandDto {
  name: string;
  slug?: string;
  imageUrl?: string;
  description?: string;
  status?: string;
}

export interface UpdateBrandDto {
  name?: string;
  slug?: string;
  imageUrl?: string;
  description?: string;
  status?: string;
}

export interface BulkDeleteResponse {
  message: string;
  deleted: string[];
  failed: Array<{ id: string; error: string }>;
}

export function useBrandsApi() {
  const { get, post, put, delete: del } = useAuthenticatedApi();

  const getBrands = useCallback(async (): Promise<Brand[]> => {
    return get("/brands") as Promise<Brand[]>;
  }, [get]);

  const getBrand = useCallback(async (id: string): Promise<Brand> => {
    return get(`/brands/${id}`) as Promise<Brand>;
  }, [get]);

  const createBrand = useCallback(async (data: CreateBrandDto): Promise<Brand> => {
    return post("/brands", data) as Promise<Brand>;
  }, [post]);

  const updateBrand = useCallback(async (id: string, data: UpdateBrandDto): Promise<Brand> => {
    return put(`/brands/${id}`, data) as Promise<Brand>;
  }, [put]);

  const deleteBrand = useCallback(async (id: string): Promise<void> => {
    await del(`/brands/${id}`);
  }, [del]);

  const bulkDeleteBrands = useCallback(async (ids: string[]): Promise<BulkDeleteResponse> => {
    return post("/brands/bulk-delete", { ids }) as Promise<BulkDeleteResponse>;
  }, [post]);

  return { getBrands, getBrand, createBrand, updateBrand, deleteBrand, bulkDeleteBrands };
}
