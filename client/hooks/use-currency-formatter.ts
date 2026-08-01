"use client";

import { useMemo } from "react";
import { useSettings } from "@/contexts/settings-context";

export function useCurrencyFormatter(): Intl.NumberFormat {
  const { settings } = useSettings();
  return useMemo(() => {
    const raw = Number(settings?.decimalPlaces);
    const decimals = Number.isFinite(raw)
      ? Math.min(Math.max(Math.round(raw), 0), 3)
      : 2;
    const symbol =
      settings?.currencySymbol && settings.currencySymbol.trim() !== ""
        ? settings.currencySymbol
        : "$";
    return new Intl.NumberFormat("en-US", {
      style: "decimal",
      minimumFractionDigits: Math.min(decimals, 2),
      maximumFractionDigits: decimals,
    });
  }, [settings?.currencySymbol, settings?.decimalPlaces]);
}

export function useCurrencySymbol(): string {
  const { settings } = useSettings();
  return useMemo(
    () =>
      settings?.currencySymbol && settings.currencySymbol.trim() !== ""
        ? settings.currencySymbol
        : "$",
    [settings?.currencySymbol]
  );
}

export function useFormatCurrency(): (value: number | string | null | undefined) => string {
  const formatter = useCurrencyFormatter();
  const symbol = useCurrencySymbol();
  return useMemo(
    () => (value: number | string | null | undefined) => {
      const num = Number(value);
      if (value === undefined || value === null || Number.isNaN(num)) {
        return `${symbol}0`;
      }
      return `${symbol}${formatter.format(num)}`;
    },
    [formatter, symbol]
  );
}
