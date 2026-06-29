"use client";

import { useEffect, useState, useCallback } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import { AlertTriangle, TrendingUp, TrendingDown, BarChart3 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import type { SalesPurchaseChartItem } from "./types";

const PERIODS = ["1D", "1W", "1M", "3M", "6M", "1Y"] as const;

interface SalesStatsResponse {
  chart: SalesPurchaseChartItem[];
  totalRevenue: number;
  totalExpenses: number;
  revenueChange: number;
  expenseChange: number;
}

export function SalesStatistics() {
  const [data, setData] = useState<SalesStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("1Y");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api.get<SalesStatsResponse>(`/dashboard/sales-stats?period=${period}`);
      setData(result);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const chartData = data?.chart && data.chart.length > 0 ? data.chart : [];
  const totalRevenue = data?.totalRevenue ?? 0;
  const totalExpenses = data?.totalExpenses ?? 0;
  const revenueChange = data?.revenueChange ?? 0;
  const expenseChange = data?.expenseChange ?? 0;

  return (
    <div className="border border-border rounded-lg h-full">
      <div className="border-b border-border px-5 py-[15px] flex items-center gap-2">
        <div className="bg-[#ffede9] dark:bg-[#3d1f1a] rounded-lg p-2">
          <AlertTriangle className="h-4 w-4 text-[#e04f16]" />
        </div>
        <h3 className="text-lg font-bold text-card-foreground flex-1">
          Sales Statics
        </h3>
        <div className="flex items-center bg-muted rounded-[4px] h-[26px]">
          {PERIODS.map((tab, idx) => (
            <button
              key={tab}
              onClick={() => setPeriod(tab)}
              className={`px-2 py-0.5 text-[11px] font-medium transition-colors ${
                tab === period ? "text-card-foreground font-semibold" : "text-muted-foreground hover:text-card-foreground"
              } ${idx < PERIODS.length - 1 ? "border-r border-border" : ""}`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>
      <div className="p-5 space-y-4">
        {loading ? (
          <div className="space-y-4">
            <div className="flex gap-4">
              <Skeleton className="h-16 flex-1 rounded-lg" />
              <Skeleton className="h-16 w-[130px] rounded-lg" />
            </div>
            <Skeleton className="h-[243px] rounded-lg" />
          </div>
        ) : chartData.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            <BarChart3 className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm font-medium">No sales data yet</p>
            <p className="text-xs mt-1">Sales and expense data will appear here</p>
          </div>
        ) : (
          <>
            <div className="flex gap-4">
              <div className="border border-border rounded-lg p-2 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-base font-bold text-[#0e9384]">
                    ${(totalRevenue / 1000).toFixed(1)}K
                  </span>
                  {revenueChange !== 0 && (
                    <span className="inline-flex items-center gap-1 bg-[#3eb780] text-white text-[10px] font-medium px-1.5 py-1 rounded-[5px]">
                      <TrendingUp className="h-2.5 w-2.5" />
                      {revenueChange}%
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">Revenue</p>
              </div>
              <div className="border border-border rounded-lg p-2 flex-1 max-w-[130px]">
                <div className="flex items-center gap-2">
                  <span className="text-base font-bold text-[#e04f16]">
                    ${(totalExpenses / 1000).toFixed(1)}K
                  </span>
                  {expenseChange !== 0 && (
                    <span className="inline-flex items-center gap-1 bg-[#e70d0d] text-white text-[10px] font-medium px-1.5 py-1 rounded-[5px]">
                      <TrendingDown className="h-2.5 w-2.5" />
                      {expenseChange}%
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">Expense</p>
              </div>
            </div>

            <div className="h-[243px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} barGap={2} barCategoryGap="10%">
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis dataKey="month" axisLine={{ stroke: "#E5E7EB" }} tickLine={false} tick={{ fill: "#9CA3AF", fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: "#9CA3AF", fontSize: 12 }} tickFormatter={(v: number) => `${Math.abs(v)}K`} />
                  <Bar dataKey="sales" fill="#0e9384" radius={[4, 4, 0, 0]} maxBarSize={12} />
                  <Bar dataKey="purchase" fill="#e04f16" radius={[4, 4, 0, 0]} maxBarSize={12} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
