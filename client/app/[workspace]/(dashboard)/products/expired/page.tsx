"use client";

import { useEffect, useState, useCallback } from "react";
import { WorkspaceLink as Link } from "@/components/workspace-link";
import { useRouter } from "next/navigation";
import {
  Search,
  FileText,
  FileSpreadsheet,
  RefreshCw,
  Minus,
  ChevronDown,
  Pencil,
  Trash2,
  Loader2,
  Calendar,
  Package,
  CirclePlus,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useProductApi } from "@/hooks/use-product-api";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import type { Product } from "@/lib/types";

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function ExpiredProductsPage() {
  const router = useRouter();
  const { getExpiredProducts, updateProduct, deleteProduct } = useProductApi();
  const { toast } = useToast();
  const { user } = useAuth();

  const canManage =
    user?.role === "OWNER" || user?.role === "ADMIN" || user?.role === "MANAGER";

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 10;

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editForm, setEditForm] = useState({
    manufacturedDate: "",
    expiryDate: "",
    status: "ACTIVE" as string,
  });
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setError(null);
      const data = await getExpiredProducts({ page, limit: pageSize });
      setProducts(data.products);
      setTotalPages(data.pages);
    } catch {
      setError("Failed to load expired products.");
    } finally {
      setLoading(false);
    }
  }, [page, getExpiredProducts]);

  useEffect(() => { load(); }, [load]);

  const filtered = search
    ? products.filter((p) =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.sku.toLowerCase().includes(search.toLowerCase())
      )
    : products;

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setEditForm({
      manufacturedDate: product.manufacturedDate
        ? new Date(product.manufacturedDate).toISOString().split("T")[0]
        : "",
      expiryDate: product.expiryDate
        ? new Date(product.expiryDate).toISOString().split("T")[0]
        : "",
      status: product.status,
    });
  };

  const handleSaveEdit = async () => {
    if (!editingProduct) return;
    setSaving(true);
    try {
      await updateProduct(editingProduct.id, {
        manufacturedDate: editForm.manufacturedDate || undefined,
        expiryDate: editForm.expiryDate || undefined,
        status: editForm.status as "ACTIVE" | "INACTIVE" | "DISCONTINUED",
      });
      toast({ title: "Success", description: "Product updated" });
      setEditingProduct(null);
      load();
    } catch {
      toast({ title: "Error", description: "Failed to update product", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteProduct(id);
      toast({ title: "Success", description: "Product deleted" });
      setSelectedIds((prev) => prev.filter((sid) => sid !== id));
      load();
    } catch {
      toast({ title: "Error", description: "Failed to delete product", variant: "destructive" });
    } finally {
      setDeletingId(null);
    }
  };

  const toggleAll = () => {
    if (selectedIds.length === filtered.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filtered.map((p) => p.id));
    }
  };

  const toggleOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((sid) => sid !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-0">
      {/* Header */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-3xl font-semibold tracking-tight">Expired Products</h1>
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
              <button
                className="flex items-center justify-center w-4 h-4 text-muted-foreground hover:text-foreground"
                onClick={() => load()}
                title="Refresh"
              >
                <RefreshCw className="w-full h-full" />
              </button>
              <button
                className="flex items-center justify-center w-4 h-4 text-muted-foreground hover:text-foreground"
                title="Collapse"
              >
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
          <span className="text-foreground font-medium">Expired Products</span>
        </div>
      </div>

      {/* Search + Toolbar */}
      <div className="border border-border rounded-[5px]">
        <div className="border-b border-border px-[20px] py-[15px] flex items-center justify-between">
          <div className="flex items-center gap-2 border border-border rounded-[5px] px-[8px] py-[4px] w-[200px]">
            <Search className="w-[14px] h-[14px] text-muted-foreground shrink-0" />
            <input
              className="text-[14px] text-foreground bg-transparent border-none outline-none w-full placeholder:text-muted-foreground"
              placeholder="Search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-[8px]">
            <div className="flex items-center gap-1 border border-border rounded-[5px] px-[8px] py-[4px]">
              <Calendar className="w-[14px] h-[14px] text-muted-foreground" />
              <span className="text-[14px] text-foreground">Select Date</span>
            </div>
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
            <p className="text-[16px] font-medium">No expired products found</p>
            <p className="text-[13px]">Products with past expiry dates will appear here.</p>
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
                <TableHead className="w-[86px]">
                  <div className="flex items-center gap-1">
                    SKU
                    <ChevronDown className="w-[10px] h-[10px] text-muted-foreground" />
                  </div>
                </TableHead>
                <TableHead className="w-[295px]">Product Name</TableHead>
                <TableHead className="w-[254px]">
                  <div className="flex items-center gap-1">
                    Manufactured Date
                    <ChevronDown className="w-[10px] h-[10px] text-muted-foreground" />
                  </div>
                </TableHead>
                <TableHead className="w-[240px]">
                  <div className="flex items-center gap-1">
                    Expired Date
                    <ChevronDown className="w-[10px] h-[10px] text-muted-foreground" />
                  </div>
                </TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.includes(product.id)}
                      onCheckedChange={() => toggleOne(product.id)}
                    />
                  </TableCell>
                  <TableCell className="text-muted-foreground text-[14px]">{product.sku}</TableCell>
                  <TableCell>
                    <Link
                      href={`/products/${product.id}`}
                      className="flex items-center gap-3 hover:underline"
                    >
                      <div className="w-[30px] h-[30px] rounded-[5px] border border-border bg-muted flex items-center justify-center overflow-hidden shrink-0">
                        {product.imageUrl ? (
                          <img src={product.imageUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <Package className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                      <span className="text-[14px] font-medium text-foreground">{product.name}</span>
                    </Link>
                  </TableCell>
                  <TableCell className="text-[14px] text-muted-foreground">
                    {formatDate(product.manufacturedDate)}
                  </TableCell>
                  <TableCell>
                    <span className="text-[14px] font-medium text-red-600">
                      {formatDate(product.expiryDate)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-[4px]">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            className="flex items-center justify-center w-[30px] h-[30px] border border-border rounded-[5px] hover:bg-muted"
                            onClick={() => handleEdit(product)}
                          >
                            <Pencil className="w-[14px] h-[14px] text-muted-foreground" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="top">Edit</TooltipContent>
                      </Tooltip>
                      {canManage && (
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
                                Are you sure you want to delete "{product.name}"? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(product.id)}
                                className="bg-destructive text-destructive-foreground"
                              >
                                {deletingId === product.id ? "Deleting..." : "Delete"}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
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
      <Dialog open={!!editingProduct} onOpenChange={(open) => !open && setEditingProduct(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Expired Product</DialogTitle>
          </DialogHeader>
          {editingProduct && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-[13px] text-muted-foreground">SKU</Label>
                  <p className="text-[14px] font-medium text-foreground mt-1">{editingProduct.sku}</p>
                </div>
                <div>
                  <Label className="text-[13px] text-muted-foreground">Product Name</Label>
                  <p className="text-[14px] font-medium text-foreground mt-1">{editingProduct.name}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="mfg-date" className="text-[13px]">Manufactured Date</Label>
                  <Input
                    id="mfg-date"
                    type="date"
                    value={editForm.manufacturedDate}
                    onChange={(e) => setEditForm((f) => ({ ...f, manufacturedDate: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="exp-date" className="text-[13px]">Expired Date</Label>
                  <Input
                    id="exp-date"
                    type="date"
                    value={editForm.expiryDate}
                    onChange={(e) => setEditForm((f) => ({ ...f, expiryDate: e.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="status" className="text-[13px]">Status</Label>
                <Select
                  value={editForm.status}
                  onValueChange={(v) => setEditForm((f) => ({ ...f, status: v }))}
                >
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="INACTIVE">Inactive</SelectItem>
                    <SelectItem value="DISCONTINUED">Discontinued</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingProduct(null)}>Cancel</Button>
            <Button onClick={handleSaveEdit} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
