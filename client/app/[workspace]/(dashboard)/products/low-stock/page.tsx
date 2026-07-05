"use client";

import { useEffect, useState, useCallback } from "react";
import { WorkspaceLink as Link } from "@/components/workspace-link";
import {
  Search,
  FileText,
  FileSpreadsheet,
  RefreshCw,
  Minus,
  ChevronDown,
  Eye,
  Pencil,
  Trash2,
  Loader2,
  Package,
  CirclePlus,
  Bell,
} from "lucide-react";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useProductApi, type LowStockDetailItem } from "@/hooks/use-product-api";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";

export default function LowStockPage() {
  const { getLowStockDetails, updateProduct, deleteProduct } = useProductApi();
  const { toast } = useToast();
  const { user } = useAuth();

  const canManage =
    user?.role === "OWNER" || user?.role === "ADMIN" || user?.role === "MANAGER";

  const [items, setItems] = useState<LowStockDetailItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 10;

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [notify, setNotify] = useState(false);
  const [activeTab, setActiveTab] = useState<"low" | "out">("low");

  const [editingItem, setEditingItem] = useState<LowStockDetailItem | null>(null);
  const [editQuantity, setEditQuantity] = useState("");
  const [editAlert, setEditAlert] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setError(null);
      const data = await getLowStockDetails({ page, limit: pageSize });
      setItems(data.items);
      setTotalPages(data.pages);
      setTotal(data.total);
    } catch {
      setError("Failed to load low stock products.");
    } finally {
      setLoading(false);
    }
  }, [page, getLowStockDetails]);

  useEffect(() => { load(); }, [load]);

  const tabbed = items.filter((i) =>
    activeTab === "out" ? i.quantity === 0 : i.quantity > 0
  );

  const filtered = search
    ? tabbed.filter((i) =>
        i.productName.toLowerCase().includes(search.toLowerCase()) ||
        i.sku.toLowerCase().includes(search.toLowerCase()) ||
        i.warehouseName.toLowerCase().includes(search.toLowerCase())
      )
    : tabbed;

  const toggleAll = () => {
    if (selectedIds.length === filtered.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filtered.map((i) => i.productId + "-" + i.warehouseId));
    }
  };

  const toggleOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((sid) => sid !== id) : [...prev, id]
    );
  };

  const handleEdit = (item: LowStockDetailItem) => {
    setEditingItem(item);
    setEditQuantity(item.quantity.toString());
    setEditAlert(item.alertQuantity.toString());
  };

  const handleSave = async () => {
    if (!editingItem) return;
    setSaving(true);
    try {
      await updateProduct(editingItem.productId, {
        stock: parseInt(editQuantity) || 0,
        alertQuantity: parseInt(editAlert) || 0,
      });
      toast({ title: "Success", description: "Stock updated" });
      setEditingItem(null);
      load();
    } catch {
      toast({ title: "Error", description: "Failed to update", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (productId: string) => {
    setDeletingId(productId);
    try {
      await deleteProduct(productId);
      toast({ title: "Success", description: "Product deleted" });
      load();
    } catch {
      toast({ title: "Error", description: "Failed to delete", variant: "destructive" });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-0">
      {/* Header */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-3xl font-semibold tracking-tight">Low Stocks</h1>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-[1px]">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button className="flex items-center justify-center w-5 h-5 text-red-500 hover:text-red-600">
                    <FileText className="w-full h-full" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Export PDF</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button className="flex items-center justify-center w-5 h-5 text-green-600 hover:text-green-700">
                    <FileSpreadsheet className="w-full h-full" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Export Excel</TooltipContent>
              </Tooltip>
            </div>
            <div className="flex items-center gap-[1px]">
              <button className="flex items-center justify-center w-4 h-4 text-muted-foreground hover:text-foreground" onClick={() => load()} title="Refresh">
                <RefreshCw className="w-full h-full" />
              </button>
              <button className="flex items-center justify-center w-4 h-4 text-muted-foreground hover:text-foreground" title="Collapse">
                <Minus className="w-full h-full" />
              </button>
            </div>
            <Link href="/products/new">
              <button className="flex items-center gap-[4px] px-3 py-[7px] rounded-[5px] text-[13px] font-medium text-white bg-[#ff9025] whitespace-nowrap">
                <CirclePlus className="size-[13px]" />
                Add Product
              </button>
            </Link>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/dashboard" className="hover:text-foreground transition-colors">Dashboard</Link>
          <span>/</span>
          <span className="text-foreground font-medium">Low Stocks</span>
        </div>
      </div>

      {/* Tabs + Notify */}
      <div className="border border-border rounded-[5px]">
        <div className="border-b border-border px-[20px] py-[15px] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-[1px] border border-border rounded-[5px] overflow-hidden">
              <button
                onClick={() => setActiveTab("low")}
                className={`px-4 py-[6px] text-[13px] font-medium transition-colors ${
                  activeTab === "low" ? "bg-[#fe9f43] text-white" : "text-foreground hover:bg-muted"
                }`}
              >
                Low Stock
                <span className="ml-1.5 text-[11px] opacity-80">({items.filter((i) => i.quantity > 0).length})</span>
              </button>
              <button
                onClick={() => setActiveTab("out")}
                className={`px-4 py-[6px] text-[13px] font-medium transition-colors ${
                  activeTab === "out" ? "bg-[#fe9f43] text-white" : "text-foreground hover:bg-muted"
                }`}
              >
                Out of Stock
                <span className="ml-1.5 text-[11px] opacity-80">({items.filter((i) => i.quantity === 0).length})</span>
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-muted-foreground" />
            <Switch checked={notify} onCheckedChange={setNotify} />
            <span className="text-[13px] text-muted-foreground">Notify</span>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-16 text-destructive"><p>{error}</p></div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Package className="w-12 h-12 mb-3" />
            <p className="text-[16px] font-medium">
              {activeTab === "out" ? "No out of stock products" : "No low stock products"}
            </p>
            <p className="text-[13px]">
              {activeTab === "out"
                ? "All products have at least 1 item in stock."
                : "All products have sufficient inventory levels."}
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[60px]">
                  <Checkbox
                    checked={selectedIds.length === filtered.length && filtered.length > 0}
                    onCheckedChange={toggleAll}
                  />
                </TableHead>
                <TableHead className="w-[176px]">Warehouse</TableHead>
                <TableHead className="w-[156px]">Store</TableHead>
                <TableHead className="w-[228px]">Product Name</TableHead>
                <TableHead className="w-[109px]">Category</TableHead>
                <TableHead className="w-[106px]">
                  <div className="flex items-center gap-1">
                    SKU
                    <ChevronDown className="w-[10px] h-[10px] text-muted-foreground" />
                  </div>
                </TableHead>
                <TableHead className="w-[109px]">Qty</TableHead>
                <TableHead className="w-[86px]">Qty Alert</TableHead>
                <TableHead className="w-[110px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((item) => {
                const rowId = item.productId + "-" + item.warehouseId;
                return (
                  <TableRow key={rowId}>
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.includes(rowId)}
                        onCheckedChange={() => toggleOne(rowId)}
                      />
                    </TableCell>
                    <TableCell className="text-[14px] text-foreground">{item.warehouseName}</TableCell>
                    <TableCell className="text-[14px] text-foreground">{item.storeName}</TableCell>
                    <TableCell>
                      <Link
                        href={`/products/${item.productId}`}
                        className="flex items-center gap-3 hover:underline"
                      >
                        <div className="w-[30px] h-[30px] rounded-[5px] border border-border bg-muted flex items-center justify-center overflow-hidden shrink-0">
                          {item.imageUrl ? (
                            <img src={item.imageUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <Package className="w-4 h-4 text-muted-foreground" />
                          )}
                        </div>
                        <span className="text-[14px] font-medium text-foreground">{item.productName}</span>
                      </Link>
                    </TableCell>
                    <TableCell className="text-[14px] text-muted-foreground">{item.category || "—"}</TableCell>
                    <TableCell className="text-[14px] text-muted-foreground">{item.sku}</TableCell>
                    <TableCell>
                      <Badge
                        variant="destructive"
                        className="text-[12px] font-semibold"
                      >
                        {item.quantity}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-[14px] text-muted-foreground">{item.alertQuantity}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-[4px]">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Link
                              href={`/products/${item.productId}`}
                              className="flex items-center justify-center w-[30px] h-[30px] border border-border rounded-[5px] hover:bg-muted"
                            >
                              <Eye className="w-[14px] h-[14px] text-muted-foreground" />
                            </Link>
                          </TooltipTrigger>
                          <TooltipContent side="top">View</TooltipContent>
                        </Tooltip>
                        {canManage && (
                          <>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  className="flex items-center justify-center w-[30px] h-[30px] border border-border rounded-[5px] hover:bg-muted"
                                  onClick={() => handleEdit(item)}
                                >
                                  <Pencil className="w-[14px] h-[14px] text-muted-foreground" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent side="top">Edit</TooltipContent>
                            </Tooltip>
                            <AlertDialog>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <AlertDialogTrigger asChild>
                                    <button className="flex items-center justify-center w-[30px] h-[30px] border border-border rounded-[5px] hover:bg-destructive/10">
                                      <Trash2 className="w-[14px] h-[14px] text-destructive" />
                                    </button>
                                  </AlertDialogTrigger>
                                </TooltipTrigger>
                                <TooltipContent side="top">Delete</TooltipContent>
                              </Tooltip>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Product</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete "{item.productName}"?
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDelete(item.productId)}
                                    className="bg-destructive text-destructive-foreground"
                                  >
                                    {deletingId === item.productId ? "Deleting..." : "Delete"}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}

        {/* Pagination */}
        <div className="border-t border-border px-[20px] py-[15px] flex items-center justify-between text-[14px] text-muted-foreground">
          <div className="flex items-center gap-2">
            <span>Row Per Page</span>
            <div className="flex items-center gap-1 border border-border rounded-[5px] px-[8px] py-[6px] text-[12px]">
              <span>{pageSize}</span>
              <ChevronDown className="w-[12px] h-[12px]" />
            </div>
            <span>Entries</span>
          </div>
          <div className="flex items-center gap-[15px]">
            <button
              className="flex items-center justify-center w-4 h-4 disabled:opacity-30"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronDown className="w-4 h-4 rotate-90" />
            </button>
            <div className="flex items-center gap-[8px]">
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                const p = i + 1;
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`flex items-center justify-center w-[24px] h-[24px] rounded-[20px] text-[12px] ${
                      p === page
                        ? "bg-[#fe9f43] text-white"
                        : "border border-border text-muted-foreground"
                    }`}
                  >
                    {p}
                  </button>
                );
              })}
              {totalPages > 5 && <span className="text-muted-foreground">...</span>}
            </div>
            <button
              className="flex items-center justify-center w-4 h-4 disabled:opacity-30"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              <ChevronDown className="w-4 h-4 -rotate-90" />
            </button>
          </div>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingItem} onOpenChange={(open) => !open && setEditingItem(null)}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>Edit Stock</DialogTitle>
          </DialogHeader>
          {editingItem && (
            <div className="space-y-4 py-2">
              <div>
                <Label className="text-[13px] text-muted-foreground">Product</Label>
                <p className="text-[14px] font-medium text-foreground mt-1">{editingItem.productName}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="qty" className="text-[13px]">Quantity</Label>
                  <Input
                    id="qty"
                    type="number"
                    value={editQuantity}
                    onChange={(e) => setEditQuantity(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="alert" className="text-[13px]">Alert Quantity</Label>
                  <Input
                    id="alert"
                    type="number"
                    value={editAlert}
                    onChange={(e) => setEditAlert(e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-[13px] text-muted-foreground">Warehouse</Label>
                  <p className="text-[14px] text-foreground mt-1">{editingItem.warehouseName}</p>
                </div>
                <div>
                  <Label className="text-[13px] text-muted-foreground">SKU</Label>
                  <p className="text-[14px] text-foreground mt-1">{editingItem.sku}</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingItem(null)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
