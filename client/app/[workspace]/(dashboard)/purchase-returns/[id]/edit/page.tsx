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
import { useReturnsApi, type PurchaseReturn } from "@/hooks/use-returns-api";
import { useToast } from "@/hooks/use-toast";
import { useWarehouses } from "@/hooks/use-warehouses";
import { useAllProducts } from "@/hooks/use-products";
import { useSuppliersApi } from "@/hooks/use-suppliers-api";

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

export default function EditPurchaseReturnPage() {
  const params = useParams();
  const router = useRouter();
  const ws = useWorkspace();
  const { toast } = useToast();
  const { getPurchaseReturn, updatePurchaseReturn } = useReturnsApi();
  const { warehouses } = useWarehouses();
  const { products } = useAllProducts();
  const { getSuppliers } = useSuppliersApi();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pr, setPr] = useState<PurchaseReturn | null>(null);
  const [suppliers, setSuppliers] = useState<Array<{ id: string; name: string }>>([]);

  const [formData, setFormData] = useState({
    warehouseId: "", supplierId: "", reason: "",
    status: "PENDING" as "PENDING" | "PROCESSING" | "COMPLETED" | "CANCELLED",
  });

  const [items, setItems] = useState<ItemRow[]>([]);
  const id = String(params.id);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const [data, suppRes] = await Promise.all([
          getPurchaseReturn(id),
          getSuppliers().catch(() => []),
        ]);
        if (!mounted) return;
        setPr(data);
        setFormData({ warehouseId: data.warehouseId, supplierId: data.supplierId, reason: data.reason || "", status: data.status });
        setItems(data.items.map((item) => ({
          id: item.id, productId: item.productId, quantity: item.quantity,
          unitPrice: Number(item.unitPrice), total: Number(item.quantity) * Number(item.unitPrice),
        })));
        const sList = Array.isArray(suppRes) ? suppRes : [];
        setSuppliers(sList.map((s: any) => ({ id: s.id, name: s.name })));
      } catch (e: any) {
        if (!mounted) return;
        setError(e?.message || "Failed to load purchase return");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [id, getPurchaseReturn, getSuppliers]);

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
    if (!pr) return;
    try {
      setSaving(true);
      await updatePurchaseReturn(pr.id, {
        warehouseId: formData.warehouseId, reason: formData.reason || undefined,
        status: formData.status, supplierId: formData.supplierId,
        items: items.map((item) => ({ productId: item.productId, quantity: item.quantity, unitPrice: item.unitPrice })),
      });
      toast({ title: "Purchase return updated successfully" });
      router.push(`/${ws}/purchase-returns/${pr.id}`);
    } catch (e: any) {
      toast({ title: "Failed to update", description: e?.message || "Unknown error", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <PageLoadingSkeleton />;

  if (error || !pr) {
    return (
      <div className="space-y-5">
        <div className="flex items-center gap-1 text-sm text-muted-foreground mb-0.5">
          <Link href="/dashboard" className="hover:text-foreground transition-colors">Dashboard</Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <Link href="/purchase-returns" className="hover:text-foreground transition-colors">Purchase Returns</Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-foreground">Edit Purchase Return</span>
        </div>
        <div className="border rounded-[5px] bg-card shadow-sm py-12 text-center text-muted-foreground">
          <Package className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
          <p className="font-medium">Purchase return not found</p>
          <Link href="/purchase-returns"><Button variant="outline" size="sm" className="mt-4 h-[34px] rounded-[5px] text-[13px]">Back to purchase returns</Button></Link>
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
        <Link href="/purchase-returns" className="hover:text-foreground transition-colors">Purchase Returns</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link href={`/purchase-returns/${pr.id}`} className="hover:text-foreground transition-colors">{pr.referenceNumber}</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground">Edit</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href={`/purchase-returns/${pr.id}`} className="flex items-center justify-center h-8 w-8 rounded-[5px] border hover:bg-accent transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-[18px] font-bold text-foreground">Edit Purchase Return</h1>
              <Badge variant="outline" className="font-medium text-xs">{pr.referenceNumber}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">{pr.supplier?.name || "Supplier Return"}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/purchase-returns/${pr.id}`}>
            <Button type="button" variant="outline" size="sm" className="h-[34px] rounded-[5px] text-[13px]" disabled={saving}>Cancel</Button>
          </Link>
          <Button type="submit" form="edit-purchase-return-form" disabled={saving} size="sm" className="h-[34px] rounded-[5px] bg-[#ff9025] hover:bg-[#ff9025]/90 text-white text-[13px] font-medium px-3 gap-1.5">
            {saving ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving...</> : <><Save className="h-3.5 w-3.5" /> Save Changes</>}
          </Button>
        </div>
      </div>

      <form id="edit-purchase-return-form" onSubmit={handleSubmit} className="grid gap-5 lg:grid-cols-[1fr_320px]">
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
                  <Input value={pr.referenceNumber} disabled className="h-[34px] rounded-[5px] text-sm" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Date</Label>
                  <Input type="date" value={pr.returnDate.split("T")[0]} disabled className="h-[34px] rounded-[5px] text-sm" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Return Type</Label>
                  <Badge variant="outline" className="h-[34px] w-full rounded-[5px] text-sm font-normal justify-start px-3 border-emerald-200 bg-emerald-50 text-emerald-700">Supplier Return</Badge>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
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
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Supplier</Label>
                  <Select value={formData.supplierId} onValueChange={(v) => setFormData({ ...formData, supplierId: v })}>
                    <SelectTrigger className="h-[34px] rounded-[5px] text-sm">
                      <SelectValue placeholder="Select supplier" />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
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
                <span className="font-semibold">Supplier Return</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Supplier</span>
                <span className="font-semibold">{pr.supplier?.name || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Line Items</span>
                <span className="font-semibold">{items.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Warehouse</span>
                <span className="font-semibold">{pr.warehouse?.name || "—"}</span>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
