import { useAuthenticatedApi } from "./use-authenticated-api";
import { useCallback } from "react";

export interface Unit {
  id: string;
  name: string;
  shortName: string;
  slug: string;
  description?: string;
  status: string;
  companyId: string;
  createdAt: string;
  updatedAt: string;
  _count?: { products: number };
}

export interface CreateUnitDto {
  name: string;
  shortName: string;
  slug?: string;
  description?: string;
  status?: string;
}

export interface UpdateUnitDto {
  name?: string;
  shortName?: string;
  slug?: string;
  description?: string;
  status?: string;
}

export interface BulkDeleteResponse {
  message: string;
  deleted: string[];
  failed: Array<{ id: string; error: string }>;
}

export function useUnitsApi() {
  const { get, post, put, delete: del } = useAuthenticatedApi();

  const getUnits = useCallback(async (): Promise<Unit[]> => {
    return get("/units") as Promise<Unit[]>;
  }, [get]);

  const getUnit = useCallback(async (id: string): Promise<Unit> => {
    return get(`/units/${id}`) as Promise<Unit>;
  }, [get]);

  const createUnit = useCallback(async (data: CreateUnitDto): Promise<Unit> => {
    return post("/units", data) as Promise<Unit>;
  }, [post]);

  const updateUnit = useCallback(async (id: string, data: UpdateUnitDto): Promise<Unit> => {
    return put(`/units/${id}`, data) as Promise<Unit>;
  }, [put]);

  const deleteUnit = useCallback(async (id: string): Promise<void> => {
    await del(`/units/${id}`);
  }, [del]);

  const bulkDeleteUnits = useCallback(async (ids: string[]): Promise<BulkDeleteResponse> => {
    return post("/units/bulk-delete", { ids }) as Promise<BulkDeleteResponse>;
  }, [post]);

  return { getUnits, getUnit, createUnit, updateUnit, deleteUnit, bulkDeleteUnits };
}
