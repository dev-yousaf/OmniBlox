"use client";

import { WorkspaceLink as Link } from "@/components/workspace-link";
import { Info, X } from "lucide-react";
import type { LowStockProduct } from "./types";

interface NotificationBarProps {
  visible: boolean;
  onDismiss: () => void;
  lowStockProducts: LowStockProduct[];
}

export function NotificationBar({ visible, onDismiss, lowStockProducts }: NotificationBarProps) {
  if (!visible) return null;

  const lowStock = lowStockProducts.filter((p) => p.stockQuantity > 0 && p.stockQuantity <= p.alertQuantity);
  const outOfStock = lowStockProducts.filter((p) => p.stockQuantity === 0);

  if (lowStock.length === 0 && outOfStock.length === 0) return null;

  const firstLow = lowStock[0] || outOfStock[0];

  return (
    <div className="flex items-center justify-between bg-[#fcefea] dark:bg-[#3d2a23] rounded-lg px-[10px] py-[10px]">
      <div className="flex items-center gap-[10px]">
        <Info className="h-3.5 w-3.5 text-[#e04f16] shrink-0" />
        <p className="text-sm text-[#646b72] dark:text-[#c0c8d4]">
          {lowStock.length > 0 ? (
            <>
              Your Product{" "}
              <span className="font-semibold text-[#e04f16]">{firstLow.name} is running Low,</span>
              {" "}already below {firstLow.alertQuantity} Pcs.,{" "}
              <Link href="/products" className="font-semibold text-[#e04f16] underline">Add Stock</Link>
              {lowStock.length > 1 && <span className="text-[#e04f16]"> (+{lowStock.length - 1} more)</span>}
            </>
          ) : (
            <>
              <span className="font-semibold text-[#e04f16]">{outOfStock.length} product(s)</span>
              {" "}are out of stock,{" "}
              <Link href="/products" className="font-semibold text-[#e04f16] underline">Add Stock</Link>
            </>
          )}
        </p>
      </div>
      <button
        onClick={onDismiss}
        className="shrink-0 ml-4 p-0.5 rounded-full hover:bg-orange-200 dark:hover:bg-orange-800 transition-colors"
      >
        <X className="h-3.5 w-3.5 text-[#e04f16]" />
      </button>
    </div>
  );
}
