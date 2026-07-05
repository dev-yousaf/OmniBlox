"use client";

import { useMemo, useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { WorkspaceLink as Link } from "@/components/workspace-link";
import { PageLoadingSkeleton } from "@/components/ui/page-loading-skeleton";
import {
  ArrowLeft, Edit, Trash2, Loader2, Package, RotateCcw,
  ChevronRight, CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { usePurchasesApi, type PurchaseOrder } from "@/hooks/use-purchases-api";
import { useAuth } from "@/contexts/auth-context";
import { useWorkspace } from "@/hooks/use-workspace";
import { ReceivePurchaseDialog } from "@/components/purchases/ReceivePurchaseDialog";
import { toast } from "@/hooks/use-toast";
import { api } from "@/lib/api";

const statusStyles: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800",
  COMPLETED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
  CANCELLED: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400 border-gray-200 dark:border-gray-800",
};

const statusLabels: Record<string, string> = {
  PENDING: "Pending",
  COMPLETED: "Received",
  CANCELLED: "Cancelled",
};

export default function PurchaseDetailPage() {
  const { user } = useAuth();
  const canManage = user?.role === "OWNER" || user?.role === "ADMIN" || user?.role === "MANAGER";
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const ws = useWorkspace();
  const purchaseId = params?.id ?? "";
  const { getById, receive, markAsPaid } = usePurchasesApi();

  const [purchase, setPurchase] = useState<PurchaseOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showReceiveDialog, setShowReceiveDialog] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const formatCurrency = useMemo(
    () => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }),
    []
  );

  useEffect(() => {
    if (!purchaseId) return;
    setLoading(true);
    setError(null);
    getById(purchaseId)
      .then(setPurchase)
      .catch((e: any) => setError(e?.message || "Failed to load purchase"))
      .finally(() => setLoading(false));
  }, [purchaseId, getById]);

  const handleReceiveConfirm = async (warehouseId: string) => {
    if (!purchase) return;
    setUpdating(true);
    try {
      await receive(purchase.id, warehouseId);
      toast({ title: "Purchase received", description: "Inventory updated." });
      const updated = await getById(purchase.id);
      setPurchase(updated);
    } catch (e: any) {
      toast({
        title: "Failed to receive",
        description: e?.message || "Try again",
        variant: "destructive" as any,
      });
      throw e;
    } finally {
      setUpdating(false);
    }
  };

  const handleMarkAsPaid = async () => {
    if (!purchase) return;
    setUpdating(true);
    try {
      const updated = await markAsPaid(purchase.id);
      setPurchase(updated);
      toast({ title: "Bill marked as paid" });
    } catch (e: any) {
      toast({ title: "Failed to mark as paid", description: e?.message || "Try again", variant: "destructive" as any });
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!purchase) return;
    setDeleting(true);
    try {
      await api.delete(`/purchases/${purchase.id}`);
      toast({ title: "Purchase deleted" });
      router.push(`/${ws}/purchases`);
    } catch (e: any) {
      toast({
        title: "Failed to delete",
        description: e?.message || "Try again",
        variant: "destructive" as any,
      });
    } finally {
      setDeleting(false);
    }
  };

  if (!purchaseId) return <div className="p-6">Purchase identifier is missing.</div>;
  if (loading) return <PageLoadingSkeleton />;

  if (!purchase) {
    return (
      <div className="space-y-5">
        <div className="flex items-center gap-1 text-sm text-muted-foreground mb-0.5">
          <Link href="/dashboard" className="hover:text-foreground transition-colors">Dashboard</Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <Link href="/purchases" className="hover:text-foreground transition-colors">Purchases</Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-foreground">Purchase Detail</span>
        </div>
        <div className="border rounded-[5px] bg-card shadow-sm py-12 text-center text-muted-foreground">
          <Package className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
          <p className="font-medium">Purchase not found</p>
        </div>
      </div>
    );
  }

  const status = purchase.status;
  const statusLabel = statusLabels[status] || status;
  const totalUnits = purchase.items?.reduce((sum, item) => sum + item.quantity, 0) ?? 0;
  const allReturned = purchase.items?.every((item) => (item.returnedQuantity ?? 0) >= item.quantity) ?? false;
  const totalReturnedValue = purchase.items?.reduce(
    (sum, item) => sum + (item.returnedQuantity ?? 0) * item.unitCost,
    0,
  ) ?? 0;

  return (
    <div className="space-y-5">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1 text-sm text-muted-foreground mb-0.5">
        <Link href="/dashboard" className="hover:text-foreground transition-colors">Dashboard</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link href="/purchases" className="hover:text-foreground transition-colors">Purchases</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground">{purchase.referenceNumber}</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/purchases">
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-[18px] font-bold text-foreground">{purchase.referenceNumber}</h1>
              <Badge variant="outline" className={`font-medium text-xs ${statusStyles[status] || ""}`}>
                {statusLabel}
              </Badge>
              {allReturned ? (
                <Link href={`/purchase-returns?search=${purchase.referenceNumber}`}>
                  <Badge variant="outline" className="font-medium text-xs text-purple-600 border-purple-200 bg-purple-50 hover:bg-purple-100 cursor-pointer transition-colors">
                    <RotateCcw className="mr-1 h-3 w-3" /> All Returned
                  </Badge>
                </Link>
              ) : (purchase.processingReturnCount ?? 0) > 0 ? (
                <Link href={`/purchase-returns?search=${purchase.referenceNumber}`}>
                  <Badge variant="outline" className="font-medium text-xs text-blue-600 border-blue-200 bg-blue-50 hover:bg-blue-100 cursor-pointer transition-colors">
                    <RotateCcw className="mr-1 h-3 w-3" /> Processing
                  </Badge>
                </Link>
              ) : (purchase.pendingReturnCount ?? 0) > 0 ? (
                <Link href={`/purchase-returns?search=${purchase.referenceNumber}`}>
                  <Badge variant="outline" className="font-medium text-xs text-amber-600 border-amber-200 bg-amber-50 hover:bg-amber-100 cursor-pointer transition-colors">
                    <RotateCcw className="mr-1 h-3 w-3" /> Pending
                  </Badge>
                </Link>
              ) : purchase.hasReturns ? (
                <Link href={`/purchase-returns?search=${purchase.referenceNumber}`}>
                  <Badge variant="outline" className="font-medium text-xs text-emerald-600 border-emerald-200 bg-emerald-50 hover:bg-emerald-100 cursor-pointer transition-colors">
                    <RotateCcw className="mr-1 h-3 w-3" /> Returned
                  </Badge>
                </Link>
              ) : null}
            </div>
            <p className="text-sm text-muted-foreground">{purchase.supplier?.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {canManage && (
            <>
              {status === "PENDING" && (
                <Button
                  size="sm"
                  className="h-[34px] rounded-[5px] text-[13px]"
                  disabled={updating}
                  onClick={() => setShowReceiveDialog(true)}
                >
                  Receive
                </Button>
              )}
              {status === "PENDING" && (
                <Link href={`/purchases/${purchase.id}/edit`}>
                  <Button variant="outline" size="sm" className="h-[34px] rounded-[5px] text-[13px]">
                    <Edit className="mr-1.5 h-3.5 w-3.5" /> Edit
                  </Button>
                </Link>
              )}
              {purchase.paymentStatus !== "PAID" && (
                <Button
                  size="sm"
                  className="h-[34px] rounded-[5px] text-[13px]"
                  disabled={updating}
                  onClick={handleMarkAsPaid}
                >
                  {updating ? <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Marking...</> : <><CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> Mark Paid</>}
                </Button>
              )}
              {!allReturned && (
                <Link href={`/purchase-returns/new?purchaseId=${purchase.id}`}>
                  <Button variant="outline" size="sm" className="h-[34px] rounded-[5px] text-[13px]">
                    <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Return
                  </Button>
                </Link>
              )}
              {(user?.role === "OWNER" || user?.role === "ADMIN") && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-[34px] rounded-[5px] text-[13px] text-destructive hover:text-destructive"
                  onClick={() => setDeleteOpen(true)}
                >
                  <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-5 py-3 bg-destructive/10 text-destructive text-sm border rounded-[5px]">
          {error}
        </div>
      )}

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="border rounded-[5px] bg-card shadow-sm p-5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Items</p>
          <p className="text-2xl font-bold">{purchase.items?.length ?? 0}</p>
        </div>
        <div className="border rounded-[5px] bg-card shadow-sm p-5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Total Units</p>
          <p className="text-2xl font-bold">{totalUnits}</p>
        </div>
        <div className="border rounded-[5px] bg-card shadow-sm p-5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Order Date</p>
          <p className="text-lg font-semibold">
            {new Date(purchase.orderDate).toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" })}
          </p>
        </div>
        <div className="border rounded-[5px] bg-card shadow-sm p-5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Supplier</p>
          <p className="text-lg font-semibold truncate">{purchase.supplier?.name || "—"}</p>
        </div>
      </div>

      {/* Main Content: Two Columns */}
      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        {/* Left: Supplier Info & Items */}
        <div className="border rounded-[5px] bg-card shadow-sm overflow-hidden">
          <div className="px-5 py-[15px] border-b">
            <h2 className="text-sm font-semibold text-foreground">Supplier & Items</h2>
          </div>
          <div className="p-5 space-y-5">
            {/* Supplier Info */}
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Supplier</p>
              <p className="font-semibold text-foreground">{purchase.supplier?.name || "—"}</p>
            </div>

            {/* Items Table */}
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Items</p>
              <div className="overflow-x-auto border rounded-[5px]">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted h-[33px]">
                      <th className="px-4 py-2 text-left font-semibold text-foreground text-xs">Product</th>
                      <th className="w-[80px] px-4 py-2 text-left font-semibold text-foreground text-xs">SKU</th>
                      <th className="w-[70px] px-4 py-2 text-right font-semibold text-foreground text-xs">Qty</th>
                      <th className="w-[80px] px-4 py-2 text-right font-semibold text-foreground text-xs">Returned</th>
                      <th className="w-[100px] px-4 py-2 text-right font-semibold text-foreground text-xs">Unit Cost</th>
                      <th className="w-[110px] px-4 py-2 text-right font-semibold text-foreground text-xs">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {purchase.items?.map((item) => (
                      <tr key={item.id} className="h-[52px] border-b hover:bg-muted/30 transition-colors">
                        <td className="px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="bg-muted rounded-[5px] size-[30px] flex items-center justify-center overflow-hidden shrink-0">
                              <Package className="h-3.5 w-3.5 text-muted-foreground" />
                            </div>
                            <span className="font-medium text-foreground">{item.productName || "N/A"}</span>
                          </div>
                        </td>
                        <td className="px-4 text-left tabular-nums text-muted-foreground">{item.productSku || "—"}</td>
                        <td className="px-4 text-right tabular-nums">{item.quantity}</td>
                        <td className="px-4 text-right">
                          {item.returnedQuantity > 0 ? (
                            <span className="text-orange-600 font-medium tabular-nums">{item.returnedQuantity}</span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-4 text-right tabular-nums">{formatCurrency.format(item.unitCost)}</td>
                        <td className="px-4 text-right font-semibold tabular-nums">{formatCurrency.format(item.quantity * item.unitCost)}</td>
                      </tr>
                    ))}
                    {(!purchase.items || purchase.items.length === 0) && (
                      <tr>
                        <td colSpan={6} className="p-6 text-center text-sm text-muted-foreground">No items found</td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="border-t bg-muted/50 font-medium">
                      <td colSpan={5} className="p-3 text-right text-sm">Total</td>
                      <td className="p-3 text-right text-sm font-semibold">{formatCurrency.format(purchase.totalAmount)}</td>
                    </tr>
                    {totalReturnedValue > 0 && (
                      <tr className="bg-muted/30">
                        <td colSpan={5} className="px-3 py-2 text-right text-xs text-muted-foreground">Returned</td>
                        <td className="px-3 py-2 text-right text-xs text-destructive font-medium">
                          -{formatCurrency.format(totalReturnedValue)}
                        </td>
                      </tr>
                    )}
                    {totalReturnedValue > 0 && (
                      <tr className="border-t-2 border-muted font-semibold">
                        <td colSpan={5} className="px-3 py-3 text-right text-sm">Net Total</td>
                        <td className="px-3 py-3 text-right text-sm font-bold">
                          {formatCurrency.format(purchase.totalAmount - totalReturnedValue)}
                        </td>
                      </tr>
                    )}
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Summary */}
        <div className="space-y-4">
          <div className="border rounded-[5px] bg-card shadow-sm p-5 space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Items</span>
                <span className="font-semibold">{purchase.items?.length ?? 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Units</span>
                <span className="font-semibold">{totalUnits}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Supplier</span>
                <span className="font-semibold text-xs truncate max-w-[140px] text-right">{purchase.supplier?.name || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Order Date</span>
                <span className="font-semibold text-xs text-right">
                  {new Date(purchase.orderDate).toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" })}
                </span>
              </div>
              {purchase.warehouse?.name && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Warehouse</span>
                  <span className="font-semibold text-xs truncate max-w-[140px] text-right">{purchase.warehouse.name}</span>
                </div>
              )}
              <div className="flex justify-between border-t pt-2">
                <span className="text-muted-foreground">Status</span>
                <Badge variant="outline" className={`font-medium text-xs ${statusStyles[status] || ""}`}>
                  {statusLabel}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total</span>
                <span className="font-bold text-base">{formatCurrency.format(purchase.totalAmount)}</span>
              </div>
              {totalReturnedValue > 0 && (
                <div className="flex justify-between text-destructive">
                  <span className="text-muted-foreground">Returned</span>
                  <span className="font-semibold">-{formatCurrency.format(totalReturnedValue)}</span>
                </div>
              )}
              {totalReturnedValue > 0 && (
                <div className="flex justify-between border-t pt-2">
                  <span className="text-muted-foreground">Net Total</span>
                  <span className="font-bold text-base">
                    {formatCurrency.format(purchase.totalAmount - totalReturnedValue)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {canManage && status === "PENDING" && (
            <Button
              className="w-full h-[38px] rounded-[5px] text-sm"
              disabled={updating}
              onClick={() => setShowReceiveDialog(true)}
            >
              {updating ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Receiving...</>
              ) : (
                <>Receive Purchase</>
              )}
            </Button>
          )}

          <ReceivePurchaseDialog
            open={showReceiveDialog}
            onOpenChange={setShowReceiveDialog}
            onConfirm={handleReceiveConfirm}
            purchaseReference={purchase.referenceNumber}
            defaultWarehouseId={purchase.warehouseId}
          />
        </div>
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this purchase order?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. Purchase order {purchase.referenceNumber} will be removed permanently.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting} className="rounded-[5px]">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="rounded-[5px] bg-destructive hover:bg-destructive/90"
              disabled={deleting}
            >
              {deleting ? "Deleting..." : "Delete Purchase"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
