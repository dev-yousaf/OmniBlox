"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import { AlertTriangle, ChevronDown, CalendarDays, TrendingUp, TrendingDown } from "lucide-react";
import type { SalesPurchaseChartItem } from "./types";

const FALLBACK_DATA: SalesPurchaseChartItem[] = [
  { month: "Jan", purchase: 41.938, sales: 21.557 },
  { month: "Feb", purchase: 63.385, sales: 86.0 },
  { month: "Mar", purchase: 31.789, sales: 82.7 },
  { month: "Apr", purchase: 63.385, sales: 70.376 },
  { month: "May", purchase: 63.385, sales: 70.376 },
  { month: "Jun", purchase: 31.789, sales: 65.301 },
  { month: "Jul", purchase: 63.385, sales: 86.0 },
  { month: "Aug", purchase: 63.385, sales: 56.602 },
  { month: "Sep", purchase: 31.789, sales: 82.7 },
  { month: "Oct", purchase: 41.938, sales: 44.278 },
  { month: "Nov", purchase: 50.637, sales: 21.557 },
  { month: "Dec", purchase: 63.385, sales: 70.376 },
];

interface SalesStatisticsProps {
  data?: SalesPurchaseChartItem[];
  totalRevenue?: number;
  totalExpenses?: number;
  revenueChange?: number;
  expenseChange?: number;
  loading?: boolean;
}

export function SalesStatistics({
  data,
  totalRevenue = 48988078,
  totalExpenses = 12189,
  revenueChange = 25,
  expenseChange = 59,
  loading,
}: SalesStatisticsProps) {
  const chartData = data && data.length > 0 ? data : FALLBACK_DATA;

  return (
    <div className="border border-border rounded-lg h-full">
      <div className="border-b border-border px-5 py-[15px] flex items-center gap-2">
        <div className="bg-[#ffede9] dark:bg-[#3d1f1a] rounded-lg p-2">
          <AlertTriangle className="h-4 w-4 text-[#e04f16]" />
        </div>
        <h3 className="text-lg font-bold text-card-foreground flex-1">
          Sales Statics
        </h3>
        <div className="flex items-center gap-1.5 border border-border rounded px-3 py-1.5">
          <CalendarDays className="h-3 w-3 text-card-foreground" />
          <span className="text-xs font-semibold text-card-foreground">2025</span>
          <ChevronDown className="h-3 w-3 text-card-foreground" />
        </div>
      </div>
      <div className="p-5 space-y-4">
        <div className="flex gap-4">
          <div className="border border-border rounded-lg p-2 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-base font-bold text-[#0e9384]">
                ${(totalRevenue / 1000).toFixed(1)}K
              </span>
              <span className="inline-flex items-center gap-1 bg-[#3eb780] text-white text-[10px] font-medium px-1.5 py-1 rounded-[5px]">
                <TrendingUp className="h-2.5 w-2.5" />
                {revenueChange}%
              </span>
            </div>
            <p className="text-sm text-muted-foreground">Revenue</p>
          </div>
          <div className="border border-border rounded-lg p-2 flex-1 max-w-[130px]">
            <div className="flex items-center gap-2">
              <span className="text-base font-bold text-[#e04f16]">
                ${(totalExpenses / 1000).toFixed(1)}K
              </span>
              <span className="inline-flex items-center gap-1 bg-[#e70d0d] text-white text-[10px] font-medium px-1.5 py-1 rounded-[5px]">
                <TrendingDown className="h-2.5 w-2.5" />
                {expenseChange}%
              </span>
            </div>
            <p className="text-sm text-muted-foreground">Expense</p>
          </div>
        </div>

        <div className="h-[243px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} barGap={2} barCategoryGap="10%">
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
              <XAxis
                dataKey="month"
                axisLine={{ stroke: "#E5E7EB" }}
                tickLine={false}
                tick={{ fill: "#9CA3AF", fontSize: 12 }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#9CA3AF", fontSize: 12 }}
                tickFormatter={(v: number) => `${Math.abs(v)}K`}
                domain={[-100, 100]}
                ticks={[-100, -80, -60, -40, -20, 0, 20, 40, 60, 80, 100]}
              />
              <Bar
                dataKey="sales"
                fill="#0e9384"
                radius={[4, 4, 0, 0]}
                maxBarSize={12}
              />
              <Bar
                dataKey="purchase"
                fill="#e04f16"
                radius={[4, 4, 0, 0]}
                maxBarSize={12}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
