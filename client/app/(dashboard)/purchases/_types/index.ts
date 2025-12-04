export type PurchaseStatus = "PENDING" | "RECEIVED" | "CANCELLED";

export type PurchaseOrderItem = {
  id: string;
  productId: string;
  quantity: number;
  returnedQuantity: number;
  unitCost: number;
  product?: {
    id: string;
    name: string;
    sku?: string;
  };
};

export type Purchase = {
  id: string;
  referenceNumber: string;
  status: PurchaseStatus;
  orderDate: string;
  totalAmount: number;
  hasReturns: boolean;
  supplier: { id: string; name: string };
  warehouse?: { id: string; name: string } | null;
};

export type PurchaseStats = {
  totalPurchases: number;
  activePurchases: number;
  // Add more stats as needed
};

export type PurchaseFilters = {
  searchQuery: string;
  statusFilter: string;
};

export type PurchaseTableProps = {
  purchases: Purchase[];
  onPurchaseClick: (id: string) => void;
};

export type PurchaseStatsCardsProps = {
  stats: PurchaseStats;
};

export type PurchaseFiltersProps = {
  filters: PurchaseFilters;
  onFiltersChange: (filters: PurchaseFilters) => void;
};

export type PurchaseFormData = Omit<Purchase, "id">;
