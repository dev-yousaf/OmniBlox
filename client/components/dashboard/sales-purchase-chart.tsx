"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { BarChart3, CircleDot } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatCompactCurrency, PERIODS, type SalesPurchaseChartItem } from "./types";

interface SalesPurchaseChartProps {
  data: SalesPurchaseChartItem[];
  period: string;
  onPeriodChange: (period: string) => void;
  totalPurchaseAmount: number;
  totalSalesAmount: number;
  loading: boolean;
}

export function SalesPurchaseChart({
  data,
  period,
  onPeriodChange,
  totalPurchaseAmount,
  totalSalesAmount,
  loading,
}: SalesPurchaseChartProps) {
  return (
    <div className="border border-border rounded-lg h-full">
      <div className="border-b border-border px-5 py-[15px]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-[#fff6ee] dark:bg-[#3d2a20] rounded-lg p-2">
              <BarChart3 className="h-3.5 w-3.5 text-[#fe9f43]" />
            </div>
            <h3 className="text-lg font-bold text-card-foreground leading-[27px]">
              Sales & Purchase
            </h3>
          </div>
          <div className="flex items-center bg-muted rounded-[4px] h-[30px]">
            {PERIODS.map((tab, idx) => (
              <button
                key={tab}
                onClick={() => onPeriodChange(tab)}
                className={`px-3 py-1 text-xs font-medium leading-[18px] transition-colors ${
                  tab === period
                    ? "text-card-foreground"
                    : "text-card-foreground"
                } ${idx < PERIODS.length - 1 ? "border-r border-border" : ""}`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="p-5">
        <div className="flex items-center gap-6 mt-3 mb-4">
          <div className="flex items-center gap-2">
            <CircleDot className="h-3 w-3 text-blue-500 fill-blue-500" />
            <span className="text-sm text-muted-foreground">Total Purchase</span>
            <span className="text-sm font-semibold text-card-foreground">
              {loading ? (
                <Skeleton className="h-4 w-16 inline-block" />
              ) : (
                formatCompactCurrency(totalPurchaseAmount)
              )}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <CircleDot className="h-3 w-3 text-green-500 fill-green-500" />
            <span className="text-sm text-muted-foreground">Total Sales</span>
            <span className="text-sm font-semibold text-card-foreground">
              {loading ? (
                <Skeleton className="h-4 w-16 inline-block" />
              ) : (
                formatCompactCurrency(totalSalesAmount)
              )}
            </span>
          </div>
        </div>

        {loading ? (
          <Skeleton className="h-[300px] w-full" />
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data} barGap={4} barCategoryGap="20%">
              <CartesianGrid
                stroke="#E5E7EB"
                strokeDasharray="3 3"
                vertical={false}
              />
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
                tickFormatter={(v: number) => formatCompactCurrency(v)}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: "8px",
                  border: "1px solid #E5E7EB",
                  boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
                }}
                formatter={(value: number, name: string) => [
                  formatCurrency(value),
                  name === "purchase" ? "Total Purchase" : "Total Sales",
                ]}
                labelStyle={{ fontWeight: 600, marginBottom: 4 }}
              />
              <Bar
                dataKey="purchase"
                fill="#3B82F6"
                radius={[4, 4, 0, 0]}
                name="purchase"
                maxBarSize={32}
              />
              <Bar
                dataKey="sales"
                fill="#22C55E"
                radius={[4, 4, 0, 0]}
                name="sales"
                maxBarSize={32}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
