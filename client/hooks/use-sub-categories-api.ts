import { useAuthenticatedApi } from "./use-authenticated-api";
import { useCallback } from "react";

export interface SubCategory {
  id: string;
  name: string;
  slug: string;
  code?: string;
  imageUrl?: string;
  description?: string;
  status: string;
  categoryId: string;
  companyId: string;
  createdAt: string;
  updatedAt: string;
  category?: { id: string; name: string; slug: string };
}

export interface CreateSubCategoryDto {
  name: string;
  categoryId: string;
  slug?: string;
  code?: string;
  imageUrl?: string;
  description?: string;
  status?: string;
}

export interface UpdateSubCategoryDto {
  name?: string;
  categoryId?: string;
  slug?: string;
  code?: string;
  imageUrl?: string;
  description?: string;
  status?: string;
}

export function useSubCategoriesApi() {
  const { get, post, put, delete: del } = useAuthenticatedApi();

  const getSubCategories = useCallback(async (categoryId?: string): Promise<SubCategory[]> => {
    const params = categoryId ? `?categoryId=${categoryId}` : "";
    return get(`/sub-categories${params}`) as Promise<SubCategory[]>;
  }, [get]);

  const getSubCategory = useCallback(
    async (id: string): Promise<SubCategory> => {
      return get(`/sub-categories/${id}`) as Promise<SubCategory>;
    },
    [get]
  );

  const createSubCategory = useCallback(
    async (data: CreateSubCategoryDto): Promise<SubCategory> => {
      return post("/sub-categories", data) as Promise<SubCategory>;
    },
    [post]
  );

  const updateSubCategory = useCallback(
    async (id: string, data: UpdateSubCategoryDto): Promise<SubCategory> => {
      return put(`/sub-categories/${id}`, data) as Promise<SubCategory>;
    },
    [put]
  );

  const deleteSubCategory = useCallback(
    async (id: string): Promise<void> => {
      await del(`/sub-categories/${id}`);
    },
    [del]
  );

  const bulkDeleteSubCategories = useCallback(
    async (ids: string[]): Promise<{ deleted: string[]; failed: Array<{ id: string; error: string }> }> => {
      return post("/sub-categories/bulk-delete", { ids }) as Promise<any>;
    },
    [post]
  );

  return {
    getSubCategories,
    getSubCategory,
    createSubCategory,
    updateSubCategory,
    deleteSubCategory,
    bulkDeleteSubCategories,
  };
}
