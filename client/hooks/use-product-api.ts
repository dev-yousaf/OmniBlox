import { useAuthenticatedApi } from "./use-authenticated-api";
import { useCallback } from "react";
import type { Product } from "@/lib/types";

interface CreateProductData {
  name: string;
  sku: string;
  description?: string;
  category: string;
  brand?: string;
  salePrice: number;
  costPrice: number;
  stock: number;
  reorderLevel: number;
  status?: "ACTIVE" | "INACTIVE" | "DISCONTINUED";
}

interface UpdateProductData extends Partial<CreateProductData> {}

export interface ProductListResponse {
  products: Product[];
  total: number;
  pages: number;
}

export interface ProductStats {
  totalProducts: number;
  lowStockCount: number;
  totalValue: number;
  categoriesCount: number;
}

interface ProductFilters {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  status?: string;
}

export function useProductApi() {
  const { post, get, put, delete: del } = useAuthenticatedApi();

  const createProduct = useCallback(
    async (data: CreateProductData): Promise<Product> => {
      return post("/products", data) as Promise<Product>;
    },
    [post]
  );

  const getProducts = useCallback(
    async (filters: ProductFilters = {}): Promise<ProductListResponse> => {
      const params = new URLSearchParams();
      if (filters.page) params.set("page", filters.page.toString());
      if (filters.limit) params.set("limit", filters.limit.toString());
      if (filters.search) params.set("search", filters.search);
      if (filters.category) params.set("category", filters.category);
      if (filters.status) params.set("status", filters.status);

      const query = params.toString();
      return get(
        `/products${query ? `?${query}` : ""}`
      ) as Promise<ProductListResponse>;
    },
    [get]
  );

  const getProduct = useCallback(
    async (id: string): Promise<Product> => {
      return get(`/products/${id}`) as Promise<Product>;
    },
    [get]
  );

  const getProductBySku = useCallback(
    async (sku: string): Promise<Product> => {
      return get(`/products/sku/${sku}`) as Promise<Product>;
    },
    [get]
  );

  const updateProduct = useCallback(
    async (id: string, data: UpdateProductData): Promise<Product> => {
      return put(`/products/${id}`, data) as Promise<Product>;
    },
    [put]
  );

  const deleteProduct = useCallback(
    async (id: string): Promise<void> => {
      await del(`/products/${id}`);
    },
    [del]
  );

  const updateStock = useCallback(
    async (
      id: string,
      quantity: number,
      operation: "add" | "subtract"
    ): Promise<Product> => {
      return put(`/products/${id}/stock`, {
        quantity,
        operation,
      }) as Promise<Product>;
    },
    [put]
  );

  const getCategories = useCallback(async (): Promise<string[]> => {
    return get("/products/categories") as Promise<string[]>;
  }, [get]);

  const getBrands = useCallback(async (): Promise<string[]> => {
    return get("/products/brands") as Promise<string[]>;
  }, [get]);

  const getLowStockProducts = useCallback(async (): Promise<Product[]> => {
    return get("/products/low-stock") as Promise<Product[]>;
  }, [get]);

  const getProductStats = useCallback(async (): Promise<ProductStats> => {
    return get("/products/stats") as Promise<ProductStats>;
  }, [get]);

  return {
    createProduct,
    getProducts,
    getProduct,
    getProductBySku,
    updateProduct,
    deleteProduct,
    updateStock,
    getCategories,
    getBrands,
    getLowStockProducts,
    getProductStats,
  };
}
