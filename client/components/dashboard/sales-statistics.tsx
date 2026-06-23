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

const MONTHLY_DATA = [
  { month: "Jan", revenue: 21.557, expense: -41.938 },
  { month: "Feb", revenue: 86.0, expense: -63.385 },
  { month: "Mar", revenue: 82.7, expense: -31.789 },
  { month: "Apr", revenue: 70.376, expense: -63.385 },
  { month: "May", revenue: 70.376, expense: -63.385 },
  { month: "Jun", revenue: 65.301, expense: -31.789 },
  { month: "Jul", revenue: 86.0, expense: -63.385 },
  { month: "Aug", revenue: 56.602, expense: -63.385 },
  { month: "Sep", revenue: 82.7, expense: -31.789 },
  { month: "Oct", revenue: 44.278, expense: -41.938 },
  { month: "Nov", revenue: 21.557, expense: -50.637 },
  { month: "Dec", revenue: 70.376, expense: -63.385 },
];

export function SalesStatistics() {
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
              <span className="text-base font-bold text-[#0e9384]">$48,988,078</span>
              <span className="inline-flex items-center gap-1 bg-[#3eb780] text-white text-[10px] font-medium px-1.5 py-1 rounded-[5px]">
                <TrendingUp className="h-2.5 w-2.5" />
                25%
              </span>
            </div>
            <p className="text-sm text-muted-foreground">Revenue</p>
          </div>
          <div className="border border-border rounded-lg p-2 flex-1 max-w-[130px]">
            <div className="flex items-center gap-2">
              <span className="text-base font-bold text-[#e04f16]">$12,189</span>
              <span className="inline-flex items-center gap-1 bg-[#e70d0d] text-white text-[10px] font-medium px-1.5 py-1 rounded-[5px]">
                <TrendingDown className="h-2.5 w-2.5" />
                59%
              </span>
            </div>
            <p className="text-sm text-muted-foreground">Expense</p>
          </div>
        </div>

        <div className="h-[243px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={MONTHLY_DATA} barGap={2} barCategoryGap="10%">
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
                dataKey="revenue"
                fill="#0e9384"
                radius={[4, 4, 0, 0]}
                maxBarSize={12}
              />
              <Bar
                dataKey="expense"
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
