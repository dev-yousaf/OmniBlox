export interface MoneySettings {
  currencyCode: string;
  currencySymbol: string;
  decimalPlaces: number;
}

let current: MoneySettings = {
  currencyCode: "usd",
  currencySymbol: "$",
  decimalPlaces: 2,
};

export function setMoneySettings(settings: Partial<MoneySettings>) {
  current = {
    ...current,
    ...settings,
    decimalPlaces: sanitizeDecimalPlaces(settings.decimalPlaces),
  };
}

function sanitizeDecimalPlaces(value: number | undefined): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return 2;
  return Math.min(Math.max(Math.round(n), 0), 3);
}

export function getMoneySettings(): MoneySettings {
  return current;
}

const memoizedFormatters = new Map<string, Intl.NumberFormat>();

function getFormatter(compact: boolean): Intl.NumberFormat {
  const key = `${current.currencyCode.toUpperCase()}:${current.decimalPlaces}:${compact}`;
  const existing = memoizedFormatters.get(key);
  if (existing) return existing;
  const decimals = Math.min(current.decimalPlaces, compact ? 1 : 2);
  const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: current.currencyCode.toUpperCase(),
    minimumFractionDigits: decimals,
    maximumFractionDigits: compact ? decimals : current.decimalPlaces,
    ...(compact ? { notation: "compact" } : {}),
  });
  memoizedFormatters.set(key, formatter);
  return formatter;
}

export function formatMoney(
  value: number | string | undefined | null,
  opts?: { compact?: boolean }
): string {
  const num = Number(value);
  if (value === undefined || value === null || Number.isNaN(num)) {
    return `${current.currencySymbol}0`;
  }
  return getFormatter(!!opts?.compact).format(num);
}

export function formatCompactMoney(
  value: number | string | undefined | null
): string {
  return formatMoney(value, { compact: true });
}
