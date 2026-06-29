"use client";

import { useCallback, useRef, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { CalendarDays, ChevronDown } from "lucide-react";

interface WelcomeHeaderProps {
  adminName: string;
  loading: boolean;
  storeName?: string;
  totalUsers?: number;
  period: string;
  onPeriodChange: (period: string) => void;
}

const periodLabels: Record<string, string> = {
  "1D": "1 Day",
  "1W": "1 Week",
  "1M": "1 Month",
  "3M": "3 Months",
  "6M": "6 Months",
  "1Y": "1 Year",
};

export function SuperadminWelcomeHeader({ adminName, loading, storeName, totalUsers, period, onPeriodChange }: WelcomeHeaderProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const handleSelect = useCallback((p: string) => {
    onPeriodChange(p);
    setOpen(false);
  }, [onPeriodChange]);

  return (
    <div className="pt-6 pb-0 flex items-center justify-between">
      <div>
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-7 w-64" />
            <Skeleton className="h-4 w-72" />
          </div>
        ) : (
          <>
            <h1 className="text-[28px] font-bold text-[#212b36] dark:text-[#f1f3f4] leading-[42px]">
              {storeName ?? adminName}
            </h1>
            <p className="text-sm text-[#646b72] dark:text-[#a6b0c0]">
              <span className="font-bold text-[#fe9f43]">{totalUsers ?? 0}</span> users
            </p>
          </>
        )}
      </div>
      <div className="relative" ref={ref}>
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-[7px] px-[10px] py-[10px] border border-border rounded-lg bg-card text-sm text-[#092c4c] dark:text-[#d1d5db] hover:bg-accent"
        >
          <CalendarDays className="h-4 w-4 text-[#092c4c] dark:text-[#d1d5db]" />
          <span className="text-[15px]">{periodLabels[period] ?? period}</span>
          <ChevronDown className="h-3 w-3" />
        </button>
        {open && (
          <div className="absolute right-0 mt-1 w-[140px] bg-card border border-border rounded-lg shadow-lg z-50">
            {Object.entries(periodLabels).map(([key, label]) => (
              <button
                key={key}
                onClick={() => handleSelect(key)}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-accent first:rounded-t-lg last:rounded-b-lg ${
                  key === period ? "font-bold text-[#fe9f43]" : "text-[#212b36] dark:text-[#d1d5db]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
