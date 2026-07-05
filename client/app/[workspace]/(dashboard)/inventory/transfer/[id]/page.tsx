"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { PageLoadingSkeleton } from "@/components/ui/page-loading-skeleton";
import {
  ArrowLeft, Package, Calendar, User, FileText, Loader2, Warehouse,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronRight } from "lucide-react";
import { useInventoryApi, type StockAdjustment } from "@/hooks/use-inventory-api";
import { WorkspaceLink as Link } from "@/components/workspace-link";

export default function TransferDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { getTransfer } = useInventoryApi();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [transfer, setTransfer] = useState<any | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const data = await getTransfer(params.id as string);
        setTransfer(data);
      } catch (err: any) {
        setError(err?.message || "Failed to load transfer");
      } finally {
        setLoading(false);
      }
    })();
  }, [params.id, getTransfer]);

  if (loading) return <PageLoadingSkeleton />;

  if (error || !transfer) {
    return (
      <div className="space-y-5">
        <div className="flex items-center gap-1 text-sm text-muted-foreground mb-0.5">
          <Link href="/dashboard" className="hover:text-foreground transition-colors">Dashboard</Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <Link href="/inventory" className="hover:text-foreground transition-colors">Manage Stock</Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <Link href="/inventory/transfer" className="hover:text-foreground transition-colors">Stock Transfer</Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-foreground">Transfer Detail</span>
        </div>
        <div className="border rounded-[5px] bg-card shadow-sm py-12 text-center text-muted-foreground">
          <Package className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
          <p className="font-medium">{error || "Transfer not found"}</p>
        </div>
      </div>
    );
  }

  const fromItems = transfer.items?.filter((i: any) => i.difference < 0) || [];
  const toItems = transfer.items?.filter((i: any) => i.difference > 0) || [];
  const fromWarehouseName = fromItems[0]?.warehouse?.name || "Unknown";
  const toWarehouseName = toItems[0]?.warehouse?.name || "Unknown";
  const totalQuantity = transfer.items?.reduce((sum: number, i: any) => sum + Math.abs(i.difference), 0) || 0;

  return (
    <div className="space-y-5">
      {/* Breadcrumb */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-1 text-sm text-muted-foreground mb-0.5">
            <Link href="/dashboard" className="hover:text-foreground transition-colors">Dashboard</Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <Link href="/inventory" className="hover:text-foreground transition-colors">Manage Stock</Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <Link href="/inventory/transfer" className="hover:text-foreground transition-colors">Stock Transfer</Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="text-foreground">{transfer.referenceNumber}</span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-[18px] font-bold text-foreground">{transfer.referenceNumber}</h1>
          </div>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="border rounded-[5px] bg-card shadow-sm p-5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Items</p>
          <p className="text-2xl font-bold">{transfer.totalItems}</p>
        </div>
        <div className="border rounded-[5px] bg-card shadow-sm p-5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Total Qty</p>
          <p className="text-2xl font-bold">{totalQuantity}</p>
        </div>
        <div className="border rounded-[5px] bg-card shadow-sm p-5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Date</p>
          <p className="text-lg font-semibold">
            {new Date(transfer.adjustmentDate).toLocaleDateString("en-US", {
              day: "2-digit", month: "short", year: "numeric",
            })}
          </p>
        </div>
        <div className="border rounded-[5px] bg-card shadow-sm p-5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Initiated By</p>
          <p className="text-lg font-semibold truncate">{transfer.user?.name || "—"}</p>
        </div>
      </div>

      {/* Warehouse Info */}
      <div className="border rounded-[5px] bg-card shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-[15px] border-b">
          <h2 className="text-sm font-semibold text-foreground">Transfer Route</h2>
        </div>
        <div className="grid md:grid-cols-2 gap-0">
          <div className="p-5 border-r border-b md:border-b-0">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">From</p>
            <div className="flex items-center gap-2.5">
              <div className="bg-muted rounded-[5px] size-[34px] flex items-center justify-center shrink-0">
                <Warehouse className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="font-semibold text-foreground">{fromWarehouseName}</p>
                <p className="text-xs text-muted-foreground">{fromItems.length} item(s) outgoing</p>
              </div>
            </div>
          </div>
          <div className="p-5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">To</p>
            <div className="flex items-center gap-2.5">
              <div className="bg-muted rounded-[5px] size-[34px] flex items-center justify-center shrink-0">
                <Warehouse className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="font-semibold text-foreground">{toWarehouseName}</p>
                <p className="text-xs text-muted-foreground">{toItems.length} item(s) incoming</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Items Table */}
      <div className="border rounded-[5px] bg-card shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-[15px] border-b">
          <h2 className="text-sm font-semibold text-foreground">Transfer Items</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted h-[33px]">
                <th className="px-5 py-2 text-left font-semibold text-foreground text-xs">Product</th>
                <th className="px-5 py-2 text-left font-semibold text-foreground text-xs">SKU</th>
                <th className="px-5 py-2 text-left font-semibold text-foreground text-xs">Direction</th>
                <th className="w-[100px] px-5 py-2 text-right font-semibold text-foreground text-xs">Qty</th>
              </tr>
            </thead>
            <tbody>
              {transfer.items?.map((item: any, idx: number) => {
                const isFrom = item.difference < 0;
                const productName = item.product?.name || "Unknown";
                const productSku = item.product?.sku || "";
                const qty = Math.abs(item.difference);
                return (
                  <tr key={item.id || idx} className="h-[56px] border-b hover:bg-muted/30 transition-colors">
                    <td className="px-5">
                      <div className="flex items-center gap-2.5">
                        <div className="bg-muted rounded-[5px] size-[30px] flex items-center justify-center overflow-hidden shrink-0">
                          {item.product?.imageUrl ? (
                            <img src={item.product.imageUrl} alt="" className="size-full object-cover" />
                          ) : (
                            <Package className="h-3.5 w-3.5 text-muted-foreground" />
                          )}
                        </div>
                        <span className="font-medium text-foreground">{productName}</span>
                      </div>
                    </td>
                    <td className="px-5 font-mono text-xs text-muted-foreground">{productSku}</td>
                    <td className="px-5">
                      <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                        isFrom
                          ? "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400"
                          : "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400"
                      }`}>
                        {isFrom ? `${fromWarehouseName} →` : `→ ${toWarehouseName}`}
                      </span>
                    </td>
                    <td className="w-[100px] px-5 text-right font-semibold tabular-nums">{qty}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Notes */}
      {transfer.notes && (
        <div className="border rounded-[5px] bg-card shadow-sm p-5">
          <h2 className="text-sm font-semibold text-foreground mb-2">Notes</h2>
          <p className="text-sm text-muted-foreground">{transfer.notes}</p>
        </div>
      )}

      {/* Back Button */}
      <div className="flex justify-start">
        <Link href="/inventory/transfer">
          <Button variant="outline" size="sm" className="h-[34px] rounded-[5px] text-[13px]">
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Back to Transfers
          </Button>
        </Link>
      </div>
    </div>
  );
}