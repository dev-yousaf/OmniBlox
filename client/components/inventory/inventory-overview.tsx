"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertCircle,
  Package,
  TrendingDown,
  TrendingUp,
  Warehouse,
} from "lucide-react";
import Link from "next/link";
import {
  useInventoryApi,
  type InventoryItem,
  type InventoryStats,
  type StockAdjustment,
} from "@/hooks/use-inventory-api";

export function InventoryOverview() {
  const { getInventory, getInventoryStats, getStockAdjustments } =
    useInventoryApi();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [stats, setStats] = useState<InventoryStats | null>(null);
  const [adjustments, setAdjustments] = useState<StockAdjustment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        setError(null);
        // Fetch inventory data and stats
        const [inventoryResponse, statsData, adjustmentsResponse] =
          await Promise.all([
            getInventory({ page: 1, limit: 100 }),
            getInventoryStats(),
            getStockAdjustments(1, 10),
          ]);
        if (!cancelled) {
          setInventory(inventoryResponse.inventory || []);
          setStats(statsData);
          setAdjustments(adjustmentsResponse.adjustments || []);
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Failed to load inventory data");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [getInventory, getInventoryStats, getStockAdjustments]);

  const statusVariants: Record<
    string,
    "default" | "secondary" | "destructive" | "outline"
  > = {
    completed: "default",
    "in-transit": "secondary",
    pending: "outline",
    draft: "outline",
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Products
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">
              {loading ? "—" : stats?.totalProducts?.toLocaleString() || "0"}
            </div>
            <p className="text-xs text-muted-foreground">
              Across all warehouses
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Low Stock Items
            </CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">
              {loading ? "—" : stats?.lowStockProducts || "0"}
            </div>
            <p className="text-xs text-muted-foreground">Need restocking</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Stock Value
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">
              {loading
                ? "—"
                : `$${(stats?.totalStockValue || 0).toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                  })}`}
            </div>
            <p className="text-xs text-muted-foreground">At current value</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Warehouses</CardTitle>
            <Warehouse className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">
              {loading ? "—" : stats?.totalWarehouses || "0"}
            </div>
            <p className="text-xs text-muted-foreground">Storage locations</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="stock" className="space-y-4">
        <TabsList>
          <TabsTrigger value="stock">Stock Levels</TabsTrigger>
          <TabsTrigger value="transfers">Recent Transfers</TabsTrigger>
        </TabsList>

        <TabsContent value="stock" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Inventory by Product & Warehouse</CardTitle>
              <CardDescription>
                Current stock levels across all locations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Warehouse</TableHead>
                      <TableHead className="text-right">Quantity</TableHead>
                      <TableHead className="text-right">
                        Reorder Level
                      </TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Stock Level</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading && (
                      <TableRow>
                        <TableCell
                          colSpan={7}
                          className="text-center text-sm text-muted-foreground"
                        >
                          Loading inventory...
                        </TableCell>
                      </TableRow>
                    )}
                    {!loading && error && (
                      <TableRow>
                        <TableCell
                          colSpan={7}
                          className="text-center text-sm text-destructive"
                        >
                          {error}
                        </TableCell>
                      </TableRow>
                    )}
                    {!loading && !error && inventory.length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={7}
                          className="text-center text-sm text-muted-foreground"
                        >
                          No inventory found.
                        </TableCell>
                      </TableRow>
                    )}
                    {!loading &&
                      !error &&
                      inventory.map((item) => {
                        const current = item.quantity || 0;
                        const reorder = item.reorderLevel || 0;
                        const stockPercentage =
                          reorder > 0 ? (current / (reorder * 3)) * 100 : 100;

                        return (
                          <TableRow
                            key={`${item.productId}-${item.warehouseId}`}
                          >
                            <TableCell>
                              <Link
                                href={`/products/${item.productId}`}
                                className="font-medium hover:underline"
                              >
                                {item.productName}
                              </Link>
                            </TableCell>
                            <TableCell className="font-mono text-sm">
                              {item.productSku}
                            </TableCell>
                            <TableCell>
                              <Link
                                href={`/inventory/warehouses/${item.warehouseId}`}
                                className="text-sm hover:underline"
                              >
                                {item.warehouseName}
                              </Link>
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {current}
                            </TableCell>
                            <TableCell className="text-right text-muted-foreground">
                              {reorder}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  item.status === "out_of_stock"
                                    ? "destructive"
                                    : item.status === "low_stock"
                                    ? "secondary"
                                    : "default"
                                }
                                className="gap-1"
                              >
                                {item.status === "out_of_stock" && (
                                  <AlertCircle className="h-3 w-3" />
                                )}
                                {item.status === "low_stock" && (
                                  <TrendingDown className="h-3 w-3" />
                                )}
                                {item.status === "in_stock" && (
                                  <TrendingUp className="h-3 w-3" />
                                )}
                                {item.status === "out_of_stock"
                                  ? "Out of Stock"
                                  : item.status === "low_stock"
                                  ? "Low Stock"
                                  : "In Stock"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Progress
                                  value={Math.min(stockPercentage, 100)}
                                  className="h-2 w-24"
                                />
                                <span className="text-xs text-muted-foreground">
                                  {Math.round(stockPercentage)}%
                                </span>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transfers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Stock Adjustments</CardTitle>
              <CardDescription>
                Latest inventory adjustments and transfers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Reference #</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead className="text-right">Net Change</TableHead>
                      <TableHead>Notes</TableHead>
                      <TableHead>By</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading && (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="text-center text-sm text-muted-foreground"
                        >
                          Loading adjustments...
                        </TableCell>
                      </TableRow>
                    )}
                    {!loading && adjustments.length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="text-center text-sm text-muted-foreground"
                        >
                          No adjustments to show yet.
                        </TableCell>
                      </TableRow>
                    )}
                    {!loading &&
                      adjustments.map((adjustment) => (
                        <TableRow key={adjustment.id}>
                          <TableCell className="font-mono text-sm">
                            {adjustment.referenceNumber}
                          </TableCell>
                          <TableCell>
                            {new Date(
                              adjustment.adjustmentDate
                            ).toLocaleDateString()}
                          </TableCell>
                          <TableCell>{adjustment.totalItems} items</TableCell>
                          <TableCell className="text-right">
                            <span
                              className={
                                adjustment.netChange >= 0
                                  ? "text-green-600"
                                  : "text-red-600"
                              }
                            >
                              {adjustment.netChange >= 0 ? "+" : ""}
                              {adjustment.netChange}
                            </span>
                          </TableCell>
                          <TableCell className="max-w-xs truncate">
                            {adjustment.notes || "—"}
                          </TableCell>
                          <TableCell>{adjustment.user.name}</TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
