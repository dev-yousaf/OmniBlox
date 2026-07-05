"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { WorkspaceLink as Link } from "@/components/workspace-link";
import { ArrowLeft, Edit, Loader2, Package, Trash2, Truck } from "lucide-react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { useToast } from "@/hooks/use-toast";
import { useDeliveriesApi, type Delivery } from "@/hooks/use-deliveries-api";
import { useAuth } from "@/contexts/auth-context";
import { useWorkspace } from "@/hooks/use-workspace";

const STATUS_BADGE_MAP = {
  PENDING: { label: "Pending", variant: "secondary" as const },
  IN_TRANSIT: { label: "In Transit", variant: "default" as const },
  DELIVERED: { label: "Delivered", variant: "default" as const },
  CANCELLED: { label: "Cancelled", variant: "destructive" as const },
};

export default function DeliveryDetailPage() {
  const { user } = useAuth();
  const canManage = user?.role === "OWNER" || user?.role === "ADMIN" || user?.role === "MANAGER";
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const ws = useWorkspace();
  const { toast } = useToast();
  const deliveryId = params?.id ?? "";

  const { getDelivery, deleteDelivery } = useDeliveriesApi();

  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  useEffect(() => {
    if (!deliveryId) return;

    let mounted = true;

    const loadDelivery = async () => {
      setLoading(true);
      setError(null);

      try {
        const data = await getDelivery(deliveryId);
        if (mounted) {
          setDelivery(data);
        }
      } catch (err) {
        if (mounted) {
          const message =
            err instanceof Error ? err.message : "Failed to load delivery";
          setError(message);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadDelivery();

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deliveryId]);

  const handleDelete = async () => {
    if (!deliveryId) return;

    setDeleting(true);
    try {
      await deleteDelivery(deliveryId);
      toast({
        title: "Delivery deleted",
        description: "The delivery has been deleted successfully.",
      });
      router.push(`/${ws}/sales/deliveries`);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to delete delivery";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  if (!deliveryId) {
    return <div className="p-6">Delivery identifier is missing.</div>;
  }

  if (loading) {
    return <PageLoadingSkeleton />;
  }

  if (error || !delivery) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertDescription>{error || "Delivery not found"}</AlertDescription>
        </Alert>
      </div>
    );
  }

  const statusBadge = STATUS_BADGE_MAP[delivery.status] || {
    label: delivery.status,
    variant: "secondary" as const,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/sales/deliveries">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">
              Delivery Details
            </h1>
            <p className="text-sm text-muted-foreground">
              Invoice: {delivery.sale.invoiceNumber}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {canManage && (
            <>
              <Link href={`/sales/deliveries/${delivery.id}/edit`}>
                <Button size="sm" className="gap-2">
                  <Edit className="h-4 w-4" />
                  Edit
                </Button>
              </Link>
              <Button
                variant="destructive"
                size="sm"
                className="gap-2"
                onClick={() => setShowDeleteDialog(true)}
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Delivery Information</CardTitle>
                <CardDescription>Complete delivery details</CardDescription>
              </div>
              <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Status
                </p>
                <p className="text-sm font-medium">{statusBadge.label}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Tracking Number
                </p>
                <p className="text-sm font-mono">
                  {delivery.trackingNumber || "—"}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Dispatch Date
                </p>
                <p className="text-sm">
                  {delivery.dispatchDate
                    ? new Date(delivery.dispatchDate).toLocaleDateString()
                    : "—"}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Delivered Date
                </p>
                <p className="text-sm">
                  {delivery.deliveredDate
                    ? new Date(delivery.deliveredDate).toLocaleDateString()
                    : "—"}
                </p>
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">
                Delivery Address
              </p>
              <p className="text-sm whitespace-pre-wrap">
                {delivery.deliveryAddress || "—"}
              </p>
            </div>

            <div>
              <h3 className="mb-4 font-semibold">Order Items</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {delivery.sale.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">
                        {item.product.name}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {item.product.sku || "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        {item.quantity}
                      </TableCell>
                      <TableCell className="text-right">
                        ${Number(item.unitPrice).toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                Sale Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Invoice Number
                </p>
                <Link
                  href={`/sales/${delivery.sale.id}`}
                  className="text-sm font-mono underline"
                >
                  {delivery.sale.invoiceNumber}
                </Link>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Sale Date
                </p>
                <p className="text-sm">
                  {new Date(delivery.sale.saleDate).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Total Amount
                </p>
                <p className="text-2xl font-semibold">
                  ${Number(delivery.sale.totalAmount).toFixed(2)}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-4 w-4" />
                Customer Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Name
                </p>
                <p className="text-sm font-medium">
                  {delivery.sale.customer.name}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Email
                </p>
                <p className="text-sm">
                  {delivery.sale.customer.email ? (
                    <a
                      href={`mailto:${delivery.sale.customer.email}`}
                      className="underline"
                    >
                      {delivery.sale.customer.email}
                    </a>
                  ) : (
                    "—"
                  )}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Timeline</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Created
                </p>
                <p className="text-sm">
                  {new Date(delivery.createdAt).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Last Updated
                </p>
                <p className="text-sm">
                  {new Date(delivery.updatedAt).toLocaleString()}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this delivery record. This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}



