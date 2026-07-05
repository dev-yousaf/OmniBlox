"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import {
  Plus, Pencil, Trash2, Loader2, ArrowUpDown,
  Search, ChevronLeft, ChevronRight,
  RefreshCw, ChevronUp, FileText, FileSpreadsheet,
  Package, Warehouse, ArrowLeftRight,
} from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  useInventoryApi,
  type InventoryItem,
} from "@/hooks/use-inventory-api";
import { WorkspaceLink as Link } from "@/components/workspace-link";

const statusStyles: Record<string, string> = {
  in_stock: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
  low_stock: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800",
  out_of_stock: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800",
};

const statusLabels: Record<string, string> = {
  in_stock: "In Stock",
  low_stock: "Low Stock",
  out_of_stock: "Out of Stock",
};

const ROWS_PER_PAGE = 10;

export default function ManageStockPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const api = useInventoryApi();

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [warehouseFilter, setWarehouseFilter] = useState("all");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [warehouseNames, setWarehouseNames] = useState<string[]>([]);

  const [editOpen, setEditOpen] = useState(false);
  const [editItem, setEditItem] = useState<InventoryItem | null>(null);
  const [editQty, setEditQty] = useState("");
  const [editNote, setEditNote] = useState("");
  const [editingQty, setEditingQty] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteItem, setDeleteItem] = useState<InventoryItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [tableCollapsed, setTableCollapsed] = useState(false);

  const canManage = user?.role === "OWNER" || user?.role === "ADMIN" || user?.role === "MANAGER";

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      setIsLoading(true);
      const [data, wh] = await Promise.all([
        api.getInventory({ limit: 100 }),
        api.getWarehouses(),
      ]);
      setItems(data.inventory);
      setWarehouseNames(wh.map((w) => w.name));
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to load", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const filtered = useMemo(() => {
    let result = [...items];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (i) =>
          i.productName.toLowerCase().includes(q) ||
          i.productSku.toLowerCase().includes(q) ||
          i.warehouseName.toLowerCase().includes(q)
      );
    }
    if (warehouseFilter !== "all") result = result.filter((i) => i.warehouseName === warehouseFilter);
    if (statusFilter !== "all") result = result.filter((i) => i.status === statusFilter);
    result.sort((a, b) => {
      const d = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
      return sortDir === "asc" ? d : -d;
    });
    return result;
  }, [items, search, warehouseFilter, statusFilter, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE));
  const paged = filtered.slice((page - 1) * ROWS_PER_PAGE, page * ROWS_PER_PAGE);

  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [page, totalPages]);

  const toggleSort = () => setSortDir((d) => (d === "asc" ? "desc" : "asc"));

  const toggleSelect = (id: string) => {
    const n = new Set(selectedIds);
    n.has(id) ? n.delete(id) : n.add(id);
    setSelectedIds(n);
  };
  const toggleAll = () => {
    if (selectedIds.size === paged.length && paged.length > 0) setSelectedIds(new Set());
    else setSelectedIds(new Set(paged.map((i) => `${i.productId}-${i.warehouseId}`)));
  };

  const openEdit = (item: InventoryItem) => {
    setEditItem(item);
    setEditQty(String(item.quantity));
    setEditNote("");
    setEditOpen(true);
  };

  const handleEditSave = async () => {
    if (!editItem) return;
    const qty = parseInt(editQty, 10);
    if (isNaN(qty) || qty < 0) {
      toast({ title: "Invalid quantity", description: "Quantity must be a non-negative number", variant: "destructive" });
      return;
    }
    try {
      setEditingQty(true);
      await api.updateInventory(editItem.productId, editItem.warehouseId, qty, editNote.trim() || undefined);
      toast({ title: "Updated", description: `Stock for ${editItem.productName} set to ${qty}` });
      setEditOpen(false);
      load();
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to update", variant: "destructive" });
    } finally {
      setEditingQty(false);
    }
  };

  const openDelete = (item: InventoryItem) => {
    setDeleteItem(item);
    setDeleteOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteItem) return;
    try {
      setDeleting(true);
      await api.updateInventory(deleteItem.productId, deleteItem.warehouseId, 0);
      toast({ title: "Deleted", description: `Stock for ${deleteItem.productName} cleared` });
      setDeleteOpen(false);
      setDeleteItem(null);
      load();
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to delete", variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  const exportCSV = () => {
    const headers = ["Warehouse", "Product", "SKU", "Category", "Quantity", "Status", "Last Updated"];
    const rows = filtered.map((i) => [
      i.warehouseName,
      i.productName,
      i.productSku,
      i.category,
      String(i.quantity),
      statusLabels[i.status] || i.status,
      new Date(i.updatedAt).toLocaleDateString(),
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `manage-stock-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Exported", description: "Stock data exported as CSV" });
  };

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-1 text-sm text-muted-foreground mb-0.5">
            <span>Dashboard</span>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="text-foreground">Manage Stock</span>
          </div>
          <h1 className="text-[18px] font-bold text-foreground">Manage Stock</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="h-[34px] w-[34px] rounded-[5px]" title="Export CSV" onClick={exportCSV}>
            <FileText className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" className="h-[34px] w-[34px] rounded-[5px]" title="Export Excel" onClick={exportCSV}>
            <FileSpreadsheet className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" className="h-[34px] w-[34px] rounded-[5px]" title="Refresh" onClick={load}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button
            variant="outline" size="icon" className="h-[34px] w-[34px] rounded-[5px]" title="Collapse"
            onClick={() => setTableCollapsed(!tableCollapsed)}
          >
            <ChevronUp className={`h-4 w-4 transition-transform ${tableCollapsed ? "rotate-180" : ""}`} />
          </Button>
          {canManage && (
            <Link href="/products/adjustment">
              <Button className="h-[34px] rounded-[5px] bg-[#ff9025] hover:bg-[#ff9025]/90 text-white text-[13px] font-medium px-3">
                <Plus className="mr-1.5 h-3.5 w-3.5" />Stock Adjustment
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex items-center gap-3">
        <Link href="/inventory/transfer">
          <Button variant="outline" size="sm" className="h-[34px] rounded-[5px] text-[13px]">
            <ArrowLeftRight className="mr-1.5 h-3.5 w-3.5" />Transfer Stock
          </Button>
        </Link>
        <Link href="/inventory/warehouses">
          <Button variant="outline" size="sm" className="h-[34px] rounded-[5px] text-[13px]">
            <Warehouse className="mr-1.5 h-3.5 w-3.5" />Manage Warehouses
          </Button>
        </Link>
        {selectedIds.size > 0 && (
          <span className="text-sm text-muted-foreground ml-2">{selectedIds.size} selected</span>
        )}
      </div>

      {/* Table */}
      {!tableCollapsed && (
        <div className="border rounded-[5px] bg-card shadow-sm overflow-hidden">
          {/* Table Toolbar */}
          <div className="flex items-center gap-4 px-5 py-[15px] border-b flex-wrap">
            <div className="flex items-center gap-2 border rounded-[5px] px-2.5 py-1.5 w-[200px]">
              <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <input
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground min-w-0"
                placeholder="Search products..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              />
            </div>
            <div className="flex items-center gap-2 ml-auto flex-wrap">
              <Select value={warehouseFilter} onValueChange={(v) => { setWarehouseFilter(v); setPage(1); }}>
                <SelectTrigger className="h-[34px] w-[130px] text-sm rounded-[5px]">
                  <SelectValue placeholder="Warehouse" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Warehouses</SelectItem>
                  {warehouseNames.map((name) => (
                    <SelectItem key={name} value={name}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
                <SelectTrigger className="h-[34px] w-[130px] text-sm rounded-[5px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="in_stock">In Stock</SelectItem>
                  <SelectItem value="low_stock">Low Stock</SelectItem>
                  <SelectItem value="out_of_stock">Out of Stock</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center gap-1.5 text-sm text-foreground font-semibold whitespace-nowrap">
                Sort By :
                <Select defaultValue="last7">
                  <SelectTrigger className="h-[34px] w-[130px] text-sm rounded-[5px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="last7">Last 7 Days</SelectItem>
                    <SelectItem value="last30">Last 30 Days</SelectItem>
                    <SelectItem value="last90">Last 90 Days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Table Content */}
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
          ) : paged.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-muted-foreground">
              <Package className="h-12 w-12 mb-3 text-muted-foreground/50" />
              <p className="font-medium">{search || warehouseFilter !== "all" || statusFilter !== "all" ? "No stock items match your filters" : "No stock items yet"}</p>
              <p className="text-sm mt-1">Add products to warehouses to start managing stock.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted h-[33px]">
                    <th className="w-[50px] px-5 py-2 text-left font-semibold text-foreground">
                      <Checkbox
                        checked={selectedIds.size === paged.length && paged.length > 0}
                        onCheckedChange={toggleAll}
                      />
                    </th>
                    <th className="px-5 py-2 text-left font-semibold text-foreground min-w-[140px]">Product</th>
                    <th className="w-[110px] px-5 py-2 text-left font-semibold text-foreground">SKU</th>
                    <th className="w-[160px] px-5 py-2 text-left font-semibold text-foreground">Warehouse</th>
                    <th className="w-[80px] px-5 py-2 text-right font-semibold text-foreground">Qty</th>
                    <th className="w-[110px] px-5 py-2 text-left font-semibold text-foreground">Status</th>
                    <th className="w-[120px] px-5 py-2 text-left font-semibold text-foreground cursor-pointer select-none" onClick={toggleSort}>
                      <span className="inline-flex items-center gap-1">
                        Updated
                        <ArrowUpDown className="h-3 w-3" />
                      </span>
                    </th>
                    <th className="w-[100px] px-5 py-2 text-left font-semibold text-foreground">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {paged.map((item) => {
                    const rowKey = `${item.productId}-${item.warehouseId}`;
                    return (
                      <tr key={rowKey} className="h-[56px] border-b hover:bg-muted/30 transition-colors">
                        <td className="w-[50px] px-5">
                          <Checkbox
                            checked={selectedIds.has(rowKey)}
                            onCheckedChange={() => toggleSelect(rowKey)}
                          />
                        </td>
                        <td className="px-5">
                          <div className="flex items-center gap-2.5">
                            <div className="bg-muted rounded-[5px] size-[34px] flex items-center justify-center overflow-hidden shrink-0">
                              {item.imageUrl ? (
                                <img src={item.imageUrl} alt="" className="size-full object-cover" />
                              ) : (
                                <Package className="h-4 w-4 text-muted-foreground" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-foreground truncate max-w-[200px]">{item.productName}</p>
                              {item.brand && <p className="text-xs text-muted-foreground truncate">{item.brand}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="w-[110px] px-5 font-mono text-xs text-muted-foreground">{item.productSku}</td>
                        <td className="w-[160px] px-5 text-foreground">{item.warehouseName}</td>
                        <td className="w-[80px] px-5 text-right">
                          <span className={`font-semibold tabular-nums ${item.quantity === 0 ? "text-destructive" : item.quantity <= item.reorderLevel ? "text-amber-600" : "text-foreground"}`}>
                            {item.quantity}
                          </span>
                        </td>
                        <td className="w-[110px] px-5">
                          <Badge variant="outline" className={`font-medium text-xs ${statusStyles[item.status] || ""}`}>
                            {statusLabels[item.status] || item.status}
                          </Badge>
                        </td>
                        <td className="w-[120px] px-5 text-muted-foreground text-xs">
                          {new Date(item.updatedAt).toLocaleDateString("en-US", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </td>
                        <td className="w-[100px] px-5">
                          {canManage && (
                            <div className="flex items-center gap-1">
                              <Button
                                variant="outline" size="icon"
                                className="h-[30px] w-[30px] rounded-[5px]"
                                title="Edit quantity"
                                onClick={() => openEdit(item)}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="outline" size="icon"
                                className="h-[30px] w-[30px] rounded-[5px] text-destructive hover:text-destructive"
                                title="Clear stock"
                                onClick={() => openDelete(item)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Table Footer */}
          {!isLoading && paged.length > 0 && (
            <div className="flex items-center justify-between px-5 py-[15px] border-t">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Row Per Page</span>
                <Select defaultValue="10">
                  <SelectTrigger className="h-8 w-16 text-xs rounded-[5px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                  </SelectContent>
                </Select>
                <span>Entries</span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  className="disabled:opacity-30 disabled:cursor-not-allowed"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="h-4 w-4 text-muted-foreground" />
                </button>
                <div className="flex items-center gap-1.5">
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                    let pageNum: number;
                    if (totalPages <= 5) pageNum = i + 1;
                    else if (page <= 3) pageNum = i + 1;
                    else if (page >= totalPages - 2) pageNum = totalPages - 4 + i;
                    else pageNum = page - 2 + i;
                    return (
                      <button
                        key={pageNum}
                        className={`h-7 w-7 rounded-full text-xs flex items-center justify-center border transition-colors ${
                          pageNum === page
                            ? "bg-primary text-primary-foreground border-primary"
                            : "text-muted-foreground border-border hover:bg-muted"
                        }`}
                        onClick={() => setPage(pageNum)}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  {totalPages > 5 && page < totalPages - 2 && (
                    <span className="text-xs text-muted-foreground px-1">...</span>
                  )}
                  {totalPages > 5 && page < totalPages - 2 && (
                    <button
                      className="h-7 w-7 rounded-full text-xs flex items-center justify-center border border-border text-muted-foreground hover:bg-muted transition-colors"
                      onClick={() => setPage(totalPages)}
                    >
                      {totalPages}
                    </button>
                  )}
                </div>
                <button
                  className="disabled:opacity-30 disabled:cursor-not-allowed"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Edit Quantity Dialog */}
      <Dialog open={editOpen} onOpenChange={(o) => { if (!o) setEditOpen(false); }}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Edit Stock Quantity</DialogTitle>
          </DialogHeader>
          {editItem && (
            <div className="space-y-4 py-2">
              <div className="bg-muted/50 rounded-lg p-3 space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Product</span><span className="font-medium">{editItem.productName}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">SKU</span><span className="font-mono text-xs">{editItem.productSku}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Warehouse</span><span>{editItem.warehouseName}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Current Stock</span><span className="font-semibold">{editItem.quantity}</span></div>
              </div>
              <div>
                <Label htmlFor="edit-qty" className="text-sm font-medium">New Quantity</Label>
                <Input
                  id="edit-qty"
                  type="number"
                  min={0}
                  value={editQty}
                  onChange={(e) => setEditQty(e.target.value)}
                  className="mt-1.5 h-[38px] rounded-[5px]"
                  autoFocus
                />
              </div>
              <div>
                <Label htmlFor="edit-note" className="text-sm font-medium">Note (optional)</Label>
                <Textarea
                  id="edit-note"
                  placeholder="Reason for stock change..."
                  value={editNote}
                  onChange={(e) => setEditNote(e.target.value)}
                  rows={2}
                  className="mt-1.5 rounded-[5px] resize-none"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={editingQty} className="rounded-[5px]">Cancel</Button>
            <Button onClick={handleEditSave} disabled={editingQty} className="rounded-[5px] bg-primary hover:bg-primary/90">
              {editingQty ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear stock for this item?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteItem && (
                <>This will set the stock quantity of <strong>{deleteItem.productName}</strong> in <strong>{deleteItem.warehouseName}</strong> to <strong>0</strong>.</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting} className="rounded-[5px]">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="rounded-[5px] bg-destructive hover:bg-destructive/90">
              {deleting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Clearing...</> : "Clear Stock"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
