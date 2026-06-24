import { useAuthenticatedApi } from "./use-authenticated-api";
import { useCallback } from "react";

export interface VariantAttribute {
  id: string;
  name: string;
  slug: string;
  values?: any;
  description?: string;
  status: string;
  companyId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateVariantAttributeDto {
  name: string;
  slug?: string;
  values?: any;
  description?: string;
  status?: string;
}

export interface UpdateVariantAttributeDto {
  name?: string;
  slug?: string;
  values?: any;
  description?: string;
  status?: string;
}

export interface BulkDeleteResponse {
  message: string;
  deleted: string[];
  failed: Array<{ id: string; error: string }>;
}

export function useVariantAttributesApi() {
  const { get, post, put, delete: del } = useAuthenticatedApi();

  const getVariantAttributes = useCallback(async (): Promise<VariantAttribute[]> => {
    return get("/variant-attributes") as Promise<VariantAttribute[]>;
  }, [get]);

  const getVariantAttribute = useCallback(async (id: string): Promise<VariantAttribute> => {
    return get(`/variant-attributes/${id}`) as Promise<VariantAttribute>;
  }, [get]);

  const createVariantAttribute = useCallback(async (data: CreateVariantAttributeDto): Promise<VariantAttribute> => {
    return post("/variant-attributes", data) as Promise<VariantAttribute>;
  }, [post]);

  const updateVariantAttribute = useCallback(async (id: string, data: UpdateVariantAttributeDto): Promise<VariantAttribute> => {
    return put(`/variant-attributes/${id}`, data) as Promise<VariantAttribute>;
  }, [put]);

  const deleteVariantAttribute = useCallback(async (id: string): Promise<void> => {
    await del(`/variant-attributes/${id}`);
  }, [del]);

  const bulkDeleteVariantAttributes = useCallback(async (ids: string[]): Promise<BulkDeleteResponse> => {
    return post("/variant-attributes/bulk-delete", { ids }) as Promise<BulkDeleteResponse>;
  }, [post]);

  return { getVariantAttributes, getVariantAttribute, createVariantAttribute, updateVariantAttribute, deleteVariantAttribute, bulkDeleteVariantAttributes };
}
