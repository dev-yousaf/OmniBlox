"use client";

import { WorkspaceLink as Link } from "@/components/workspace-link";
import { AlertTriangle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { LowStockProduct } from "./types";

interface LowStockProductsProps {
  products: LowStockProduct[];
  loading: boolean;
}

export function LowStockProducts({ products, loading }: LowStockProductsProps) {
  return (
    <div className="border border-border rounded-lg h-full">
      <div className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <h3 className="text-base font-semibold text-card-foreground">
              Low Stock Products
            </h3>
          </div>
          <Link
            href="/products"
            className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700"
          >
            View All
          </Link>
        </div>

        <div className="space-y-0">
          {loading
            ? Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <Skeleton className="w-12 h-12 rounded-lg" />
                    <div className="space-y-1.5">
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                  </div>
                  <div className="text-right space-y-1">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-4 w-8 ml-auto" />
                  </div>
                </div>
              ))
            : products.length > 0
            ? products.map((product) => (
                <div
                  key={product.productId}
                  className="flex items-center justify-between py-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-red-100 to-red-200 dark:from-red-800 dark:to-red-900 flex items-center justify-center text-red-700 dark:text-red-300 font-bold text-sm shrink-0">
                      {product.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-card-foreground">
                        {product.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        SKU: {product.sku}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-medium text-red-500">
                      Low Stock
                    </p>
                    <p className="text-sm font-bold text-card-foreground">
                      {product.stockQuantity}
                    </p>
                  </div>
                </div>
              ))
            : (
              <p className="text-sm text-muted-foreground py-8 text-center">
                No low stock items
              </p>
            )}
        </div>
      </div>
    </div>
  );
}
