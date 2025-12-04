"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  ArrowLeft,
  Plus,
  Trash2,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useWarehouses } from "@/hooks/use-warehouses";
import { useAllProducts } from "@/hooks/use-products";
import { useSuppliersApi } from "@/hooks/use-suppliers-api";
import { useReturnsApi } from "@/hooks/use-returns-api";
import { useSalesApi } from "@/hooks/use-sales-api";
import { usePurchasesApi } from "@/hooks/use-purchases-api";
import { useToast } from "@/hooks/use-toast";

type ItemRow = {
  id: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  maxQuantity?: number; // For reference-based returns
  saleItemId?: string;
  purchaseOrderItemId?: string;
};

function useSuppliersList() {
  const { getSuppliers } = useSuppliersApi();
  const [suppliers, setSuppliers] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = (await getSuppliers({ limit: 1000 })) as any;
        const list = Array.isArray(res)
          ? res
          : Array.isArray(res?.suppliers)
          ? res.suppliers
          : [];
        if (mounted) {
          setSuppliers(list.map((s: any) => ({ id: s.id, name: s.name })));
        }
      } catch (e: any) {
        setError(e?.message || "Failed to load suppliers");
      } finally {
        setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [getSuppliers]);

  return { suppliers, loading, error };
}

export default function NewReturnPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { warehouses, loading: whLoading } = useWarehouses();
  const { products, loading: prodLoading } = useAllProducts();
  const { suppliers, loading: suppLoading } = useSuppliersList();
  const { createSalesReturn, createPurchaseReturn } = useReturnsApi();
  const { getSales, getSale } = useSalesApi();
  const { list: listPurchases, getById: getPurchase } = usePurchasesApi();

  const [tab, setTab] = useState<"customer" | "supplier">("customer");

  // Form validation and submission state
  const [submitting, setSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<{
    customer?: string;
    supplier?: string;
  }>({});

  // Clear errors when switching tabs
  const handleTabChange = (newTab: "customer" | "supplier") => {
    setTab(newTab);
    setFormErrors({});
  };

  // Customer Return State
  const [selectedSaleId, setSelectedSaleId] = useState<string>("");
  const [sales, setSales] = useState<any[]>([]);
  const [loadingSales, setLoadingSales] = useState(false);

  const [customerForm, setCustomerForm] = useState({
    warehouseId: "",
    reason: "",
    saleId: "",
    items: [
      {
        id: crypto.randomUUID(),
        productId: "",
        quantity: 1,
        unitPrice: 0,
        saleItemId: undefined as string | undefined,
        maxQuantity: undefined as number | undefined,
      },
    ] as ItemRow[],
  });

  // Supplier Return State
  const [selectedPurchaseId, setSelectedPurchaseId] = useState<string>("");
  const [purchases, setPurchases] = useState<any[]>([]);
  const [loadingPurchases, setLoadingPurchases] = useState(false);

  const [supplierForm, setSupplierForm] = useState({
    warehouseId: "",
    supplierId: "",
    reason: "",
    purchaseOrderId: "",
    items: [
      {
        id: crypto.randomUUID(),
        productId: "",
        quantity: 1,
        unitPrice: 0,
        purchaseOrderItemId: undefined as string | undefined,
        maxQuantity: undefined as number | undefined,
      },
    ] as ItemRow[],
  });

  // Load sales when customer tab is active
  // Only load sales that are PAID and delivered (client-side delivered check)
  useEffect(() => {
    if (tab === "customer") {
      setLoadingSales(true);
      getSales({ limit: 100, paymentStatus: "PAID" })
        .then((res) => {
          const list = res?.sales || [];
          // Filter for delivered sales. The sale object may expose different
          // delivery indicators depending on backend shape. We check a few
          // possible fields safely.
          const deliveredOnly = list.filter((s: any) => {
            const isPaid = s.paymentStatus === "PAID";
            const isDelivered =
              s.status === "DELIVERED" ||
              s.deliveryStatus === "DELIVERED" ||
              Boolean(s.isDelivered) ||
              (Array.isArray(s.deliveries) &&
                s.deliveries.some((d: any) => d.status === "DELIVERED"));
            return isPaid && isDelivered;
          });
          setSales(deliveredOnly);
        })
        .catch((err) => console.error("Failed to load sales:", err))
        .finally(() => setLoadingSales(false));
    }
  }, [tab]); // Removed getSales from dependencies to prevent re-fetching

  // Load purchases when supplier tab is active
  useEffect(() => {
    if (tab === "supplier") {
      setLoadingPurchases(true);
      listPurchases()
        .then((res) => {
          const list = res || [];
          // Only allow referencing purchase orders that have been received (COMPLETED)
          const received = list.filter((p: any) => p.status === "COMPLETED");
          setPurchases(received);
        })
        .catch((err) => console.error("Failed to load purchases:", err))
        .finally(() => setLoadingPurchases(false));
    }
  }, [tab]); // Removed listPurchases from dependencies to prevent infinite loop

  // Handle sale selection
  const handleSaleSelect = async (saleId: string) => {
    if (!saleId || saleId === "__manual__") {
      setSelectedSaleId("");
      setCustomerForm({
        warehouseId: "",
        reason: "",
        saleId: "",
        items: [
          {
            id: crypto.randomUUID(),
            productId: "",
            quantity: 1,
            unitPrice: 0,
          },
        ],
      });
      return;
    }

    setSelectedSaleId(saleId);
    try {
      const sale = await getSale(saleId);
      setCustomerForm({
        warehouseId: sale.warehouseId || sale.warehouse?.id || "",
        reason: `Return for sale ${sale.invoiceNumber}`,
        saleId: sale.id,
        items: sale.items.map((item) => ({
          id: crypto.randomUUID(),
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: Number(item.unitPrice),
          saleItemId: item.id,
          maxQuantity: item.quantity,
        })),
      });
    } catch (err) {
      console.error("Failed to load sale details:", err);
      toast({
        title: "Error",
        description: "Failed to load sale details",
        variant: "destructive",
      });
    }
  };

  // Handle purchase selection
  const handlePurchaseSelect = async (purchaseId: string) => {
    if (!purchaseId || purchaseId === "__manual__") {
      setSelectedPurchaseId("");
      setSupplierForm({
        warehouseId: "",
        supplierId: "",
        reason: "",
        purchaseOrderId: "",
        items: [
          {
            id: crypto.randomUUID(),
            productId: "",
            quantity: 1,
            unitPrice: 0,
          },
        ],
      });
      return;
    }

    setSelectedPurchaseId(purchaseId);
    try {
      const purchase = await getPurchase(purchaseId);
      setSupplierForm({
        warehouseId:
          purchase.warehouse?.id || (purchase as any).warehouseId || "",
        supplierId: purchase.supplier.id,
        reason: `Return for purchase ${purchase.referenceNumber}`,
        purchaseOrderId: purchase.id,
        items:
          purchase.items?.map((item) => ({
            id: crypto.randomUUID(),
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: Number(item.unitCost),
            purchaseOrderItemId: item.id,
            maxQuantity: item.quantity,
          })) || [],
      });
    } catch (err) {
      console.error("Failed to load purchase details:", err);
      toast({
        title: "Error",
        description: "Failed to load purchase details",
        variant: "destructive",
      });
    }
  };

  const productsById = useMemo(() => {
    const map = new Map<string, any>();
    for (const p of products) map.set(p.id, p);
    return map;
  }, [products]);

  const customerTotal = useMemo(
    () =>
      customerForm.items.reduce(
        (sum, it) =>
          sum + (Number(it.unitPrice) || 0) * (Number(it.quantity) || 0),
        0
      ),
    [customerForm.items]
  );
  const supplierTotal = useMemo(
    () =>
      supplierForm.items.reduce(
        (sum, it) =>
          sum + (Number(it.unitPrice) || 0) * (Number(it.quantity) || 0),
        0
      ),
    [supplierForm.items]
  );

  const addItem = (kind: "customer" | "supplier") => {
    const row: ItemRow = {
      id: crypto.randomUUID(),
      productId: "",
      quantity: 1,
      unitPrice: 0,
    };
    if (kind === "customer")
      setCustomerForm((f) => ({ ...f, items: [...f.items, row] }));
    else setSupplierForm((f) => ({ ...f, items: [...f.items, row] }));
  };

  const removeItem = (kind: "customer" | "supplier", id: string) => {
    if (kind === "customer")
      setCustomerForm((f) => ({
        ...f,
        items: f.items.filter((i) => i.id !== id),
      }));
    else
      setSupplierForm((f) => ({
        ...f,
        items: f.items.filter((i) => i.id !== id),
      }));
  };

  const updateItem = (
    kind: "customer" | "supplier",
    id: string,
    patch: Partial<ItemRow>
  ) => {
    const up = (items: ItemRow[]) =>
      items.map((i) => (i.id === id ? { ...i, ...patch } : i));
    if (kind === "customer")
      setCustomerForm((f) => ({ ...f, items: up(f.items) }));
    else setSupplierForm((f) => ({ ...f, items: up(f.items) }));
  };

  const onProductSelected = (
    kind: "customer" | "supplier",
    id: string,
    productId: string
  ) => {
    const p = productsById.get(productId);
    const defaultPrice =
      kind === "customer"
        ? Number(p?.salePrice ?? 0)
        : Number(p?.costPrice ?? 0);
    updateItem(kind, id, { productId, unitPrice: defaultPrice });
  };

  const handleCreateCustomer = async () => {
    // Clear previous errors
    setFormErrors({});

    // Validate form
    if (!customerForm.warehouseId) {
      setFormErrors({ customer: "Please select a warehouse" });
      return;
    }

    const items = customerForm.items
      .filter((it) => it.productId && it.quantity > 0)
      .map((it) => ({
        productId: it.productId,
        quantity: it.quantity,
        unitPrice: Number(it.unitPrice),
        saleItemId: it.saleItemId,
      }));

    if (!items.length) {
      setFormErrors({
        customer: "Please add at least one item with quantity > 0",
      });
      return;
    }

    // Check for invalid quantities (exceeding max for reference-based returns)
    const invalidItems = customerForm.items.filter(
      (it) => it.maxQuantity && it.quantity > it.maxQuantity
    );
    if (invalidItems.length > 0) {
      setFormErrors({
        customer: `Some items exceed the maximum returnable quantity from the selected sale`,
      });
      return;
    }

    try {
      setSubmitting(true);
      await createSalesReturn({
        warehouseId: customerForm.warehouseId,
        saleId: customerForm.saleId || undefined,
        reason: customerForm.reason || undefined,
        items,
      });
      toast({ title: "Customer return created successfully" });
      router.push("/returns");
    } catch (e: any) {
      toast({
        title: "Failed to create return",
        description: e?.message || "Unknown error",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateSupplier = async () => {
    // Clear previous errors
    setFormErrors({});

    // Validate form
    if (!supplierForm.warehouseId) {
      setFormErrors({ supplier: "Please select a warehouse" });
      return;
    }

    if (!supplierForm.supplierId) {
      setFormErrors({ supplier: "Please select a supplier" });
      return;
    }

    const items = supplierForm.items
      .filter((it) => it.productId && it.quantity > 0)
      .map((it) => ({
        productId: it.productId,
        quantity: it.quantity,
        unitPrice: Number(it.unitPrice),
        purchaseOrderItemId: it.purchaseOrderItemId,
      }));

    if (!items.length) {
      setFormErrors({
        supplier: "Please add at least one item with quantity > 0",
      });
      return;
    }

    // Check for invalid quantities (exceeding max for reference-based returns)
    const invalidItems = supplierForm.items.filter(
      (it) => it.maxQuantity && it.quantity > it.maxQuantity
    );
    if (invalidItems.length > 0) {
      setFormErrors({
        supplier: `Some items exceed the maximum returnable quantity from the selected purchase`,
      });
      return;
    }

    try {
      setSubmitting(true);
      await createPurchaseReturn({
        warehouseId: supplierForm.warehouseId,
        supplierId: supplierForm.supplierId,
        purchaseOrderId: supplierForm.purchaseOrderId || undefined,
        reason: supplierForm.reason || undefined,
        items,
      });
      toast({ title: "Supplier return created successfully" });
      router.push("/returns");
    } catch (e: any) {
      toast({
        title: "Failed to create return",
        description: e?.message || "Unknown error",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const disabled =
    whLoading || prodLoading || (tab === "supplier" && suppLoading);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-2">
        <Link href="/returns">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">New Return</h1>
          <p className="text-sm text-muted-foreground">
            Create a customer or supplier return
          </p>
        </div>
      </div>

      <Tabs
        value={tab}
        onValueChange={(v) => handleTabChange(v as any)}
        className="max-w-5xl"
      >
        <TabsList>
          <TabsTrigger value="customer" className="gap-2">
            <TrendingDown className="h-4 w-4 text-red-600" /> Customer Return
          </TabsTrigger>
          <TabsTrigger value="supplier" className="gap-2">
            <TrendingUp className="h-4 w-4 text-emerald-600" /> Supplier Return
          </TabsTrigger>
        </TabsList>

        {/* Customer Return */}
        <TabsContent value="customer">
          <Card>
            <CardHeader>
              <CardTitle>Customer Return</CardTitle>
              <CardDescription>Add items back to inventory</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Reference Selection */}
              <div className="flex flex-col gap-2 p-4 bg-muted/50 rounded-lg">
                <Label>Select Existing Sale (Optional)</Label>
                <Select
                  value={selectedSaleId}
                  onValueChange={handleSaleSelect}
                  disabled={disabled || loadingSales}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        loadingSales
                          ? "Loading sales..."
                          : "Manual entry or select sale"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    <SelectItem value="__manual__">
                      Manual Entry (No Reference)
                    </SelectItem>
                    {sales.map((sale) => (
                      <SelectItem key={sale.id} value={sale.id}>
                        {sale.invoiceNumber} -{" "}
                        {sale.customerName || "Unknown Customer"} -{" "}
                        {new Date(sale.saleDate).toLocaleDateString()} - $
                        {Number(sale.totalAmount).toFixed(2)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedSaleId && (
                  <p className="text-xs text-muted-foreground">
                    ✓ Loaded from sale. You can adjust quantities below.
                  </p>
                )}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <Label>Warehouse</Label>
                  <Select
                    value={customerForm.warehouseId}
                    onValueChange={(v) =>
                      setCustomerForm((f) => ({ ...f, warehouseId: v }))
                    }
                    disabled={disabled}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select warehouse" />
                    </SelectTrigger>
                    <SelectContent>
                      {warehouses.map((w) => (
                        <SelectItem key={w.id} value={w.id}>
                          {w.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Reason</Label>
                  <Input
                    placeholder="Optional reason"
                    value={customerForm.reason}
                    onChange={(e) =>
                      setCustomerForm((f) => ({ ...f, reason: e.target.value }))
                    }
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">Items</h3>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => addItem("customer")}
                  >
                    <Plus className="h-4 w-4 mr-1" /> Add item
                  </Button>
                </div>

                {customerForm.items.map((it) => (
                  <div
                    key={it.id}
                    className="grid gap-3 md:grid-cols-12 items-end border rounded-md p-3"
                  >
                    <div className="md:col-span-6 flex flex-col gap-2">
                      <Label>Product</Label>
                      <Select
                        value={it.productId}
                        onValueChange={(v) =>
                          onProductSelected("customer", it.id, v)
                        }
                        disabled={disabled}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select product" />
                        </SelectTrigger>
                        <SelectContent className="max-h-72">
                          {products.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="md:col-span-2 flex flex-col gap-2">
                      <Label>
                        Qty
                        {it.maxQuantity && (
                          <span className="text-xs text-muted-foreground ml-1">
                            (max: {it.maxQuantity})
                          </span>
                        )}
                      </Label>
                      <Input
                        type="number"
                        min={1}
                        max={it.maxQuantity}
                        value={it.quantity}
                        className={
                          it.maxQuantity && it.quantity > it.maxQuantity
                            ? "border-red-500"
                            : ""
                        }
                        onChange={(e) => {
                          const val = Number(e.target.value) || 1;
                          const maxVal = it.maxQuantity || Infinity;
                          updateItem("customer", it.id, {
                            quantity: Math.max(1, Math.min(val, maxVal)),
                          });
                        }}
                      />
                    </div>
                    <div className="md:col-span-2 flex flex-col gap-2">
                      <Label>Unit Price</Label>
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        value={it.unitPrice}
                        onChange={(e) =>
                          updateItem("customer", it.id, {
                            unitPrice: Math.max(0, Number(e.target.value) || 0),
                          })
                        }
                      />
                    </div>
                    <div className="md:col-span-2 flex items-center justify-between gap-2">
                      <div className="text-sm text-muted-foreground">
                        {(
                          Number(it.unitPrice) * Number(it.quantity) || 0
                        ).toFixed(2)}
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => removeItem("customer", it.id)}
                        disabled={customerForm.items.length <= 1}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}

                <div className="flex justify-end text-sm text-muted-foreground">
                  <div>Total: ${customerTotal.toFixed(2)}</div>
                </div>
              </div>

              {formErrors.customer && (
                <Alert variant="destructive">
                  <AlertDescription>{formErrors.customer}</AlertDescription>
                </Alert>
              )}

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => router.push("/returns")}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateCustomer}
                  disabled={disabled || submitting}
                >
                  {submitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Creating...
                    </>
                  ) : (
                    "Create Return"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Supplier Return */}
        <TabsContent value="supplier">
          <Card>
            <CardHeader>
              <CardTitle>Supplier Return</CardTitle>
              <CardDescription>Send items back to supplier</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Reference Selection */}
              <div className="flex flex-col gap-2 p-4 bg-muted/50 rounded-lg">
                <Label>Select Existing Purchase (Optional)</Label>
                <Select
                  value={selectedPurchaseId}
                  onValueChange={handlePurchaseSelect}
                  disabled={disabled || loadingPurchases}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        loadingPurchases
                          ? "Loading purchases..."
                          : "Manual entry or select purchase"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    <SelectItem value="__manual__">
                      Manual Entry (No Reference)
                    </SelectItem>
                    {purchases.map((purchase) => (
                      <SelectItem key={purchase.id} value={purchase.id}>
                        {purchase.referenceNumber} -{" "}
                        {purchase.supplier?.name || "Unknown Supplier"} -{" "}
                        {new Date(purchase.orderDate).toLocaleDateString()} - $
                        {Number(purchase.totalAmount).toFixed(2)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedPurchaseId && (
                  <p className="text-xs text-muted-foreground">
                    ✓ Loaded from purchase. You can adjust quantities below.
                  </p>
                )}
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="flex flex-col gap-2">
                  <Label>Warehouse</Label>
                  <Select
                    value={supplierForm.warehouseId}
                    onValueChange={(v) =>
                      setSupplierForm((f) => ({ ...f, warehouseId: v }))
                    }
                    disabled={disabled}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select warehouse" />
                    </SelectTrigger>
                    <SelectContent>
                      {warehouses.map((w) => (
                        <SelectItem key={w.id} value={w.id}>
                          {w.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Supplier</Label>
                  <Select
                    value={supplierForm.supplierId}
                    onValueChange={(v) =>
                      setSupplierForm((f) => ({ ...f, supplierId: v }))
                    }
                    disabled={disabled || !!selectedPurchaseId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select supplier" />
                    </SelectTrigger>
                    <SelectContent className="max-h-72">
                      {suppliers.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Reason</Label>
                  <Input
                    placeholder="Optional reason"
                    value={supplierForm.reason}
                    onChange={(e) =>
                      setSupplierForm((f) => ({ ...f, reason: e.target.value }))
                    }
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">Items</h3>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => addItem("supplier")}
                  >
                    <Plus className="h-4 w-4 mr-1" /> Add item
                  </Button>
                </div>

                {supplierForm.items.map((it) => (
                  <div
                    key={it.id}
                    className="grid gap-3 md:grid-cols-12 items-end border rounded-md p-3"
                  >
                    <div className="md:col-span-6 flex flex-col gap-2">
                      <Label>Product</Label>
                      <Select
                        value={it.productId}
                        onValueChange={(v) =>
                          onProductSelected("supplier", it.id, v)
                        }
                        disabled={disabled}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select product" />
                        </SelectTrigger>
                        <SelectContent className="max-h-72">
                          {products.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="md:col-span-2 flex flex-col gap-2">
                      <Label>
                        Qty
                        {it.maxQuantity && (
                          <span className="text-xs text-muted-foreground ml-1">
                            (max: {it.maxQuantity})
                          </span>
                        )}
                      </Label>
                      <Input
                        type="number"
                        min={1}
                        max={it.maxQuantity}
                        value={it.quantity}
                        className={
                          it.maxQuantity && it.quantity > it.maxQuantity
                            ? "border-red-500"
                            : ""
                        }
                        onChange={(e) => {
                          const val = Number(e.target.value) || 1;
                          const maxVal = it.maxQuantity || Infinity;
                          updateItem("supplier", it.id, {
                            quantity: Math.max(1, Math.min(val, maxVal)),
                          });
                        }}
                      />
                    </div>
                    <div className="md:col-span-2 flex flex-col gap-2">
                      <Label>Unit Price</Label>
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        value={it.unitPrice}
                        onChange={(e) =>
                          updateItem("supplier", it.id, {
                            unitPrice: Math.max(0, Number(e.target.value) || 0),
                          })
                        }
                      />
                    </div>
                    <div className="md:col-span-2 flex items-center justify-between gap-2">
                      <div className="text-sm text-muted-foreground">
                        {(
                          Number(it.unitPrice) * Number(it.quantity) || 0
                        ).toFixed(2)}
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => removeItem("supplier", it.id)}
                        disabled={supplierForm.items.length <= 1}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}

                <div className="flex justify-end text-sm text-muted-foreground">
                  <div>Total: ${supplierTotal.toFixed(2)}</div>
                </div>
              </div>

              {formErrors.supplier && (
                <Alert variant="destructive">
                  <AlertDescription>{formErrors.supplier}</AlertDescription>
                </Alert>
              )}

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => router.push("/returns")}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateSupplier}
                  disabled={disabled || submitting}
                >
                  {submitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Creating...
                    </>
                  ) : (
                    "Create Return"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
