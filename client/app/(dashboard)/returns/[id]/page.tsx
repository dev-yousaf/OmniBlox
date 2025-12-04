"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ArrowLeft, Edit, Trash2, Loader2, AlertTriangle } from "lucide-react";
import {
  useReturnsApi,
  type SalesReturn,
  type PurchaseReturn,
} from "@/hooks/use-returns-api";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type ReturnType = "customer" | "supplier";

const statusConfig = {
  PENDING: {
    label: "Pending",
    className: "bg-amber-100 text-amber-700 border-amber-200",
  },
  PROCESSING: {
    label: "Processing",
    className: "bg-blue-100 text-blue-700 border-blue-200",
  },
  COMPLETED: {
    label: "Completed",
    className: "bg-emerald-100 text-emerald-700 border-emerald-200",
  },
  CANCELLED: {
    label: "Cancelled",
    className: "bg-red-100 text-red-700 border-red-200",
  },
};

export default function ReturnDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const {
    getSalesReturn,
    getPurchaseReturn,
    deleteSalesReturn,
    deletePurchaseReturn,
    updateSalesReturn,
    updatePurchaseReturn,
  } = useReturnsApi();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [type, setType] = useState<ReturnType | null>(null);
  const [salesReturn, setSalesReturn] = useState<SalesReturn | null>(null);
  const [purchaseReturn, setPurchaseReturn] = useState<PurchaseReturn | null>(
    null
  );
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [statusUpdateLoading, setStatusUpdateLoading] = useState(false);

  const id = String(params.id);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        // Try as sales return first
        try {
          const sr = await getSalesReturn(id);
          if (!mounted) return;
          setSalesReturn(sr);
          setType("customer");
          return;
        } catch (_e) {
          // ignore and try purchase
        }
        const pr = await getPurchaseReturn(id);
        if (!mounted) return;
        setPurchaseReturn(pr);
        setType("supplier");
      } catch (e: any) {
        if (!mounted) return;
        setError(e?.message || "Failed to load return");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [id, getSalesReturn, getPurchaseReturn]);

  const data = useMemo(() => {
    if (type === "customer" && salesReturn) {
      return {
        type,
        id: salesReturn.id,
        referenceNumber: salesReturn.referenceNumber,
        returnDate: salesReturn.returnDate,
        status: salesReturn.status,
        reason: salesReturn.reason,
        warehouse: salesReturn.warehouse?.name,
        actor: salesReturn.user?.name,
        headerBadgeClass: "border-red-200 bg-red-50 text-red-700",
        items: salesReturn.items,
        totalAmount: Number(salesReturn.totalAmount),
        sideLabel: "Customer Return",
        entityLabel: undefined as string | undefined,
      };
    }
    if (type === "supplier" && purchaseReturn) {
      return {
        type,
        id: purchaseReturn.id,
        referenceNumber: purchaseReturn.referenceNumber,
        returnDate: purchaseReturn.returnDate,
        status: purchaseReturn.status,
        reason: purchaseReturn.reason,
        warehouse: purchaseReturn.warehouse?.name,
        actor: purchaseReturn.user?.name,
        headerBadgeClass: "border-emerald-200 bg-emerald-50 text-emerald-700",
        items: purchaseReturn.items,
        totalAmount: Number(purchaseReturn.totalAmount),
        sideLabel: "Supplier Return",
        entityLabel: purchaseReturn.supplier?.name,
      };
    }
    return null;
  }, [type, salesReturn, purchaseReturn]);

  const handleDelete = async () => {
    if (!data || !type) return;
    try {
      if (type === "customer") await deleteSalesReturn(data.id);
      else await deletePurchaseReturn(data.id);
      toast({ title: "Return deleted" });
      router.push("/returns");
    } catch (e: any) {
      toast({
        title: "Failed to delete",
        description: e?.message || "Unknown error",
        variant: "destructive",
      });
    }
  };

  const handleStatusChange = async (
    newStatus: "PENDING" | "PROCESSING" | "COMPLETED" | "CANCELLED"
  ) => {
    if (!data || !type || statusUpdateLoading) return;

    try {
      setStatusUpdateLoading(true);

      if (type === "customer") {
        const updated = await updateSalesReturn(data.id, { status: newStatus });
        setSalesReturn(updated);
      } else {
        const updated = await updatePurchaseReturn(data.id, {
          status: newStatus,
        });
        setPurchaseReturn(updated);
      }

      toast({
        title: "Status updated",
        description: `Return status changed to ${statusConfig[newStatus].label}`,
      });
    } catch (e: any) {
      toast({
        title: "Failed to update status",
        description: e?.message || "Unknown error",
        variant: "destructive",
      });
    } finally {
      setStatusUpdateLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[40vh]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6">
        <div className="max-w-xl mx-auto text-center">
          <p className="text-lg font-medium mb-2">Return not found</p>
          <p className="text-muted-foreground mb-4">
            {error || "We couldn't find a return with this id."}
          </p>
          <Link href="/returns">
            <Button variant="outline">Back to returns</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/returns">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">
              {data.referenceNumber}
            </h1>
            <p className="text-sm text-muted-foreground">{data.sideLabel}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/returns/${data.id}/edit`}>
            <Button variant="outline" size="sm">
              <Edit className="h-4 w-4 mr-2" /> Edit
            </Button>
          </Link>
          <AlertDialog
            open={deleteDialogOpen}
            onOpenChange={setDeleteDialogOpen}
          >
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">
                <Trash2 className="h-4 w-4 mr-2" /> Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Return</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete this return? This action
                  cannot be undone. The return {data.referenceNumber} will be
                  permanently removed.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90 text-white"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Warning Banner for PENDING and PROCESSING status */}
      {(data.status === "PENDING" || data.status === "PROCESSING") && (
        <Alert className="border-amber-200 bg-amber-50">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-amber-900">
            Return Not Completed
          </AlertTitle>
          <AlertDescription className="text-amber-800">
            {data.status === "PENDING" && (
              <>
                This return is currently <strong>pending</strong>.{" "}
                {((type === "customer" && salesReturn?.saleId) ||
                  (type === "supplier" && purchaseReturn?.purchaseOrderId)) && (
                  <>
                    The original{" "}
                    {type === "customer" ? "sale" : "purchase order"} will not
                    show return indicators until you mark this return as{" "}
                    <strong>completed</strong>.
                  </>
                )}
              </>
            )}
            {data.status === "PROCESSING" && (
              <>
                This return is currently <strong>processing</strong>.{" "}
                {((type === "customer" && salesReturn?.saleId) ||
                  (type === "supplier" && purchaseReturn?.purchaseOrderId)) && (
                  <>
                    The original{" "}
                    {type === "customer" ? "sale" : "purchase order"} will not
                    show return indicators until you mark this return as{" "}
                    <strong>completed</strong>.
                  </>
                )}
              </>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Success Banner for COMPLETED status */}
      {data.status === "COMPLETED" &&
        ((type === "customer" && salesReturn?.saleId) ||
          (type === "supplier" && purchaseReturn?.purchaseOrderId)) && (
          <Alert className="border-emerald-200 bg-emerald-50">
            <AlertTriangle className="h-4 w-4 text-emerald-600" />
            <AlertTitle className="text-emerald-900">
              Return Completed
            </AlertTitle>
            <AlertDescription className="text-emerald-800">
              This return has been completed. The original{" "}
              {type === "customer" ? "sale" : "purchase order"} now shows return
              indicators with the returned quantities.
            </AlertDescription>
          </Alert>
        )}

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Return Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Reference</p>
                <p className="font-medium">{data.referenceNumber}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Date</p>
                <p className="font-medium">
                  {new Date(data.returnDate).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Type</p>
                <Badge variant="outline" className={data.headerBadgeClass}>
                  {data.sideLabel}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Warehouse</p>
                <p className="font-medium">{data.warehouse || "-"}</p>
              </div>
              {data.entityLabel && (
                <div>
                  <p className="text-sm text-muted-foreground">Supplier</p>
                  <p className="font-medium">{data.entityLabel}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <Badge
                  variant="outline"
                  className={
                    statusConfig[data.status as keyof typeof statusConfig]
                      .className
                  }
                >
                  {statusConfig[data.status as keyof typeof statusConfig].label}
                </Badge>
              </div>
              {data.reason && (
                <div className="md:col-span-2">
                  <p className="text-sm text-muted-foreground">Reason</p>
                  <p className="font-medium">{data.reason}</p>
                </div>
              )}
            </div>

            <Separator />

            <div>
              <h3 className="font-semibold mb-3">Items</h3>
              <div className="space-y-2">
                {data.items.map((it) => (
                  <div
                    key={it.id}
                    className="p-3 border rounded-md grid grid-cols-12 gap-3 items-center"
                  >
                    <div className="col-span-6">
                      <div className="font-medium">{it.product?.name}</div>
                      <div className="text-xs text-muted-foreground">
                        SKU: {it.product?.sku}
                      </div>
                    </div>
                    <div className="col-span-2 text-sm">Qty: {it.quantity}</div>
                    <div className="col-span-2 text-sm">
                      Unit: ${Number(it.unitPrice).toFixed(2)}
                    </div>
                    <div className="col-span-2 text-right font-medium">
                      ${(Number(it.unitPrice) * Number(it.quantity)).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            <div className="flex justify-between text-base">
              <span className="text-muted-foreground">Total</span>
              <span className="font-semibold">
                ${data.totalAmount.toFixed(2)}
              </span>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link href={`/returns/${data.id}/edit`}>
                <Button variant="outline" size="sm" className="w-full">
                  <Edit className="h-4 w-4 mr-2" /> Edit
                </Button>
              </Link>

              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">
                  Change Status
                </p>
                {/* Info message for PENDING/PROCESSING with reference */}
                {(data.status === "PENDING" || data.status === "PROCESSING") &&
                  ((type === "customer" && salesReturn?.saleId) ||
                    (type === "supplier" &&
                      purchaseReturn?.purchaseOrderId)) && (
                    <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-md p-2">
                      💡 Complete this return to update the original{" "}
                      {type === "customer" ? "sale" : "purchase order"}
                    </p>
                  )}
                <div className="grid grid-cols-1 gap-2">
                  {data.status === "PENDING" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleStatusChange("PROCESSING")}
                      disabled={statusUpdateLoading}
                      className="w-full"
                    >
                      {statusUpdateLoading ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : null}
                      Start Processing
                    </Button>
                  )}

                  {data.status === "PROCESSING" && (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => handleStatusChange("COMPLETED")}
                      disabled={statusUpdateLoading}
                      className="w-full"
                    >
                      {statusUpdateLoading ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : null}
                      Mark as Completed
                    </Button>
                  )}

                  {data.status !== "CANCELLED" && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleStatusChange("CANCELLED")}
                      disabled={statusUpdateLoading}
                      className="w-full"
                    >
                      {statusUpdateLoading ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : null}
                      Cancel Return
                    </Button>
                  )}

                  {(data.status === "PROCESSING" ||
                    data.status === "COMPLETED") && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleStatusChange("PENDING")}
                      disabled={statusUpdateLoading}
                      className="w-full"
                    >
                      {statusUpdateLoading ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : null}
                      Reset to Pending
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
