"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Plus, Save, Trash2, Loader2, ChevronRight, Search, Package, AlertCircle,
  ChevronLeft, History,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import { WorkspaceLink as Link } from "@/components/workspace-link";
import { useAllProducts } from "@/hooks/use-products";
import { useWarehouses } from "@/hooks/use-warehouses";
import { useStockAdjustmentService, type StockAdjustmentResponse } from "../_services/stock-adjustment-service";
import { useInventoryApi } from "@/hooks/use-inventory-api";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { useWorkspace } from "@/hooks/use-workspace";
import type { Product } from "@/lib/types";
import type { Warehouse } from "@/hooks/use-warehouses";

type AdjustmentItem = {
  id: string;
  productId: string;
  productName: string;
  productSku: string;
  productImage: string | null;
  warehouseId: string;
  warehouseName: string;
  previousQuantity: number;
  newQuantity: number;
};

export default function StockAdjustmentPage() {
  const router = useRouter();
  const ws = useWorkspace();
  const { toast } = useToast();
  const { user } = useAuth();
  const { products, loading: productsLoading } = useAllProducts();
  const { warehouses, loading: warehousesLoading } = useWarehouses();
  const { createStockAdjustment, getStockAdjustments } = useStockAdjustmentService();
  const inventoryApi = useInventoryApi();

  const [items, setItems] = useState<AdjustmentItem[]>([]);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [productSearch, setProductSearch] = useState("");

  const [adjustments, setAdjustments] = useState<StockAdjustmentResponse[]>([]);
  const [adjustmentsLoading, setAdjustmentsLoading] = useState(false);

  const canManage = user?.role === "OWNER" || user?.role === "ADMIN" || user?.role === "MANAGER";

  useEffect(() => {
    if (!canManage) router.push(`/${ws}/inventory`);
  }, [canManage, router]);

  const loadAdjustments = useCallback(async () => {
    try {
      setAdjustmentsLoading(true);
      const data = await getStockAdjustments();
      setAdjustments(data.slice(0, 20));
    } catch { /* silently fail */ } finally {
      setAdjustmentsLoading(false);
    }
  }, [getStockAdjustments]);

  useEffect(() => {
    loadAdjustments();
  }, [loadAdjustments]);

  const filteredProducts = useMemo(() => {
    if (!productSearch) return products.slice(0, 50);
    const q = productSearch.toLowerCase();
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.sku && p.sku.toLowerCase().includes(q))
    ).slice(0, 50);
  }, [products, productSearch]);

  const usedProductIds = useMemo(
    () => new Set(items.map((i) => i.productId)),
    [items]
  );

  const fetchCurrentStock = useCallback(
    async (productId: string, warehouseId: string): Promise<number> => {
      try {
        const inv = await inventoryApi.getProductInventory(productId);
        const found = inv.find((i) => i.warehouseId === warehouseId);
        return found?.quantity ?? 0;
      } catch {
        return 0;
      }
    },
    [inventoryApi]
  );

  const addItem = () => {
    const availableProducts = products.filter(
      (p) => !usedProductIds.has(p.id)
    );
    if (availableProducts.length === 0 || warehouses.length === 0) return;

    const firstProduct = availableProducts[0];
    const firstWarehouse = warehouses[0];

    setItems((prev) => [
      ...prev,
      {
        id: crypto.randomUUID?.() || Date.now().toString(),
        productId: firstProduct.id,
        productName: firstProduct.name,
        productSku: firstProduct.sku || "",
        productImage: firstProduct.imageUrl || null,
        warehouseId: firstWarehouse.id,
        warehouseName: firstWarehouse.name,
        previousQuantity: 0,
        newQuantity: 0,
      },
    ]);

    fetchCurrentStock(firstProduct.id, firstWarehouse.id).then((qty) => {
      setItems((prev) =>
        prev.map((item) =>
          item.productId === firstProduct.id && item.warehouseId === firstWarehouse.id
            ? { ...item, previousQuantity: qty }
            : item
        )
      );
    });
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const updateItemField = async (
    id: string,
    field: keyof AdjustmentItem,
    value: unknown
  ) => {
    const item = items.find((i) => i.id === id);
    if (!item) return;

    if (field === "productId") {
      const productId = value as string;
      const product = products.find((p) => p.id === productId);
      if (!product) return;

      const whId = item.warehouseId;
      const qty = await fetchCurrentStock(productId, whId);

      setItems((prev) =>
        prev.map((i) =>
          i.id === id
            ? {
                ...i,
                productId,
                productName: product.name,
                productSku: product.sku || "",
                productImage: product.imageUrl || null,
                previousQuantity: qty,
                newQuantity: qty,
              }
            : i
        )
      );
    } else if (field === "warehouseId") {
      const warehouseId = value as string;
      const warehouse = warehouses.find((w) => w.id === warehouseId);
      const qty = await fetchCurrentStock(item.productId, warehouseId);

      setItems((prev) =>
        prev.map((i) =>
          i.id === id
            ? {
                ...i,
                warehouseId,
                warehouseName: warehouse?.name || "",
                previousQuantity: qty,
                newQuantity: qty,
              }
            : i
        )
      );
    } else if (field === "newQuantity") {
      const parsed = Number(value);
      const newQty = Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
      setItems((prev) =>
        prev.map((i) => (i.id === id ? { ...i, newQuantity: newQty } : i))
      );
    }
  };

  const netChange = useMemo(
    () => items.reduce((sum, i) => sum + (i.newQuantity - i.previousQuantity), 0),
    [items]
  );

  const allFilled = items.length > 0 && items.every((i) => i.productId && i.warehouseId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allFilled) {
      setSubmitError("Please fill in all product and warehouse selections");
      return;
    }
    if (items.some((i) => i.newQuantity < 0)) {
      setSubmitError("Quantities cannot be negative");
      return;
    }

    setSaving(true);
    setSubmitError(null);

    // Auto-calculate adjustment type from net change
    const netChange = items.reduce(
      (sum, item) => sum + (item.newQuantity - item.previousQuantity),
      0,
    );
    const calcType = netChange >= 0 ? "ADDITION" : "REMOVAL";

    try {
      const result = await createStockAdjustment({
        notes: notes.trim() || undefined,
        type: calcType,
        items: items.map((item) => ({
          productId: item.productId,
          warehouseId: item.warehouseId,
          previousQuantity: item.previousQuantity,
          newQuantity: item.newQuantity,
        })),
      });

      toast({
        title: "Stock Adjustment Created",
        description: `Reference: ${result.referenceNumber} — ${result.totalItems} item(s) adjusted (net: ${result.netChange >= 0 ? "+" : ""}${result.netChange})`,
      });

      // Reset form and refresh adjustments list
      setItems([]);
      setNotes("");
      setProductSearch("");
      loadAdjustments();
    } catch (error: any) {
      setSubmitError(error?.message || "Failed to create stock adjustment");
    } finally {
      setSaving(false);
    }
  };

  if (!canManage) return null;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-1 text-sm text-muted-foreground mb-0.5">
            <Link href="/dashboard" className="hover:text-foreground transition-colors">Dashboard</Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <Link href="/inventory" className="hover:text-foreground transition-colors">Manage Stock</Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="text-foreground">Stock Adjustment</span>
          </div>
          <h1 className="text-[18px] font-bold text-foreground">Stock Adjustment</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
          {/* Main: Item Editor */}
          <div className="border rounded-[5px] bg-card shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-[15px] border-b">
              <div>
                <h2 className="text-sm font-semibold text-foreground">Adjustment Items</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Select products and set new stock quantities
                </p>
              </div>
              <Button
                type="button"
                onClick={addItem}
                size="sm"
                className="h-[34px] rounded-[5px] text-[13px]"
                disabled={products.length === 0 || warehouses.length === 0}
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" />Add Item
              </Button>
            </div>

            {submitError && (
              <div className="flex items-center gap-2 px-5 py-3 bg-destructive/10 text-destructive text-sm border-b">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {submitError}
              </div>
            )}

            {items.length === 0 ? (
              <div className="flex flex-col items-center py-16 text-muted-foreground">
                <Package className="h-12 w-12 mb-3 text-muted-foreground/50" />
                {products.length === 0 || warehouses.length === 0 ? (
                  <>
                    <p className="font-medium">Missing data</p>
                    <p className="text-sm mt-1">
                      {products.length === 0 && "No products found. "}
                      {warehouses.length === 0 && "No warehouses found. "}
                      Add them first before creating adjustments.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="font-medium">No items added yet</p>
                    <p className="text-sm mt-1">Click &quot;Add Item&quot; to start adjusting stock levels.</p>
                  </>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted h-[33px]">
                      <th className="w-[40px] px-3 py-2 text-left font-semibold text-foreground text-xs">#</th>
                      <th className="px-3 py-2 text-left font-semibold text-foreground text-xs min-w-[180px]">Product</th>
                      <th className="w-[150px] px-3 py-2 text-left font-semibold text-foreground text-xs">Warehouse</th>
                      <th className="w-[90px] px-3 py-2 text-right font-semibold text-foreground text-xs">Current</th>
                      <th className="w-[100px] px-3 py-2 text-right font-semibold text-foreground text-xs">New Qty</th>
                      <th className="w-[80px] px-3 py-2 text-right font-semibold text-foreground text-xs">Change</th>
                      <th className="w-[40px] px-3 py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, idx) => (
                      <tr key={item.id} className="h-[56px] border-b hover:bg-muted/30 transition-colors">
                        <td className="w-[40px] px-3 text-center text-muted-foreground text-xs">{idx + 1}</td>
                        <td className="px-3">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="bg-muted rounded-[5px] size-[30px] flex items-center justify-center overflow-hidden shrink-0">
                              {item.productImage ? (
                                <img
                                  src={item.productImage}
                                  alt=""
                                  className="size-full object-cover"
                                />
                              ) : (
                                <Package className="h-3.5 w-3.5 text-muted-foreground" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <ProductSelect
                                products={filteredProducts}
                                value={item.productId}
                                usedIds={usedProductIds}
                                search={productSearch}
                                onSearchChange={setProductSearch}
                                onChange={(pid) => updateItemField(item.id, "productId", pid)}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="px-3 w-[150px]">
                          <Select
                            value={item.warehouseId}
                            onValueChange={(v) => updateItemField(item.id, "warehouseId", v)}
                          >
                            <SelectTrigger className="h-[34px] text-xs rounded-[5px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {warehouses.map((wh) => (
                                <SelectItem key={wh.id} value={wh.id} className="text-xs">
                                  {wh.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-3 text-right">
                          <span className={`font-semibold tabular-nums text-sm ${item.previousQuantity === 0 ? "text-muted-foreground" : "text-foreground"}`}>
                            {item.previousQuantity}
                          </span>
                        </td>
                        <td className="px-3 w-[100px]">
                          <Input
                            type="number"
                            min={0}
                            value={item.newQuantity}
                            onChange={(e) => updateItemField(item.id, "newQuantity", e.target.value)}
                            className="h-[34px] text-sm text-right rounded-[5px] tabular-nums"
                          />
                        </td>
                        <td className="px-3 text-right">
                          <span
                            className={`font-semibold tabular-nums text-sm ${
                              item.newQuantity > item.previousQuantity
                                ? "text-emerald-600"
                                : item.newQuantity < item.previousQuantity
                                ? "text-destructive"
                                : "text-muted-foreground"
                            }`}
                          >
                            {item.newQuantity > item.previousQuantity ? "+" : ""}
                            {item.newQuantity - item.previousQuantity}
                          </span>
                        </td>
                        <td className="w-[40px] px-3">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            onClick={() => removeItem(item.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {items.length > 0 && (
              <div className="flex items-center justify-between px-5 py-[15px] border-t text-sm">
                <span className="text-muted-foreground">{items.length} item(s)</span>
                <span className="font-semibold">
                  Net change:{" "}
                  <span className={netChange > 0 ? "text-emerald-600" : netChange < 0 ? "text-destructive" : "text-muted-foreground"}>
                    {netChange >= 0 ? "+" : ""}{netChange}
                  </span>
                </span>
              </div>
            )}
          </div>

          {/* Sidebar: Summary & Controls */}
          <div className="space-y-4">
            <div className="border rounded-[5px] bg-card shadow-sm p-5 space-y-4">
              <div>
                <Label className="text-sm font-medium">Notes</Label>
                <Textarea
                  placeholder="Reason for adjustment..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                  className="mt-1.5 rounded-[5px] resize-none"
                />
              </div>
            </div>

            <div className="border rounded-[5px] bg-card shadow-sm p-5 space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Summary</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Items</span>
                  <span className="font-semibold">{items.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Type</span>
                  <span className="font-semibold">{netChange >= 0 ? "Stock In" : "Stock Out"}</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="text-muted-foreground">Net Change</span>
                  <span
                    className={`font-bold text-base ${
                      netChange > 0
                        ? "text-emerald-600"
                        : netChange < 0
                        ? "text-destructive"
                        : "text-muted-foreground"
                    }`}
                  >
                    {netChange >= 0 ? "+" : ""}{netChange}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Button
                type="submit"
                disabled={!allFilled || saving || items.length === 0}
                className="h-[38px] rounded-[5px] text-sm"
              >
                {saving ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
                ) : (
                  <><Save className="mr-2 h-4 w-4" /> Save Adjustment</>
                )}
              </Button>
              <Link href="/inventory">
                <Button type="button" variant="outline" className="w-full h-[38px] rounded-[5px] text-sm">
                  Cancel
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </form>

      {/* Recent Adjustments */}
      <div className="border rounded-[5px] bg-card shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-[15px] border-b">
          <History className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-foreground">Recent Adjustments</h2>
        </div>
        {adjustmentsLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : adjustments.length === 0 ? (
          <div className="flex flex-col items-center py-8 text-muted-foreground">
            <History className="h-10 w-10 mb-2 text-muted-foreground/50" />
            <p className="font-medium text-sm">No adjustments yet</p>
            <p className="text-xs mt-1">Stock adjustments will appear here once created.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted h-[33px]">
                  <th className="px-5 py-2 text-left font-semibold text-foreground text-xs">Reference</th>
                  <th className="px-5 py-2 text-left font-semibold text-foreground text-xs">Date</th>
                  <th className="px-5 py-2 text-left font-semibold text-foreground text-xs">Type</th>
                  <th className="px-5 py-2 text-left font-semibold text-foreground text-xs">Items</th>
                  <th className="px-5 py-2 text-left font-semibold text-foreground text-xs">Net Change</th>
                  <th className="px-5 py-2 text-left font-semibold text-foreground text-xs">By</th>
                  <th className="px-5 py-2 text-left font-semibold text-foreground text-xs">Notes</th>
                </tr>
              </thead>
              <tbody>
                {adjustments.map((adj) => (
                  <tr key={adj.id} className="h-[48px] border-b hover:bg-muted/30 transition-colors">
                    <td className="px-5 font-mono text-xs font-semibold text-foreground">{adj.referenceNumber}</td>
                    <td className="px-5 text-xs text-muted-foreground">
                      {new Date(adj.adjustmentDate).toLocaleDateString("en-US", {
                        day: "2-digit", month: "short", year: "numeric",
                      })}
                    </td>
                    <td className="px-5">
                      <Badge variant="outline" className={`font-medium text-xs ${
                        adj.type === "ADDITION"
                          ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                          : adj.type === "REMOVAL"
                          ? "bg-red-100 text-red-700 border-red-200"
                          : "bg-blue-100 text-blue-700 border-blue-200"
                      }`}>
                        {adj.type === "ADDITION" ? "Addition" : adj.type === "REMOVAL" ? "Removal" : adj.type}
                      </Badge>
                    </td>
                    <td className="px-5 text-sm font-medium">{adj.totalItems}</td>
                    <td className="px-5">
                      <span className={`font-semibold tabular-nums ${
                        adj.netChange > 0 ? "text-emerald-600" : adj.netChange < 0 ? "text-red-600" : "text-muted-foreground"
                      }`}>
                        {adj.netChange > 0 ? "+" : ""}{adj.netChange}
                      </span>
                    </td>
                    <td className="px-5 text-xs text-muted-foreground">{adj.userName || "—"}</td>
                    <td className="px-5 text-xs text-muted-foreground max-w-[200px] truncate">{adj.notes || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {adjustments.length > 0 && (
          <div className="flex items-center justify-end px-5 py-[15px] border-t">
            <div className="text-xs text-muted-foreground">Showing {adjustments.length} most recent adjustments</div>
          </div>
        )}
      </div>
    </div>
  );
}

function ProductSelect({
  products,
  value,
  usedIds,
  search,
  onSearchChange,
  onChange,
}: {
  products: Product[];
  value: string;
  usedIds: Set<string>;
  search: string;
  onSearchChange: (v: string) => void;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);

  const availableProducts = useMemo(
    () => products.filter((p) => p.id === value || !usedIds.has(p.id)),
    [products, value, usedIds]
  );

  const selected = products.find((p) => p.id === value);

  return (
    <Select value={value} onValueChange={onChange} open={open} onOpenChange={setOpen}>
      <SelectTrigger className="h-[34px] text-xs rounded-[5px] max-w-full">
        <SelectValue placeholder="Select product" />
      </SelectTrigger>
      <SelectContent className="min-w-[260px]">
        <div
          className="flex items-center gap-2 px-2 py-1.5 border-b"
          onKeyDown={(e) => e.stopPropagation()}
        >
          <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <input
            className="flex-1 bg-transparent text-sm outline-none"
            placeholder="Search products..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            autoFocus
          />
        </div>
        {availableProducts.length === 0 ? (
          <div className="px-2 py-4 text-center text-sm text-muted-foreground">No products found</div>
        ) : (
          <div className="max-h-[240px] overflow-y-auto">
            {availableProducts.map((product) => (
              <SelectItem key={product.id} value={product.id} className="text-xs py-1.5">
                <div className="flex items-center gap-2">
                  {product.imageUrl ? (
                    <img src={product.imageUrl} alt="" className="size-5 rounded object-cover bg-muted" />
                  ) : (
                    <div className="size-5 rounded bg-muted flex items-center justify-center">
                      <Package className="h-3 w-3 text-muted-foreground" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="truncate max-w-[160px]">{product.name}</p>
                    {product.sku && <p className="text-[10px] text-muted-foreground font-mono">{product.sku}</p>}
                  </div>
                </div>
              </SelectItem>
            ))}
          </div>
        )}
      </SelectContent>
    </Select>
  );
}
