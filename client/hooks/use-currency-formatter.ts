"use client";

import { useMemo } from "react";
import { useSettings } from "@/contexts/settings-context";

export function useCurrencyFormatter(): Intl.NumberFormat {
  const { settings } = useSettings();
  return useMemo(() => {
    const code = (settings?.currencyCode ?? "usd").toUpperCase();
    const decimals = settings?.decimalPlaces ?? 2;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: code,
      minimumFractionDigits: Math.min(decimals, 2),
      maximumFractionDigits: decimals,
    });
  }, [settings?.currencyCode, settings?.decimalPlaces]);
}
