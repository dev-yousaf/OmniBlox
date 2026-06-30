import { useState, useEffect } from "react";
import { useAuthenticatedApi } from "@/hooks/use-authenticated-api";
import { useAuth } from "@/contexts/auth-context";

export interface Warehouse {
  id: string;
  name: string;
  location: string | null;
}

export function useWarehouses() {
  const { get } = useAuthenticatedApi();
  const { isAuthenticated } = useAuth();
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadWarehouses = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await get("/inventory/warehouses");
      setWarehouses(response as Warehouse[]);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load warehouses"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }
    loadWarehouses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  return {
    warehouses,
    loading,
    error,
    reload: loadWarehouses,
  };
}
