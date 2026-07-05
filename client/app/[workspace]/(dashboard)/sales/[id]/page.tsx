"use client";

import { useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { WorkspaceLink as Link } from "@/components/workspace-link";
import { PageLoadingSkeleton } from "@/components/ui/page-loading-skeleton";
import {
  ArrowLeft, Edit, Trash2, Loader2, CheckCircle2, Package, RotateCcw, Mail,
  ChevronRight, Undo2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useSaleDetail } from "../_hooks/use-sales";
import { useAuth } from "@/contexts/auth-context";
import { useWorkspace } from "@/hooks/use-workspace";
import { useState } from "react";

const statusStyles: Record<string, string> = {
  PAID: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
  PENDING: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800",
  PARTIAL: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800",
  OVERDUE: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800",
};

const statusLabels: Record<string, string> = {
  PAID: "Paid",
  PENDING: "Pending",
  PARTIAL: "Partial",
  OVERDUE: "Overdue",
};

export default function SaleDetailPage() {
  const { user } = useAuth();
  const canManage = user?.role === "OWNER" || user?.role === "ADMIN" || user?.role === "MANAGER";
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const ws = useWorkspace();
  const saleId = params?.id ?? "";
  const { sale, loading, updating, error, markAsPaid, deleteSale } = useSaleDetail(saleId);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const formatCurrency = useMemo(
    () => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }),
    []
  );

  const getStatus = () => {
    if (!sale) return "PENDING";
    if (sale.paymentStatus === "PAID") return "PAID";
    if (sale.isOverdue) return "OVERDUE";
    if (sale.paymentStatus === "PARTIAL") return "PARTIAL";
    return "PENDING";
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteSale();
      router.push(`/${ws}/sales`);
    } catch { /* handled */ }
    setDeleting(false);
  };

  if (!saleId) return <div className="p-6">Sale identifier is missing.</div>;
  if (loading) return <PageLoadingSkeleton />;

  if (!sale) {
    return (
      <div className="space-y-5">
        <div className="flex items-center gap-1 text-sm text-muted-foreground mb-0.5">
          <Link href="/dashboard" className="hover:text-foreground transition-colors">Dashboard</Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <Link href="/sales" className="hover:text-foreground transition-colors">Sales</Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-foreground">Sale Detail</span>
        </div>
        <div className="border rounded-[5px] bg-card shadow-sm py-12 text-center text-muted-foreground">
          <Package className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
          <p className="font-medium">Sale not found</p>
        </div>
      </div>
    );
  }

  const status = getStatus();
  const statusLabel = statusLabels[status] || status;
  const totalUnits = sale.items.reduce((sum, item) => sum + item.quantity, 0);
  const allReturned = sale.items?.every((item) => (item.returnedQuantity ?? 0) >= item.quantity) ?? false;

  return (
    <div className="space-y-5">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1 text-sm text-muted-foreground mb-0.5">
        <Link href="/dashboard" className="hover:text-foreground transition-colors">Dashboard</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link href="/sales" className="hover:text-foreground transition-colors">Sales</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground">{sale.invoiceNumber}</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/sales">
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-[18px] font-bold text-foreground">{sale.invoiceNumber}</h1>
              <Badge variant="outline" className={`font-medium text-xs ${statusStyles[status] || ""}`}>
                {statusLabel}
              </Badge>
              {sale.returnStatus === "ALL" ? (
                <Link href={`/sales-returns?search=${sale.invoiceNumber}`}>
                  <Badge variant="outline" className="font-medium text-xs text-purple-600 border-purple-200 bg-purple-50 hover:bg-purple-100 cursor-pointer transition-colors">
                    <RotateCcw className="mr-1 h-3 w-3" /> All Returned
                  </Badge>
                </Link>
              ) : (sale.processingReturnCount ?? 0) > 0 ? (
                <Link href={`/sales-returns?search=${sale.invoiceNumber}`}>
                  <Badge variant="outline" className="font-medium text-xs text-blue-600 border-blue-200 bg-blue-50 hover:bg-blue-100 cursor-pointer transition-colors">
                    <RotateCcw className="mr-1 h-3 w-3" /> Processing
                  </Badge>
                </Link>
              ) : (sale.pendingReturnCount ?? 0) > 0 ? (
                <Link href={`/sales-returns?search=${sale.invoiceNumber}`}>
                  <Badge variant="outline" className="font-medium text-xs text-amber-600 border-amber-200 bg-amber-50 hover:bg-amber-100 cursor-pointer transition-colors">
                    <RotateCcw className="mr-1 h-3 w-3" /> Pending
                  </Badge>
                </Link>
              ) : sale.hasReturns ? (
                <Link href={`/sales-returns?search=${sale.invoiceNumber}`}>
                  <Badge variant="outline" className="font-medium text-xs text-emerald-600 border-emerald-200 bg-emerald-50 hover:bg-emerald-100 cursor-pointer transition-colors">
                    <RotateCcw className="mr-1 h-3 w-3" /> Returned
                  </Badge>
                </Link>
              ) : null}
            </div>
            <p className="text-sm text-muted-foreground">{sale.customerName}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {canManage && (
            <>
              <Button
                variant="outline"
                size="sm"
                className="h-[34px] rounded-[5px] text-[13px]"
                disabled={!sale.customerEmail}
              >
                <Mail className="mr-1.5 h-3.5 w-3.5" /> Email
              </Button>
              {sale.paymentStatus !== "PAID" && (
                <Button
                  size="sm"
                  className="h-[34px] rounded-[5px] text-[13px]"
                  disabled={updating}
                  onClick={() => markAsPaid().catch(() => {})}
                >
                  {updating ? (
                    <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Marking...</>
                  ) : (
                    <><CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> Mark Paid</>
                  )}
                </Button>
              )}
              {!allReturned && (
                <Link href={`/sales-returns/new?saleId=${sale.id}`}>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-[34px] rounded-[5px] text-[13px]"
                  >
                    <Undo2 className="mr-1.5 h-3.5 w-3.5" /> Return
                  </Button>
                </Link>
              )}
              <Link href={`/sales/${sale.id}/edit`}>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-[34px] rounded-[5px] text-[13px]"
                >
                  <Edit className="mr-1.5 h-3.5 w-3.5" /> Edit
                </Button>
              </Link>
            </>
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
          <p className="text-2xl font-bold">{sale.items.length}</p>
        </div>
        <div className="border rounded-[5px] bg-card shadow-sm p-5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Total Units</p>
          <p className="text-2xl font-bold">{totalUnits}</p>
        </div>
        <div className="border rounded-[5px] bg-card shadow-sm p-5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Invoice Date</p>
          <p className="text-lg font-semibold">
            {new Date(sale.saleDate).toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" })}
          </p>
        </div>
        <div className="border rounded-[5px] bg-card shadow-sm p-5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Due Date</p>
          <p className="text-lg font-semibold">
            {new Date(sale.dueDate).toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" })}
          </p>
        </div>
      </div>

      {/* Main Content: Two Columns */}
      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        {/* Left: Invoice Details & Items */}
        <div className="border rounded-[5px] bg-card shadow-sm overflow-hidden">
          <div className="px-5 py-[15px] border-b">
            <h2 className="text-sm font-semibold text-foreground">Invoice Details</h2>
          </div>
          <div className="p-5 space-y-5">
            {/* Customer Info */}
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Customer</p>
                <p className="font-semibold text-foreground">{sale.customerName}</p>
                {sale.customerEmail && (
                  <a href={`mailto:${sale.customerEmail}`} className="text-sm text-primary hover:underline">{sale.customerEmail}</a>
                )}
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Warehouse</p>
                <p className="font-semibold text-foreground">{sale.warehouseName || "—"}</p>
              </div>
            </div>

            {/* Items Table */}
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Items</p>
              <div className="overflow-x-auto border rounded-[5px]">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted h-[33px]">
                      <th className="px-4 py-2 text-left font-semibold text-foreground text-xs">Product</th>
                      <th className="w-[80px] px-4 py-2 text-right font-semibold text-foreground text-xs">Qty</th>
                      <th className="w-[80px] px-4 py-2 text-right font-semibold text-foreground text-xs">Returned</th>
                      <th className="w-[100px] px-4 py-2 text-right font-semibold text-foreground text-xs">Price</th>
                      <th className="w-[110px] px-4 py-2 text-right font-semibold text-foreground text-xs">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sale.items.map((item) => (
                      <tr key={item.id} className="h-[52px] border-b hover:bg-muted/30 transition-colors">
                        <td className="px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="bg-muted rounded-[5px] size-[30px] flex items-center justify-center overflow-hidden shrink-0">
                              <Package className="h-3.5 w-3.5 text-muted-foreground" />
                            </div>
                            <span className="font-medium text-foreground">{item.productName}</span>
                          </div>
                        </td>
                        <td className="px-4 text-right tabular-nums">{item.quantity}</td>
                        <td className="px-4 text-right">
                          {item.returnedQuantity > 0 ? (
                            <span className="text-orange-600 font-medium tabular-nums">{item.returnedQuantity}</span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-4 text-right tabular-nums">{formatCurrency.format(item.unitPrice)}</td>
                        <td className="px-4 text-right font-semibold tabular-nums">{formatCurrency.format(item.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Totals */}
            <div className="border-t pt-4 space-y-2 max-w-[320px] ml-auto">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium tabular-nums">{formatCurrency.format(sale.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tax</span>
                <span className="font-medium tabular-nums">{formatCurrency.format(sale.tax)}</span>
              </div>
              {sale.discount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Discount</span>
                  <span className="font-medium tabular-nums text-destructive">-{formatCurrency.format(sale.discount)}</span>
                </div>
              )}
              <div className="flex justify-between border-t pt-2">
                <span className="font-semibold text-foreground">Total</span>
                <span className="text-xl font-bold tabular-nums">{formatCurrency.format(sale.totalAmount)}</span>
              </div>
              {sale.returnedValue != null && sale.returnedValue > 0 && (
                <div className="flex justify-between text-sm text-destructive border-t pt-2">
                  <span className="text-muted-foreground">Returned</span>
                  <span className="font-medium">-{formatCurrency.format(sale.returnedValue)}</span>
                </div>
              )}
              {sale.netTotal != null && sale.returnedValue != null && sale.returnedValue > 0 && (
                <div className="flex justify-between border-t-2 pt-2">
                  <span className="font-semibold text-foreground">Net Total</span>
                  <span className="text-lg font-bold tabular-nums">{formatCurrency.format(sale.netTotal)}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Payment & Summary */}
        <div className="space-y-4">
          <div className="border rounded-[5px] bg-card shadow-sm p-5 space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Payment</h3>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Status</p>
              <Badge variant="outline" className={`font-medium text-xs mt-1 ${statusStyles[status] || ""}`}>
                {statusLabel}
              </Badge>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Amount Due</p>
              <p className="text-2xl font-bold">
                {formatCurrency.format(sale.paymentStatus === "PAID" ? 0 : sale.balanceDue)}
              </p>
            </div>
            {sale.paymentMethod && (
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Method</p>
                <p className="font-semibold">{sale.paymentMethod}</p>
              </div>
            )}
            {sale.paymentStatus !== "PAID" && canManage && (
              <Button
                className="w-full h-[38px] rounded-[5px] text-sm"
                disabled={updating}
                onClick={() => markAsPaid().catch(() => {})}
              >
                {updating ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Marking...</>
                ) : (
                  <><CheckCircle2 className="mr-2 h-4 w-4" /> Mark as Paid</>
                )}
              </Button>
            )}
          </div>

          <div className="border rounded-[5px] bg-card shadow-sm p-5 space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Items</span>
                <span className="font-semibold">{sale.items.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Units</span>
                <span className="font-semibold">{totalUnits}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Customer</span>
                <span className="font-semibold text-xs truncate max-w-[140px] text-right">{sale.customerName}</span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="text-muted-foreground">Total</span>
                <span className="font-bold text-base">{formatCurrency.format(sale.totalAmount)}</span>
              </div>
              {sale.returnedValue != null && sale.returnedValue > 0 && (
                <div className="flex justify-between text-destructive">
                  <span className="text-muted-foreground">Returned</span>
                  <span className="font-semibold">-{formatCurrency.format(sale.returnedValue)}</span>
                </div>
              )}
              {sale.netTotal != null && sale.returnedValue != null && sale.returnedValue > 0 && (
                <div className="flex justify-between border-t pt-2">
                  <span className="text-muted-foreground">Net Total</span>
                  <span className="font-bold text-base">{formatCurrency.format(sale.netTotal)}</span>
                </div>
              )}
              <div className="flex justify-between border-t pt-2">
                <span className="text-muted-foreground">Balance</span>
                <span className={`font-bold text-base ${
                  sale.paymentStatus === "PAID" ? "text-emerald-600" : "text-destructive"
                }`}>
                  {formatCurrency.format(sale.paymentStatus === "PAID" ? 0 : sale.balanceDue)}
                </span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {sale.notes && (
            <div className="border rounded-[5px] bg-card shadow-sm p-5">
              <h3 className="text-sm font-semibold text-foreground mb-2">Notes</h3>
              <p className="text-sm text-muted-foreground">{sale.notes}</p>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this sale?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. Sale {sale.invoiceNumber} for {sale.customerName} will be removed permanently.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting} className="rounded-[5px]">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="rounded-[5px] bg-destructive hover:bg-destructive/90"
              disabled={deleting}
            >
              {deleting ? "Deleting..." : "Delete Sale"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}