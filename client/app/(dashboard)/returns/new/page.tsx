"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ChevronRight,
  Loader2,
  Plus,
  Save,
  Trash2,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { Textarea } from "@/components/ui/textarea";
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
  maxQuantity?: number;
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
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { warehouses, loading: whLoading } = useWarehouses();
  const { products, loading: prodLoading } = useAllProducts();
  const { suppliers, loading: suppLoading } = useSuppliersList();
  const { createSalesReturn, createPurchaseReturn } = useReturnsApi();
  const { getSales, getSale } = useSalesApi();
  const { list: listPurchases, getById: getPurchase } = usePurchasesApi();

  const preselectedSaleId = searchParams?.get("saleId");

  const [tab, setTab] = useState<"customer" | "supplier">(
    preselectedSaleId ? "customer" : "customer"
  );

  const [submitting, setSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<{
    customer?: string;
    supplier?: string;
  }>({});

  const handleTabChange = (newTab: "customer" | "supplier") => {
    setTab(newTab);
    setFormErrors({});
  };

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

  useEffect(() => {
    if (tab === "customer") {
      setLoadingSales(true);
      getSales({ limit: 100, paymentStatus: "PAID" })
        .then((res) => {
          const list = res?.sales || [];
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
  }, [tab]);

  useEffect(() => {
    if (tab === "supplier") {
      setLoadingPurchases(true);
      listPurchases()
        .then((res) => {
          const list = res || [];
          const received = list.filter((p: any) => p.status === "COMPLETED");
          setPurchases(received);
        })
        .catch((err) => console.error("Failed to load purchases:", err))
        .finally(() => setLoadingPurchases(false));
    }
  }, [tab]);

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

  useEffect(() => {
    if (!preselectedSaleId || selectedSaleId) return;
    let cancelled = false;
    (async () => {
      try {
        const sale = await getSale(preselectedSaleId);
        if (cancelled || !sale) return;
        setSelectedSaleId(preselectedSaleId);
        setCustomerForm({
          warehouseId: sale.warehouseId || sale.warehouse?.id || "",
          reason: `Return for sale ${sale.invoiceNumber}`,
          saleId: sale.id,
          items: sale.items.map((item: any) => ({
            id: crypto.randomUUID(),
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: Number(item.unitPrice),
            saleItemId: item.id,
            maxQuantity: item.quantity,
          })),
        });
      } catch (err) {
        console.error("Failed to pre-fill sale:", err);
      }
    })();
    return () => { cancelled = true; };
  }, [preselectedSaleId, selectedSaleId, getSale]);

  const productsById = useMemo(() => {
    const map = new Map<string, any>();
    for (const p of products) map.set(p.id, p);
    return map;
  }, [products]);

  const currencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
      }),
    []
  );

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
    setFormErrors({});

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
    setFormErrors({});

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

  const handleCreateReturn = () => {
    if (tab === "customer") {
      handleCreateCustomer();
    } else {
      handleCreateSupplier();
    }
  };

  const disabled =
    whLoading || prodLoading || (tab === "supplier" && suppLoading);

  const currentItemCount = useMemo(() => {
    const items = tab === "customer" ? customerForm.items : supplierForm.items;
    return items.reduce((sum, it) => sum + (Number(it.quantity) || 0), 0);
  }, [tab, customerForm.items, supplierForm.items]);

  const currentTotal = tab === "customer" ? customerTotal : supplierTotal;

  return (
    <div className="space-y-5">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1 text-sm text-muted-foreground mb-0.5">
        <Link href="/dashboard" className="hover:text-foreground transition-colors">Dashboard</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link href="/returns" className="hover:text-foreground transition-colors">Returns</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground">New Return</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/returns">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-[18px] font-bold text-foreground">New Return</h1>
            <p className="text-sm text-muted-foreground">Create a customer or supplier return</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/returns">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-[34px] rounded-[5px] text-[13px]"
            >
              Cancel
            </Button>
          </Link>
          <Button
            type="button"
            onClick={handleCreateReturn}
            disabled={disabled || submitting}
            size="sm"
            className="h-[34px] rounded-[5px] text-[13px] gap-1.5"
          >
            {submitting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Creating...</span>
              </>
            ) : (
              <>
                <Save className="h-3.5 w-3.5" />
                <span>Create Return</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {tab === "customer" && formErrors.customer && (
        <Alert variant="destructive">
          <AlertDescription>{formErrors.customer}</AlertDescription>
        </Alert>
      )}
      {tab === "supplier" && formErrors.supplier && (
        <Alert variant="destructive">
          <AlertDescription>{formErrors.supplier}</AlertDescription>
        </Alert>
      )}

      <Tabs
        value={tab}
        onValueChange={(v) => handleTabChange(v as any)}
      >
        <TabsList>
          <TabsTrigger value="customer" className="gap-2">
            <TrendingDown className="h-4 w-4 text-red-600" /> Customer Return
          </TabsTrigger>
          <TabsTrigger value="supplier" className="gap-2">
            <TrendingUp className="h-4 w-4 text-emerald-600" /> Supplier Return
          </TabsTrigger>
        </TabsList>

        <TabsContent value="customer">
          <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
            {/* Left Column */}
            <div className="space-y-5">
              <Card className="border rounded-[5px] bg-card shadow-sm">
                <CardHeader className="px-5 py-[15px] border-b">
                  <CardTitle className="text-sm font-semibold">Sale Reference</CardTitle>
                  <CardDescription className="text-xs">
                    Optionally reference an existing sale to auto-fill items
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-5 space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Select Existing Sale</Label>
                    <Select
                      value={selectedSaleId}
                      onValueChange={handleSaleSelect}
                      disabled={disabled || loadingSales}
                    >
                      <SelectTrigger className="h-[34px] rounded-[5px] text-sm">
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
                            {sale.customerName || "Unknown Customer"}
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
                    <div className="space-y-2">
                      <Label className="text-xs font-medium">Warehouse</Label>
                      <Select
                        value={customerForm.warehouseId}
                        onValueChange={(v) =>
                          setCustomerForm((f) => ({ ...f, warehouseId: v }))
                        }
                        disabled={disabled}
                      >
                        <SelectTrigger className="h-[34px] rounded-[5px] text-sm">
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
                    <div className="space-y-2">
                      <Label className="text-xs font-medium">Reason</Label>
                      <Input
                        placeholder="Optional reason"
                        value={customerForm.reason}
                        onChange={(e) =>
                          setCustomerForm((f) => ({ ...f, reason: e.target.value }))
                        }
                        className="h-[34px] rounded-[5px] text-sm"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border rounded-[5px] bg-card shadow-sm">
                <CardHeader className="px-5 py-[15px] border-b">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-sm font-semibold">Return Items</CardTitle>
                      <CardDescription className="text-xs">
                        Products being returned by the customer
                      </CardDescription>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      className="h-[34px] rounded-[5px] text-[13px] gap-1.5"
                      onClick={() => addItem("customer")}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add Item
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-5">
                  {customerForm.items.length === 0 ? (
                    <p className="py-8 text-center text-sm text-muted-foreground">
                      No items added yet. Click &quot;Add Item&quot; to start.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {customerForm.items.map((it) => (
                        <div
                          key={it.id}
                          className="flex items-start justify-between gap-4 border rounded-[5px] p-4"
                        >
                          <div className="flex-1 grid gap-4 md:grid-cols-4">
                            <div className="space-y-2">
                              <Label className="text-xs font-medium">Product</Label>
                              <Select
                                value={it.productId}
                                onValueChange={(v) =>
                                  onProductSelected("customer", it.id, v)
                                }
                                disabled={disabled}
                              >
                                <SelectTrigger className="h-[34px] rounded-[5px] text-sm">
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
                            <div className="space-y-2">
                              <Label className="text-xs font-medium">
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
                                className={`h-[34px] rounded-[5px] text-sm ${
                                  it.maxQuantity && it.quantity > it.maxQuantity
                                    ? "border-red-500"
                                    : ""
                                }`}
                                onChange={(e) => {
                                  const val = Number(e.target.value) || 1;
                                  const maxVal = it.maxQuantity || Infinity;
                                  updateItem("customer", it.id, {
                                    quantity: Math.max(1, Math.min(val, maxVal)),
                                  });
                                }}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-xs font-medium">Price</Label>
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
                                className="h-[34px] rounded-[5px] text-sm"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-xs font-medium">Total</Label>
                              <Input
                                value={currencyFormatter.format(
                                  (Number(it.unitPrice) || 0) * (Number(it.quantity) || 0)
                                )}
                                readOnly
                                className="h-[34px] rounded-[5px] text-sm"
                              />
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeItem("customer", it.id)}
                            disabled={customerForm.items.length <= 1}
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
                    <span className="font-medium">{currentItemCount} units</span>
                  </div>
                  <div className="flex justify-between border-t border-border pt-3">
                    <span className="font-semibold text-foreground">Total</span>
                    <span className="text-xl font-bold tabular-nums">
                      {currencyFormatter.format(currentTotal)}
                    </span>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="supplier">
          <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
            {/* Left Column */}
            <div className="space-y-5">
              <Card className="border rounded-[5px] bg-card shadow-sm">
                <CardHeader className="px-5 py-[15px] border-b">
                  <CardTitle className="text-sm font-semibold">Purchase Reference</CardTitle>
                  <CardDescription className="text-xs">
                    Optionally reference an existing purchase to auto-fill items
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-5 space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Select Existing Purchase</Label>
                    <Select
                      value={selectedPurchaseId}
                      onValueChange={handlePurchaseSelect}
                      disabled={disabled || loadingPurchases}
                    >
                      <SelectTrigger className="h-[34px] rounded-[5px] text-sm">
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
                            {purchase.supplier?.name || "Unknown Supplier"}
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

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label className="text-xs font-medium">Warehouse</Label>
                      <Select
                        value={supplierForm.warehouseId}
                        onValueChange={(v) =>
                          setSupplierForm((f) => ({ ...f, warehouseId: v }))
                        }
                        disabled={disabled}
                      >
                        <SelectTrigger className="h-[34px] rounded-[5px] text-sm">
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
                    <div className="space-y-2">
                      <Label className="text-xs font-medium">Supplier</Label>
                      <Select
                        value={supplierForm.supplierId}
                        onValueChange={(v) =>
                          setSupplierForm((f) => ({ ...f, supplierId: v }))
                        }
                        disabled={disabled || !!selectedPurchaseId}
                      >
                        <SelectTrigger className="h-[34px] rounded-[5px] text-sm">
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
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Reason</Label>
                    <Input
                      placeholder="Optional reason"
                      value={supplierForm.reason}
                      onChange={(e) =>
                        setSupplierForm((f) => ({ ...f, reason: e.target.value }))
                      }
                      className="h-[34px] rounded-[5px] text-sm"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="border rounded-[5px] bg-card shadow-sm">
                <CardHeader className="px-5 py-[15px] border-b">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-sm font-semibold">Return Items</CardTitle>
                      <CardDescription className="text-xs">
                        Products being returned to the supplier
                      </CardDescription>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      className="h-[34px] rounded-[5px] text-[13px] gap-1.5"
                      onClick={() => addItem("supplier")}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add Item
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-5">
                  {supplierForm.items.length === 0 ? (
                    <p className="py-8 text-center text-sm text-muted-foreground">
                      No items added yet. Click &quot;Add Item&quot; to start.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {supplierForm.items.map((it) => (
                        <div
                          key={it.id}
                          className="flex items-start justify-between gap-4 border rounded-[5px] p-4"
                        >
                          <div className="flex-1 grid gap-4 md:grid-cols-4">
                            <div className="space-y-2">
                              <Label className="text-xs font-medium">Product</Label>
                              <Select
                                value={it.productId}
                                onValueChange={(v) =>
                                  onProductSelected("supplier", it.id, v)
                                }
                                disabled={disabled}
                              >
                                <SelectTrigger className="h-[34px] rounded-[5px] text-sm">
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
                            <div className="space-y-2">
                              <Label className="text-xs font-medium">
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
                                className={`h-[34px] rounded-[5px] text-sm ${
                                  it.maxQuantity && it.quantity > it.maxQuantity
                                    ? "border-red-500"
                                    : ""
                                }`}
                                onChange={(e) => {
                                  const val = Number(e.target.value) || 1;
                                  const maxVal = it.maxQuantity || Infinity;
                                  updateItem("supplier", it.id, {
                                    quantity: Math.max(1, Math.min(val, maxVal)),
                                  });
                                }}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-xs font-medium">Price</Label>
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
                                className="h-[34px] rounded-[5px] text-sm"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-xs font-medium">Total</Label>
                              <Input
                                value={currencyFormatter.format(
                                  (Number(it.unitPrice) || 0) * (Number(it.quantity) || 0)
                                )}
                                readOnly
                                className="h-[34px] rounded-[5px] text-sm"
                              />
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeItem("supplier", it.id)}
                            disabled={supplierForm.items.length <= 1}
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
                    <span className="font-medium">{currentItemCount} units</span>
                  </div>
                  <div className="flex justify-between border-t border-border pt-3">
                    <span className="font-semibold text-foreground">Total</span>
                    <span className="text-xl font-bold tabular-nums">
                      {currencyFormatter.format(currentTotal)}
                    </span>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
