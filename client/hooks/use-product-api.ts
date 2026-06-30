import { useAuthenticatedApi } from "./use-authenticated-api";
import { useCallback } from "react";
import type { Product, StockLedgerEntry, ComboItem } from "@/lib/types";

interface CreateProductData {
  name: string;
  sku: string;
  description?: string;
  category: string;
  brand?: string;
  unit?: string;
  imageUrl?: string;
  salePrice: number;
  costPrice: number;
  stock?: number;
  reorderLevel?: number;
  status?: "ACTIVE" | "INACTIVE" | "DISCONTINUED";
  type?: "STANDARD" | "DIGITAL" | "SERVICE" | "COMBO";
  hasVariants?: boolean;
  attributes?: Record<string, string>;
  parentId?: string;
  comboItems?: { productId: string; quantity: number }[];
  warehouseId?: string;
  manufacturedDate?: string;
  expiryDate?: string;
  alertQuantity?: number;
}

interface UpdateProductData extends Partial<CreateProductData> {}

export interface ProductListResponse {
  products: Product[];
  total: number;
  pages: number;
}

export interface LowStockDetailItem {
  productId: string;
  productName: string;
  sku: string;
  imageUrl: string | null;
  category: string;
  warehouseId: string;
  warehouseName: string;
  storeName: string;
  quantity: number;
  alertQuantity: number;
}

export interface LowStockDetailsResponse {
  items: LowStockDetailItem[];
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
  warehouseId?: string;
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
      if (filters.warehouseId) params.set("warehouseId", filters.warehouseId);

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

  const getLowStockDetails = useCallback(
    async (filters: { page?: number; limit?: number } = {}): Promise<LowStockDetailsResponse> => {
      const params = new URLSearchParams();
      if (filters.page) params.set("page", filters.page.toString());
      if (filters.limit) params.set("limit", filters.limit.toString());
      const query = params.toString();
      return get(`/products/low-stock/details${query ? `?${query}` : ""}`) as Promise<LowStockDetailsResponse>;
    },
    [get]
  );

  const getExpiredProducts = useCallback(
    async (filters: { page?: number; limit?: number } = {}): Promise<ProductListResponse> => {
      const params = new URLSearchParams();
      if (filters.page) params.set("page", filters.page.toString());
      if (filters.limit) params.set("limit", filters.limit.toString());
      const query = params.toString();
      return get(`/products/expired${query ? `?${query}` : ""}`) as Promise<ProductListResponse>;
    },
    [get]
  );

  const getProductStats = useCallback(async (): Promise<ProductStats> => {
    return get("/products/stats") as Promise<ProductStats>;
  }, [get]);

  const getStockLedger = useCallback(
    async (id: string): Promise<StockLedgerEntry[]> => {
      return get(`/products/${id}/ledger`) as Promise<StockLedgerEntry[]>;
    },
    [get]
  );

  const getVariants = useCallback(
    async (id: string): Promise<Product[]> => {
      return get(`/products/${id}/variants`) as Promise<Product[]>;
    },
    [get]
  );

  const importCsv = useCallback(
    async (products: CreateProductData[]): Promise<{ imported: number; errors: string[] }> => {
      return post("/products/import", products) as Promise<{ imported: number; errors: string[] }>;
    },
    [post]
  );

  const exportCsv = useCallback(async (): Promise<string> => {
    return get("/products/export") as Promise<string>;
  }, [get]);

  const getComboItems = useCallback(
    async (id: string): Promise<ComboItem[]> => {
      return get(`/products/${id}/combo-items`) as Promise<ComboItem[]>;
    },
    [get]
  );

  const exportExcel = useCallback(async (): Promise<string> => {
    return get("/products/export") as Promise<string>;
  }, [get]);

  const bulkUpdatePrice = useCallback(
    async (data: { id: string; salePrice: number; costPrice?: number }[]): Promise<void> => {
      await put("/products/bulk-update-price", data);
    },
    [put]
  );

  const getProductSales = useCallback(
    async (id: string): Promise<any[]> => {
      return get(`/products/${id}/sales`) as Promise<any[]>;
    },
    [get]
  );

  const getProductQuotations = useCallback(
    async (id: string): Promise<any[]> => {
      return get(`/products/${id}/quotations`) as Promise<any[]>;
    },
    [get]
  );

  const getProductPurchases = useCallback(
    async (id: string): Promise<any[]> => {
      return get(`/products/${id}/purchases`) as Promise<any[]>;
    },
    [get]
  );

  const getProductTransfers = useCallback(
    async (id: string): Promise<any[]> => {
      return get(`/products/${id}/transfers`) as Promise<any[]>;
    },
    [get]
  );

  const getProductAdjustments = useCallback(
    async (id: string): Promise<any[]> => {
      return get(`/products/${id}/adjustments`) as Promise<any[]>;
    },
    [get]
  );

  const adjustStock = useCallback(
    async (data: {
      items: { productId: string; warehouseId: string; previousQuantity: number; newQuantity: number }[];
      notes?: string;
      type: "ADDITION" | "REMOVAL";
      documentUrl?: string;
    }): Promise<any> => {
      return post("/products/adjustments", data);
    },
    [post]
  );

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
    getLowStockDetails,
    getExpiredProducts,
    getProductStats,
    getStockLedger,
    getVariants,
    importCsv,
    exportCsv,
    getComboItems,
    exportExcel,
    bulkUpdatePrice,
    getProductSales,
    getProductQuotations,
    getProductPurchases,
    getProductTransfers,
    getProductAdjustments,
    adjustStock,
  };
}
