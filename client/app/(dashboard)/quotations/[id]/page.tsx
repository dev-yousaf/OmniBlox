"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { PageLoadingSkeleton } from "@/components/ui/page-loading-skeleton";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  FileText,
  User,
  Calendar,
  DollarSign,
  CheckCircle,
  XCircle,
  Clock,
  ShoppingCart,
  Loader2,
  AlertCircle,
  Warehouse,
  Package,
} from "lucide-react";
import Link from "next/link";
import {
  useQuotationsApi,
  type QuotationWithDetails,
} from "@/hooks/use-quotations-api";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

const statusConfig = {
  PENDING: {
    label: "Sent",
    icon: Clock,
    className: "bg-amber-100 text-amber-700 border-amber-200",
  },
  COMPLETED: {
    label: "Accepted",
    icon: CheckCircle,
    className: "bg-emerald-100 text-emerald-700 border-emerald-200",
  },
  CANCELLED: {
    label: "Rejected",
    icon: XCircle,
    className: "bg-red-100 text-red-700 border-red-200",
  },
};

export default function QuotationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const quotationId = params.id as string;

  const {
    getQuotation,
    updateQuotationStatus,
    convertQuotationToSale,
    getQuotationStockLevels,
  } = useQuotationsApi();

  const [quotation, setQuotation] = useState<QuotationWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [showConvertDialog, setShowConvertDialog] = useState(false);
  const [stockLevels, setStockLevels] = useState<any>(null);
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>("");
  const [loadingStock, setLoadingStock] = useState(false);

  useEffect(() => {
    loadQuotation();
  }, [quotationId]);

  const loadQuotation = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getQuotation(quotationId);
      setQuotation(data);
    } catch (err: any) {
      setError(err.message || "Failed to load quotation");
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
      await loadQuotation(); // Reload to show updated status
    } catch (err: any) {
      toast.error(err.message || "Failed to accept quotation");
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
    } catch (err: any) {
      toast.error(err.message || "Failed to reject quotation");
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

      // Call the conversion API with selected warehouse
      const result = await convertQuotationToSale(
        quotation.id,
        selectedWarehouse
      );
      const sale = result.sale;

      toast.success("Quotation converted to sale successfully!", {
        description: `Sale ${sale.invoiceNumber} has been created`,
      });

      // Navigate to the new sale detail page
      router.push(`/sales/${sale.id}`);
    } catch (err: any) {
      console.error("Conversion error:", err);

      // Extract the actual error message from the nested structure
      let errorMessage = "Failed to convert quotation to sale";

      if (err?.message) {
        errorMessage = err.message;
      } else if (err?.details?.message) {
        errorMessage = Array.isArray(err.details.message)
          ? err.details.message.join(", ")
          : err.details.message;
      }

      toast.error(errorMessage);
      setActionLoading(false);
    }
  };

  const handleShowConvertDialog = async () => {
    try {
      setLoadingStock(true);
      setShowConvertDialog(true);
      const levels = await getQuotationStockLevels(quotationId);
      setStockLevels(levels);

      // Auto-select first warehouse that can fulfill
      const canFulfill = levels.warehouses.find((w: any) => w.canFulfill);
      if (canFulfill) {
        setSelectedWarehouse(canFulfill.warehouseId);
      } else if (levels.warehouses.length > 0) {
        setSelectedWarehouse(levels.warehouses[0].warehouseId);
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to load stock levels");
      setShowConvertDialog(false);
    } finally {
      setLoadingStock(false);
    }
  };

  if (loading) {
    return <PageLoadingSkeleton />;
  }

  if (error || !quotation) {
    return (
      <div className="p-6">
        <div className="max-w-2xl mx-auto text-center py-12">
          <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
          <h2 className="text-2xl font-semibold mb-2">
            Error Loading Quotation
          </h2>
          <p className="text-muted-foreground mb-6">
            {error || "Quotation not found"}
          </p>
          <Link href="/quotations">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Quotations
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const StatusIcon =
    statusConfig[quotation.status as keyof typeof statusConfig].icon;
  const subtotal = quotation.items.reduce(
    (sum: number, item: any) =>
      sum + Number(item.unitPrice) * Number(item.quantity),
    0
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/quotations">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">
              {quotation.referenceNumber}
            </h1>
            <p className="text-sm text-muted-foreground">Quotation Details</p>
          </div>
        </div>
        <Badge
          variant="outline"
          className={`${
            statusConfig[quotation.status as keyof typeof statusConfig]
              .className
          } text-base px-4 py-2`}
        >
          <StatusIcon className="h-4 w-4 mr-2" />
          {statusConfig[quotation.status as keyof typeof statusConfig].label}
        </Badge>
      </div>

      {/* Action Buttons */}
      <Card>
        <CardHeader>
          <CardTitle>Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            {quotation.status === "PENDING" && (
              <>
                <Button
                  onClick={handleAccept}
                  disabled={actionLoading}
                  className="gap-2"
                  variant="default"
                >
                  {actionLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle className="h-4 w-4" />
                  )}
                  Accept Quotation
                </Button>
                <Button
                  onClick={handleReject}
                  disabled={actionLoading}
                  variant="destructive"
                  className="gap-2"
                >
                  {actionLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <XCircle className="h-4 w-4" />
                  )}
                  Reject Quotation
                </Button>
              </>
            )}

            {quotation.status === "COMPLETED" && (
              <Button
                onClick={handleShowConvertDialog}
                disabled={actionLoading}
                className="gap-2 bg-emerald-600 hover:bg-emerald-700"
                size="lg"
              >
                {actionLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ShoppingCart className="h-4 w-4" />
                )}
                Convert to Sale
              </Button>
            )}

            {quotation.status === "CANCELLED" && (
              <div className="text-sm text-muted-foreground py-2">
                This quotation has been rejected and cannot be converted to a
                sale.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Customer Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Customer Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <div className="text-sm text-muted-foreground">Name</div>
              <div className="font-medium">{quotation.customer.name}</div>
            </div>
            {quotation.customer.email && (
              <div>
                <div className="text-sm text-muted-foreground">Email</div>
                <div className="font-medium">{quotation.customer.email}</div>
              </div>
            )}
            {quotation.customer.phone && (
              <div>
                <div className="text-sm text-muted-foreground">Phone</div>
                <div className="font-medium">{quotation.customer.phone}</div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quotation Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Quotation Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <div className="text-sm text-muted-foreground">Quote Date</div>
              <div className="font-medium">
                {format(new Date(quotation.quoteDate), "MMMM dd, yyyy")}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Expiry Date</div>
              <div className="font-medium">
                {quotation.expiryDate
                  ? format(new Date(quotation.expiryDate), "MMMM dd, yyyy")
                  : "N/A"}
              </div>
            </div>
            {quotation.notes && (
              <div>
                <div className="text-sm text-muted-foreground">Notes</div>
                <div className="font-medium text-sm">{quotation.notes}</div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Items */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Items
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-3 font-medium">Product</th>
                    <th className="text-right p-3 font-medium">Quantity</th>
                    <th className="text-right p-3 font-medium">Unit Price</th>
                    <th className="text-right p-3 font-medium">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {quotation.items.map((item: any, index: number) => (
                    <tr
                      key={item.id}
                      className={
                        index !== quotation.items.length - 1 ? "border-b" : ""
                      }
                    >
                      <td className="p-3">
                        <div className="font-medium">{item.product.name}</div>
                        {item.product.sku && (
                          <div className="text-xs text-muted-foreground">
                            SKU: {item.product.sku}
                          </div>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        {Number(item.quantity)}
                      </td>
                      <td className="p-3 text-right">
                        $
                        {Number(item.unitPrice).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                      <td className="p-3 text-right font-medium">
                        $
                        {(
                          Number(item.unitPrice) * Number(item.quantity)
                        ).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Separator />

            {/* Totals */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium">
                  $
                  {subtotal.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  Tax ({Number(quotation.taxAmount) > 0 ? "Included" : "N/A"})
                </span>
                <span className="font-medium">
                  $
                  {Number(quotation.taxAmount).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
              {Number(quotation.discount) > 0 && (
                <div className="flex justify-between text-sm text-emerald-600">
                  <span>Discount</span>
                  <span className="font-medium">
                    -$
                    {Number(quotation.discount).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between text-lg">
                <span className="font-semibold">Total</span>
                <span className="font-bold">
                  $
                  {Number(quotation.totalAmount).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Convert to Sale Confirmation Dialog */}
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
              {/* Warehouse Selection */}
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
                    {stockLevels.warehouses.map((wh: any) => (
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

              {/* Stock Level Details for Selected Warehouse */}
              {selectedWarehouse &&
                (() => {
                  const warehouse = stockLevels.warehouses.find(
                    (w: any) => w.warehouseId === selectedWarehouse
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
                          {warehouse.products.map((product: any) => (
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
                (stockLevels &&
                  !stockLevels.warehouses.find(
                    (w: any) => w.warehouseId === selectedWarehouse
                  )?.canFulfill)
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
    </div>
  );
}



