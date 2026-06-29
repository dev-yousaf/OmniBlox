"use client";

import { Box } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { formatCurrency, type TopSellingProduct } from "./types";

const PERIOD_LABELS: Record<string, string> = {
  "1D": "24H", "1W": "7D", "1M": "1M", "3M": "3M", "6M": "6M", "1Y": "1Y",
};

interface TopSellingProductsProps {
  products: TopSellingProduct[];
  period: string;
  loading: boolean;
}

export function TopSellingProducts({ products, period, loading }: TopSellingProductsProps) {
  return (
    <div className="border border-border rounded-lg h-full">
      <div className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Box className="h-5 w-5 text-pink-500" />
            <h3 className="text-base font-semibold text-card-foreground">
              Top Selling Products
            </h3>
          </div>
          <span className="text-xs text-muted-foreground border border-border rounded-md px-2 py-1">
            {PERIOD_LABELS[period] || period}
          </span>
        </div>

        <div className="space-y-0">
          {loading
            ? Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <Skeleton className="w-12 h-12 rounded-lg" />
                    <div className="space-y-1.5">
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </div>
                  <Skeleton className="h-5 w-14" />
                </div>
              ))
            : products.length > 0
            ? products.map((product, index) => (
                <div key={product.productId}>
                  <div className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-800 dark:to-blue-900 flex items-center justify-center text-blue-700 dark:text-blue-300 font-bold text-sm shrink-0">
                        {product.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-card-foreground">
                          {product.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatCurrency(product.salePrice)}
                          <span className="mx-1.5">&bull;</span>
                          {product.salesCount} Sales
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className="text-xs font-medium text-muted-foreground border-border"
                    >
                      #{index + 1}
                    </Badge>
                  </div>
                  {index < products.length - 1 && <Separator />}
                </div>
              ))
            : (
              <p className="text-sm text-muted-foreground py-8 text-center">
                No products found
              </p>
            )}
        </div>
      </div>
    </div>
  );
}
