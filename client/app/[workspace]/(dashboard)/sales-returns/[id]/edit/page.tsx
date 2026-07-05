"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
import { WorkspaceLink as Link } from "@/components/workspace-link";
import { useParams, useRouter } from "next/navigation";
import { useWorkspace } from "@/hooks/use-workspace";
import { ArrowLeft, ChevronRight, Loader2, Plus, Save, Trash2, Package } from "lucide-react";

import { PageLoadingSkeleton } from "@/components/ui/page-loading-skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useReturnsApi, type SalesReturn } from "@/hooks/use-returns-api";
import { useToast } from "@/hooks/use-toast";
import { useWarehouses } from "@/hooks/use-warehouses";
import { useAllProducts } from "@/hooks/use-products";

interface ItemRow {
  id: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

const STATUS_OPTIONS = [
  { value: "PENDING", label: "Pending" },
  { value: "PROCESSING", label: "Processing" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
];

export default function EditSalesReturnPage() {
  const params = useParams();
  const router = useRouter();
  const ws = useWorkspace();
  const { toast } = useToast();
  const { getSalesReturn, updateSalesReturn } = useReturnsApi();
  const { warehouses } = useWarehouses();
  const { products } = useAllProducts();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sr, setSr] = useState<SalesReturn | null>(null);

  const [formData, setFormData] = useState({
    warehouseId: "",
    reason: "",
    status: "PENDING" as "PENDING" | "PROCESSING" | "COMPLETED" | "CANCELLED",
  });

  const [items, setItems] = useState<ItemRow[]>([]);
  const id = String(params.id);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const data = await getSalesReturn(id);
        if (!mounted) return;
        setSr(data);
        setFormData({ warehouseId: data.warehouseId, reason: data.reason || "", status: data.status });
        setItems(data.items.map((item) => ({
          id: item.id, productId: item.productId, quantity: item.quantity,
          unitPrice: Number(item.unitPrice), total: Number(item.quantity) * Number(item.unitPrice),
        })));
      } catch (e: any) {
        if (!mounted) return;
        setError(e?.message || "Failed to load sales return");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [id, getSalesReturn]);

  const currencyFormatter = useMemo(
    () => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }), []
  );

  const total = useMemo(() => items.reduce((sum, item) => sum + Number(item.quantity) * Number(item.unitPrice), 0), [items]);
  const itemUnits = useMemo(() => items.reduce((sum, item) => sum + Number(item.quantity), 0), [items]);

  const addItem = () => {
    setItems((prev) => [...prev, { id: crypto.randomUUID(), productId: "", quantity: 1, unitPrice: 0, total: 0 }]);
  };

  const removeItem = (id: string) => setItems((prev) => prev.filter((item) => item.id !== id));

  const updateItem = (itemId: string, field: keyof ItemRow, value: unknown) => {
    setItems((prev) => prev.map((item) => {
      if (item.id !== itemId) return item;
      const next = { ...item };
      if (field === "productId" && typeof value === "string") next.productId = value;
      if (field === "quantity" && typeof value === "number") next.quantity = Math.max(1, Math.floor(value));
      if (field === "unitPrice" && typeof value === "number") next.unitPrice = Math.max(0, value);
      next.total = Number(next.quantity) * Number(next.unitPrice);
      return next;
    }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!sr) return;
    try {
      setSaving(true);
      await updateSalesReturn(sr.id, {
        warehouseId: formData.warehouseId, reason: formData.reason || undefined,
        status: formData.status, items: items.map((item) => ({ productId: item.productId, quantity: item.quantity, unitPrice: item.unitPrice })),
      });
      toast({ title: "Sales return updated successfully" });
      router.push(`/${ws}/sales-returns/${sr.id}`);
    } catch (e: any) {
      toast({ title: "Failed to update", description: e?.message || "Unknown error", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <PageLoadingSkeleton />;

  if (error || !sr) {
    return (
      <div className="space-y-5">
        <div className="flex items-center gap-1 text-sm text-muted-foreground mb-0.5">
          <Link href="/dashboard" className="hover:text-foreground transition-colors">Dashboard</Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <Link href="/sales-returns" className="hover:text-foreground transition-colors">Sales Returns</Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-foreground">Edit Sales Return</span>
        </div>
        <div className="border rounded-[5px] bg-card shadow-sm py-12 text-center text-muted-foreground">
          <Package className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
          <p className="font-medium">Sales return not found</p>
          <Link href="/sales-returns"><Button variant="outline" size="sm" className="mt-4 h-[34px] rounded-[5px] text-[13px]">Back to sales returns</Button></Link>
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
        <Link href="/sales-returns" className="hover:text-foreground transition-colors">Sales Returns</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link href={`/sales-returns/${sr.id}`} className="hover:text-foreground transition-colors">{sr.referenceNumber}</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground">Edit</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href={`/sales-returns/${sr.id}`} className="flex items-center justify-center h-8 w-8 rounded-[5px] border hover:bg-accent transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-[18px] font-bold text-foreground">Edit Sales Return</h1>
              <Badge variant="outline" className="font-medium text-xs">{sr.referenceNumber}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">Customer Return</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/sales-returns/${sr.id}`}>
            <Button type="button" variant="outline" size="sm" className="h-[34px] rounded-[5px] text-[13px]" disabled={saving}>Cancel</Button>
          </Link>
          <Button type="submit" form="edit-sales-return-form" disabled={saving} size="sm" className="h-[34px] rounded-[5px] bg-[#ff9025] hover:bg-[#ff9025]/90 text-white text-[13px] font-medium px-3 gap-1.5">
            {saving ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving...</> : <><Save className="h-3.5 w-3.5" /> Save Changes</>}
          </Button>
        </div>
      </div>

      <form id="edit-sales-return-form" onSubmit={handleSubmit} className="grid gap-5 lg:grid-cols-[1fr_320px]">
        {/* Left */}
        <div className="space-y-5">
          <div className="border rounded-[5px] bg-card shadow-sm">
            <div className="px-5 py-[15px] border-b">
              <h2 className="text-sm font-semibold text-foreground">Return Information</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Update the return details</p>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Reference</Label>
                  <Input value={sr.referenceNumber} disabled className="h-[34px] rounded-[5px] text-sm" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Date</Label>
                  <Input type="date" value={sr.returnDate.split("T")[0]} disabled className="h-[34px] rounded-[5px] text-sm" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Return Type</Label>
                  <Badge variant="outline" className="h-[34px] w-full rounded-[5px] text-sm font-normal justify-start px-3 border-red-200 bg-red-50 text-red-700">Customer Return</Badge>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Warehouse</Label>
                  <Select value={formData.warehouseId} onValueChange={(v) => setFormData({ ...formData, warehouseId: v })}>
                    <SelectTrigger className="h-[34px] rounded-[5px] text-sm">
                      <SelectValue placeholder="Select warehouse" />
                    </SelectTrigger>
                    <SelectContent>
                      {warehouses.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Status</Label>
                  <Select value={formData.status} onValueChange={(v: any) => setFormData({ ...formData, status: v })}>
                    <SelectTrigger className="h-[34px] rounded-[5px] text-sm">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((opt) => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium">Reason</Label>
                <Textarea value={formData.reason} onChange={(e) => setFormData({ ...formData, reason: e.target.value })} rows={3} placeholder="Optional reason" className="rounded-[5px] text-sm" />
              </div>
            </div>
          </div>

          <div className="border rounded-[5px] bg-card shadow-sm">
            <div className="px-5 py-[15px] border-b">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-foreground">Return Items</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Manage the products in this return</p>
                </div>
                <Button type="button" size="sm" className="h-[34px] rounded-[5px] text-[13px] gap-1.5" onClick={addItem}>
                  <Plus className="h-3.5 w-3.5" /> Add Item
                </Button>
              </div>
            </div>
            <div className="p-5">
              {items.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">No items in this return.</p>
              ) : (
                <div className="space-y-3">
                  {items.map((item) => (
                    <div key={item.id} className="flex items-start justify-between gap-4 border rounded-[5px] p-4">
                      <div className="flex-1 grid gap-4 md:grid-cols-4">
                        <div className="space-y-2">
                          <Label className="text-xs font-medium">Product</Label>
                          <Select value={item.productId} onValueChange={(v) => updateItem(item.id, "productId", v)}>
                            <SelectTrigger className="h-[34px] rounded-[5px] text-sm">
                              <SelectValue placeholder="Select product" />
                            </SelectTrigger>
                            <SelectContent>
                              {products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs font-medium">Qty</Label>
                          <Input type="number" min={1} value={item.quantity} onChange={(e) => updateItem(item.id, "quantity", Number(e.target.value) || 0)} className="h-[34px] rounded-[5px] text-sm" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs font-medium">Price</Label>
                          <Input type="number" min={0} step="0.01" value={item.unitPrice} onChange={(e) => updateItem(item.id, "unitPrice", Number(e.target.value) || 0)} className="h-[34px] rounded-[5px] text-sm" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs font-medium">Total</Label>
                          <Input value={currencyFormatter.format(item.total)} readOnly className="h-[34px] rounded-[5px] text-sm" />
                        </div>
                      </div>
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(item.id)} className="mt-6 h-[34px] w-[34px] rounded-[5px] text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right */}
        <div className="space-y-4">
          <div className="border rounded-[5px] bg-card shadow-sm p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4">Return Summary</h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Items</span>
                <span className="font-medium">{itemUnits} units</span>
              </div>
              <div className="flex justify-between border-t pt-3">
                <span className="font-semibold text-foreground">Total</span>
                <span className="text-xl font-bold tabular-nums">{currencyFormatter.format(total)}</span>
              </div>
            </div>
          </div>
          <div className="border rounded-[5px] bg-card shadow-sm p-5 space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Quick Stats</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Return Type</span>
                <span className="font-semibold">Customer Return</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Line Items</span>
                <span className="font-semibold">{items.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Warehouse</span>
                <span className="font-semibold">{sr.warehouse?.name || "—"}</span>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
