"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { WorkspaceLink as Link } from "@/components/workspace-link";
import { PageLoadingSkeleton } from "@/components/ui/page-loading-skeleton";
import {
  ArrowLeft, Edit, Trash2, Loader2, AlertTriangle, CheckCircle2,
  ChevronRight, Package, XCircle, RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useReturnsApi, type SalesReturn } from "@/hooks/use-returns-api";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { useWorkspace } from "@/hooks/use-workspace";

const statusConfig: Record<string, { label: string; className: string }> = {
  PENDING: { label: "Pending", className: "bg-amber-100 text-amber-700 border-amber-200" },
  PROCESSING: { label: "Processing", className: "bg-blue-100 text-blue-700 border-blue-200" },
  COMPLETED: { label: "Returned", className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  CANCELLED: { label: "Cancelled", className: "bg-red-100 text-red-700 border-red-200" },
};

export default function SalesReturnDetailPage() {
  const { user } = useAuth();
  const canManage = user?.role === "OWNER" || user?.role === "ADMIN" || user?.role === "MANAGER";
  const params = useParams();
  const router = useRouter();
  const ws = useWorkspace();
  const { toast } = useToast();
  const { getSalesReturn, deleteSalesReturn, updateSalesReturn } = useReturnsApi();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sr, setSr] = useState<SalesReturn | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [statusUpdateLoading, setStatusUpdateLoading] = useState(false);

  const id = String(params.id);

  const formatCurrency = useMemo(
    () => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }), []
  );

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const data = await getSalesReturn(id);
        if (!mounted) return;
        setSr(data);
      } catch (e: any) {
        if (!mounted) return;
        setError(e?.message || "Failed to load sales return");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [id, getSalesReturn]);

  const handleDelete = async () => {
    if (!sr) return;
    setDeleting(true);
    try {
      await deleteSalesReturn(sr.id);
      toast({ title: "Return deleted" });
      router.push(`/${ws}/sales-returns`);
    } catch (e: any) {
      toast({ title: "Failed to delete", description: e?.message || "Unknown error", variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  const handleStatusChange = async (newStatus: "PENDING" | "PROCESSING" | "COMPLETED" | "CANCELLED") => {
    if (!sr || statusUpdateLoading) return;
    try {
      setStatusUpdateLoading(true);
      const updated = await updateSalesReturn(sr.id, { status: newStatus });
      setSr(updated);
      toast({ title: "Status updated", description: `Return status changed to ${statusConfig[newStatus].label}` });
    } catch (e: any) {
      toast({ title: "Failed to update status", description: e?.message || "Unknown error", variant: "destructive" });
    } finally {
      setStatusUpdateLoading(false);
    }
  };

  if (loading) return <PageLoadingSkeleton />;

  if (error || !sr) {
    return (
      <div className="space-y-5">
        <div className="flex items-center gap-1 text-sm text-muted-foreground mb-0.5">
          <Link href="/dashboard" className="hover:text-foreground transition-colors">Dashboard</Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <Link href="/sales-returns" className="hover:text-foreground transition-colors">Sales Returns</Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-foreground">Sales Return Detail</span>
        </div>
        <div className="border rounded-[5px] bg-card shadow-sm py-12 text-center text-muted-foreground">
          <Package className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
          <p className="font-medium">{error || "Sales return not found"}</p>
        </div>
      </div>
    );
  }

  const curStatus = sr.status;
  const statusLabel = statusConfig[curStatus]?.label || sr.status;

  return (
    <div className="space-y-5">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1 text-sm text-muted-foreground mb-0.5">
        <Link href="/dashboard" className="hover:text-foreground transition-colors">Dashboard</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link href="/sales-returns" className="hover:text-foreground transition-colors">Sales Returns</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground">{sr.referenceNumber}</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/sales-returns" className="flex items-center justify-center h-8 w-8 rounded-[5px] border hover:bg-accent transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-[18px] font-bold text-foreground">{sr.referenceNumber}</h1>
              <Badge variant="outline" className={`font-medium text-xs ${statusConfig[curStatus]?.className || ""}`}>{statusLabel}</Badge>
              <Badge variant="outline" className="border-red-200 bg-red-50 text-red-700 font-medium text-xs">Customer Return</Badge>
            </div>
            <p className="text-sm text-muted-foreground">Customer Return</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {canManage && sr.status !== "COMPLETED" && sr.status !== "CANCELLED" && (
            <>
              <Link href={`/sales-returns/${sr.id}/edit`}>
                <Button variant="outline" size="sm" className="h-[34px] rounded-[5px] text-[13px]">
                  <Edit className="mr-1.5 h-3.5 w-3.5" /> Edit
                </Button>
              </Link>
              <Button variant="outline" size="sm" className="h-[34px] rounded-[5px] text-[13px] text-destructive" onClick={() => setDeleteDialogOpen(true)}>
                <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Status info banner */}
      {sr.status !== "COMPLETED" && (
        <div className="flex items-center gap-2 px-5 py-3 bg-amber-50 text-amber-800 text-sm border border-amber-200 rounded-[5px]">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
          <span>
            This return is currently <strong>{statusLabel.toLowerCase()}</strong>.
            {sr.saleId && (sr.status === "PENDING" || sr.status === "PROCESSING") && (
              <span> The original sale will not show return indicators until you mark this return as <strong>completed</strong>.</span>
            )}
          </span>
        </div>
      )}
      {sr.status === "COMPLETED" && sr.saleId && (
        <div className="flex items-center gap-2 px-5 py-3 bg-emerald-50 text-emerald-800 text-sm border border-emerald-200 rounded-[5px]">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>This return has been processed. The original sale now shows return indicators with the returned quantities.</span>
        </div>
      )}

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="border rounded-[5px] bg-card shadow-sm p-5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Reference</p>
          <p className="text-lg font-semibold">{sr.referenceNumber}</p>
        </div>
        <div className="border rounded-[5px] bg-card shadow-sm p-5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Date</p>
          <p className="text-lg font-semibold">{new Date(sr.returnDate).toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" })}</p>
        </div>
        <div className="border rounded-[5px] bg-card shadow-sm p-5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Warehouse</p>
          <p className="text-lg font-semibold">{sr.warehouse?.name || "—"}</p>
        </div>
        <div className="border rounded-[5px] bg-card shadow-sm p-5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Items Count</p>
          <p className="text-2xl font-bold">{sr.items.length}</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        {/* Left: Items Table */}
        <div className="border rounded-[5px] bg-card shadow-sm overflow-hidden">
          <div className="px-5 py-[15px] border-b">
            <h2 className="text-sm font-semibold text-foreground">Return Items</h2>
          </div>
          <div className="p-5">
            <div className="overflow-x-auto border rounded-[5px]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted h-[33px]">
                    <th className="px-4 py-2 text-left font-semibold text-foreground text-xs">Product</th>
                    <th className="w-[80px] px-4 py-2 text-right font-semibold text-foreground text-xs">Qty</th>
                    <th className="w-[100px] px-4 py-2 text-right font-semibold text-foreground text-xs">Price</th>
                    <th className="w-[110px] px-4 py-2 text-right font-semibold text-foreground text-xs">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {sr.items.map((it: any) => (
                    <tr key={it.id} className="h-[52px] border-b hover:bg-muted/30 transition-colors">
                      <td className="px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="bg-muted rounded-[5px] size-[30px] flex items-center justify-center overflow-hidden shrink-0">
                            <Package className="h-3.5 w-3.5 text-muted-foreground" />
                          </div>
                          <div>
                            <span className="font-medium text-foreground">{it.product?.name || it.productName}</span>
                            {it.product?.sku && <p className="text-xs text-muted-foreground">SKU: {it.product.sku}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 text-right tabular-nums">{it.quantity}</td>
                      <td className="px-4 text-right tabular-nums">{formatCurrency.format(Number(it.unitPrice))}</td>
                      <td className="px-4 text-right font-semibold tabular-nums">{formatCurrency.format(Number(it.unitPrice) * Number(it.quantity))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end pt-4">
              <div className="flex justify-between items-center w-[220px]">
                <span className="text-sm text-muted-foreground">Total</span>
                <span className="text-xl font-bold tabular-nums">{formatCurrency.format(Number(sr.totalAmount))}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Status + Summary */}
        <div className="space-y-4">
          <div className="border rounded-[5px] bg-card shadow-sm p-5 space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Status</h3>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Current Status</p>
              <Badge variant="outline" className={`font-medium text-xs mt-1 ${statusConfig[curStatus]?.className || ""}`}>{statusLabel}</Badge>
            </div>
            {canManage && sr.status !== "COMPLETED" && sr.status !== "CANCELLED" && (
              <div className="space-y-2 pt-1">
                {sr.status === "PENDING" && (
                  <Button className="w-full h-[38px] rounded-[5px] text-sm" disabled={statusUpdateLoading} onClick={() => handleStatusChange("PROCESSING")}>
                    {statusUpdateLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</> : <><RotateCcw className="mr-2 h-4 w-4" /> Start Processing</>}
                  </Button>
                )}
                {sr.status === "PROCESSING" && (
                  <Button className="w-full h-[38px] rounded-[5px] text-sm" disabled={statusUpdateLoading} onClick={() => handleStatusChange("COMPLETED")}>
                    {statusUpdateLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Completing...</> : <><CheckCircle2 className="mr-2 h-4 w-4" /> Mark Completed</>}
                  </Button>
                )}
                <Button variant="outline" className="w-full h-[38px] rounded-[5px] text-sm text-destructive" disabled={statusUpdateLoading} onClick={() => handleStatusChange("CANCELLED")}>
                  {statusUpdateLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Cancelling...</> : <><XCircle className="mr-2 h-4 w-4" /> Cancel Return</>}
                </Button>
              </div>
            )}
          </div>

          <div className="border rounded-[5px] bg-card shadow-sm p-5 space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Type</span>
                <Badge variant="outline" className="border-red-200 bg-red-50 text-red-700 font-medium text-xs">Customer Return</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <Badge variant="outline" className={`font-medium text-xs ${statusConfig[curStatus]?.className || ""}`}>{statusLabel}</Badge>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="text-muted-foreground">Total Amount</span>
                <span className="font-bold text-base">{formatCurrency.format(Number(sr.totalAmount))}</span>
              </div>
              {sr.reason && (
                <div className="border-t pt-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Reason</p>
                  <p className="font-semibold text-sm">{sr.reason}</p>
                </div>
              )}
              {sr.user?.name && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Processed by</p>
                  <p className="font-semibold text-sm">{sr.user.name}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this sales return?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. Return {sr.referenceNumber} will be removed permanently.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting} className="rounded-[5px]">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="rounded-[5px] bg-destructive hover:bg-destructive/90" disabled={deleting}>
              {deleting ? "Deleting..." : "Delete Return"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
