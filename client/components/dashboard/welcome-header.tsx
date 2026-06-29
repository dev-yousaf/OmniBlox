"use client";

import { useMemo, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { CalendarDays, ChevronDown } from "lucide-react";
import { format } from "date-fns";
import type { UserProfile } from "./types";

interface WelcomeHeaderProps {
  user: UserProfile | null;
  ordersCount?: number;
  period: string;
  onPeriodChange: (period: string) => void;
  loading: boolean;
}

const PERIOD_LABELS: Record<string, string> = {
  "1D": "Last 24 Hours",
  "1W": "Last 7 Days",
  "1M": "Last Month",
  "3M": "Last 3 Months",
  "6M": "Last 6 Months",
  "1Y": "Last Year",
};

export function WelcomeHeader({ user, ordersCount, period, onPeriodChange, loading }: WelcomeHeaderProps) {
  const [open, setOpen] = useState(false);

  const dateLabel = useMemo(() => {
    const now = new Date();
    const start = new Date();
    switch (period) {
      case "1D": start.setDate(now.getDate() - 1); break;
      case "1W": start.setDate(now.getDate() - 7); break;
      case "1M": start.setMonth(now.getMonth() - 1); break;
      case "3M": start.setMonth(now.getMonth() - 3); break;
      case "6M": start.setMonth(now.getMonth() - 6); break;
      default: start.setFullYear(now.getFullYear() - 1);
    }
    return `${format(start, "dd MMM yyyy")} - ${format(now, "dd MMM yyyy")}`;
  }, [period]);

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
              Welcome, {user?.name?.split(" ")[0] ?? "Admin"}
            </h1>
            <p className="text-sm text-[#646b72] dark:text-[#a6b0c0]">
              You have <span className="font-bold text-[#fe9f43]">{ordersCount ?? 0}</span> Orders
            </p>
          </>
        )}
      </div>
      <div className="relative">
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-[7px] px-[10px] py-[10px] border border-border rounded-lg bg-card text-sm text-[#092c4c] dark:text-[#d1d5db] hover:bg-accent transition-colors cursor-pointer"
        >
          <CalendarDays className="h-4 w-4 text-[#092c4c] dark:text-[#d1d5db]" />
          <span className="text-[15px]">{dateLabel}</span>
          <ChevronDown className="h-3.5 w-3.5" />
        </button>
        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <div className="absolute right-0 top-full mt-1 z-20 w-[180px] border border-border rounded-lg bg-card shadow-lg overflow-hidden">
              {Object.entries(PERIOD_LABELS).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => { onPeriodChange(key); setOpen(false); }}
                  className={`w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-muted ${
                    key === period ? "font-semibold text-primary bg-muted/50" : "text-card-foreground"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
