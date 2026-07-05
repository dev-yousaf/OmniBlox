"use client";

import { useCallback, useEffect, useState } from "react";
import { useCustomersApi, type Customer } from "@/hooks/use-customers-api";
import { useAuthenticatedApi } from "@/hooks/use-authenticated-api";
import type { SaleSummary } from "../../../sales/_types";

interface UseCustomerDetailState {
  customer: Customer | null;
  sales: SaleSummary[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  delete: () => Promise<void>;
}

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

export function useCustomerDetail(id: string | null): UseCustomerDetailState {
  const { getCustomer, deleteCustomer } = useCustomersApi();
  const { get } = useAuthenticatedApi();

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [sales, setSales] = useState<SaleSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!id) {
      setCustomer(null);
      setSales([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [customerData, salesResponse] = await Promise.all([
        getCustomer(id),
        get(`/sales?customerId=${id}`).catch(() => ({ sales: [] })),
      ]);
      setCustomer(customerData);
      setSales((salesResponse as { sales: SaleSummary[] }).sales ?? []);
    } catch (err) {
      setError(normalizeError(err));
    } finally {
      setLoading(false);
    }
  }, [id, getCustomer, get]);

  useEffect(() => {
    refresh().catch(() => {});
  }, [refresh]);

  const handleDelete = useCallback(async () => {
    if (!id) return;
    await deleteCustomer(id);
  }, [id, deleteCustomer]);

  return {
    customer,
    sales,
    loading,
    error,
    refresh,
    delete: handleDelete,
  };
}
