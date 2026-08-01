"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import { useAuthenticatedApi } from "@/hooks/use-authenticated-api";
import { useAuth } from "@/contexts/auth-context";
import { setMoneySettings, type MoneySettings } from "@/lib/money";

export interface AppSettings {
  id: string;
  companyId: string;
  timezone: string;
  language: string;
  dateFormat: string;
  timeFormat: string;
  currencyCode: string;
  currencySymbol: string;
  decimalPlaces: number;
  lowStockThreshold: number;
  lowStockAlerts: boolean;
  defaultWarehouseId: string | null;
  autoBackup: boolean;
  backupTime: string;
  dataRetention: string;
}

export interface UpdateSettingsPayload {
  timezone?: string;
  language?: string;
  dateFormat?: string;
  timeFormat?: string;
  currencyCode?: string;
  currencySymbol?: string;
  decimalPlaces?: number;
  lowStockThreshold?: number;
  lowStockAlerts?: boolean;
  defaultWarehouseId?: string | null;
  autoBackup?: boolean;
  backupTime?: string;
  dataRetention?: string;
}

interface SettingsContextType {
  settings: AppSettings | null;
  loading: boolean;
  refreshSettings: () => Promise<void>;
  updateSettings: (payload: UpdateSettingsPayload) => Promise<AppSettings>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(
  undefined
);

const DEFAULT_SETTINGS: AppSettings = {
  id: "",
  companyId: "",
  timezone: "utc",
  language: "en",
  dateFormat: "mdy",
  timeFormat: "12",
  currencyCode: "usd",
  currencySymbol: "$",
  decimalPlaces: 2,
  lowStockThreshold: 10,
  lowStockAlerts: true,
  defaultWarehouseId: null,
  autoBackup: true,
  backupTime: "02:00",
  dataRetention: "1year",
};

export function SettingsProvider({ children }: { children: ReactNode }) {
  const { get, put } = useAuthenticatedApi();
  const { isAuthenticated } = useAuth();
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const syncMoneySettings = useCallback((s: AppSettings) => {
    setMoneySettings({
      currencyCode: s.currencyCode,
      currencySymbol: s.currencySymbol,
      decimalPlaces: s.decimalPlaces,
    } as MoneySettings);
  }, []);

  const refreshSettings = useCallback(async () => {
    try {
      const data = (await get("/settings")) as AppSettings;
      setSettings(data);
      syncMoneySettings(data);
    } catch (error) {
      console.error("Failed to load settings:", error);
      setSettings(DEFAULT_SETTINGS);
    } finally {
      setLoading(false);
    }
  }, [get, syncMoneySettings]);

  useEffect(() => {
    if (!isAuthenticated) {
      setSettings(null);
      setLoading(false);
      return;
    }
    refreshSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  const updateSettings = useCallback(
    async (payload: UpdateSettingsPayload) => {
      const updated = (await put("/settings", payload)) as AppSettings;
      setSettings(updated);
      syncMoneySettings(updated);
      return updated;
    },
    [put, syncMoneySettings]
  );

  const value = useMemo(
    () => ({ settings, loading, refreshSettings, updateSettings }),
    [settings, loading, refreshSettings, updateSettings]
  );

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings(): SettingsContextType {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
}
