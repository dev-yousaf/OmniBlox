"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Plus, Save, Trash2, Loader2, ChevronRight, Search, Package, AlertCircle,
  ChevronLeft, ArrowRight, Warehouse as WarehouseIcon, Calendar,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { WorkspaceLink as Link } from "@/components/workspace-link";
import { useAllProducts } from "@/hooks/use-products";
import { useWarehouses } from "@/hooks/use-warehouses";
import { useInventoryApi, type StockAdjustment } from "@/hooks/use-inventory-api";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { useWorkspace } from "@/hooks/use-workspace";
import type { Product } from "@/lib/types";
import type { Warehouse } from "@/hooks/use-warehouses";

type TransferItem = {
  id: string;
  productId: string;
  productName: string;
  productSku: string;
  productImage: string | null;
  quantity: number;
  available: number;
};

const HISTORY_PAGE_SIZE = 10;

export default function StockTransferPage() {
  const router = useRouter();
  const ws = useWorkspace();
  const { toast } = useToast();
  const { user } = useAuth();
  const { products, loading: productsLoading } = useAllProducts();
  const { warehouses, loading: warehousesLoading } = useWarehouses();
  const {
    getWarehouseInventory,
    bulkTransferStock,
    getTransfers: getTransfersApi,
  } = useInventoryApi();

  const [items, setItems] = useState<TransferItem[]>([]);
  const [fromWarehouseId, setFromWarehouseId] = useState("");
  const [toWarehouseId, setToWarehouseId] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [warehouseAvailability, setWarehouseAvailability] = useState<Record<string, number>>({});

  // History state
  const [transfers, setTransfers] = useState<StockAdjustment[]>([]);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyPages, setHistoryPages] = useState(0);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyLoading, setHistoryLoading] = useState(false);

  const canManage = user?.role === "OWNER" || user?.role === "ADMIN" || user?.role === "MANAGER";

  useEffect(() => {
    if (!canManage) router.push(`/${ws}/${ws}/inventory`);
  }, [canManage, router]);

  const usedProductIds = useMemo(
    () => new Set(items.map((i) => i.productId)),
    [items]
  );

  // Load warehouse inventory map when warehouse changes
  useEffect(() => {
    if (!fromWarehouseId) {
      setWarehouseAvailability({});
      setItems((prev) => prev.map((i) => ({ ...i, available: 0, quantity: 0 })));
      return;
    }
    (async () => {
      try {
        const data = await getWarehouseInventory(fromWarehouseId);
        const map: Record<string, number> = {};
        for (const row of data.inventory || []) {
          map[row.productId] = row.quantity;
        }
        setWarehouseAvailability(map);
        setItems((prev) =>
          prev.map((i) => {
            const avail = map[i.productId] ?? 0;
            return { ...i, available: avail, quantity: Math.min(i.quantity, avail) };
          })
        );
      } catch {
        setWarehouseAvailability({});
        setItems((prev) => prev.map((i) => ({ ...i, available: 0, quantity: 0 })));
      }
    })();
  }, [fromWarehouseId, getWarehouseInventory]);

  // Load history
  const loadHistory = useCallback(async (page: number) => {
    try {
      setHistoryLoading(true);
      const data = await getTransfersApi(page, HISTORY_PAGE_SIZE);
      setTransfers(data.transfers);
      setHistoryTotal(data.total);
      setHistoryPages(data.pages);
    } catch {
      // silently fail
    } finally {
      setHistoryLoading(false);
    }
  }, [getTransfersApi]);

  useEffect(() => {
    loadHistory(historyPage);
  }, [historyPage, loadHistory]);

  const addItem = () => {
    const availableProducts = products.filter(
      (p) => !usedProductIds.has(p.id)
    );
    if (availableProducts.length === 0) return;

    const firstProduct = availableProducts[0];
    const avail = warehouseAvailability[firstProduct.id] ?? 0;

    setItems((prev) => [
      ...prev,
      {
        id: crypto.randomUUID?.() || Date.now().toString(),
        productId: firstProduct.id,
        productName: firstProduct.name,
        productSku: firstProduct.sku || "",
        productImage: firstProduct.imageUrl || null,
        quantity: avail > 0 ? 1 : 0,
        available: avail,
      },
    ]);
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const updateItemField = async (
    id: string,
    field: keyof TransferItem,
    value: unknown
  ) => {
    const item = items.find((i) => i.id === id);
    if (!item) return;

    if (field === "productId") {
      const productId = value as string;
      const product = products.find((p) => p.id === productId);
      if (!product) return;

      let avail = 0;
      if (fromWarehouseId) {
        try {
          const data = await getWarehouseInventory(fromWarehouseId);
          const found = data.inventory?.find((i) => i.productId === productId);
          avail = found?.quantity ?? 0;
        } catch {
          avail = 0;
        }
      }

      setItems((prev) =>
        prev.map((i) =>
          i.id === id
            ? {
                ...i,
                productId,
                productName: product.name,
                productSku: product.sku || "",
                productImage: product.imageUrl || null,
                available: avail,
                quantity: Math.min(1, avail),
              }
            : i
        )
      );
    } else if (field === "quantity") {
      const parsed = Number(value);
      const qty = Number.isFinite(parsed) ? Math.max(1, parsed) : 1;
      setItems((prev) =>
        prev.map((i) =>
          i.id === id
            ? { ...i, quantity: Math.min(qty, i.available || qty) }
            : i
        )
      );
    }
  };

  const totalQuantity = useMemo(
    () => items.reduce((sum, i) => sum + i.quantity, 0),
    [items]
  );

  const allFilled = items.length > 0
    && items.every((i) => i.productId && i.quantity > 0)
    && fromWarehouseId
    && toWarehouseId
    && fromWarehouseId !== toWarehouseId;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fromWarehouseId || !toWarehouseId) {
      setSubmitError("Please select both source and destination warehouses");
      return;
    }
    if (fromWarehouseId === toWarehouseId) {
      setSubmitError("Source and destination warehouses must be different");
      return;
    }
    if (items.length === 0 || !items.every((i) => i.productId && i.quantity > 0)) {
      setSubmitError("Please add at least one product with a valid quantity");
      return;
    }

    const insufficient = items.filter((i) => i.quantity > i.available);
    if (insufficient.length > 0) {
      setSubmitError(
        `Insufficient stock: ${insufficient.map((i) => i.productName).join(", ")}`
      );
      return;
    }

    setSaving(true);
    setSubmitError(null);

    try {
      const result = await bulkTransferStock({
        fromWarehouseId,
        toWarehouseId,
        notes: notes.trim() || undefined,
        items: items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
      });

      toast({
        title: "Stock Transfer Created",
        description: `Reference: ${result.referenceNumber} — ${items.length} item(s) transferred`,
      });

      router.push(`/${ws}/inventory/transfer/${result.id}`);
    } catch (error: any) {
      setSubmitError(error?.message || "Failed to create stock transfer");
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
            <span className="text-foreground">Stock Transfer</span>
          </div>
          <h1 className="text-[18px] font-bold text-foreground">Stock Transfer</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
          {/* Main: Item Editor */}
          <div className="border rounded-[5px] bg-card shadow-sm overflow-hidden">
            {/* Warehouse Selection */}
            <div className="border-b px-5 py-[15px]">
              <h2 className="text-sm font-semibold text-foreground mb-3">Transfer Between Warehouses</h2>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label className="text-xs font-medium">From Warehouse <span className="text-destructive">*</span></Label>
                  <Select value={fromWarehouseId} onValueChange={(v) => { setFromWarehouseId(v); if (v === toWarehouseId) setToWarehouseId(""); }}>
                    <SelectTrigger className="mt-1.5 h-[38px] rounded-[5px] text-sm">
                      <SelectValue placeholder="Select source warehouse" />
                    </SelectTrigger>
                    <SelectContent>
                      {warehouses.map((wh) => (
                        <SelectItem key={wh.id} value={wh.id} className="text-sm">
                          <div className="flex items-center gap-2">
                            <WarehouseIcon className="h-3.5 w-3.5 text-muted-foreground" />
                            {wh.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs font-medium">To Warehouse <span className="text-destructive">*</span></Label>
                  <Select
                    value={toWarehouseId}
                    onValueChange={setToWarehouseId}
                    disabled={!fromWarehouseId}
                  >
                    <SelectTrigger className="mt-1.5 h-[38px] rounded-[5px] text-sm">
                      <SelectValue placeholder={
                        !fromWarehouseId ? "Select source first" : "Select destination warehouse"
                      } />
                    </SelectTrigger>
                    <SelectContent>
                      {warehouses
                        .filter((wh) => wh.id !== fromWarehouseId)
                        .map((wh) => (
                          <SelectItem key={wh.id} value={wh.id} className="text-sm">
                            <div className="flex items-center gap-2">
                            <WarehouseIcon className="h-3.5 w-3.5 text-muted-foreground" />
                            {wh.name}
                            </div>
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Items Header */}
            <div className="flex items-center justify-between px-5 py-[15px] border-b">
              <div>
                <h2 className="text-sm font-semibold text-foreground">Transfer Items</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Select products and quantities to transfer
                </p>
              </div>
              <Button
                type="button"
                onClick={addItem}
                size="sm"
                className="h-[34px] rounded-[5px] text-[13px]"
                disabled={products.length === 0 || !fromWarehouseId}
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
                {!fromWarehouseId ? (
                  <>
                    <p className="font-medium">Select a source warehouse</p>
                    <p className="text-sm mt-1">Choose the source warehouse above, then add items to transfer.</p>
                  </>
                ) : products.length === 0 ? (
                  <>
                    <p className="font-medium">No products found</p>
                    <p className="text-sm mt-1">Add products first before creating a transfer.</p>
                  </>
                ) : (
                  <>
                    <p className="font-medium">No items added yet</p>
                    <p className="text-sm mt-1">Click &quot;Add Item&quot; to start adding products to transfer.</p>
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
                      <th className="w-[90px] px-3 py-2 text-right font-semibold text-foreground text-xs">Available</th>
                      <th className="w-[100px] px-3 py-2 text-right font-semibold text-foreground text-xs">Qty</th>
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
                                products={products}
                                value={item.productId}
                                usedIds={usedProductIds}
                                warehouseAvailability={warehouseAvailability}
                                fromWarehouseSelected={!!fromWarehouseId}
                                onChange={(pid) => updateItemField(item.id, "productId", pid)}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="px-3 text-right">
                          <span className={`font-semibold tabular-nums text-sm ${
                            item.available === 0 ? "text-destructive" : "text-foreground"
                          }`}>
                            {item.available}
                          </span>
                        </td>
                        <td className="px-3 w-[100px]">
                          <Input
                            type="number"
                            min={1}
                            max={item.available || 1}
                            value={item.quantity}
                            onChange={(e) => updateItemField(item.id, "quantity", e.target.value)}
                            className="h-[34px] text-sm text-right rounded-[5px] tabular-nums"
                          />
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
                  Total qty: <span className="text-foreground">{totalQuantity}</span>
                </span>
              </div>
            )}
          </div>

          {/* Sidebar: Summary & Controls */}
          <div className="space-y-4">
            <div className="border rounded-[5px] bg-card shadow-sm p-5 space-y-4">
              <div>
                <Label className="text-sm font-medium">Transfer Notes</Label>
                <Textarea
                  placeholder="Reason for transfer..."
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
                  <span className="text-muted-foreground">Total Units</span>
                  <span className="font-semibold">{totalQuantity}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">From</span>
                  <span className="font-semibold text-xs truncate max-w-[140px] text-right">
                    {warehouses.find((w) => w.id === fromWarehouseId)?.name || "—"}
                  </span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="text-muted-foreground">To</span>
                  <span className="font-semibold text-xs truncate max-w-[140px] text-right">
                    {warehouses.find((w) => w.id === toWarehouseId)?.name || "—"}
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
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Transferring...</>
                ) : (
                  <><ArrowRight className="mr-2 h-4 w-4" /> Create Transfer</>
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

      {/* Transfer History Section */}
      <div className="border rounded-[5px] bg-card shadow-sm overflow-hidden mt-8">
        <div className="flex items-center justify-between px-5 py-[15px] border-b">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Transfer History</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Recent stock transfers between warehouses
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-[34px] rounded-[5px] text-[13px]"
            onClick={() => loadHistory(historyPage)}
            disabled={historyLoading}
          >
            <Loader2 className={`mr-1.5 h-3.5 w-3.5 ${historyLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {historyLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : transfers.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-muted-foreground">
            <Package className="h-12 w-12 mb-3 text-muted-foreground/50" />
            <p className="font-medium">No transfers yet</p>
            <p className="text-sm mt-1">Complete a transfer above to see it here.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted h-[33px]">
                    <th className="px-5 py-2 text-left font-semibold text-foreground text-xs min-w-[130px]">Reference</th>
                    <th className="px-5 py-2 text-left font-semibold text-foreground text-xs">Items</th>
                    <th className="px-5 py-2 text-left font-semibold text-foreground text-xs">Date</th>
                    <th className="px-5 py-2 text-left font-semibold text-foreground text-xs">By</th>
                    <th className="px-5 py-2 text-left font-semibold text-foreground text-xs">Notes</th>
                    <th className="w-[80px] px-5 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {transfers.map((t) => (
                    <tr key={t.id} className="h-[52px] border-b hover:bg-muted/30 transition-colors">
                      <td className="px-5 font-mono text-xs font-semibold text-foreground">{t.referenceNumber}</td>
                      <td className="px-5">
                        <div className="flex flex-col">
                          <span className="font-medium text-foreground text-xs">
                            {t.totalItems} item(s)
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            {t.items?.map((i) => i.product?.name).filter(Boolean).join(", ").slice(0, 60) || "—"}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3 w-3" />
                          {new Date(t.adjustmentDate).toLocaleDateString("en-US", {
                            day: "2-digit", month: "short", year: "numeric",
                          })}
                        </div>
                      </td>
                      <td className="px-5 text-xs text-foreground">{t.user?.name || "—"}</td>
                      <td className="px-5 text-xs text-muted-foreground max-w-[160px] truncate">
                        {t.notes || "—"}
                      </td>
                      <td className="w-[80px] px-5">
                        <Link href={`/inventory/transfer/${t.id}`}>
                          <Button variant="ghost" size="sm" className="h-7 text-xs rounded-[5px]">
                            View
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* History Pagination */}
            {historyPages > 1 && (
              <div className="flex items-center justify-between px-5 py-[15px] border-t">
                <div className="text-sm text-muted-foreground">
                  Page {historyPage} of {historyPages} ({historyTotal} total)
                </div>
                <div className="flex items-center gap-3">
                  <button
                    className="disabled:opacity-30 disabled:cursor-not-allowed"
                    disabled={historyPage <= 1}
                    onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                  >
                    <ChevronLeft className="h-4 w-4 text-muted-foreground" />
                  </button>
                  <div className="flex items-center gap-1.5">
                    {Array.from({ length: Math.min(historyPages, 5) }, (_, i) => {
                      let pageNum: number;
                      if (historyPages <= 5) pageNum = i + 1;
                      else if (historyPage <= 3) pageNum = i + 1;
                      else if (historyPage >= historyPages - 2) pageNum = historyPages - 4 + i;
                      else pageNum = historyPage - 2 + i;
                      return (
                        <button
                          key={pageNum}
                          className={`h-7 w-7 rounded-full text-xs flex items-center justify-center border transition-colors ${
                            pageNum === historyPage
                              ? "bg-primary text-primary-foreground border-primary"
                              : "text-muted-foreground border-border hover:bg-muted"
                          }`}
                          onClick={() => setHistoryPage(pageNum)}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>
                  <button
                    className="disabled:opacity-30 disabled:cursor-not-allowed"
                    disabled={historyPage >= historyPages}
                    onClick={() => setHistoryPage((p) => Math.min(historyPages, p + 1))}
                  >
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function ProductSelect({
  products,
  value,
  usedIds,
  warehouseAvailability,
  fromWarehouseSelected,
  onChange,
}: {
  products: Product[];
  value: string;
  usedIds: Set<string>;
  warehouseAvailability: Record<string, number>;
  fromWarehouseSelected: boolean;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const availableProducts = useMemo(
    () => products.filter((p) => p.id === value || !usedIds.has(p.id)),
    [products, value, usedIds]
  );

  const filtered = useMemo(() => {
    if (!search) return availableProducts.slice(0, 50);
    const q = search.toLowerCase();
    return availableProducts.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.sku && p.sku.toLowerCase().includes(q))
    ).slice(0, 50);
  }, [availableProducts, search]);

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
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
        </div>
        {filtered.length === 0 ? (
          <div className="px-2 py-4 text-center text-sm text-muted-foreground">No products found</div>
        ) : (
          <div className="max-h-[240px] overflow-y-auto">
            {filtered.map((product) => {
              const availQty = warehouseAvailability[product.id] ?? 0;
              const noStock = fromWarehouseSelected && availQty === 0;
              return (
                <SelectItem
                  key={product.id}
                  value={product.id}
                  disabled={noStock}
                  className="text-xs py-1.5"
                >
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
                      <p className="text-[10px] text-muted-foreground font-mono">
                        {product.sku}
                        {fromWarehouseSelected ? ` — ${availQty} avail` : ""}
                      </p>
                    </div>
                  </div>
                </SelectItem>
              );
            })}
          </div>
        )}
      </SelectContent>
    </Select>
  );
}