"use client";

import { CalendarDays } from "lucide-react";
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
}

export function RevenueCard({ chartData, amount, change, changeText, loading }: RevenueCardProps) {
  if (loading) {
    return <Skeleton className="h-[323px] w-[558px] rounded-[5px]" />;
  }

  return (
    <div className="border border-border rounded-[5px] flex flex-col flex-1">
      <div className="bg-card border-b border-border flex items-center gap-[10px] px-[20px] py-[15px] rounded-tl-[5px] rounded-tr-[5px]">
        <p className="flex-1 text-[16px] font-semibold text-[#212b36] dark:text-[#f1f3f4] leading-[24px]">
          Revenue
        </p>
        <div className="bg-card border border-border flex items-center px-[12px] py-[6px] rounded-[4px]">
          <div className="flex items-center gap-[4px]">
            <CalendarDays className="h-3 w-3 text-[#212b36] dark:text-[#d1d5db]" />
            <span className="text-[12px] font-semibold text-[#212b36] dark:text-[#d1d5db] leading-[18px]">2025</span>
          </div>
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
        <div className="flex-1 flex items-center justify-end px-[20px] py-[8px]">
          <div className="flex items-center gap-[4px]">
            <div className="w-[6px] h-[6px] rounded-full bg-[#fe9f43]" />
            <span className="text-[13px] text-[#212b36] dark:text-[#d1d5db] leading-[16px]">Revenue</span>
          </div>
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
              <Bar dataKey="revenue" fill="#fe9f43" radius={[4, 4, 0, 0]} maxBarSize={24} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
