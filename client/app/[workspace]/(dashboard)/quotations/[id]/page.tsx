"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useWorkspace } from "@/hooks/use-workspace";
import { WorkspaceLink as Link } from "@/components/workspace-link";
import { PageLoadingSkeleton } from "@/components/ui/page-loading-skeleton";
import {
  ArrowLeft, Edit, Trash2, Loader2, CheckCircle, XCircle,
  ChevronRight, ShoppingCart, Package, AlertCircle, Warehouse,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Card, CardContent, CardHeader, CardTitle,
} from "@/components/ui/card";
import {
  useQuotationsApi,
  type QuotationWithDetails,
  type QuotationItem,
} from "@/hooks/use-quotations-api";
import { toast } from "sonner";

const getErrorMessage = (err: unknown, fallback: string): string => {
  if (err && typeof err === "object" && "message" in err) {
    const msg = (err as { message?: unknown }).message;
    if (typeof msg === "string") return msg;
  }
  return fallback;
};

const getConvertError = (err: unknown): string => {
  if (err && typeof err === "object") {
    const e = err as Record<string, unknown>;
    if (typeof e.message === "string") return e.message;
    if (e.details && typeof e.details === "object") {
      const d = e.details as Record<string, unknown>;
      if (Array.isArray(d.message)) return (d.message as string[]).join(", ");
      if (typeof d.message === "string") return d.message;
    }
  }
  return "Failed to convert quotation to sale";
};

const statusStyles: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800",
  COMPLETED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
  CANCELLED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800",
  DRAFT: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400 border-gray-200 dark:border-gray-800",
};

const statusLabels: Record<string, string> = {
  PENDING: "Sent",
  COMPLETED: "Accepted",
  CANCELLED: "Rejected",
  DRAFT: "Draft",
};

export default function QuotationDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const ws = useWorkspace();
  const quotationId = params?.id ?? "";

  const {
    getQuotation,
    updateQuotationStatus,
    convertQuotationToSale,
    getQuotationStockLevels,
    deleteQuotation,
  } = useQuotationsApi();

  const [quotation, setQuotation] = useState<QuotationWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showConvertDialog, setShowConvertDialog] = useState(false);
  const [stockLevels, setStockLevels] = useState<{
    warehouses: Array<{
      warehouseId: string;
      warehouseName: string;
      location?: string;
      canFulfill: boolean;
      products: Array<{
        productId: string;
        productName: string;
        sku?: string;
        required: number;
        available: number;
        sufficient: boolean;
      }>;
    }>;
  } | null>(null);
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>("");
  const [loadingStock, setLoadingStock] = useState(false);

  const formatCurrency = useMemo(
    () => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }),
    []
  );

  useEffect(() => {
    loadQuotation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quotationId]);

  const loadQuotation = async () => {
    if (!quotationId) return;
    try {
      setLoading(true);
      setError(null);
      const data = await getQuotation(quotationId);
      setQuotation(data);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load quotation"));
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    if (!quotation) return;
    try {
      setActionLoading(true);
      await updateQuotationStatus(quotation.id, { status: "COMPLETED" });
      toast.success("Quotation accepted successfully");
      await loadQuotation();
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to accept quotation"));
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!quotation) return;
    try {
      setActionLoading(true);
      await updateQuotationStatus(quotation.id, { status: "CANCELLED" });
      toast.success("Quotation rejected");
      await loadQuotation();
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to reject quotation"));
    } finally {
      setActionLoading(false);
    }
  };

  const handleConvertToSale = async () => {
    if (!quotation || !selectedWarehouse) {
      toast.error("Please select a warehouse");
      return;
    }
    try {
      setActionLoading(true);
      setShowConvertDialog(false);
      const result = await convertQuotationToSale(quotation.id, selectedWarehouse);
      const sale = result.sale;
      toast.success("Quotation converted to sale successfully!", {
        description: `Sale ${sale.invoiceNumber} has been created`,
      });
      router.push(`/${ws}/sales/${sale.id}`);
    } catch (err) {
      toast.error(getConvertError(err));
      setActionLoading(false);
    }
  };

  const handleShowConvertDialog = async () => {
    try {
      setLoadingStock(true);
      setShowConvertDialog(true);
      const levels = await getQuotationStockLevels(quotationId);
      setStockLevels(levels);
      const canFulfill = levels.warehouses.find((w: { canFulfill: boolean }) => w.canFulfill);
      if (canFulfill) {
        setSelectedWarehouse(canFulfill.warehouseId);
      } else if (levels.warehouses.length > 0) {
        setSelectedWarehouse(levels.warehouses[0].warehouseId);
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to load stock levels"));
      setShowConvertDialog(false);
    } finally {
      setLoadingStock(false);
    }
  };

  const handleDelete = async () => {
    if (!quotation) return;
    setDeleting(true);
    try {
      await deleteQuotation(quotation.id);
      toast.success("Quotation deleted successfully");
      router.push(`/${ws}/${ws}/quotations`);
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to delete quotation"));
    } finally {
      setDeleting(false);
    }
  };

  if (!quotationId) return <div className="p-6">Quotation identifier is missing.</div>;
  if (loading) return <PageLoadingSkeleton />;

  if (!quotation) {
    return (
      <div className="space-y-5">
        <div className="flex items-center gap-1 text-sm text-muted-foreground mb-0.5">
          <Link href="/dashboard" className="hover:text-foreground transition-colors">Dashboard</Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <Link href="/quotations" className="hover:text-foreground transition-colors">Quotations</Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-foreground">Quotation Detail</span>
        </div>
        <div className="border rounded-[5px] bg-card shadow-sm py-12 text-center text-muted-foreground">
          <Package className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
          <p className="font-medium">Quotation not found</p>
        </div>
      </div>
    );
  }

  const status = quotation.status || "PENDING";
  const statusLabel = statusLabels[status] || status;
  const totalUnits = quotation.items.reduce((sum: number, item: QuotationItem) => sum + Number(item.quantity), 0);
  const items = quotation.items;

  return (
    <div className="space-y-5">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1 text-sm text-muted-foreground mb-0.5">
        <Link href="/dashboard" className="hover:text-foreground transition-colors">Dashboard</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link href="/quotations" className="hover:text-foreground transition-colors">Quotations</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground">{quotation.referenceNumber}</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/quotations">
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-[18px] font-bold text-foreground">{quotation.referenceNumber}</h1>
              <Badge variant="outline" className={`font-medium text-xs ${statusStyles[status] || ""}`}>
                {statusLabel}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">{quotation.customer?.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {quotation.status === "PENDING" && (
            <>
              <Button
                size="sm"
                className="h-[34px] rounded-[5px] text-[13px]"
                disabled={actionLoading}
                onClick={handleAccept}
              >
                {actionLoading ? (
                  <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Accepting...</>
                ) : (
                  <><CheckCircle className="mr-1.5 h-3.5 w-3.5" /> Accept</>
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-[34px] rounded-[5px] text-[13px] text-destructive hover:text-destructive"
                disabled={actionLoading}
                onClick={handleReject}
              >
                {actionLoading ? (
                  <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Rejecting...</>
                ) : (
                  <><XCircle className="mr-1.5 h-3.5 w-3.5" /> Reject</>
                )}
              </Button>
            </>
          )}
          {quotation.status === "COMPLETED" && (
            <Button
              size="sm"
              className="h-[34px] rounded-[5px] text-[13px] bg-emerald-600 hover:bg-emerald-700"
              disabled={actionLoading}
              onClick={handleShowConvertDialog}
            >
              {actionLoading ? (
                <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Converting...</>
              ) : (
                <><ShoppingCart className="mr-1.5 h-3.5 w-3.5" /> Convert to Sale</>
              )}
            </Button>
          )}
          {quotation.status === "CANCELLED" && (
            <span className="text-sm text-muted-foreground">This quotation has been rejected and cannot be converted to a sale.</span>
          )}
          <Link href={`/quotations/${quotation.id}/edit`}>
            <Button
              variant="outline"
              size="sm"
              className="h-[34px] rounded-[5px] text-[13px]"
            >
              <Edit className="mr-1.5 h-3.5 w-3.5" /> Edit
            </Button>
          </Link>
          <Button
            variant="outline"
            size="sm"
            className="h-[34px] rounded-[5px] text-[13px] text-destructive hover:text-destructive"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete
          </Button>
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
          <p className="text-2xl font-bold">{items.length}</p>
        </div>
        <div className="border rounded-[5px] bg-card shadow-sm p-5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Total Units</p>
          <p className="text-2xl font-bold">{totalUnits}</p>
        </div>
        <div className="border rounded-[5px] bg-card shadow-sm p-5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Quote Date</p>
          <p className="text-lg font-semibold">
            {new Date(quotation.quoteDate).toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" })}
          </p>
        </div>
        <div className="border rounded-[5px] bg-card shadow-sm p-5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Expiry Date</p>
          <p className="text-lg font-semibold">
            {quotation.expiryDate
              ? new Date(quotation.expiryDate).toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" })
              : "—"}
          </p>
        </div>
      </div>

      {/* Main Content: Two Columns */}
      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        {/* Left: Customer Info & Items */}
        <div className="border rounded-[5px] bg-card shadow-sm overflow-hidden">
          <div className="px-5 py-[15px] border-b">
            <h2 className="text-sm font-semibold text-foreground">Quotation Details</h2>
          </div>
          <div className="p-5 space-y-5">
            {/* Customer Info */}
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Customer</p>
              <p className="font-semibold text-foreground">{quotation.customer?.name}</p>
              {quotation.customer?.email && (
                <a href={`mailto:${quotation.customer.email}`} className="text-sm text-primary hover:underline">
                  {quotation.customer.email}
                </a>
              )}
              {quotation.customer?.phone && (
                <p className="text-sm text-muted-foreground">{quotation.customer.phone}</p>
              )}
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
                      <th className="w-[100px] px-4 py-2 text-right font-semibold text-foreground text-xs">Price</th>
                      <th className="w-[110px] px-4 py-2 text-right font-semibold text-foreground text-xs">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item: QuotationItem, index: number) => (
                      <tr key={item.id || index} className="h-[52px] border-b hover:bg-muted/30 transition-colors">
                        <td className="px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="bg-muted rounded-[5px] size-[30px] flex items-center justify-center overflow-hidden shrink-0">
                              <Package className="h-3.5 w-3.5 text-muted-foreground" />
                            </div>
                            <div>
                              <span className="font-medium text-foreground">{item.product?.name || (item as unknown as Record<string, string>).productName || ""}</span>
                              {item.product?.sku && (
                                <span className="text-xs text-muted-foreground ml-1">SKU: {item.product.sku}</span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 text-right tabular-nums">{Number(item.quantity)}</td>
                        <td className="px-4 text-right tabular-nums">{formatCurrency.format(Number(item.unitPrice))}</td>
                        <td className="px-4 text-right font-semibold tabular-nums">
                          {formatCurrency.format(Number(item.unitPrice) * Number(item.quantity))}
                        </td>
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
                <span className="font-medium tabular-nums">
                  {formatCurrency.format(items.reduce((sum: number, i: QuotationItem) => sum + Number(i.unitPrice) * Number(i.quantity), 0))}
                </span>
              </div>
              {Number(quotation.taxAmount) > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tax</span>
                  <span className="font-medium tabular-nums">{formatCurrency.format(Number(quotation.taxAmount))}</span>
                </div>
              )}
              {Number(quotation.discount) > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Discount</span>
                  <span className="font-medium tabular-nums text-destructive">-{formatCurrency.format(Number(quotation.discount))}</span>
                </div>
              )}
              <div className="flex justify-between border-t pt-2">
                <span className="font-semibold text-foreground">Total</span>
                <span className="text-xl font-bold tabular-nums">{formatCurrency.format(Number(quotation.totalAmount))}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Summary & Actions */}
        <div className="space-y-4">
          <div className="border rounded-[5px] bg-card shadow-sm p-5 space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Customer</span>
                <span className="font-semibold text-xs truncate max-w-[140px] text-right">{quotation.customer?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <Badge variant="outline" className={`font-medium text-xs ${statusStyles[status] || ""}`}>
                  {statusLabel}
                </Badge>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="text-muted-foreground">Total Amount</span>
                <span className="font-bold text-base">{formatCurrency.format(Number(quotation.totalAmount))}</span>
              </div>
            </div>
          </div>

          {quotation.notes && (
            <div className="border rounded-[5px] bg-card shadow-sm p-5">
              <h3 className="text-sm font-semibold text-foreground mb-2">Notes</h3>
              <p className="text-sm text-muted-foreground">{quotation.notes}</p>
            </div>
          )}

          {quotation.status === "COMPLETED" && (
            <Button
              className="w-full h-[38px] rounded-[5px] text-sm bg-emerald-600 hover:bg-emerald-700"
              disabled={actionLoading}
              onClick={handleShowConvertDialog}
            >
              {actionLoading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Converting...</>
              ) : (
                <><ShoppingCart className="mr-2 h-4 w-4" /> Convert to Sale</>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Convert to Sale Dialog */}
      <AlertDialog open={showConvertDialog} onOpenChange={setShowConvertDialog}>
        <AlertDialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Convert Quotation to Sale
            </AlertDialogTitle>
            <AlertDialogDescription>
              Select a warehouse to fulfill this sale from.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {loadingStock ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : stockLevels ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="warehouse">Select Warehouse</Label>
                <Select
                  value={selectedWarehouse}
                  onValueChange={setSelectedWarehouse}
                >
                  <SelectTrigger id="warehouse">
                    <SelectValue placeholder="Choose a warehouse..." />
                  </SelectTrigger>
                  <SelectContent>
                    {stockLevels.warehouses.map((wh) => (
                      <SelectItem key={wh.warehouseId} value={wh.warehouseId}>
                        <div className="flex items-center gap-2">
                          <Warehouse className="h-4 w-4" />
                          <span>{wh.warehouseName}</span>
                          {wh.location && (
                            <span className="text-xs text-muted-foreground">
                              ({wh.location})
                            </span>
                          )}
                          {wh.canFulfill ? (
                            <Badge
                              variant="outline"
                              className="ml-2 bg-emerald-50 text-emerald-700 border-emerald-200"
                            >
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Can Fulfill
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="ml-2 bg-red-50 text-red-700 border-red-200"
                            >
                              <XCircle className="h-3 w-3 mr-1" />
                              Insufficient Stock
                            </Badge>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedWarehouse &&
                (() => {
                  const warehouse = stockLevels.warehouses.find(
                    (w) => w.warehouseId === selectedWarehouse
                  );
                  return warehouse ? (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">
                          Stock Levels - {warehouse.warehouseName}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {warehouse.products.map((product) => (
                            <div
                              key={product.productId}
                              className={`flex items-center justify-between p-3 rounded-lg border ${
                                product.sufficient
                                  ? "bg-emerald-50 border-emerald-200"
                                  : "bg-red-50 border-red-200"
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <Package className="h-4 w-4" />
                                <div>
                                  <div className="font-medium">
                                    {product.productName}
                                  </div>
                                  {product.sku && (
                                    <div className="text-xs text-muted-foreground">
                                      SKU: {product.sku}
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-4">
                                <div className="text-sm text-right">
                                  <div className="font-medium">
                                    Required: {product.required}
                                  </div>
                                  <div
                                    className={
                                      product.sufficient
                                        ? "text-emerald-600"
                                        : "text-red-600"
                                    }
                                  >
                                    Available: {product.available}
                                  </div>
                                </div>
                                {product.sufficient ? (
                                  <CheckCircle className="h-5 w-5 text-emerald-600" />
                                ) : (
                                  <XCircle className="h-5 w-5 text-red-600" />
                                )}
                              </div>
                            </div>
                          ))}
                        </div>

                        {!warehouse.canFulfill && (
                          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                            <div className="flex gap-2">
                              <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0" />
                              <div className="text-sm text-amber-800">
                                <p className="font-medium">
                                  Insufficient Stock Warning
                                </p>
                                <p>
                                  This warehouse does not have enough stock to
                                  fulfill all items. The conversion will fail
                                  unless you select a different warehouse or
                                  adjust inventory levels.
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ) : null;
                })()}

              <div className="pt-2 text-sm text-muted-foreground">
                <p className="font-medium">The sale will include:</p>
                <ul className="list-disc list-inside space-y-1 mt-1">
                  <li>All items from this quotation</li>
                  <li>Customer information and pricing</li>
                  <li>Automatic inventory deduction from selected warehouse</li>
                  <li>Delivery record creation</li>
                </ul>
              </div>
            </div>
          ) : null}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConvertToSale}
              disabled={
                actionLoading ||
                !selectedWarehouse ||
                (stockLevels
                  ? !stockLevels.warehouses.find(
                      (w: { warehouseId: string }) => w.warehouseId === selectedWarehouse
                    )?.canFulfill
                  : false)
              }
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {actionLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Converting...
                </>
              ) : (
                "Convert to Sale"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this quotation?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. Quotation {quotation.referenceNumber} for {quotation.customer?.name} will be removed permanently.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting} className="rounded-[5px]">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="rounded-[5px] bg-destructive hover:bg-destructive/90"
              disabled={deleting}
            >
              {deleting ? "Deleting..." : "Delete Quotation"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
