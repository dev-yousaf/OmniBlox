"use client";

import { type FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useWorkspace } from "@/hooks/use-workspace";
import { WorkspaceLink as Link } from "@/components/workspace-link";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import { PageLoadingSkeleton } from "@/components/ui/page-loading-skeleton";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import {
  useDeliveriesApi,
  type Delivery,
  type DeliveryStatus,
} from "@/hooks/use-deliveries-api";

const STATUS_OPTIONS: Array<{ value: DeliveryStatus; label: string }> = [
  { value: "PENDING", label: "Pending" },
  { value: "IN_TRANSIT", label: "In Transit" },
  { value: "DELIVERED", label: "Delivered" },
  { value: "CANCELLED", label: "Cancelled" },
];

export default function EditDeliveryPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const ws = useWorkspace();
  const { toast } = useToast();
  const deliveryId = params?.id ?? "";

  const { getDelivery, updateDelivery } = useDeliveriesApi();

  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    trackingNumber: "",
    deliveryAddress: "",
    status: "PENDING" as DeliveryStatus,
  });

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
          setFormData({
            trackingNumber: data.trackingNumber || "",
            deliveryAddress: data.deliveryAddress || "",
            status: data.status,
          });
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

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!deliveryId) return;

    setSaving(true);
    setError(null);

    try {
      await updateDelivery(deliveryId, {
        trackingNumber: formData.trackingNumber.trim() || undefined,
        deliveryAddress: formData.deliveryAddress.trim() || undefined,
        status: formData.status,
      });

      toast({
        title: "Delivery updated",
        description: "The delivery has been updated successfully.",
      });

      router.push(`/${ws}/sales/deliveries/${deliveryId}`);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to update delivery";
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  if (!deliveryId) {
    return <div className="p-6">Delivery identifier is missing.</div>;
  }

  if (loading) {
    return <PageLoadingSkeleton />;
  }

  if (!delivery) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertDescription>{error || "Delivery not found"}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/sales/deliveries/${deliveryId}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            Edit Delivery
          </h1>
          <p className="text-sm text-muted-foreground">
            Invoice: {delivery.sale.invoiceNumber}
          </p>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Delivery Information</CardTitle>
            <CardDescription>
              Update tracking, address, and status
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) =>
                  setFormData((prev) => ({
                    ...prev,
                    status: value as DeliveryStatus,
                  }))
                }
              >
                <SelectTrigger id="status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="trackingNumber">Tracking Number</Label>
              <Input
                id="trackingNumber"
                placeholder="Enter tracking number"
                value={formData.trackingNumber}
                onChange={(event) =>
                  setFormData((prev) => ({
                    ...prev,
                    trackingNumber: event.target.value,
                  }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="deliveryAddress">Delivery Address</Label>
              <Textarea
                id="deliveryAddress"
                placeholder="Enter delivery address"
                value={formData.deliveryAddress}
                onChange={(event) =>
                  setFormData((prev) => ({
                    ...prev,
                    deliveryAddress: event.target.value,
                  }))
                }
                rows={4}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sale Information</CardTitle>
            <CardDescription>Related sale details (read-only)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Invoice Number
                </p>
                <p className="text-sm font-mono">
                  {delivery.sale.invoiceNumber}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Customer
                </p>
                <p className="text-sm font-medium">
                  {delivery.sale.customer.name}
                </p>
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
                <p className="text-sm font-semibold">
                  ${Number(delivery.sale.totalAmount).toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-2">
          <Button type="submit" disabled={saving} className="gap-2">
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
          <Link href={`/sales/deliveries/${deliveryId}`}>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
        </div>
      </form>
    </div>
  );
}



