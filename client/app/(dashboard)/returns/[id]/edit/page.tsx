"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { PageLoadingSkeleton } from "@/components/ui/page-loading-skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Plus, Trash2, Loader2 } from "lucide-react";
import {
  useReturnsApi,
  type SalesReturn,
  type PurchaseReturn,
} from "@/hooks/use-returns-api";
import { useToast } from "@/hooks/use-toast";
import { useWarehouses } from "@/hooks/use-warehouses";
import { useAllProducts } from "@/hooks/use-products";
import { useSuppliersApi } from "@/hooks/use-suppliers-api";

type ReturnType = "customer" | "supplier";

const statusConfig = {
  PENDING: "Pending",
  PROCESSING: "Processing",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export default function EditReturnPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const {
    getSalesReturn,
    getPurchaseReturn,
    updateSalesReturn,
    updatePurchaseReturn,
  } = useReturnsApi();

  const { warehouses } = useWarehouses();
  const { products } = useAllProducts();
  const { getSuppliers } = useSuppliersApi();
  const [suppliers, setSuppliers] = useState<
    Array<{ id: string; name: string }>
  >([]);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await getSuppliers();
        if (!mounted) return;
        // normalize response: some APIs return an array or a { data: [] } shape
        if (Array.isArray(res)) {
          setSuppliers(res as Array<{ id: string; name: string }>);
        } else if (res && Array.isArray((res as any).data)) {
          setSuppliers((res as any).data);
        } else {
          setSuppliers([]);
        }
      } catch (e) {
        // fail silently; suppliers list is optional for this form
        setSuppliers([]);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [getSuppliers]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [type, setType] = useState<ReturnType | null>(null);
  const [salesReturn, setSalesReturn] = useState<SalesReturn | null>(null);
  const [purchaseReturn, setPurchaseReturn] = useState<PurchaseReturn | null>(
    null
  );

  const [formData, setFormData] = useState({
    warehouseId: "",
    supplierId: "",
    reason: "",
    status: "PENDING" as "PENDING" | "PROCESSING" | "COMPLETED" | "CANCELLED",
  });

  const [items, setItems] = useState<
    Array<{
      id: string;
      productId: string;
      quantity: number;
      unitPrice: number;
    }>
  >([]);

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
          setFormData({
            warehouseId: sr.warehouseId,
            supplierId: "",
            reason: sr.reason || "",
            status: sr.status,
          });
          setItems(
            sr.items.map((item) => ({
              id: item.id,
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: Number(item.unitPrice),
            }))
          );
          return;
        } catch (_e) {
          // ignore and try purchase
        }
        const pr = await getPurchaseReturn(id);
        if (!mounted) return;
        setPurchaseReturn(pr);
        setType("supplier");
        setFormData({
          warehouseId: pr.warehouseId,
          supplierId: pr.supplierId,
          reason: pr.reason || "",
          status: pr.status,
        });
        setItems(
          pr.items.map((item) => ({
            id: item.id,
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: Number(item.unitPrice),
          }))
        );
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

  const addItem = () => {
    setItems([
      ...items,
      { id: Date.now().toString(), productId: "", quantity: 1, unitPrice: 0 },
    ]);
  };

  const removeItem = (id: string) => {
    setItems(items.filter((item) => item.id !== id));
  };

  const updateItem = (id: string, field: string, value: any) => {
    setItems(
      items.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data || !type) return;

    try {
      setSaving(true);
      const updateData = {
        warehouseId: formData.warehouseId,
        reason: formData.reason || undefined,
        status: formData.status,
        items: items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
        ...(type === "supplier" && { supplierId: formData.supplierId }),
      };

      if (type === "customer") {
        await updateSalesReturn(data.id, updateData);
      } else {
        await updatePurchaseReturn(data.id, updateData);
      }

      toast({ title: "Return updated successfully" });
      router.push(`/returns/${data.id}`);
    } catch (e: any) {
      toast({
        title: "Failed to update return",
        description: e?.message || "Unknown error",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <PageLoadingSkeleton />;
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
      <div className="flex items-center gap-4">
        <Link href={`/returns/${data.id}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Edit Return</h1>
          <p className="text-muted-foreground">
            Update {data.referenceNumber} details
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Return Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="reference">Reference</Label>
                <Input id="reference" value={data.referenceNumber} disabled />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={data.returnDate.split("T")[0]}
                  disabled
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Return Type</Label>
                <Input id="type" value={data.sideLabel} disabled />
              </div>
              <div className="space-y-2">
                <Label htmlFor="warehouse">Warehouse</Label>
                <Select
                  value={formData.warehouseId}
                  onValueChange={(value) =>
                    setFormData({ ...formData, warehouseId: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select warehouse" />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses.map((warehouse) => (
                      <SelectItem key={warehouse.id} value={warehouse.id}>
                        {warehouse.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {type === "supplier" && (
                <div className="space-y-2">
                  <Label htmlFor="supplier">Supplier</Label>
                  <Select
                    value={formData.supplierId}
                    onValueChange={(value) =>
                      setFormData({ ...formData, supplierId: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select supplier" />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.map(
                        (supplier: { id: string; name: string }) => (
                          <SelectItem key={supplier.id} value={supplier.id}>
                            {supplier.name}
                          </SelectItem>
                        )
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value: any) =>
                    setFormData({ ...formData, status: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="PROCESSING">Processing</SelectItem>
                    <SelectItem value="COMPLETED">Completed</SelectItem>
                    <SelectItem value="CANCELLED">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">Reason</Label>
              <Textarea
                id="reason"
                value={formData.reason}
                onChange={(e) =>
                  setFormData({ ...formData, reason: e.target.value })
                }
                rows={3}
                placeholder="Optional reason for the return"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Returned Items</CardTitle>
            <Button type="button" onClick={addItem} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex gap-4 items-end p-4 border rounded-lg"
              >
                <div className="flex-1 space-y-2">
                  <Label>Product</Label>
                  <Select
                    value={item.productId}
                    onValueChange={(value) =>
                      updateItem(item.id, "productId", value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select product" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.name} (SKU: {product.sku})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-24 space-y-2">
                  <Label>Quantity</Label>
                  <Input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) =>
                      updateItem(item.id, "quantity", Number(e.target.value))
                    }
                  />
                </div>
                <div className="w-32 space-y-2">
                  <Label>Unit Price</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.unitPrice}
                    onChange={(e) =>
                      updateItem(item.id, "unitPrice", Number(e.target.value))
                    }
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeItem(item.id)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}

            <div className="flex justify-end">
              <div className="w-64 space-y-2">
                <div className="flex justify-between text-lg font-semibold">
                  <span>Total Refund:</span>
                  <span>${calculateTotal().toFixed(2)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4 mt-4">
          <Link href={`/returns/${data.id}`}>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save Changes
          </Button>
        </div>
      </form>
    </div>
  );
}



