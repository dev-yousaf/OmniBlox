"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { formatCompactCurrency } from "./types";
import type { MonthlyRevenueItem } from "./types";

interface RevenueCardProps {
  chartData: MonthlyRevenueItem[];
  amount: number;
  change: number;
  changeText: string;
  loading: boolean;
  period: string;
  onPeriodChange: (period: string) => void;
}

const tabs = [
  { key: "1W", label: "1W" },
  { key: "1M", label: "1M" },
  { key: "3M", label: "3M" },
  { key: "6M", label: "6M" },
  { key: "1Y", label: "1Y" },
];

export function RevenueCard({ chartData, amount, change, changeText, loading, period, onPeriodChange }: RevenueCardProps) {
  if (loading) {
    return <Skeleton className="h-[323px] w-[558px] rounded-[5px]" />;
  }

  return (
    <div className="border border-border rounded-[5px] flex flex-col flex-1">
      <div className="bg-card border-b border-border flex items-center gap-[10px] px-[20px] py-[15px] rounded-tl-[5px] rounded-tr-[5px]">
        <p className="flex-1 text-[16px] font-semibold text-[#212b36] dark:text-[#f1f3f4] leading-[24px]">
          Expenses by Category
        </p>
        <div className="flex items-center gap-1">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => onPeriodChange(t.key)}
              className={`px-2 py-1 text-[11px] font-medium rounded ${
                period === t.key
                  ? "bg-[#fe9f43] text-white"
                  : "text-[#646b72] dark:text-[#a6b0c0] hover:bg-accent"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
      <div className="bg-card flex items-center">
        <div className="flex-1 flex flex-col justify-center px-[20px] py-[8px]">
          <p className="text-[16px] font-semibold text-[#212b36] dark:text-[#f1f3f4] leading-[24px]">
            {formatCompactCurrency(amount)}
          </p>
          <p className="text-[12px] text-[#646b72] leading-[0]">
            <span className="text-[12px] font-bold text-[#29b768] leading-[18px]">
              {change > 0 ? "+" : ""}{change.toFixed(0)}%
            </span>{" "}
            <span className="text-[12px] text-[#646b72] leading-[16px]">{changeText}</span>
          </p>
        </div>
      </div>
      <div className="bg-card flex items-end p-[20px] rounded-bl-[5px] rounded-br-[5px] drop-shadow-[0px_1px_0.5px_rgba(198,198,198,0.2)]">
        <div className="w-full h-[165px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <YAxis
                tick={{ fontSize: 10, fill: "#646b72" }}
                axisLine={false}
                tickLine={false}
                width={30}
                tickFormatter={(v: number) => v >= 1000 ? `${(v/1000).toFixed(0)}K` : String(v)}
              />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 10, fill: "#646b72" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#fff",
                  border: "1px solid #e6eaed",
                  borderRadius: "5px",
                  fontSize: "12px",
                }}
              />
              <Bar dataKey="revenue" fill="#6938ef" radius={[4, 4, 0, 0]} maxBarSize={24} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}