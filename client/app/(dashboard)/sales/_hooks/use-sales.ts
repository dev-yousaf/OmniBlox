"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import type {
  CreateSalePayload,
  SaleDetail,
  SaleItemPayload,
  SaleSummary,
  SalesFilters,
  SalesStats,
  UpdateSalePayload,
} from "../_types";
import { useSalesService } from "../_services/sales-service";

interface UseSalesListState {
  sales: SaleSummary[];
  stats: SalesStats | null;
  total: number;
  pages: number;
  filters: SalesFilters;
  loading: boolean;
  error: string | null;
  deletingId: string | null;
  markPaidId: string | null;
  refresh: (overrides?: Partial<SalesFilters>) => Promise<void>;
  setFilters: (updater: Partial<SalesFilters>) => void;
  deleteSale: (id: string) => Promise<void>;
  markSalePaid: (id: string) => Promise<void>;
}

interface UseSaleDetailState {
  sale: SaleDetail | null;
  loading: boolean;
  updating: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  markAsPaid: () => Promise<void>;
  updateSale: (payload: UpdateSalePayload) => Promise<SaleDetail | null>;
  deleteSale: () => Promise<void>;
  setLocalSale: (
    updater: (current: SaleDetail | null) => SaleDetail | null
  ) => void;
}

const DEFAULT_FILTERS: SalesFilters = {
  page: 1,
  limit: 20,
};

const normalizeError = (error: unknown): string => {
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: string }).message;
    if (typeof message === "string" && message.trim().length > 0) {
      return message;
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Something went wrong while processing the request.";
};

export function useSalesList(
  initialFilters: SalesFilters = {}
): UseSalesListState {
  const mergedInitial = useMemo(
    () => ({
      ...DEFAULT_FILTERS,
      ...initialFilters,
    }),
    [initialFilters]
  );

  const [filters, setFiltersState] = useState<SalesFilters>(mergedInitial);
  const [sales, setSales] = useState<SaleSummary[]>([]);
  const [stats, setStats] = useState<SalesStats | null>(null);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [markPaidId, setMarkPaidId] = useState<string | null>(null);

  const { getSales, getSalesStats, deleteSale, markSalePaid } =
    useSalesService();

  const load = useCallback(
    async (overrides: Partial<SalesFilters> = {}) => {
      const params = { ...filters, ...overrides };
      setLoading(true);
      setError(null);

      try {
        const statsPromise = getSalesStats().catch(
          () => null as SalesStats | null
        );
        const [listResponse, statsResponse] = await Promise.all([
          getSales(params),
          statsPromise,
        ]);

        setSales(listResponse.sales);
        setTotal(listResponse.total);
        setPages(listResponse.pages);

        if (statsResponse) {
          setStats(statsResponse);
        }
      } catch (err) {
        setError(normalizeError(err));
      } finally {
        setLoading(false);
      }
    },
    [filters, getSales, getSalesStats]
  );

  useEffect(() => {
    load().catch((err) => {
      setError(normalizeError(err));
      setLoading(false);
    });
  }, [filters, load]);

  const setFilters = useCallback((update: Partial<SalesFilters>) => {
    setFiltersState((prev) => {
      const next = { ...prev, ...update };

      const shouldResetPage =
        (update.search !== undefined && update.search !== prev.search) ||
        (update.status !== undefined && update.status !== prev.status) ||
        (update.paymentStatus !== undefined &&
          update.paymentStatus !== prev.paymentStatus) ||
        (update.warehouseId !== undefined &&
          update.warehouseId !== prev.warehouseId) ||
        (update.dateFrom !== undefined &&
          update.dateFrom !== prev.dateFrom) ||
        (update.dateTo !== undefined &&
          update.dateTo !== prev.dateTo) ||
        (update.productId !== undefined &&
          update.productId !== prev.productId);

      if (shouldResetPage) {
        next.page = 1;
      }

      return next;
    });
  }, []);

  const handleDelete = useCallback(
    async (id: string) => {
      setDeletingId(id);
      try {
        await deleteSale(id);
        await load();
      } catch (err) {
        setError(normalizeError(err));
      } finally {
        setDeletingId(null);
      }
    },
    [deleteSale, load]
  );

  const handleMarkPaid = useCallback(
    async (id: string) => {
      setMarkPaidId(id);
      try {
        await markSalePaid(id);
        await load();
      } catch (err) {
        setError(normalizeError(err));
      } finally {
        setMarkPaidId(null);
      }
    },
    [load, markSalePaid]
  );

  return {
    sales,
    stats,
    total,
    pages,
    filters,
    loading,
    error,
    deletingId,
    markPaidId,
    refresh: load,
    setFilters,
    deleteSale: handleDelete,
    markSalePaid: handleMarkPaid,
  };
}

export function useSaleDetail(id: string | null): UseSaleDetailState {
  const { getSale, markSalePaid, updateSale, deleteSale } = useSalesService();
  const [sale, setSale] = useState<SaleDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(Boolean(id));
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!id) {
      setSale(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await getSale(id);
      setSale(data);
    } catch (err) {
      setError(normalizeError(err));
    } finally {
      setLoading(false);
    }
  }, [getSale, id]);

  useEffect(() => {
    refresh().catch((err) => {
      setError(normalizeError(err));
      setLoading(false);
    });
  }, [refresh]);

  const markAsPaid = useCallback(async () => {
    if (!sale) return;
    setUpdating(true);
    try {
      const updated = await markSalePaid(sale.id);
      setSale(updated);
    } catch (err) {
      setError(normalizeError(err));
    } finally {
      setUpdating(false);
    }
  }, [markSalePaid, sale]);

  const handleUpdate = useCallback(
    async (payload: UpdateSalePayload) => {
      if (!id) return null;
      setUpdating(true);
      try {
        const updated = await updateSale(id, payload);
        setSale(updated);
        return updated;
      } catch (err) {
        setError(normalizeError(err));
        return null;
      } finally {
        setUpdating(false);
      }
    },
    [id, updateSale]
  );

  const handleDelete = useCallback(async () => {
    if (!id) return;
    setUpdating(true);
    try {
      await deleteSale(id);
      setSale(null);
    } catch (err) {
      setError(normalizeError(err));
    } finally {
      setUpdating(false);
    }
  }, [deleteSale, id]);

  const setLocalSale = useCallback(
    (updater: (current: SaleDetail | null) => SaleDetail | null) => {
      setSale((current) => updater(current));
    },
    []
  );

  return {
    sale,
    loading,
    updating,
    error,
    refresh,
    markAsPaid,
    updateSale: handleUpdate,
    deleteSale: handleDelete,
    setLocalSale,
  };
}

export function buildSalePayload(
  data: Omit<CreateSalePayload, "items"> & {
    items: (SaleItemPayload & { productName?: string })[];
  }
): CreateSalePayload {
  return {
    ...data,
    items: data.items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
    })),
  };
}
