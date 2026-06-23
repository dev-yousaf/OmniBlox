"use client";

import { useEffect, useRef, useState } from "react";
import { PageLoadingSkeleton } from "@/components/ui/page-loading-skeleton";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Badge } from "@/components/ui/badge";
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
import {
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  Package,
  AlertTriangle,
  Loader2,
  Download,
  Upload,
  FileSpreadsheet,
} from "lucide-react";
import Link from "next/link";
import { useProductApi, type ProductStats } from "@/hooks/use-product-api";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import type { Product } from "@/lib/types";
import { Checkbox } from "@/components/ui/checkbox";

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<ProductStats | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 20;
  const {
    getProducts,
    deleteProduct,
    getProductStats,
    importCsv,
    exportCsv,
    exportExcel,
    bulkUpdatePrice,
  } = useProductApi();
  const { toast } = useToast();
  const { user } = useAuth();

  // Selection state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [priceUpdateDialogOpen, setPriceUpdateDialogOpen] = useState(false);
  const [bulkSalePrice, setBulkSalePrice] = useState("");
  const [bulkCostPrice, setBulkCostPrice] = useState("");

  // Import dialog state
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importPreview, setImportPreview] = useState<Record<string, string>[] | null>(null);
  const [importHeaders, setImportHeaders] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ imported: number; errors: string[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // RBAC: Define management permissions
  const canManageProducts =
    user?.role === "OWNER" ||
    user?.role === "ADMIN" ||
    user?.role === "MANAGER";

  // Load products on component mount
  useEffect(() => {
    loadProducts();
  }, [page, searchQuery]);

  const loadProducts = async ({ showSpinner = true } = {}) => {
    try {
      if (showSpinner) {
        setLoading(true);
      }

      const [statsResponse, productsResponse] = await Promise.all([
        getProductStats(),
        getProducts({
          page,
          limit: pageSize,
          search: searchQuery || undefined,
        }),
      ]);

      setProducts(productsResponse.products);
      setTotalPages(productsResponse.pages);
      setStats(statsResponse);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load products. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    try {
      await deleteProduct(id);
      setProducts((prev) => prev.filter((p) => p.id !== id));
      await loadProducts({ showSpinner: false });
      toast({
        title: "Success",
        description: "Product deleted successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete product. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleExportCsv = async () => {
    try {
      const csvData = await exportCsv();
      const blob = new Blob([csvData], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "products.csv";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast({
        title: "Success",
        description: "Products exported successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to export products.",
        variant: "destructive",
      });
    }
  };

  const handleExportExcel = async () => {
    try {
      const csvData = await exportExcel();
      const blob = new Blob([csvData], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "products.xlsx";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast({
        title: "Success",
        description: "Products exported successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to export products.",
        variant: "destructive",
      });
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportPreview(null);
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      const lines = text.split("\n").filter((l) => l.trim());
      if (lines.length < 2) {
        toast({
          title: "Error",
          description: "CSV file must have a header row and at least one data row.",
          variant: "destructive",
        });
        return;
      }
      const headers = lines[0].split(",").map((h) => h.trim());
      setImportHeaders(headers);
      const rows = lines.slice(1).map((line) => {
        const values = line.split(",").map((v) => v.trim());
        const row: Record<string, string> = {};
        headers.forEach((h, i) => {
          row[h] = values[i] || "";
        });
        return row;
      });
      setImportPreview(rows.slice(0, 5));
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!importPreview || importPreview.length === 0) return;
    setImporting(true);
    setImportResult(null);
    try {
      // Re-read full data from file
      const file = fileInputRef.current?.files?.[0];
      if (!file) return;
      const text = await file.text();
      const lines = text.split("\n").filter((l) => l.trim());
      const headers = lines[0].split(",").map((h) => h.trim());
      const rows = lines.slice(1).map((line) => {
        const values = line.split(",").map((v) => v.trim());
        const row: Record<string, string> = {};
        headers.forEach((h, i) => {
          row[h] = values[i] || "";
        });
        return row;
      });
      const result = await importCsv(rows);
      setImportResult(result);
      toast({
        title: "Import Complete",
        description: `Imported ${result.imported} products.`,
      });
      await loadProducts({ showSpinner: false });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to import products.",
        variant: "destructive",
      });
    } finally {
      setImporting(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === products.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(products.map((p) => p.id));
    }
  };

  const handleBulkUpdatePrice = async () => {
    try {
      const salePrice = parseFloat(bulkSalePrice);
      if (isNaN(salePrice)) {
        toast({
          title: "Error",
          description: "Please enter a valid sale price.",
          variant: "destructive",
        });
        return;
      }
      const costPrice = bulkCostPrice ? parseFloat(bulkCostPrice) : undefined;
      const payload = selectedIds.map((id) => ({
        id,
        salePrice,
        ...(costPrice !== undefined && !isNaN(costPrice) ? { costPrice } : {}),
      }));
      await bulkUpdatePrice(payload);
      setPriceUpdateDialogOpen(false);
      setBulkSalePrice("");
      setBulkCostPrice("");
      setSelectedIds([]);
      await loadProducts({ showSpinner: false });
      toast({
        title: "Success",
        description: "Prices updated successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update prices.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteSelected = async () => {
    try {
      await Promise.all(selectedIds.map((id) => deleteProduct(id)));
      setSelectedIds([]);
      await loadProducts({ showSpinner: false });
      toast({
        title: "Success",
        description: "Selected products deleted successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete selected products.",
        variant: "destructive",
      });
    }
  };

  const lowStockCount = stats?.lowStockCount ?? 0;

  const totalProducts = stats?.totalProducts ?? products.length;
  const categoriesCount =
    stats?.categoriesCount ?? new Set(products.map((p) => p.category)).size;
  // Compute inventory value on the client: sum of retail price (salePrice) * total stock
  const totalInventoryValue = products.reduce(
    (sum, p) => sum + p.salePrice * p.stock,
    0
  );
  const formattedInventoryValue = totalInventoryValue.toLocaleString(
    undefined,
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  );

  if (loading) {
    return <PageLoadingSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Products</h1>
          <p className="text-sm text-muted-foreground">
            Manage your product inventory and pricing
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canManageProducts && (
            <>
              <Button variant="outline" className="gap-2" onClick={handleExportCsv}>
                <Download className="h-4 w-4" />
                Export CSV
              </Button>
              <Button variant="outline" className="gap-2" onClick={handleExportExcel}>
                <FileSpreadsheet className="h-4 w-4" />
                Export Excel
              </Button>
              <Button variant="outline" className="gap-2" onClick={() => setImportDialogOpen(true)}>
                <Upload className="h-4 w-4" />
                Import CSV
              </Button>
              <Link href="/products/new">
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add Product
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>

      {importDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold">Import Products from CSV</h2>
              <Button variant="ghost" size="sm" onClick={() => { setImportDialogOpen(false); setImportPreview(null); setImportResult(null); }}>
                X
              </Button>
            </div>
            <div className="mb-4">
              <Input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
              />
            </div>
            {importPreview && importPreview.length > 0 && (
              <div className="mb-4 max-h-60 overflow-auto">
                <p className="mb-2 text-sm font-medium text-muted-foreground">Preview (first 5 rows):</p>
                <Table>
                  <TableHeader>
                    <TableRow>
                      {importHeaders.map((h) => (
                        <TableHead key={h}>{h}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {importPreview.map((row, i) => (
                      <TableRow key={i}>
                        {importHeaders.map((h) => (
                          <TableCell key={h}>{row[h]}</TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
            {importResult && (
              <div className="mb-4 space-y-1 text-sm">
                <p className="text-green-600">Successfully imported: {importResult.imported}</p>
                {importResult.errors.length > 0 && (
                  <div>
                    <p className="text-red-600">Errors ({importResult.errors.length}):</p>
                    <ul className="list-inside list-disc text-red-500">
                      {importResult.errors.map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setImportDialogOpen(false); setImportPreview(null); setImportResult(null); }}>
                Cancel
              </Button>
              <Button onClick={handleImport} disabled={!importPreview || importPreview.length === 0 || importing}>
                {importing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Importing...
                  </>
                ) : (
                  "Import"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Products
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{totalProducts}</div>
            <p className="text-xs text-muted-foreground">
              Active inventory items
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Low Stock Items
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-warning">
              {lowStockCount}
            </div>
            <p className="text-xs text-muted-foreground">Need reordering</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">
              ${formattedInventoryValue}
            </div>
            <p className="text-xs text-muted-foreground">At retail price</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Categories</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{categoriesCount}</div>
            <p className="text-xs text-muted-foreground">Product categories</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Products</CardTitle>
              <CardDescription>
                View and manage your product catalog
              </CardDescription>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {selectedIds.length > 0 && (
            <div className="mb-4 flex items-center gap-2 rounded-md border bg-muted/50 p-2">
              <span className="text-sm font-medium">{selectedIds.length} selected</span>
              <Button variant="outline" size="sm" onClick={() => setPriceUpdateDialogOpen(true)}>
                Update Price
              </Button>
              <Button variant="destructive" size="sm" onClick={handleDeleteSelected}>
                <Trash2 className="mr-1 h-4 w-4" />
                Delete Selected
              </Button>
            </div>
          )}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedIds.length === products.length && products.length > 0}
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Product Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">Cost</TableHead>
                <TableHead className="text-right">Stock</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.includes(product.id)}
                      onCheckedChange={() => toggleSelect(product.id)}
                    />
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {product.sku}
                  </TableCell>
                  <TableCell className="font-medium">
                    <Link
                      href={`/products/${product.id}`}
                      className="hover:underline"
                    >
                      {product.name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{product.category}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={
                      product.type === "DIGITAL" ? "bg-blue-50 text-blue-700" :
                      product.type === "SERVICE" ? "bg-green-50 text-green-700" :
                      product.type === "COMBO" ? "bg-purple-50 text-purple-700" :
                      ""
                    }>
                      {product.type || "STANDARD"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {product.unit}
                  </TableCell>
                  <TableCell className="text-right">
                    ${product.salePrice.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    ${product.costPrice.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right">
                    <span
                      className={
                        product.stock <= product.reorderLevel
                          ? "font-semibold text-warning"
                          : ""
                      }
                    >
                      {product.stock}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        product.status === "ACTIVE" ? "default" : "secondary"
                      }
                    >
                      {product.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                          <Link href={`/products/${product.id}`}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </Link>
                        </DropdownMenuItem>
                        {/* Only show Edit and Delete for management roles */}
                        {canManageProducts && (
                          <>
                            <DropdownMenuItem asChild>
                              <Link href={`/products/${product.id}/edit`}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onSelect={(e) => e.preventDefault()}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>
                                    Are you absolutely sure?
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This action cannot be undone. This will
                                    permanently delete the product "
                                    {product.name}" and remove all associated
                                    data from our servers.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() =>
                                      handleDeleteProduct(product.id)
                                    }
                                    className="bg-destructive text-white hover:bg-destructive/90"
                                  >
                                    Delete Product
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="flex items-center justify-between pt-4">
            <div className="text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={priceUpdateDialogOpen} onOpenChange={setPriceUpdateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Prices</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="salePrice">Set Sale Price</Label>
              <Input
                id="salePrice"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={bulkSalePrice}
                onChange={(e) => setBulkSalePrice(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="costPrice">Set Cost Price (optional)</Label>
              <Input
                id="costPrice"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={bulkCostPrice}
                onChange={(e) => setBulkCostPrice(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPriceUpdateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleBulkUpdatePrice}>Apply</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
