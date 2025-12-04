"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { usePurchasesApi, type PurchaseOrder } from "@/hooks/use-purchases-api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Package, User, FileText, RotateCcw } from "lucide-react";
import { format } from "date-fns";
import { ReceivePurchaseDialog } from "@/components/purchases/ReceivePurchaseDialog";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";

function formatCurrency(value: number | string | undefined | null): string {
  if (value === undefined || value === null) return "$0.00";
  const num = typeof value === "string" ? parseFloat(value) : value;
  return isNaN(num) ? "$0.00" : `$${num.toFixed(2)}`;
}

function statusBadgeVariant(
  status: string
): React.ComponentProps<typeof Badge>["variant"] {
  switch (status) {
    case "PENDING":
      return "secondary";
    case "COMPLETED":
      return "default";
    case "CANCELLED":
      return "outline";
    default:
      return "secondary";
  }
}

export default function PurchaseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const id = params?.id as string;
  const { list, receive } = usePurchasesApi();

  const [purchase, setPurchase] = useState<PurchaseOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showReceiveDialog, setShowReceiveDialog] = useState(false);

  const canManage =
    user?.role === "OWNER" ||
    user?.role === "ADMIN" ||
    user?.role === "MANAGER";

  async function loadPurchase() {
    try {
      setLoading(true);
      setError(null);
      const purchases = await list();
      const found = purchases.find((p) => p.id === id);
      if (found) {
        setPurchase(found);
      } else {
        setError("Purchase order not found");
      }
    } catch (e: any) {
      setError(e?.message || "Failed to load purchase");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (id) {
      loadPurchase();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleReceiveConfirm = async (warehouseId: string) => {
    if (!purchase) return;

    try {
      await receive(purchase.id, warehouseId);
      toast({ title: "Purchase received", description: "Inventory updated." });
      await loadPurchase();
    } catch (e: any) {
      toast({
        title: "Failed to receive",
        description: e?.message || "Try again",
        variant: "destructive" as any,
      });
      throw e;
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-sm text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (error || !purchase) {
    return (
      <div className="p-6 space-y-4">
        <Button variant="ghost" onClick={() => router.push("/purchases")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Purchases
        </Button>
        <div className="text-sm text-destructive">
          {error || "Purchase not found"}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/purchases")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight flex items-center gap-3">
              {purchase.referenceNumber}
              {purchase.hasReturns && (
                <span className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className="text-orange-600 border-orange-600"
                  >
                    <RotateCcw className="mr-1 h-3 w-3" />
                    Has Returns
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    (
                    {purchase.items?.reduce(
                      (s, i) => s + (i.returnedQuantity ?? 0),
                      0
                    )}
                    )
                  </span>
                </span>
              )}
            </h1>
            <p className="text-sm text-muted-foreground">
              Purchase Order Details
            </p>
          </div>
        </div>
        {canManage && purchase.status === "PENDING" && (
          <Button onClick={() => setShowReceiveDialog(true)}>
            Mark as Received
          </Button>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Purchase Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Purchase Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Status</span>
              <Badge variant={statusBadgeVariant(purchase.status)}>
                {purchase.status}
              </Badge>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">
                Reference Number
              </span>
              <span className="text-sm font-medium">
                {purchase.referenceNumber}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Order Date</span>
              <span className="text-sm font-medium">
                {format(new Date(purchase.orderDate), "MMM dd, yyyy")}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">
                Total Amount
              </span>
              <span className="text-sm font-medium">
                {formatCurrency(purchase.totalAmount)}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Supplier Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Supplier Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">
                Supplier Name
              </span>
              <span className="text-sm font-medium">
                {purchase.supplier?.name || "N/A"}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Line Items */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Line Items
          </CardTitle>
          <CardDescription>
            Products included in this purchase order
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="p-3 text-left text-sm font-medium">Product</th>
                  <th className="p-3 text-left text-sm font-medium">SKU</th>
                  <th className="p-3 text-right text-sm font-medium">
                    Quantity
                  </th>
                  <th className="p-3 text-right text-sm font-medium">
                    Returned
                  </th>
                  <th className="p-3 text-right text-sm font-medium">
                    Unit Cost
                  </th>
                  <th className="p-3 text-right text-sm font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {purchase.items && purchase.items.length > 0 ? (
                  purchase.items.map((item) => (
                    <tr key={item.id} className="border-b last:border-0">
                      <td className="p-3 text-sm">
                        {item.product?.name || "N/A"}
                      </td>
                      <td className="p-3 text-sm text-muted-foreground">
                        {item.product?.sku || "-"}
                      </td>
                      <td className="p-3 text-sm text-right">
                        {item.quantity}
                      </td>
                      <td className="p-3 text-sm text-right">
                        {item.returnedQuantity > 0 && (
                          <span className="text-orange-600 font-medium">
                            {item.returnedQuantity}
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-sm text-right">
                        {formatCurrency(item.unitCost)}
                      </td>
                      <td className="p-3 text-sm text-right font-medium">
                        {formatCurrency(item.quantity * item.unitCost)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={6}
                      className="p-6 text-center text-sm text-muted-foreground"
                    >
                      No items found
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr className="border-t bg-muted/50 font-medium">
                  <td colSpan={5} className="p-3 text-right text-sm">
                    Total:
                  </td>
                  <td className="p-3 text-right text-sm">
                    {formatCurrency(purchase.totalAmount)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>

      <ReceivePurchaseDialog
        open={showReceiveDialog}
        onOpenChange={setShowReceiveDialog}
        onConfirm={handleReceiveConfirm}
        purchaseReference={purchase.referenceNumber}
      />
    </div>
  );
}
