"use client";

import { DollarSign, ArrowDownUp, ShoppingBag, RefreshCcw } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "./types";

const SUMMARY_CARDS = [
  { title: "Total Sales", icon: DollarSign, iconBg: "bg-[#fe9f43]" },
  { title: "Total Sales Return", icon: ArrowDownUp, iconBg: "bg-[#092c4c]" },
  { title: "Total Purchase", icon: ShoppingBag, iconBg: "bg-[#0e9384]" },
  { title: "Total Purchase Return", icon: RefreshCcw, iconBg: "bg-[#155eef]" },
] as const;

interface SummaryCardsProps {
  amounts: number[];
  changes: number[];
  loading: boolean;
}

export function SummaryCards({ amounts, changes, loading }: SummaryCardsProps) {
  return (
    <div className="grid grid-cols-4 gap-6">
      {SUMMARY_CARDS.map((card, i) => {
        const Icon = card.icon;
        const amount = amounts[i] ?? 0;
        const change = changes[i] ?? 0;
        return (
          <div key={card.title} className={`rounded-lg h-[92px] p-5 ${card.iconBg}`}>
            <div className="flex items-center gap-3 h-full">
              <div className="bg-white dark:bg-white/10 rounded-lg p-[10px] shrink-0 flex items-center justify-center">
                <Icon className="h-6 w-6 text-black dark:text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-[#f9fafb]">{card.title}</p>
                <div className="flex items-center gap-2 mt-1">
                  {loading ? (
                    <Skeleton className="h-7 w-24" />
                  ) : (
                    <span className="text-lg font-bold text-white">
                      {formatCurrency(amount)}
                    </span>
                  )}
                  <div className={`flex items-center gap-1 px-[6px] py-[4px] rounded-[5px] ${
                    change >= 0 ? "bg-[#eefaf1]" : "bg-[#ffede9]"
                  }`}>
                    <span className={`text-[10px] font-bold ${
                      change >= 0 ? "text-[#3eb780]" : "text-[#e70d0d]"
                    }`}>
                      {change >= 0 ? "+" : ""}{change}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
