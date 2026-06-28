"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ChevronRight, Loader2, Plus, Save, Trash2, Package } from "lucide-react";

import { PageLoadingSkeleton } from "@/components/ui/page-loading-skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
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

interface ReturnItemRow {
  id: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

const STATUS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "PENDING", label: "Pending" },
  { value: "PROCESSING", label: "Processing" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
];

const createItemId = () =>
  typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : Date.now().toString();

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
        if (Array.isArray(res)) {
          setSuppliers(res as Array<{ id: string; name: string }>);
        } else if (res && Array.isArray((res as any).data)) {
          setSuppliers((res as any).data);
        } else {
          setSuppliers([]);
        }
      } catch (_e) {
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

  const [items, setItems] = useState<ReturnItemRow[]>([]);

  const id = String(params.id);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
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
              total: Number(item.quantity) * Number(item.unitPrice),
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
            total: Number(item.quantity) * Number(item.unitPrice),
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
        badgeVariant: "outline" as const,
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
        badgeVariant: "outline" as const,
        items: purchaseReturn.items,
        totalAmount: Number(purchaseReturn.totalAmount),
        sideLabel: "Supplier Return",
        entityLabel: purchaseReturn.supplier?.name,
      };
    }
    return null;
  }, [type, salesReturn, purchaseReturn]);

  const currencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
      }),
    []
  );

  const total = useMemo(
    () =>
      items.reduce(
        (sum, item) => sum + Number(item.quantity) * Number(item.unitPrice),
        0
      ),
    [items]
  );

  const itemUnits = useMemo(
    () =>
      items.reduce((sum, item) => sum + Number(item.quantity), 0),
    [items]
  );

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      {
        id: createItemId(),
        productId: "",
        quantity: 1,
        unitPrice: 0,
        total: 0,
      },
    ]);
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const updateItem = (id: string, field: keyof ReturnItemRow, value: unknown) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;

        const next = { ...item };

        if (field === "productId" && typeof value === "string") {
          next.productId = value;
        }

        if (field === "quantity" && typeof value === "number") {
          next.quantity = Math.max(1, Math.floor(value));
        }

        if (field === "unitPrice" && typeof value === "number") {
          next.unitPrice = Math.max(0, value);
        }

        next.total = Number(next.quantity) * Number(next.unitPrice);
        return next;
      })
    );
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
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
      <div className="space-y-5 p-6">
        <div className="flex items-center gap-1 text-sm text-muted-foreground mb-0.5">
          <Link href="/dashboard" className="hover:text-foreground transition-colors">Dashboard</Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <Link href="/returns" className="hover:text-foreground transition-colors">Returns</Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-foreground">Edit Return</span>
        </div>
        <div className="border rounded-[5px] bg-card shadow-sm py-12 text-center text-muted-foreground">
          <Package className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
          <p className="font-medium">Return not found</p>
          <p className="text-sm mt-1">
            {error || "We couldn't find a return with this id."}
          </p>
          <Link href="/returns">
            <Button variant="outline" size="sm" className="mt-4 h-[34px] rounded-[5px] text-[13px]">
              Back to returns
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1 text-sm text-muted-foreground mb-0.5">
        <Link href="/dashboard" className="hover:text-foreground transition-colors">Dashboard</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link href="/returns" className="hover:text-foreground transition-colors">Returns</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link href={`/returns/${data.id}`} className="hover:text-foreground transition-colors">{data.referenceNumber}</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground">Edit</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href={`/returns/${data.id}`}>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-[18px] font-bold text-foreground">Edit Return</h1>
              <Badge variant={data.badgeVariant} className="font-medium text-xs">
                {data.referenceNumber}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">{data.sideLabel}{data.entityLabel ? ` — ${data.entityLabel}` : ""}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/returns/${data.id}`}>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-[34px] rounded-[5px] text-[13px]"
              disabled={saving}
            >
              Cancel
            </Button>
          </Link>
          <Button
            type="submit"
            form="edit-return-form"
            disabled={saving}
            size="sm"
            className="h-[34px] rounded-[5px] text-[13px] gap-1.5"
          >
            {saving ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="h-3.5 w-3.5" />
                <span>Save Changes</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form id="edit-return-form" onSubmit={handleSubmit} className="grid gap-5 lg:grid-cols-[1fr_320px]">
        {/* Left Column */}
        <div className="space-y-5">
          {/* Return Information Card */}
          <Card className="border rounded-[5px] bg-card shadow-sm">
            <CardHeader className="px-5 py-[15px] border-b">
              <CardTitle className="text-sm font-semibold">Return Information</CardTitle>
              <CardDescription className="text-xs">Update the return details</CardDescription>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="reference" className="text-xs font-medium">Reference</Label>
                  <Input
                    id="reference"
                    value={data.referenceNumber}
                    disabled
                    className="h-[34px] rounded-[5px] text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date" className="text-xs font-medium">Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={data.returnDate.split("T")[0]}
                    disabled
                    className="h-[34px] rounded-[5px] text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Return Type</Label>
                  <Badge
                    variant="outline"
                    className="h-[34px] w-full rounded-[5px] text-sm font-normal justify-start px-3"
                  >
                    {data.sideLabel}
                  </Badge>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="warehouse" className="text-xs font-medium">Warehouse</Label>
                  <Select
                    value={formData.warehouseId}
                    onValueChange={(value) =>
                      setFormData({ ...formData, warehouseId: value })
                    }
                  >
                    <SelectTrigger id="warehouse" className="h-[34px] rounded-[5px] text-sm">
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
                <div className="space-y-2">
                  <Label htmlFor="status" className="text-xs font-medium">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value: any) =>
                      setFormData({ ...formData, status: value })
                    }
                  >
                    <SelectTrigger id="status" className="h-[34px] rounded-[5px] text-sm">
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
                {type === "supplier" && (
                  <div className="space-y-2">
                    <Label htmlFor="supplier" className="text-xs font-medium">Supplier</Label>
                    <Input
                      id="supplier"
                      value={data.entityLabel || ""}
                      disabled
                      className="h-[34px] rounded-[5px] text-sm"
                    />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="reason" className="text-xs font-medium">Reason</Label>
                <Textarea
                  id="reason"
                  value={formData.reason}
                  onChange={(e) =>
                    setFormData({ ...formData, reason: e.target.value })
                  }
                  rows={3}
                  placeholder="Optional reason for the return"
                  className="rounded-[5px] text-sm"
                />
              </div>
            </CardContent>
          </Card>

          {/* Returned Items Card */}
          <Card className="border rounded-[5px] bg-card shadow-sm">
            <CardHeader className="px-5 py-[15px] border-b">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-semibold">Return Items</CardTitle>
                  <CardDescription className="text-xs">Manage the products in this return</CardDescription>
                </div>
                <Button
                  type="button"
                  size="sm"
                  className="h-[34px] rounded-[5px] text-[13px] gap-1.5"
                  onClick={addItem}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Item
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-5">
              {items.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No items in this return. Click &quot;Add Item&quot; to add products.
                </p>
              ) : (
                <div className="space-y-3">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-start justify-between gap-4 border rounded-[5px] p-4"
                    >
                      <div className="flex-1 grid gap-4 md:grid-cols-4">
                        <div className="space-y-2">
                          <Label className="text-xs font-medium">Product</Label>
                          <Select
                            value={item.productId}
                            onValueChange={(value) =>
                              updateItem(item.id, "productId", value)
                            }
                          >
                            <SelectTrigger className="h-[34px] rounded-[5px] text-sm">
                              <SelectValue placeholder="Select product" />
                            </SelectTrigger>
                            <SelectContent>
                              {products.map((product) => (
                                <SelectItem key={product.id} value={product.id}>
                                  {product.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs font-medium">Qty</Label>
                          <Input
                            type="number"
                            min={1}
                            value={item.quantity}
                            onChange={(e) =>
                              updateItem(item.id, "quantity", Number(e.target.value) || 0)
                            }
                            className="h-[34px] rounded-[5px] text-sm"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs font-medium">Price</Label>
                          <Input
                            type="number"
                            min={0}
                            step="0.01"
                            value={item.unitPrice}
                            onChange={(e) =>
                              updateItem(item.id, "unitPrice", Number(e.target.value) || 0)
                            }
                            className="h-[34px] rounded-[5px] text-sm"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs font-medium">Total</Label>
                          <Input
                            value={currencyFormatter.format(item.total)}
                            readOnly
                            className="h-[34px] rounded-[5px] text-sm"
                          />
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeItem(item.id)}
                        className="mt-6 h-[34px] w-[34px] rounded-[5px] text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-4">
          <Card className="border rounded-[5px] bg-card shadow-sm p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4">Return Summary</h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Items</span>
                <span className="font-medium">{itemUnits} units</span>
              </div>
              <div className="flex justify-between border-t border-border pt-3">
                <span className="font-semibold text-foreground">Total</span>
                <span className="text-xl font-bold tabular-nums">
                  {currencyFormatter.format(total)}
                </span>
              </div>
            </div>
          </Card>

          <Card className="border rounded-[5px] bg-card shadow-sm p-5 space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Quick Stats</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Return Type</span>
                <span className="font-semibold">{data.sideLabel}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Line Items</span>
                <span className="font-semibold">{items.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Warehouse</span>
                <span className="font-semibold">{data.warehouse || "—"}</span>
              </div>
              {data.actor && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Created By</span>
                  <span className="font-semibold">{data.actor}</span>
                </div>
              )}
            </div>
          </Card>
        </div>
      </form>
    </div>
  );
}
