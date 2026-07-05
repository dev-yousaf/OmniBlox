"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { WorkspaceLink as Link } from "@/components/workspace-link";
import { useRouter, useSearchParams } from "next/navigation";
import { useWorkspace } from "@/hooks/use-workspace";
import {
  ArrowLeft, ChevronRight, Loader2, Plus, Save, Trash2,
} from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useWarehouses } from "@/hooks/use-warehouses";
import { useAllProducts } from "@/hooks/use-products";
import { useReturnsApi } from "@/hooks/use-returns-api";
import { useSalesApi } from "@/hooks/use-sales-api";
import { useToast } from "@/hooks/use-toast";

type ItemRow = {
  id: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  maxQuantity?: number;
  saleItemId?: string;
};

export default function NewSalesReturnPage() {
  const router = useRouter();
  const ws = useWorkspace();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const initialAutoFillDone = useRef(false);
  const { warehouses, loading: whLoading } = useWarehouses();
  const { products, loading: prodLoading } = useAllProducts();
  const { createSalesReturn } = useReturnsApi();
  const { getSales, getSale } = useSalesApi();

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [selectedSaleId, setSelectedSaleId] = useState("");
  const [sales, setSales] = useState<any[]>([]);
  const [loadingSales, setLoadingSales] = useState(false);

  const [formData, setFormData] = useState({
    warehouseId: "",
    reason: "",
    saleId: "",
    items: [{ id: crypto.randomUUID(), productId: "", quantity: 1, unitPrice: 0 }] as ItemRow[],
  });

  useEffect(() => {
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
            (Array.isArray(s.deliveries) && s.deliveries.some((d: any) => d.status === "DELIVERED"));
          return isPaid && isDelivered;
        });
        setSales(deliveredOnly);
      })
      .catch((err) => console.error("Failed to load sales:", err))
      .finally(() => setLoadingSales(false));
  }, []);

  useEffect(() => {
    const saleIdFromUrl = searchParams.get("saleId");
    if (saleIdFromUrl && !initialAutoFillDone.current) {
      initialAutoFillDone.current = true;
      setSelectedSaleId(saleIdFromUrl);
      getSale(saleIdFromUrl)
        .then((sale: any) => {
          setFormData({
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
        })
        .catch((err: any) => {
          toast({ title: "Error", description: "Failed to load sale details", variant: "destructive" });
        });
    }
  }, [searchParams, getSale, toast]);

  const handleSaleSelect = async (saleId: string) => {
    if (!saleId || saleId === "__manual__") {
      setSelectedSaleId("");
      setFormData({ warehouseId: "", reason: "", saleId: "", items: [{ id: crypto.randomUUID(), productId: "", quantity: 1, unitPrice: 0 }] });
      return;
    }
    setSelectedSaleId(saleId);
    try {
      const sale = await getSale(saleId);
      setFormData({
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
      toast({ title: "Error", description: "Failed to load sale details", variant: "destructive" });
    }
  };

  const productsById = useMemo(() => {
    const map = new Map<string, any>();
    for (const p of products) map.set(p.id, p);
    return map;
  }, [products]);

  const currencyFormatter = useMemo(
    () => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }), []
  );

  const total = useMemo(
    () => formData.items.reduce((sum, it) => sum + (Number(it.unitPrice) || 0) * (Number(it.quantity) || 0), 0),
    [formData.items]
  );

  const addItem = () => {
    setFormData((f) => ({ ...f, items: [...f.items, { id: crypto.randomUUID(), productId: "", quantity: 1, unitPrice: 0 }] }));
  };

  const removeItem = (id: string) => {
    setFormData((f) => ({ ...f, items: f.items.filter((i) => i.id !== id) }));
  };

  const updateItem = (id: string, patch: Partial<ItemRow>) => {
    setFormData((f) => ({ ...f, items: f.items.map((i) => (i.id === id ? { ...i, ...patch } : i)) }));
  };

  const onProductSelected = (id: string, productId: string) => {
    const p = productsById.get(productId);
    const defaultPrice = Number(p?.salePrice ?? 0);
    updateItem(id, { productId, unitPrice: defaultPrice });
  };

  const handleSubmit = async () => {
    setFormError(null);
    if (!formData.warehouseId) { setFormError("Please select a warehouse"); return; }
    const items = formData.items.filter((it) => it.productId && it.quantity > 0).map((it) => ({
      productId: it.productId, quantity: it.quantity, unitPrice: Number(it.unitPrice), saleItemId: it.saleItemId,
    }));
    if (!items.length) { setFormError("Please add at least one item with quantity > 0"); return; }
    const invalidItems = formData.items.filter((it) => it.maxQuantity && it.quantity > it.maxQuantity);
    if (invalidItems.length > 0) { setFormError("Some items exceed the maximum returnable quantity from the selected sale"); return; }
    try {
      setSubmitting(true);
      await createSalesReturn({ warehouseId: formData.warehouseId, saleId: formData.saleId || undefined, reason: formData.reason || undefined, items });
      toast({ title: "Sales return created successfully" });
      router.push(`/${ws}/sales-returns`);
    } catch (e: any) {
      toast({ title: "Failed to create return", description: e?.message || "Unknown error", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const disabled = whLoading || prodLoading;

  return (
    <div className="space-y-5">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1 text-sm text-muted-foreground mb-0.5">
        <Link href="/dashboard" className="hover:text-foreground transition-colors">Dashboard</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link href="/sales-returns" className="hover:text-foreground transition-colors">Sales Returns</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground">New Sales Return</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/sales-returns" className="flex items-center justify-center h-8 w-8 rounded-[5px] border hover:bg-accent transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-[18px] font-bold text-foreground">New Sales Return</h1>
            <p className="text-sm text-muted-foreground">Create a customer return</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/sales-returns">
            <Button type="button" variant="outline" size="sm" className="h-[34px] rounded-[5px] text-[13px]">Cancel</Button>
          </Link>
          <Button type="button" onClick={handleSubmit} disabled={disabled || submitting} size="sm" className="h-[34px] rounded-[5px] bg-[#ff9025] hover:bg-[#ff9025]/90 text-white text-[13px] font-medium px-3 gap-1.5">
            {submitting ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Creating...</> : <><Save className="h-3.5 w-3.5" /> Create Return</>}
          </Button>
        </div>
      </div>

      {formError && (
        <Alert variant="destructive">
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        {/* Left */}
        <div className="space-y-5">
          {/* Sale Reference */}
          <div className="border rounded-[5px] bg-card shadow-sm">
            <div className="px-5 py-[15px] border-b">
              <h2 className="text-sm font-semibold text-foreground">Sale Reference</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Optionally reference an existing sale to auto-fill items</p>
            </div>
            <div className="p-5 space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-medium">Select Existing Sale</Label>
                <Select value={selectedSaleId} onValueChange={handleSaleSelect} disabled={disabled || loadingSales}>
                  <SelectTrigger className="h-[34px] rounded-[5px] text-sm">
                    <SelectValue placeholder={loadingSales ? "Loading sales..." : "Manual entry or select sale"} />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    <SelectItem value="__manual__">Manual Entry (No Reference)</SelectItem>
                    {sales.map((sale) => (
                      <SelectItem key={sale.id} value={sale.id}>{sale.invoiceNumber} - {sale.customerName || "Unknown Customer"}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedSaleId && <p className="text-xs text-muted-foreground">✓ Loaded from sale. You can adjust quantities below.</p>}
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Warehouse *</Label>
                  <Select value={formData.warehouseId} onValueChange={(v) => setFormData((f) => ({ ...f, warehouseId: v }))} disabled={disabled}>
                    <SelectTrigger className="h-[34px] rounded-[5px] text-sm">
                      <SelectValue placeholder="Select warehouse" />
                    </SelectTrigger>
                    <SelectContent>
                      {warehouses.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Reason</Label>
                  <Input placeholder="Optional reason" value={formData.reason} onChange={(e) => setFormData((f) => ({ ...f, reason: e.target.value }))} className="h-[34px] rounded-[5px] text-sm" />
                </div>
              </div>
            </div>
          </div>

          {/* Return Items */}
          <div className="border rounded-[5px] bg-card shadow-sm">
            <div className="px-5 py-[15px] border-b">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-foreground">Return Items</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Products being returned by the customer</p>
                </div>
                <Button type="button" size="sm" className="h-[34px] rounded-[5px] text-[13px] gap-1.5" onClick={addItem}>
                  <Plus className="h-3.5 w-3.5" /> Add Item
                </Button>
              </div>
            </div>
            <div className="p-5">
              {formData.items.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">No items added yet. Click "Add Item" to start.</p>
              ) : (
                <div className="space-y-3">
                  {formData.items.map((it) => (
                    <div key={it.id} className="flex items-start justify-between gap-4 border rounded-[5px] p-4">
                      <div className="flex-1 grid gap-4 md:grid-cols-4">
                        <div className="space-y-2">
                          <Label className="text-xs font-medium">Product</Label>
                          <Select value={it.productId} onValueChange={(v) => onProductSelected(it.id, v)} disabled={disabled}>
                            <SelectTrigger className="h-[34px] rounded-[5px] text-sm">
                              <SelectValue placeholder="Select product" />
                            </SelectTrigger>
                            <SelectContent className="max-h-72">
                              {products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs font-medium">Qty {it.maxQuantity && <span className="text-xs text-muted-foreground ml-1">(max: {it.maxQuantity})</span>}</Label>
                          <Input type="number" min={1} max={it.maxQuantity} value={it.quantity}
                            className={`h-[34px] rounded-[5px] text-sm ${it.maxQuantity && it.quantity > it.maxQuantity ? "border-red-500" : ""}`}
                            onChange={(e) => { const val = Number(e.target.value) || 1; const maxVal = it.maxQuantity || Infinity; updateItem(it.id, { quantity: Math.max(1, Math.min(val, maxVal)) }); }}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs font-medium">Price</Label>
                          <Input type="number" min={0} step="0.01" value={it.unitPrice} onChange={(e) => updateItem(it.id, { unitPrice: Math.max(0, Number(e.target.value) || 0) })} className="h-[34px] rounded-[5px] text-sm" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs font-medium">Total</Label>
                          <Input value={currencyFormatter.format((Number(it.unitPrice) || 0) * (Number(it.quantity) || 0))} readOnly className="h-[34px] rounded-[5px] text-sm" />
                        </div>
                      </div>
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(it.id)} disabled={formData.items.length <= 1}
                        className="mt-6 h-[34px] w-[34px] rounded-[5px] text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Summary */}
        <div className="space-y-4">
          <div className="border rounded-[5px] bg-card shadow-sm p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4">Return Summary</h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Items</span>
                <span className="font-medium">{formData.items.reduce((sum, it) => sum + (Number(it.quantity) || 0), 0)} units</span>
              </div>
              <div className="flex justify-between border-t pt-3">
                <span className="font-semibold text-foreground">Total</span>
                <span className="text-xl font-bold tabular-nums">{currencyFormatter.format(total)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
