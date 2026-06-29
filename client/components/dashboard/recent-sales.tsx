"use client";

import { ShoppingBag } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, type RecentSale } from "./types";

const PERIOD_LABELS: Record<string, string> = {
  "1D": "24H", "1W": "7D", "1M": "1M", "3M": "3M", "6M": "6M", "1Y": "1Y",
};

interface RecentSalesProps {
  sales: RecentSale[];
  period: string;
  loading: boolean;
}

export function RecentSales({ sales, period, loading }: RecentSalesProps) {
  return (
    <div className="border border-border rounded-lg h-full">
      <div className="border-b border-border px-5 py-[15px]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-[#e7f0ff] dark:bg-[#1a2a4a] rounded-lg p-2">
              <ShoppingBag className="h-4 w-4 text-[#2d7aff] dark:text-[#6b9fff]" />
            </div>
            <h3 className="text-lg font-bold text-card-foreground">
              Recent Sales
            </h3>
          </div>
          <span className="text-xs text-muted-foreground border border-border rounded px-2.5 py-1">
            {PERIOD_LABELS[period] || period}
          </span>
        </div>
      </div>
      <div className="p-5 space-y-6">
        {loading
          ? Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Skeleton className="w-12 h-12 rounded-[10px]" />
                  <div className="space-y-1.5">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
                <div className="text-right space-y-1">
                  <Skeleton className="h-3 w-10" />
                  <Skeleton className="h-5 w-16 rounded-md" />
                </div>
              </div>
            ))
          : sales.length > 0
          ? sales.map((sale) => (
              <div key={sale.id} className="flex items-center justify-between">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div className="w-12 h-12 rounded-[10px] bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 flex items-center justify-center text-gray-600 dark:text-gray-300 font-bold text-sm shrink-0">
                    {sale.customerName.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-card-foreground truncate">
                      {sale.productName}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[13px] text-muted-foreground">
                        {sale.categoryName}
                      </span>
                      <span className="bg-[#e04f16] rounded-full w-1 h-1" />
                      <span className="text-[13px] text-card-foreground">
                        {formatCurrency(sale.totalAmount)}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right shrink-0 ml-3">
                  <p className="text-[13px] text-muted-foreground">
                    {new Date(sale.saleDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </p>
                  <span className="inline-flex items-center gap-1 bg-[#6938ef] text-white text-[10px] font-medium px-1.5 py-1 rounded-[5px] mt-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-white" />
                    {sale.status}
                  </span>
                </div>
              </div>
            ))
          : (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No recent sales
            </p>
          )}
      </div>
    </div>
  );
}
