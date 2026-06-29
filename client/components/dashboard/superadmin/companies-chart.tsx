"use client";

import { Skeleton } from "@/components/ui/skeleton";
import type { BarChartItem } from "./types";

interface CompaniesChartProps {
  data: BarChartItem[];
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

export function CompaniesChart({ data, change, changeText, loading, period, onPeriodChange }: CompaniesChartProps) {
  const maxCount = Math.max(...data.map((d) => d.count), 1);

  if (loading) {
    return (
      <Skeleton className="h-[323px] w-[267px] rounded-[5px]" />
    );
  }

  return (
    <div className="border border-border rounded-[5px] flex flex-col h-full">
      <div className="bg-card border-b border-border flex items-center gap-[10px] px-[20px] py-[15px] rounded-tl-[5px] rounded-tr-[5px]">
        <p className="flex-1 text-[16px] font-semibold text-[#212b36] dark:text-[#f1f3f4] leading-[24px]">
          Activity
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
      <div className="bg-card flex-1 p-[20px] rounded-bl-[5px] rounded-br-[5px] drop-shadow-[0px_1px_0.5px_rgba(198,198,198,0.2)]">
        <div className="flex flex-col gap-[4px] h-full">
          <div className="flex-1 flex items-end gap-[16px] w-full">
            {data.map((item, i) => {
              const barH = Math.max((item.count / maxCount) * 140, 4);
              const highlighted = i === data.length - 1;
              return (
                <div key={i} className="flex flex-col items-center gap-[4px]">
                  {highlighted && (
                    <div className="bg-[#fe9f43] flex items-center justify-center p-[4px] rounded-[2px] w-full">
                      <span className="text-[10px] font-normal text-white leading-[8px]">{item.count}</span>
                    </div>
                  )}
                  <div
                    className="rounded-[10px] w-[16px]"
                    style={{
                      height: `${barH}px`,
                      backgroundColor: highlighted ? "#fe9f43" : "#092c4c",
                    }}
                  />
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-between text-[12px] font-medium text-[#646b72] leading-[18px]">
            {data.map((item, i) => (
              <span key={i} className="shrink-0">{item.day}</span>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-[8px] mt-2">
          <div className="bg-[#3eb780] flex items-center justify-center p-[6px] rounded-[5px]">
            <span className="text-[10px] font-medium text-white leading-[8px]">{change > 0 ? "+" : ""}{change.toFixed(0)}%</span>
          </div>
          <span className="text-[14px] text-[#646b72] leading-[21px]">{changeText}</span>
        </div>
      </div>
    </div>
  );
}