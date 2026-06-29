"use client";

import { TrendingUp, FileText, Receipt, Banknote } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCompactCurrency, type FinancialCardData } from "./types";

const FINANCIAL_CARDS: FinancialCardData[] = [
  { title: "Profit", iconBg: "bg-[#e9f8fb] dark:bg-[#1a3a40]", label: "vs Last Month", amount: 0, change: 0 },
  { title: "Invoice Due", iconBg: "bg-[#e9f5f4] dark:bg-[#1a3332]", label: "vs Last Month", amount: 0, change: 0 },
  { title: "Total Expenses", iconBg: "bg-[#fcefea] dark:bg-[#3d2a23]", label: "vs Last Month", amount: 0, change: 0 },
  { title: "Total Payment Returns", iconBg: "bg-[#ededfb] dark:bg-[#23234a]", label: "vs Last Month", amount: 0, change: 0 },
];

const CARD_ICONS = [TrendingUp, FileText, Receipt, Banknote];

interface FinancialCardsProps {
  amounts: number[];
  changes: number[];
  loading: boolean;
}

export function FinancialCards({ amounts, changes, loading }: FinancialCardsProps) {
  return (
    <div className="grid grid-cols-4 gap-6">
      {FINANCIAL_CARDS.map((card, i) => {
        const Icon = CARD_ICONS[i];
        const amount = amounts[i] ?? 0;
        const change = changes[i] ?? 0;
        return (
          <div key={card.title} className="bg-card border border-border rounded-lg p-5 flex flex-col gap-4 shadow-[0px_4px_12px_rgba(236,236,236,0.25)] dark:shadow-[0px_4px_12px_rgba(0,0,0,0.25)]">
            <div className="flex items-start justify-between gap-1">
              <div>
                {loading ? (
                  <>
                    <Skeleton className="h-7 w-24" />
                    <Skeleton className="h-4 w-16 mt-1" />
                  </>
                ) : (
                  <>
                    <p className="text-lg font-bold text-card-foreground leading-[27px]">
                      {formatCompactCurrency(amount)}
                    </p>
                    <p className="text-sm text-muted-foreground leading-[21px]">
                      {card.title}
                    </p>
                  </>
                )}
              </div>
              <div className={`w-12 h-12 rounded-lg ${card.iconBg} flex items-center justify-center shrink-0`}>
                <Icon className="h-4 w-4 text-card-foreground" />
              </div>
            </div>
            <div className="h-px bg-border" />
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                <span
                  className={`font-bold ${
                    change >= 0 ? "text-[#3eb780]" : "text-red-500"
                  }`}
                >
                  {change >= 0 ? "+" : ""}{change}%
                </span>{" "}
                {card.label}
              </p>

            </div>
          </div>
        );
      })}
    </div>
  );
}
