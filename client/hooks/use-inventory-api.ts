import { useAuthenticatedApi } from "./use-authenticated-api";
import { useCallback } from "react";

export interface Warehouse {
  id: string;
  name: string;
  location?: string;
  createdAt: string;
  updatedAt: string;
  _count?: {
    inventory: number;
  };
}

export interface CreateWarehouseData {
  name: string;
  location?: string;
}

export interface UpdateWarehouseData {
  name?: string;
  location?: string;
}

export interface InventoryItem {
  productId: string;
  productName: string;
  productSku: string;
  imageUrl: string | null;
  warehouseId: string;
  warehouseName: string;
  quantity: number;
  salePrice: number;
  costPrice: number;
  reorderLevel: number;
  stockValue: number;
  status: "in_stock" | "low_stock" | "out_of_stock";
  category: string;
  brand?: string;
  updatedAt: string;
}

export interface InventoryListResponse {
  inventory: InventoryItem[];
  total: number;
  pages: number;
}

export interface InventoryStats {
  totalProducts: number;
  totalWarehouses: number;
  lowStockProducts: number;
  outOfStockProducts: number;
  totalStockValue: number;
  recentAdjustments: number;
}

export interface StockTransferData {
  productId: string;
  fromWarehouseId: string;
  toWarehouseId: string;
  quantity: number;
  notes?: string;
}

export interface BulkStockTransferItem {
  productId: string;
  quantity: number;
}

export interface BulkStockTransferData {
  fromWarehouseId: string;
  toWarehouseId: string;
  notes?: string;
  items: BulkStockTransferItem[];
}

export interface TransferListResponse {
  transfers: StockAdjustment[];
  total: number;
  pages: number;
}

export interface StockAdjustmentData {
  notes?: string;
  adjustmentItems: StockAdjustmentItemData[];
}

export interface StockAdjustmentItemData {
  productId: string;
  warehouseId: string;
  newQuantity: number;
}

export interface StockAdjustment {
  id: string;
  referenceNumber: string;
  adjustmentDate: string;
  notes?: string;
  totalItems: number;
  netChange: number;
  createdAt: string;
  user: {
    name: string;
    email: string;
  };
  items: StockAdjustmentItem[];
}

export interface StockAdjustmentItem {
  id: string;
  previousQuantity: number;
  newQuantity: number;
  difference: number;
  product: {
    name: string;
    sku: string;
  };
  warehouse: {
    name: string;
  };
}

export interface WarehouseInventory {
  warehouseId: string;
  warehouseName: string;
  location?: string;
  totalProducts: number;
  totalStockValue: number;
  lowStockCount: number;
  outOfStockCount: number;
  inventory: InventoryItem[];
}

interface InventoryFilters {
  page?: number;
  limit?: number;
  search?: string;
  warehouseId?: string;
  filter?: "low_stock" | "out_of_stock" | "all";
}

export function useInventoryApi() {
  const { post, get, put, delete: del } = useAuthenticatedApi();

  // === WAREHOUSE OPERATIONS ===
  const createWarehouse = useCallback(
    async (data: CreateWarehouseData): Promise<Warehouse> => {
      return post("/inventory/warehouses", data) as Promise<Warehouse>;
    },
    [post]
  );

  const getWarehouses = useCallback(async (): Promise<Warehouse[]> => {
    return get("/inventory/warehouses") as Promise<Warehouse[]>;
  }, [get]);

  const getWarehouse = useCallback(
    async (id: string): Promise<Warehouse> => {
      return get(`/inventory/warehouses/${id}`) as Promise<Warehouse>;
    },
    [get]
  );

  const updateWarehouse = useCallback(
    async (id: string, data: UpdateWarehouseData): Promise<Warehouse> => {
      return put(`/inventory/warehouses/${id}`, data) as Promise<Warehouse>;
    },
    [put]
  );

  const deleteWarehouse = useCallback(
    async (id: string): Promise<{ message: string }> => {
      return del(`/inventory/warehouses/${id}`) as Promise<{ message: string }>;
    },
    [del]
  );

  const getWarehouseInventory = useCallback(
    async (warehouseId: string): Promise<WarehouseInventory> => {
      return get(
        `/inventory/warehouses/${warehouseId}/inventory`
      ) as Promise<WarehouseInventory>;
    },
    [get]
  );

  // === INVENTORY OPERATIONS ===
  const getInventory = useCallback(
    async (filters: InventoryFilters = {}): Promise<InventoryListResponse> => {
      const params = new URLSearchParams();
      if (filters.page) params.set("page", filters.page.toString());
      if (filters.limit) params.set("limit", filters.limit.toString());
      if (filters.search) params.set("search", filters.search);
      if (filters.warehouseId) params.set("warehouseId", filters.warehouseId);
      if (filters.filter) params.set("filter", filters.filter);

      const query = params.toString();
      return get(
        `/inventory${query ? `?${query}` : ""}`
      ) as Promise<InventoryListResponse>;
    },
    [get]
  );

  const updateInventory = useCallback(
    async (
      productId: string,
      warehouseId: string,
      quantity: number,
      notes?: string
    ): Promise<any> => {
      const body: Record<string, any> = { quantity };
      if (notes) body.notes = notes;
      return put(`/inventory/${productId}/${warehouseId}`, body);
    },
    [put]
  );

  const getProductInventory = useCallback(
    async (productId: string): Promise<InventoryItem[]> => {
      return get(`/inventory/product/${productId}`) as Promise<InventoryItem[]>;
    },
    [get]
  );

  const getInventoryStats = useCallback(async (): Promise<InventoryStats> => {
    return get("/inventory/stats") as Promise<InventoryStats>;
  }, [get]);

  // === STOCK TRANSFER OPERATIONS ===
  const transferStock = useCallback(
    async (data: StockTransferData): Promise<StockAdjustment> => {
      return post("/inventory/transfers", data) as Promise<StockAdjustment>;
    },
    [post]
  );

  const bulkTransferStock = useCallback(
    async (data: BulkStockTransferData): Promise<StockAdjustment> => {
      return post("/inventory/transfers/bulk", data) as Promise<StockAdjustment>;
    },
    [post]
  );

  const getTransfers = useCallback(
    async (page = 1, limit = 20): Promise<TransferListResponse> => {
      const params = new URLSearchParams();
      params.set("page", page.toString());
      params.set("limit", limit.toString());
      return get(`/inventory/transfers?${params.toString()}`) as Promise<TransferListResponse>;
    },
    [get]
  );

  const getTransfer = useCallback(
    async (id: string): Promise<StockAdjustment> => {
      return get(`/inventory/transfers/${id}`) as Promise<StockAdjustment>;
    },
    [get]
  );

  // === STOCK ADJUSTMENT OPERATIONS ===
  const createStockAdjustment = useCallback(
    async (data: StockAdjustmentData): Promise<StockAdjustment> => {
      return post("/inventory/adjustments", data) as Promise<StockAdjustment>;
    },
    [post]
  );

  const getStockAdjustments = useCallback(
    async (
      page = 1,
      limit = 10
    ): Promise<{
      adjustments: StockAdjustment[];
      total: number;
      pages: number;
    }> => {
      const params = new URLSearchParams();
      params.set("page", page.toString());
      params.set("limit", limit.toString());

      return get(`/inventory/adjustments?${params.toString()}`) as Promise<{
        adjustments: StockAdjustment[];
        total: number;
        pages: number;
      }>;
    },
    [get]
  );

  return {
    // Warehouses
    createWarehouse,
    getWarehouses,
    getWarehouse,
    updateWarehouse,
    deleteWarehouse,
    getWarehouseInventory,

    // Inventory
    getInventory,
    getProductInventory,
    updateInventory,
    getInventoryStats,

    // Stock operations
    transferStock,
    bulkTransferStock,
    getTransfers,
    getTransfer,
    createStockAdjustment,
    getStockAdjustments,
  };
}
