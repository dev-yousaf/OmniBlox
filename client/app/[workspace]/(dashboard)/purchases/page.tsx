"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import { WorkspaceLink as Link } from "@/components/workspace-link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Plus, Search, Loader2, ChevronRight, ChevronLeft, FileText,
  FileSpreadsheet, RefreshCw, Package, RotateCcw,
} from "lucide-react";
import { usePurchasesApi, type PurchaseOrder } from "@/hooks/use-purchases-api";
import { format } from "date-fns";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";
import { ReceivePurchaseDialog } from "@/components/purchases/ReceivePurchaseDialog";

const statusConfig: Record<string, { label: string; className: string }> = {
  PENDING: { label: "Pending", className: "bg-amber-100 text-amber-700 border-amber-200" },
  COMPLETED: { label: "Received", className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  CANCELLED: { label: "Cancelled", className: "bg-red-100 text-red-700 border-red-200" },
};

const ROWS_PER_PAGE = 20;

export default function PurchasesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const canManage = user?.role === "OWNER" || user?.role === "ADMIN" || user?.role === "MANAGER";
  const { list, receive } = usePurchasesApi();
  const [purchases, setPurchases] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [receivingPurchase, setReceivingPurchase] = useState<PurchaseOrder | null>(null);

  const loadPurchases = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await list();
      setPurchases(data);
    } catch (err: any) {
      setError(err.message || "Failed to load purchases");
    } finally {
      setLoading(false);
    }
  }, [list]);

  useEffect(() => { loadPurchases(); }, [loadPurchases]);

  const filtered = useMemo(() => {
    if (!search) return purchases;
    const q = search.toLowerCase();
    return purchases.filter((p) =>
      p.referenceNumber.toLowerCase().includes(q) ||
      p.supplier?.name.toLowerCase().includes(q) ||
      p.warehouse?.name?.toLowerCase().includes(q)
    );
  }, [purchases, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE));
  const paged = filtered.slice((page - 1) * ROWS_PER_PAGE, page * ROWS_PER_PAGE);

  const stats = useMemo(() => ({
    total: purchases.length,
    pending: purchases.filter((p) => p.status === "PENDING").length,
    received: purchases.filter((p) => p.status === "COMPLETED").length,
    totalAmount: purchases.reduce((s, p) => s + Number(p.totalAmount), 0),
    netCost: purchases.reduce((s, p) => s + Number(p.netTotal ?? p.totalAmount), 0),
    returnedCost: purchases.reduce((s, p) => s + Number(p.returnedValue ?? 0), 0),
  }), [purchases]);

  const exportCSV = () => {
    const headers = ["Reference", "Supplier", "Warehouse", "Date", "Amount", "Status", "Returns"];
    const rows = filtered.map((p) => [
      p.referenceNumber,
      p.supplier?.name || "",
      p.warehouse?.name || "",
      format(new Date(p.orderDate), "MMM dd, yyyy"),
      Number(p.totalAmount).toFixed(2),
      statusConfig[p.status]?.label || p.status,
      p.hasReturns ? "Returned" : "No",
    ]);
    const csv = [headers, ...rows].map((row) =>
      row.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")
    ).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `purchases-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Exported", description: "Purchases data exported as CSV" });
  };

  const formatCurrency = new Intl.NumberFormat("en-US", {
    style: "currency", currency: "USD", minimumFractionDigits: 2,
  });

  const handleReceiveConfirm = async (warehouseId: string) => {
    if (!receivingPurchase) return;
    try {
      await receive(receivingPurchase.id, warehouseId);
      toast({ title: "Purchase received", description: "Inventory updated." });
      setReceivingPurchase(null);
      await loadPurchases();
    } catch (e: any) {
      toast({ title: "Failed to receive", description: e?.message || "Try again", variant: "destructive" });
      throw e;
    }
  };

  return (
    <div className="space-y-5">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1 text-sm text-muted-foreground mb-0.5">
        <Link href="/dashboard" className="hover:text-foreground transition-colors">Dashboard</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground">Purchases</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[18px] font-bold text-foreground">All Purchases</h1>
          <p className="text-sm text-muted-foreground">View and manage purchase orders</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="h-[34px] w-[34px] rounded-[5px]" title="Export CSV" onClick={exportCSV}>
            <FileText className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" className="h-[34px] w-[34px] rounded-[5px]" title="Export Excel" onClick={exportCSV}>
            <FileSpreadsheet className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" className="h-[34px] w-[34px] rounded-[5px]" title="Refresh" onClick={loadPurchases}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          {canManage && (
            <Link href="/purchases/new">
              <Button className="h-[34px] rounded-[5px] bg-[#ff9025] hover:bg-[#ff9025]/90 text-white text-[13px] font-medium px-3">
                <Plus className="mr-1.5 h-3.5 w-3.5" />New Purchase
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="border rounded-[5px] bg-card shadow-sm p-5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Total Purchases</p>
          <p className="text-2xl font-bold">{stats.total}</p>
        </div>
        <div className="border rounded-[5px] bg-card shadow-sm p-5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Total Cost</p>
          <p className="text-2xl font-bold">{formatCurrency.format(stats.netCost)}</p>
          {stats.returnedCost > 0 && (
            <p className="text-xs text-destructive mt-0.5">
              {formatCurrency.format(stats.returnedCost)} returned
            </p>
          )}
        </div>
        <div className="border rounded-[5px] bg-card shadow-sm p-5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Pending</p>
          <p className="text-2xl font-bold text-amber-600">{stats.pending}</p>
        </div>
        <div className="border rounded-[5px] bg-card shadow-sm p-5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Received</p>
          <p className="text-2xl font-bold text-emerald-600">{stats.received}</p>
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-[5px] bg-card shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center gap-4 px-5 py-[15px] border-b">
          <div className="flex items-center gap-2 border rounded-[5px] px-2.5 py-1.5 w-[250px]">
            <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <input
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground min-w-0"
              placeholder="Search by reference, supplier..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="px-5 py-8 text-center">
            <p className="text-sm text-destructive mb-3">{error}</p>
            <Button variant="outline" size="sm" onClick={loadPurchases}>Try Again</Button>
          </div>
        ) : paged.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-muted-foreground">
            <Package className="h-12 w-12 mb-3 text-muted-foreground/50" />
            <p className="font-medium">
              {search ? "No purchases match your search" : "No purchases yet"}
            </p>
            <p className="text-sm mt-1">
              {search ? "Try a different search term" : "Create a purchase order to get started."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted h-[33px]">
                  <th className="px-5 py-2 text-left font-semibold text-foreground min-w-[120px]">Reference</th>
                  <th className="px-5 py-2 text-left font-semibold text-foreground min-w-[140px]">Supplier</th>
                  <th className="px-5 py-2 text-left font-semibold text-foreground min-w-[120px]">Warehouse</th>
                  <th className="w-[110px] px-5 py-2 text-left font-semibold text-foreground">Date</th>
                  <th className="w-[130px] px-5 py-2 text-right font-semibold text-foreground">Amount</th>
                  <th className="w-[100px] px-5 py-2 text-left font-semibold text-foreground">Status</th>
                  <th className="w-[60px] px-5 py-2 text-center font-semibold text-foreground">Returns</th>
                  <th className="w-[100px] px-5 py-2 text-left font-semibold text-foreground">Action</th>
                </tr>
              </thead>
              <tbody>
                {paged.map((p) => (
                  <tr key={p.id} className="h-[52px] border-b hover:bg-muted/30 transition-colors">
                    <td className="px-5">
                      <Link href={`/purchases/${p.id}`} className="font-mono text-xs font-semibold text-primary hover:underline">
                        {p.referenceNumber}
                      </Link>
                    </td>
                    <td className="px-5">
                      <span className="font-medium text-foreground">{p.supplier?.name || "—"}</span>
                    </td>
                    <td className="px-5 text-muted-foreground">{p.warehouse?.name || "—"}</td>
                    <td className="px-5 text-muted-foreground">
                      {format(new Date(p.orderDate), "MMM dd, yyyy")}
                    </td>
                    <td className="px-5 text-right font-medium tabular-nums">
                      {formatCurrency.format(Number(p.netTotal ?? p.totalAmount))}
                    </td>
                    <td className="px-5">
                      <Badge variant="outline" className={`font-medium text-xs ${statusConfig[p.status]?.className || ""}`}>
                        {statusConfig[p.status]?.label || p.status}
                      </Badge>
                    </td>
                    <td className="px-5 text-center">
                      {p.returnStatus === "ALL" ? (
                        <Badge variant="outline" className="font-medium text-xs text-purple-600 border-purple-200 bg-purple-50">
                          <RotateCcw className="mr-1 h-3 w-3" /> All Returned
                        </Badge>
                      ) : (p.processingReturnCount ?? 0) > 0 ? (
                        <Badge variant="outline" className="font-medium text-xs text-blue-600 border-blue-200 bg-blue-50">
                          <RotateCcw className="mr-1 h-3 w-3" /> Processing
                        </Badge>
                      ) : (p.pendingReturnCount ?? 0) > 0 ? (
                        <Badge variant="outline" className="font-medium text-xs text-amber-600 border-amber-200 bg-amber-50">
                          <RotateCcw className="mr-1 h-3 w-3" /> Pending
                        </Badge>
                      ) : p.hasReturns ? (
                        <Badge variant="outline" className="font-medium text-xs text-emerald-600 border-emerald-200 bg-emerald-50">
                          <RotateCcw className="mr-1 h-3 w-3" /> Returned
                        </Badge>
                      ) : null}
                    </td>
                    <td className="px-5">
                      <div className="flex items-center gap-1">
                        <Link href={`/purchases/${p.id}`}>
                          <Button variant="ghost" size="sm" className="h-[30px] rounded-[5px] text-xs">
                            View
                          </Button>
                        </Link>
                        {canManage && p.status === "PENDING" && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-[30px] rounded-[5px] text-xs"
                            onClick={() => setReceivingPurchase(p)}
                          >
                            Receive
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && !error && filtered.length > 0 && (
          <div className="flex items-center justify-between px-5 py-3 border-t">
            <p className="text-xs text-muted-foreground">
              Showing page {page} of {totalPages} ({filtered.length} total)
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="outline" size="icon" className="h-[30px] w-[30px] rounded-[5px]"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                const start = Math.max(1, Math.min(page - 2, totalPages - 4));
                const p = start + i;
                if (p > totalPages) return null;
                return (
                  <Button
                    key={p}
                    variant={p === page ? "default" : "outline"}
                    size="icon"
                    className="h-[30px] w-[30px] rounded-[5px] text-xs"
                    onClick={() => setPage(p)}
                  >
                    {p}
                  </Button>
                );
              })}
              <Button
                variant="outline" size="icon" className="h-[30px] w-[30px] rounded-[5px]"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Receive Dialog */}
      <ReceivePurchaseDialog
        open={!!receivingPurchase}
        onOpenChange={(open) => !open && setReceivingPurchase(null)}
        onConfirm={handleReceiveConfirm}
        purchaseReference={receivingPurchase?.referenceNumber || ""}
      />
    </div>
  );
}
