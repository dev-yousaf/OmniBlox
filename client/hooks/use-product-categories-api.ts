import { useAuthenticatedApi } from "./use-authenticated-api";
import { useCallback } from "react";

export interface ProductCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  status: string;
  companyId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProductCategoryDto {
  name: string;
  slug?: string;
  description?: string;
  status?: string;
}

export interface UpdateProductCategoryDto {
  name?: string;
  slug?: string;
  description?: string;
  status?: string;
}

export interface AffectedProduct {
  id: string;
  name: string;
  sku: string;
}

export interface DeleteCategoryResponse {
  message: string;
  affectedProducts: AffectedProduct[];
}

export interface BulkDeleteResponse {
  message: string;
  deleted: string[];
  failed: Array<{ id: string; error: string }>;
  totalAffectedProducts: number;
  affectedProductsList: AffectedProduct[];
}

export function useProductCategoriesApi() {
  const { get, post, put, delete: del } = useAuthenticatedApi();

  const getCategories = useCallback(async (): Promise<ProductCategory[]> => {
    return get("/product-categories") as Promise<ProductCategory[]>;
  }, [get]);

  const getCategory = useCallback(
    async (id: string): Promise<ProductCategory> => {
      return get(`/product-categories/${id}`) as Promise<ProductCategory>;
    },
    [get]
  );

  const createCategory = useCallback(
    async (data: CreateProductCategoryDto): Promise<ProductCategory> => {
      return post("/product-categories", data) as Promise<ProductCategory>;
    },
    [post]
  );

  const updateCategory = useCallback(
    async (
      id: string,
      data: UpdateProductCategoryDto
    ): Promise<ProductCategory> => {
      return put(`/product-categories/${id}`, data) as Promise<ProductCategory>;
    },
    [put]
  );

  const deleteCategory = useCallback(
    async (id: string): Promise<DeleteCategoryResponse> => {
      return del(
        `/product-categories/${id}`
      ) as Promise<DeleteCategoryResponse>;
    },
    [del]
  );

  const bulkDeleteCategories = useCallback(
    async (ids: string[]): Promise<BulkDeleteResponse> => {
      return post(`/product-categories/bulk-delete`, {
        ids,
      }) as Promise<BulkDeleteResponse>;
    },
    [post]
  );

  return {
    getCategories,
    getCategory,
    createCategory,
    updateCategory,
    deleteCategory,
    bulkDeleteCategories,
  };
}
