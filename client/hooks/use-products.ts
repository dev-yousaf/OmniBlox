import { useCallback, useEffect, useState } from "react";
import type { Product } from "@/lib/types";
import { useProductApi, type ProductListResponse } from "./use-product-api";
import { useAuth } from "@/contexts/auth-context";

const CACHE_TTL_MS = 60_000;

let cachedResponse: ProductListResponse | null = null;
let cacheTimestamp = 0;
let inflightRequest: Promise<ProductListResponse> | null = null;

interface ReloadOptions {
  force?: boolean;
}

interface UseAllProductsOptions {
  skip?: boolean;
  refreshInterval?: number;
}

interface UseAllProductsResult {
  products: Product[];
  total: number;
  pages: number;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  reload: (options?: ReloadOptions) => Promise<ProductListResponse | null>;
}

const isCacheFresh = () => {
  if (!cachedResponse) {
    return false;
  }
  return Date.now() - cacheTimestamp < CACHE_TTL_MS;
};

const normalizeError = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return "Unexpected error while loading products.";
};

export function useAllProducts(
  options: UseAllProductsOptions = {}
): UseAllProductsResult {
  const { skip = false, refreshInterval } = options;
  const { getProducts } = useProductApi();
  const { isAuthenticated } = useAuth();

  const [products, setProducts] = useState<Product[]>(
    () => cachedResponse?.products ?? []
  );
  const [total, setTotal] = useState(() => cachedResponse?.total ?? 0);
  const [pages, setPages] = useState(() => cachedResponse?.pages ?? 0);
  const [loading, setLoading] = useState(!skip && !isCacheFresh());
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateStateFromResponse = useCallback(
    (response: ProductListResponse) => {
      setProducts(response.products);
      setTotal(response.total);
      setPages(response.pages);
    },
    []
  );

  const fetchAll = useCallback(
    async ({ force = false }: ReloadOptions = {}) => {
      if (skip) {
        return null;
      }

      setError(null);

      if (!force) {
        if (isCacheFresh()) {
          if (cachedResponse) {
            updateStateFromResponse(cachedResponse);
            setLoading(false);
          }
          return cachedResponse;
        }

        if (inflightRequest) {
          setRefreshing(true);
          try {
            const response = await inflightRequest;
            updateStateFromResponse(response);
            setLoading(false);
            setRefreshing(false);
            return response;
          } catch (err) {
            const message = normalizeError(err);
            setError(message);
            setRefreshing(false);
            throw err;
          }
        }
      }

      if (cachedResponse) {
        updateStateFromResponse(cachedResponse);
      }

      const isInitialLoad = !cachedResponse;
      setLoading(isInitialLoad);
      setRefreshing(!isInitialLoad);

      const request = getProducts();
      inflightRequest = request;

      try {
        const response = await request;
        cachedResponse = response;
        cacheTimestamp = Date.now();
        updateStateFromResponse(response);
        setLoading(false);
        setRefreshing(false);
        return response;
      } catch (err) {
        const message = normalizeError(err);
        setError(message);
        setLoading(false);
        setRefreshing(false);
        throw err;
      } finally {
        inflightRequest = null;
      }
    },
    [getProducts, skip, updateStateFromResponse]
  );

  useEffect(() => {
    if (skip) {
      setLoading(false);
      return;
    }

    if (!isAuthenticated) {
      return;
    }

    if (!isCacheFresh()) {
      fetchAll().catch(() => {
        /* error state already handled */
      });
    } else if (cachedResponse) {
      updateStateFromResponse(cachedResponse);
      setLoading(false);
    }
  }, [fetchAll, skip, updateStateFromResponse, isAuthenticated]);

  useEffect(() => {
    if (skip || !refreshInterval) {
      return;
    }

    const interval = setInterval(() => {
      fetchAll({ force: true }).catch(() => {
        /* error state already handled */
      });
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [fetchAll, refreshInterval, skip]);

  const reload = useCallback(
    (options: ReloadOptions = { force: true }) =>
      fetchAll({ force: options.force ?? true }),
    [fetchAll]
  );

  return {
    products,
    total,
    pages,
    loading,
    refreshing,
    error,
    reload,
  };
}
