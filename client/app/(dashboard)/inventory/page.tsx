"use client";

import { useEffect, useState } from "react";
import { PageLoadingSkeleton } from "@/components/ui/page-loading-skeleton";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Package,
  Warehouse,
  TrendingUp,
  AlertTriangle,
  Search,
} from "lucide-react";
import Link from "next/link";
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
  useInventoryApi,
  type InventoryStats,
  type InventoryItem,
  type StockAdjustment,
} from "@/hooks/use-inventory-api";
import { useToast } from "@/hooks/use-toast";

export default function InventoryPage() {
  const { toast } = useToast();
  const { getInventoryStats, getInventory, getStockAdjustments } =
    useInventoryApi();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<InventoryStats | null>(null);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [adjustments, setAdjustments] = useState<StockAdjustment[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const [statsData, inventoryData, adjustmentsData] = await Promise.all([
        getInventoryStats(),
        getInventory({ limit: 50 }),
        getStockAdjustments(1, 10),
      ]);
      setStats(statsData);
      setInventory(inventoryData.inventory);
      setAdjustments(adjustmentsData.adjustments);
    } catch (error) {
      console.error("Failed to load inventory data:", error);
      toast({
        title: "Error",
        description: "Failed to load inventory data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  const filteredInventory = inventory.filter(
    (item) =>
      item.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.productSku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.warehouseName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const lowStockItems = inventory.filter((item) => item.status === "low_stock");
  const outOfStockItems = inventory.filter(
    (item) => item.status === "out_of_stock"
  );

  if (loading) {
    return <PageLoadingSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h1 className="text-3xl font-semibold tracking-tight">
          Inventory Management
        </h1>
        <p className="text-sm text-muted-foreground">
          Manage stock across all warehouses
        </p>
      </div>

      <div className="flex items-center justify-between">
        <div></div>
        <div className="flex gap-2">
          <Link href="/inventory/transfer">
            <Button>
              <Package className="mr-2 h-4 w-4" />
              Stock Transfer
            </Button>
          </Link>
          <Link href="/inventory/warehouses">
            <Button variant="outline">
              <Warehouse className="mr-2 h-4 w-4" />
              Manage Warehouses
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Total Stock Value
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${stats?.totalStockValue.toLocaleString() || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Across all warehouses
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Total Products
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.totalProducts || 0}
            </div>
            <p className="text-xs text-muted-foreground">Unique products</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Low Stock Items
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">
              {stats?.lowStockProducts || 0}
            </div>
            <p className="text-xs text-muted-foreground">Need restocking</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Warehouses</CardTitle>
            <Warehouse className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.totalWarehouses || 0}
            </div>
            <p className="text-xs text-muted-foreground">Active locations</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="stock" className="w-full">
        <TabsList>
          <TabsTrigger value="stock">
            Stock Levels ({filteredInventory.length})
          </TabsTrigger>
          <TabsTrigger value="transfers">
            Recent Adjustments ({adjustments.length})
          </TabsTrigger>
          <TabsTrigger value="alerts">
            Alerts ({lowStockItems.length + outOfStockItems.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="stock" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Current Inventory</CardTitle>
                  <CardDescription>
                    Stock levels across all warehouses
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search products..."
                      className="pl-8 w-[300px]"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filteredInventory.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Warehouse</TableHead>
                      <TableHead className="text-right">Quantity</TableHead>
                      <TableHead className="text-right">Value</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInventory.map((item, index) => (
                      <TableRow
                        key={`${item.productId}-${item.warehouseId}-${index}`}
                      >
                        <TableCell className="font-medium">
                          {item.productName}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {item.productSku}
                        </TableCell>
                        <TableCell>{item.warehouseName}</TableCell>
                        <TableCell className="text-right font-semibold">
                          {item.quantity}
                        </TableCell>
                        <TableCell className="text-right">
                          ${item.stockValue.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              item.status === "in_stock"
                                ? "bg-success/10 text-success"
                                : item.status === "low_stock"
                                ? "bg-warning/10 text-warning"
                                : "bg-destructive/10 text-destructive"
                            }
                          >
                            {item.status === "in_stock"
                              ? "In Stock"
                              : item.status === "low_stock"
                              ? "Low Stock"
                              : "Out of Stock"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12">
                  <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    {searchQuery
                      ? "No inventory items found matching your search"
                      : "No inventory items found"}
                  </p>
                </div>
              )}
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
              {adjustments.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Reference</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead className="text-right">Items</TableHead>
                      <TableHead className="text-right">Net Change</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {adjustments.map((adjustment) => (
                      <TableRow key={adjustment.id}>
                        <TableCell className="font-medium font-mono text-sm">
                          {adjustment.referenceNumber}
                        </TableCell>
                        <TableCell>
                          {new Date(
                            adjustment.adjustmentDate
                          ).toLocaleDateString()}
                        </TableCell>
                        <TableCell>{adjustment.user.name}</TableCell>
                        <TableCell className="text-right">
                          {adjustment.totalItems}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          <span
                            className={
                              adjustment.netChange > 0
                                ? "text-success"
                                : adjustment.netChange < 0
                                ? "text-destructive"
                                : ""
                            }
                          >
                            {adjustment.netChange > 0 ? "+" : ""}
                            {adjustment.netChange}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {adjustment.notes || "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12">
                  <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    No stock adjustments found
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Stock Alerts</CardTitle>
              <CardDescription>Items requiring attention</CardDescription>
            </CardHeader>
            <CardContent>
              {lowStockItems.length > 0 || outOfStockItems.length > 0 ? (
                <div className="flex flex-col gap-4">
                  {outOfStockItems.map((item, index) => (
                    <div
                      key={`out-${index}`}
                      className="flex items-start gap-4 p-4 border rounded-lg"
                    >
                      <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
                      <div className="flex-1">
                        <h4 className="font-semibold">Out of Stock</h4>
                        <p className="text-sm text-muted-foreground">
                          {item.productName} ({item.productSku}) is out of stock
                          in {item.warehouseName}
                        </p>
                      </div>
                      <Link href="/inventory/transfer">
                        <Button size="sm">Transfer Stock</Button>
                      </Link>
                    </div>
                  ))}
                  {lowStockItems.map((item, index) => (
                    <div
                      key={`low-${index}`}
                      className="flex items-start gap-4 p-4 border rounded-lg"
                    >
                      <AlertTriangle className="h-5 w-5 text-warning mt-0.5" />
                      <div className="flex-1">
                        <h4 className="font-semibold">Low Stock Alert</h4>
                        <p className="text-sm text-muted-foreground">
                          {item.productName} ({item.productSku}) is running low
                          in {item.warehouseName}. Current stock:{" "}
                          {item.quantity} units (Reorder level:{" "}
                          {item.reorderLevel})
                        </p>
                      </div>
                      <Link href="/purchases/new">
                        <Button size="sm">Reorder</Button>
                      </Link>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No stock alerts</p>
                  <p className="text-sm text-muted-foreground">
                    All inventory levels are healthy
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}




