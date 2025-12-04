"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { Product } from "@/lib/types"
import { mockStockLedger } from "@/lib/mock-data"
import { ArrowDown, ArrowUp } from "lucide-react"

interface ProductDetailTabsProps {
  product: Product
}

export function ProductDetailTabs({ product }: ProductDetailTabsProps) {
  const stockLedger = mockStockLedger[product.id] || []
  const isLowStock = product.stock <= product.reorderLevel
  const margin = ((product.price - product.cost) / product.price) * 100

  return (
    <Tabs defaultValue="overview" className="space-y-4">
      <TabsList>
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="inventory">Inventory</TabsTrigger>
        <TabsTrigger value="ledger">Stock Ledger</TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Selling Price</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">
                ${product.price.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Cost Price</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">
                ${product.cost.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Margin</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">{margin.toFixed(1)}%</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Category</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">{product.category}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Product Information</CardTitle>
            <CardDescription>Basic details about this product</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <div className="text-sm font-medium text-muted-foreground">SKU</div>
                <div className="mt-1 font-mono text-sm">{product.sku}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">Status</div>
                <div className="mt-1">
                  <Badge variant={product.status === "active" ? "default" : "secondary"} className="capitalize">
                    {product.status}
                  </Badge>
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">Created</div>
                <div className="mt-1 text-sm">{new Date(product.createdAt).toLocaleDateString()}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">Last Updated</div>
                <div className="mt-1 text-sm">{new Date(product.updatedAt).toLocaleDateString()}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="inventory" className="space-y-4">
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Current Stock</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-2xl font-semibold">{product.stock}</div>
                {isLowStock && (
                  <Badge variant="destructive" className="text-xs">
                    Low Stock
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Reorder Level</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">{product.reorderLevel}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Stock Value</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">
                ${(product.stock * product.cost).toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Inventory Status</CardTitle>
            <CardDescription>Current stock levels and alerts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLowStock ? (
              <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
                <div className="flex items-start gap-3">
                  <div className="rounded-full bg-destructive/20 p-2">
                    <ArrowDown className="h-4 w-4 text-destructive" />
                  </div>
                  <div>
                    <div className="font-medium text-destructive">Low Stock Alert</div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      Current stock ({product.stock}) is at or below the reorder level ({product.reorderLevel}).
                      Consider restocking soon.
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-green-500/50 bg-green-500/10 p-4">
                <div className="flex items-start gap-3">
                  <div className="rounded-full bg-green-500/20 p-2">
                    <ArrowUp className="h-4 w-4 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <div className="font-medium text-green-600 dark:text-green-400">Stock Healthy</div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      Current stock levels are above the reorder threshold.
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="ledger" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Stock Ledger</CardTitle>
            <CardDescription>Complete transaction history for this product</CardDescription>
          </CardHeader>
          <CardContent>
            {stockLedger.length > 0 ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead className="text-right">Quantity</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stockLedger.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell className="font-medium">{new Date(entry.date).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              entry.type === "purchase" ? "default" : entry.type === "sale" ? "secondary" : "outline"
                            }
                            className="capitalize"
                          >
                            {entry.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-sm">{entry.reference}</TableCell>
                        <TableCell
                          className={`text-right font-medium ${entry.quantity > 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
                        >
                          {entry.quantity > 0 ? "+" : ""}
                          {entry.quantity}
                        </TableCell>
                        <TableCell className="text-right font-medium">{entry.balance}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{entry.notes}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
                No stock transactions yet
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}
