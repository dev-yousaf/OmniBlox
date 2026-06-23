"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PageLoadingSkeleton } from "@/components/ui/page-loading-skeleton";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, Edit, Trash2 } from "lucide-react";
import Link from "next/link";
import { useProductApi } from "@/hooks/use-product-api";
import { useInventoryApi, type InventoryItem } from "@/hooks/use-inventory-api";
import { useToast } from "@/hooks/use-toast";
import type { Product, StockLedgerEntry } from "@/lib/types";
import { useAuth } from "@/contexts/auth-context";

export default function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: productId } = use(params);
  const [product, setProduct] = useState<Product | null>(null);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [variants, setVariants] = useState<Product[]>([]);
  const [ledger, setLedger] = useState<StockLedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const { getProduct, deleteProduct, getStockLedger, getVariants } = useProductApi();
  const { getProductInventory } = useInventoryApi();
  const { toast } = useToast();
  const router = useRouter();
  const { user } = useAuth();
  const canManage = user?.role === "OWNER" || user?.role === "ADMIN" || user?.role === "MANAGER";

  useEffect(() => {
    if (productId) {
      loadProduct();
    }
  }, [productId]);

  const loadProduct = async () => {
    try {
      setLoading(true);
      const productData = await getProduct(productId);
      setProduct(productData);

      // Load inventory data
      setInventoryLoading(true);
      const [inventoryData, variantsData, ledgerData] = await Promise.all([
        getProductInventory(productId),
        getVariants(productId),
        getStockLedger(productId),
      ]);
      setInventory(inventoryData);
      setVariants(variantsData);
      setLedger(ledgerData);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load product details",
        variant: "destructive",
      });
      router.push("/dashboard/products");
    } finally {
      setLoading(false);
      setInventoryLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!product) return;

    if (confirm("Are you sure you want to delete this product?")) {
      try {
        await deleteProduct(product.id);
        toast({
          title: "Success",
          description: "Product deleted successfully",
        });
        router.push("/dashboard/products");
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to delete product",
          variant: "destructive",
        });
      }
    }
  };

  if (loading) {
    return <PageLoadingSkeleton />;
  }

  if (!product) {
    return (
      <div className="p-6 space-y-6">
        <div className="text-center py-8">Product not found</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/products">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Products
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">
              {product.name}
            </h1>
            <p className="text-sm text-muted-foreground">SKU: {product.sku}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {canManage && (
            <>
              <Link href={`/products/${productId}/edit`}>
                <Button variant="outline" className="gap-2">
                  <Edit className="h-4 w-4" />
                  Edit
                </Button>
              </Link>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="gap-2">
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete the
                      product "{product.name}" and remove all associated data from
                      our servers.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Delete Product
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Product Information</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Name
                  </label>
                  <p className="text-sm font-medium">{product.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    SKU
                  </label>
                  <p className="text-sm font-mono">{product.sku}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Category
                  </label>
                  <p className="text-sm">{product.category}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Brand
                  </label>
                  <p className="text-sm">{product.brand || "—"}</p>
                </div>
              </div>

              {product.description && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Description
                  </label>
                  <p className="text-sm">{product.description}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Pricing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Sale Price
                </label>
                <p className="text-lg font-semibold">
                  ${product.salePrice.toFixed(2)}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Cost Price
                </label>
                <p className="text-sm">${product.costPrice.toFixed(2)}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Inventory</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Stock Level
                </label>
                <div className="flex items-center gap-2">
                  <p className="text-lg font-semibold">{product.stock}</p>
                  {product.stock <= product.reorderLevel && (
                    <Badge variant="destructive">Low Stock</Badge>
                  )}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Reorder Level
                </label>
                <p className="text-sm">{product.reorderLevel}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Warehouse Stock</CardTitle>
              <CardDescription>
                Stock levels across all warehouses
              </CardDescription>
            </CardHeader>
            <CardContent>
              {inventoryLoading ? (
                <div className="text-center py-4 text-sm text-muted-foreground">
                  Loading warehouse stock...
                </div>
              ) : inventory.length === 0 ? (
                <div className="text-center py-4 text-sm text-muted-foreground">
                  No warehouse stock data available
                </div>
              ) : (
                <div className="space-y-3">
                  {inventory.map((item) => (
                    <div
                      key={`${item.productId}-${item.warehouseId}`}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm">
                            {item.warehouseName}
                          </p>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Stock: {item.quantity}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {item.quantity === 0 && (
                          <Badge variant="destructive" className="text-xs">
                            Out of Stock
                          </Badge>
                        )}
                        {item.quantity > 0 &&
                          item.quantity <= item.reorderLevel && (
                            <Badge variant="destructive" className="text-xs">
                              Low Stock
                            </Badge>
                          )}
                        {item.quantity > item.reorderLevel && (
                          <Badge variant="secondary" className="text-xs">
                            In Stock
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Summary Alert */}
                  {inventory.some((item) => item.quantity === 0) && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                        <p className="text-sm font-medium text-red-800">
                          Out of Stock Alert
                        </p>
                      </div>
                      <p className="text-xs text-red-700 mt-1">
                        This product is out of stock in{" "}
                        {inventory.filter((item) => item.quantity === 0).length}{" "}
                        warehouse(s)
                      </p>
                    </div>
                  )}

                  {inventory.some(
                    (item) =>
                      item.quantity > 0 && item.quantity <= item.reorderLevel
                  ) && (
                    <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                        <p className="text-sm font-medium text-yellow-800">
                          Low Stock Alert
                        </p>
                      </div>
                      <p className="text-xs text-yellow-700 mt-1">
                        This product is low on stock in{" "}
                        {
                          inventory.filter(
                            (item) =>
                              item.quantity > 0 &&
                              item.quantity <= item.reorderLevel
                          ).length
                        }{" "}
                        warehouse(s)
                      </p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Status & Type</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="text-sm font-medium text-muted-foreground block mb-1">Status</label>
                <Badge
                  variant={
                    product.status === "ACTIVE"
                      ? "default"
                      : product.status === "INACTIVE"
                      ? "secondary"
                      : "destructive"
                  }
                  className="capitalize"
                >
                  {product.status.toLowerCase()}
                </Badge>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground block mb-1">Type</label>
                <Badge variant="outline" className={
                  product.type === "DIGITAL" ? "bg-blue-50 text-blue-700" :
                  product.type === "SERVICE" ? "bg-green-50 text-green-700" :
                  product.type === "COMBO" ? "bg-purple-50 text-purple-700" :
                  "bg-gray-50 text-gray-700"
                }>
                  {product.type || "STANDARD"}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {ledger.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Stock Ledger</CardTitle>
            <CardDescription>History of stock movements</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Balance</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Note</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ledger.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>{new Date(entry.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{entry.type}</Badge>
                    </TableCell>
                    <TableCell className={entry.quantity > 0 ? "text-green-600" : "text-red-600"}>
                      {entry.quantity > 0 ? `+${entry.quantity}` : entry.quantity}
                    </TableCell>
                    <TableCell>{entry.balance}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{entry.reference || "-"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{entry.note || "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {variants.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Variants</CardTitle>
            <CardDescription>Product variations ({variants.length})</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {variants.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell className="font-mono text-xs">{v.sku}</TableCell>
                    <TableCell>
                      <Link href={`/products/${v.id}`} className="hover:underline font-medium">
                        {v.name}
                      </Link>
                    </TableCell>
                    <TableCell>${v.salePrice.toFixed(2)}</TableCell>
                    <TableCell>
                      <span className={v.stock <= v.reorderLevel ? "text-warning font-semibold" : ""}>
                        {v.stock}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={v.status === "ACTIVE" ? "default" : "secondary"}>
                        {v.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}



