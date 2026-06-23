"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  Download,
  FileSpreadsheet,
  FileText,
  RefreshCw,
  Minus,
  ChevronDown,
  Loader2,
  ImageIcon,
  CirclePlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useProductApi, type ProductStats } from "@/hooks/use-product-api";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import type { Product } from "@/lib/types";

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 10;
  const {
    getProducts,
    deleteProduct,
    importCsv,
    exportCsv,
    exportExcel,
    bulkUpdatePrice,
  } = useProductApi();
  const { toast } = useToast();
  const { user } = useAuth();

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [priceUpdateDialogOpen, setPriceUpdateDialogOpen] = useState(false);
  const [bulkSalePrice, setBulkSalePrice] = useState("");
  const [bulkCostPrice, setBulkCostPrice] = useState("");

  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importPreview, setImportPreview] = useState<Record<string, string>[] | null>(null);
  const [importHeaders, setImportHeaders] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ imported: number; errors: string[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canManageProducts =
    user?.role === "OWNER" ||
    user?.role === "ADMIN" ||
    user?.role === "MANAGER";

  useEffect(() => {
    loadProducts();
  }, [page, searchQuery]);

  const loadProducts = async ({ showSpinner = true } = {}) => {
    try {
      if (showSpinner) setLoading(true);
      const res = await getProducts({ page, limit: pageSize, search: searchQuery || undefined });
      setProducts(res.products);
      setTotalPages(res.pages);
    } catch {
      toast({ title: "Error", description: "Failed to load products.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteProduct(id);
      setProducts((prev) => prev.filter((p) => p.id !== id));
      toast({ title: "Success", description: "Product deleted." });
    } catch {
      toast({ title: "Error", description: "Failed to delete product.", variant: "destructive" });
    }
  };

  const handleExportCsv = async () => {
    try {
      const csvData = await exportCsv();
      const blob = new Blob([csvData], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = "products.csv";
      document.body.appendChild(a); a.click();
      document.body.removeChild(a); URL.revokeObjectURL(url);
      toast({ title: "Success", description: "Products exported." });
    } catch {
      toast({ title: "Error", description: "Export failed.", variant: "destructive" });
    }
  };

  const handleExportExcel = async () => {
    try {
      const data = await exportExcel();
      const blob = new Blob([data], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = "products.xlsx";
      document.body.appendChild(a); a.click();
      document.body.removeChild(a); URL.revokeObjectURL(url);
      toast({ title: "Success", description: "Products exported." });
    } catch {
      toast({ title: "Error", description: "Export failed.", variant: "destructive" });
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportPreview(null); setImportResult(null);
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      const lines = text.split("\n").filter((l) => l.trim());
      if (lines.length < 2) {
        toast({ title: "Error", description: "CSV needs header + data.", variant: "destructive" });
        return;
      }
      const headers = lines[0].split(",").map((h) => h.trim());
      setImportHeaders(headers);
      const rows = lines.slice(1).map((line) => {
        const values = line.split(",").map((v) => v.trim());
        const row: Record<string, string> = {};
        headers.forEach((h, i) => { row[h] = values[i] || ""; });
        return row;
      });
      setImportPreview(rows.slice(0, 5));
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!importPreview?.length) return;
    setImporting(true);
    try {
      const file = fileInputRef.current?.files?.[0];
      if (!file) return;
      const text = await file.text();
      const lines = text.split("\n").filter((l) => l.trim());
      const headers = lines[0].split(",").map((h) => h.trim());
      const rows = lines.slice(1).map((line) => {
        const values = line.split(",").map((v) => v.trim());
        const row: Record<string, string> = {};
        headers.forEach((h, i) => { row[h] = values[i] || ""; });
        return row;
      });
      const result = await importCsv(rows);
      setImportResult(result);
      toast({ title: "Import Complete", description: `Imported ${result.imported} products.` });
      await loadProducts({ showSpinner: false });
    } catch {
      toast({ title: "Error", description: "Import failed.", variant: "destructive" });
    } finally {
      setImporting(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === products.length) setSelectedIds([]);
    else setSelectedIds(products.map((p) => p.id));
  };

  const handleBulkUpdatePrice = async () => {
    try {
      const salePrice = parseFloat(bulkSalePrice);
      if (isNaN(salePrice)) {
        toast({ title: "Error", description: "Invalid sale price.", variant: "destructive" });
        return;
      }
      const costPrice = bulkCostPrice ? parseFloat(bulkCostPrice) : undefined;
      await bulkUpdatePrice(selectedIds.map((id) => ({ id, salePrice, ...(costPrice !== undefined && !isNaN(costPrice) ? { costPrice } : {}) })));
      setPriceUpdateDialogOpen(false);
      setBulkSalePrice(""); setBulkCostPrice(""); setSelectedIds([]);
      await loadProducts({ showSpinner: false });
      toast({ title: "Success", description: "Prices updated." });
    } catch {
      toast({ title: "Error", description: "Failed to update prices.", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-0">
      {/* Page Info */}
      <div className="flex items-center justify-between h-[48px] mb-4">
        <div className="flex items-center gap-2 text-sm text-[#646b72]">
          <Link href="/dashboard" className="hover:text-[#212b36]">Inventory</Link>
          <span>/</span>
          <span className="text-[#212b36] font-medium">Products</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-[1px]">
            <button className="flex items-center justify-center w-5 h-5 text-[#646b72] hover:text-[#212b36]" onClick={handleExportCsv} title="Export PDF">
              <FileText className="w-full h-full" />
            </button>
            <button className="flex items-center justify-center w-5 h-5 text-[#646b72] hover:text-[#212b36]" onClick={handleExportExcel} title="Export Excel">
              <FileSpreadsheet className="w-full h-full" />
            </button>
          </div>
          <div className="flex items-center gap-[1px]">
            <button className="flex items-center justify-center w-4 h-4 text-[#646b72] hover:text-[#212b36]" onClick={loadProducts} title="Refresh">
              <RefreshCw className="w-full h-full" />
            </button>
            <button className="flex items-center justify-center w-4 h-4 text-[#646b72] hover:text-[#212b36]" title="Collapse">
              <Minus className="w-full h-full" />
            </button>
          </div>
          {canManageProducts && (
            <div className="flex items-center gap-2">
              <button
                className="flex items-center gap-[4px] px-3 py-[7px] rounded-[5px] text-[13px] font-medium text-white bg-[#092c4c] whitespace-nowrap"
                onClick={() => setImportDialogOpen(true)}
              >
                <Download className="size-[13px]" />
                Import Product
              </button>
              <Link href="/products/new">
                <button className="flex items-center gap-[4px] px-3 py-[7px] rounded-[5px] text-[13px] font-medium text-white bg-[#ff9025] whitespace-nowrap">
                  <CirclePlus className="size-[13px]" />
                  Add Product
                </button>
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Import Dialog */}
      {importDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold">Import Products from CSV</h2>
              <Button variant="ghost" size="sm" onClick={() => { setImportDialogOpen(false); setImportPreview(null); setImportResult(null); }}>X</Button>
            </div>
            <div className="mb-4">
              <Input ref={fileInputRef} type="file" accept=".csv" onChange={handleFileSelect} />
            </div>
            {importPreview && importPreview.length > 0 && (
              <div className="mb-4 max-h-60 overflow-auto">
                <p className="mb-2 text-sm font-medium text-muted-foreground">Preview (first 5 rows):</p>
                <Table>
                  <TableHeader>
                    <TableRow>{importHeaders.map((h) => <TableHead key={h}>{h}</TableHead>)}</TableRow>
                  </TableHeader>
                  <TableBody>
                    {importPreview.map((row, i) => (
                      <TableRow key={i}>{importHeaders.map((h) => <TableCell key={h}>{row[h]}</TableCell>)}</TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
            {importResult && (
              <div className="mb-4 space-y-1 text-sm">
                <p className="text-green-600">Imported: {importResult.imported}</p>
                {importResult.errors.length > 0 && (
                  <div>
                    <p className="text-red-600">Errors ({importResult.errors.length}):</p>
                    <ul className="list-inside list-disc text-red-500">
                      {importResult.errors.map((err, i) => <li key={i}>{err}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setImportDialogOpen(false); setImportPreview(null); setImportResult(null); }}>Cancel</Button>
              <Button onClick={handleImport} disabled={!importPreview?.length || importing}>
                {importing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Importing...</> : "Import"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Products Table */}
      <div className="border border-border rounded-lg overflow-hidden">
        {selectedIds.length > 0 && (
          <div className="flex items-center gap-2 border-b border-border bg-muted/50 p-2 px-4">
            <span className="text-sm font-medium">{selectedIds.length} selected</span>
            <Button variant="outline" size="sm" onClick={() => setPriceUpdateDialogOpen(true)}>Update Price</Button>
            <Button variant="destructive" size="sm" onClick={async () => { await Promise.all(selectedIds.map((id) => deleteProduct(id))); setSelectedIds([]); loadProducts({ showSpinner: false }); }}>
              <Trash2 className="mr-1 h-4 w-4" /> Delete Selected
            </Button>
          </div>
        )}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-[#f9fafb]">
                <TableHead className="w-[60px]">
                  <Checkbox checked={selectedIds.length === products.length && products.length > 0} onCheckedChange={toggleSelectAll} />
                </TableHead>
                <TableHead className="w-[79px] text-[12px] font-semibold text-[#646b72]">
                  <div className="flex items-center gap-1">
                    SKU
                    <ChevronDown className="h-3 w-3 text-[#646b72]" />
                  </div>
                </TableHead>
                <TableHead className="w-[212px] text-[12px] font-semibold text-[#646b72]">Product Name</TableHead>
                <TableHead className="w-[109px] text-[12px] font-semibold text-[#646b72]">Category</TableHead>
                <TableHead className="w-[133px] text-[12px] font-semibold text-[#646b72]">Brand</TableHead>
                <TableHead className="w-[81px] text-[12px] font-semibold text-[#646b72]">Price</TableHead>
                <TableHead className="w-[72px] text-[12px] font-semibold text-[#646b72]">Unit</TableHead>
                <TableHead className="w-[82px] text-[12px] font-semibold text-[#646b72]">Quantity</TableHead>
                <TableHead className="w-[171px] text-[12px] font-semibold text-[#646b72]">Created By</TableHead>
                <TableHead className="w-[141px] text-[12px] font-semibold text-[#646b72] text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 10 }).map((_, j) => (
                      <TableCell key={j}><div className="h-4 bg-gray-100 rounded animate-pulse" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : products.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-10 text-muted-foreground">
                    No products found
                  </TableCell>
                </TableRow>
              ) : (
                products.map((product) => (
                  <TableRow key={product.id} className="hover:bg-[#f9fafb]">
                    <TableCell>
                      <Checkbox checked={selectedIds.includes(product.id)} onCheckedChange={() => toggleSelect(product.id)} />
                    </TableCell>
                    <TableCell className="font-mono text-[13px] text-[#212b36]">{product.sku}</TableCell>
                    <TableCell>
                      <Link href={`/products/${product.id}`} className="flex items-center gap-3 hover:underline">
                        <div className="w-[30px] h-[30px] rounded-lg bg-[#f4f6f8] flex items-center justify-center shrink-0 overflow-hidden">
                          {product.imageUrl ? (
                            <img src={product.imageUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <ImageIcon className="h-4 w-4 text-[#646b72]" />
                          )}
                        </div>
                        <span className="text-[13px] font-medium text-[#212b36]">{product.name}</span>
                      </Link>
                    </TableCell>
                    <TableCell><span className="text-[13px] text-[#212b36]">{product.category}</span></TableCell>
                    <TableCell><span className="text-[13px] text-[#212b36]">{product.brand || "-"}</span></TableCell>
                    <TableCell className="text-[13px] text-[#212b36]">${product.salePrice.toFixed(2)}</TableCell>
                    <TableCell className="text-[13px] text-[#212b36]">{product.unit}</TableCell>
                    <TableCell className="text-[13px] text-[#212b36]">{product.stock}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-[30px] h-[30px] rounded-full bg-[#f4f6f8] flex items-center justify-center shrink-0 overflow-hidden">
                          {product.createdBy?.image ? (
                            <img src={product.createdBy.image} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-[11px] font-medium text-[#646b72]">
                              {product.createdBy?.name?.charAt(0).toUpperCase() || "U"}
                            </span>
                          )}
                        </div>
                        <span className="text-[13px] text-[#212b36]">{product.createdBy?.name || "—"}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem asChild>
                            <Link href={`/products/${product.id}`}><Eye className="mr-2 h-4 w-4" /> View Details</Link>
                          </DropdownMenuItem>
                          {canManageProducts && (
                            <>
                              <DropdownMenuItem asChild>
                                <Link href={`/products/${product.id}/edit`}><Edit className="mr-2 h-4 w-4" /> Edit</Link>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <DropdownMenuItem className="text-destructive" onSelect={(e) => e.preventDefault()}>
                                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                                  </DropdownMenuItem>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete product?</AlertDialogTitle>
                                    <AlertDialogDescription>This permanently deletes "{product.name}".</AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDelete(product.id)} className="bg-destructive text-white hover:bg-destructive/90">Delete</AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-[#f9fafb]">
          <div className="text-[13px] text-[#646b72]">Page {page} of {totalPages}</div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>Previous</Button>
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>Next</Button>
          </div>
        </div>
      </div>

      {/* Bulk Price Update Dialog */}
      <Dialog open={priceUpdateDialogOpen} onOpenChange={setPriceUpdateDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Update Prices</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="salePrice">Set Sale Price</Label>
              <Input id="salePrice" type="number" step="0.01" placeholder="0.00" value={bulkSalePrice} onChange={(e) => setBulkSalePrice(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="costPrice">Set Cost Price (optional)</Label>
              <Input id="costPrice" type="number" step="0.01" placeholder="0.00" value={bulkCostPrice} onChange={(e) => setBulkCostPrice(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPriceUpdateDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleBulkUpdatePrice}>Apply</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
