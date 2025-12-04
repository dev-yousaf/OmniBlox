"use client";

import type React from "react";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Save, Plus, Trash2, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAllProducts } from "@/hooks/use-products";
import { useWarehouses } from "@/hooks/use-warehouses";
import { useStockAdjustmentService } from "../_services/stock-adjustment-service";
import { useToast } from "@/hooks/use-toast";

type AdjustmentItem = {
  id: string;
  productId: string;
  warehouseId: string;
  currentStock: number;
  newStock: number;
  difference: number;
};

export default function StockAdjustmentPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>("");
  const [items, setItems] = useState<AdjustmentItem[]>([]);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    products,
    loading: productsLoading,
    refreshing: productsRefreshing,
    error: productsError,
    reload: reloadProducts,
  } = useAllProducts();

  const {
    warehouses,
    loading: warehousesLoading,
    error: warehousesError,
    reload: reloadWarehouses,
  } = useWarehouses();

  const { createStockAdjustment } = useStockAdjustmentService();

  // Auto-select first warehouse when warehouses load
  useEffect(() => {
    if (warehouses.length > 0 && !selectedWarehouseId) {
      setSelectedWarehouseId(warehouses[0].id);
    }
  }, [warehouses, selectedWarehouseId]);

  const addItem = () => {
    if (productsLoading || products.length === 0 || !selectedWarehouseId) {
      return;
    }

    setItems((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        productId: "",
        warehouseId: selectedWarehouseId,
        currentStock: 0,
        newStock: 0,
        difference: 0,
      },
    ]);
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const updateItem = (
    id: string,
    field: keyof AdjustmentItem,
    value: unknown
  ) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) {
          return item;
        }

        const updated: AdjustmentItem = { ...item };

        if (field === "productId") {
          const nextProductId = value as string;
          updated.productId = nextProductId;
          const product = products.find((p) => p.id === nextProductId);
          updated.currentStock = product?.stock ?? 0;
          updated.warehouseId = selectedWarehouseId;
        } else if (field === "newStock") {
          const parsed = Number(value);
          updated.newStock = Number.isFinite(parsed) ? parsed : 0;
        }

        updated.difference = updated.newStock - updated.currentStock;
        return updated;
      })
    );
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (items.length === 0) {
      setSubmitError("Please add at least one adjustment item");
      return;
    }

    if (!selectedWarehouseId) {
      setSubmitError(
        "Please select a warehouse before creating the adjustment."
      );
      return;
    }

    const invalidItems = items.filter(
      (item) => !item.productId || item.newStock < 0
    );
    if (invalidItems.length > 0) {
      setSubmitError(
        "Please ensure all items have a product selected and valid stock quantities"
      );
      return;
    }

    setSaving(true);
    setSubmitError(null);

    try {
      const payload = {
        warehouseId: selectedWarehouseId,
        adjustmentDate: new Date().toISOString(),
        notes: notes.trim() || undefined,
        items: items.map((item) => ({
          productId: item.productId,
          newQuantity: item.newStock,
        })),
      };

      const result = await createStockAdjustment(payload);

      toast({
        title: "Stock Adjustment Created",
        description: `Stock adjustment has been successfully created.`,
      });

      router.push("/products");
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : "Failed to create stock adjustment"
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/products">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            Stock Adjustment
          </h1>
          <p className="text-sm text-muted-foreground">
            Adjust inventory levels for products
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 md:grid-cols-3">
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Adjustment Items</CardTitle>
              <CardDescription>
                Select a warehouse and adjust stock levels for products
              </CardDescription>
              <div className="pt-4">
                <div className="space-y-2">
                  <Label htmlFor="warehouse">Warehouse *</Label>
                  <Select
                    value={selectedWarehouseId}
                    onValueChange={(value) => {
                      setSelectedWarehouseId(value);
                      // Clear items when warehouse changes
                      setItems([]);
                    }}
                    disabled={warehousesLoading}
                  >
                    <SelectTrigger id="warehouse">
                      <SelectValue placeholder="Select warehouse" />
                    </SelectTrigger>
                    <SelectContent>
                      {warehousesLoading && (
                        <SelectItem value="LOADING" disabled>
                          Loading warehouses...
                        </SelectItem>
                      )}
                      {!warehousesLoading && warehousesError && (
                        <SelectItem value="ERROR" disabled>
                          {warehousesError}
                        </SelectItem>
                      )}
                      {!warehousesLoading &&
                        !warehousesError &&
                        warehouses.length === 0 && (
                          <SelectItem value="NO_WAREHOUSES" disabled>
                            No warehouses available
                          </SelectItem>
                        )}
                      {!warehousesLoading &&
                        !warehousesError &&
                        warehouses.map((warehouse) => (
                          <SelectItem key={warehouse.id} value={warehouse.id}>
                            {warehouse.name}
                            {warehouse.location && ` - ${warehouse.location}`}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center justify-between pt-4">
                <div>
                  <p className="text-sm font-medium">Products</p>
                  <p className="text-xs text-muted-foreground">
                    Add products to adjust their stock levels
                  </p>
                </div>
                <Button
                  type="button"
                  onClick={addItem}
                  size="sm"
                  className="gap-2"
                  disabled={
                    products.length === 0 ||
                    !selectedWarehouseId ||
                    warehousesLoading ||
                    productsLoading
                  }
                >
                  <Plus className="h-4 w-4" />
                  Add Item
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {warehousesError && (
                  <Alert variant="destructive">
                    <AlertDescription>
                      {warehousesError}
                      <Button
                        variant="link"
                        type="button"
                        onClick={() => reloadWarehouses()}
                        className="ml-2 h-auto p-0"
                      >
                        Retry
                      </Button>
                    </AlertDescription>
                  </Alert>
                )}
                {productsError && (
                  <Alert variant="destructive">
                    <AlertDescription>
                      {productsError}
                      <Button
                        variant="link"
                        type="button"
                        onClick={() => reloadProducts()}
                        className="ml-2 h-auto p-0"
                      >
                        Retry
                      </Button>
                    </AlertDescription>
                  </Alert>
                )}
                {submitError && (
                  <Alert variant="destructive">
                    <AlertDescription>{submitError}</AlertDescription>
                  </Alert>
                )}
                {items.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    {warehousesLoading || productsLoading
                      ? "Loading..."
                      : !selectedWarehouseId
                      ? "Please select a warehouse first."
                      : products.length === 0
                      ? "No products available. Add products before creating adjustments."
                      : 'No items added yet. Click "Add Item" to start.'}
                  </p>
                ) : (
                  items.map((item) => (
                    <div
                      key={item.id}
                      className="border border-border rounded-lg p-4 space-y-4"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 grid gap-4 md:grid-cols-4">
                          <div className="space-y-2">
                            <Label>Product</Label>
                            <Select
                              value={item.productId}
                              onValueChange={(value) =>
                                updateItem(item.id, "productId", value)
                              }
                              disabled={products.length === 0}
                            >
                              <SelectTrigger>
                                <SelectValue
                                  placeholder={
                                    products.length === 0
                                      ? productsLoading
                                        ? "Loading..."
                                        : "No products available"
                                      : productsRefreshing
                                      ? "Refreshing products..."
                                      : "Select product"
                                  }
                                />
                              </SelectTrigger>
                              <SelectContent>
                                {products.length === 0 && productsLoading ? (
                                  <SelectItem value="LOADING" disabled>
                                    <span className="flex items-center gap-2">
                                      <Loader2 className="h-3 w-3 animate-spin" />{" "}
                                      Loading products...
                                    </span>
                                  </SelectItem>
                                ) : products.length > 0 ? (
                                  products.map((product) => (
                                    <SelectItem
                                      key={product.id}
                                      value={product.id}
                                    >
                                      {product.name}
                                    </SelectItem>
                                  ))
                                ) : (
                                  <SelectItem value="NO_PRODUCTS" disabled>
                                    No products available
                                  </SelectItem>
                                )}
                              </SelectContent>
                            </Select>
                          </div>
                          {/* Warehouse column removed because warehouse is selected above */}
                          <div className="space-y-2">
                            <Label>Current Stock</Label>
                            <Input value={item.currentStock} disabled />
                          </div>
                          <div className="space-y-2">
                            <Label>New Stock</Label>
                            <Input
                              type="number"
                              value={item.newStock}
                              onChange={(e) =>
                                updateItem(item.id, "newStock", e.target.value)
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Difference</Label>
                            <Input
                              value={item.difference}
                              disabled
                              className={
                                item.difference > 0
                                  ? "text-success"
                                  : item.difference < 0
                                  ? "text-destructive"
                                  : ""
                              }
                            />
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeItem(item.id)}
                          className="ml-2"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Adjustment Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="Enter reason for adjustment..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={6}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-medium">Total Items</p>
                  <p className="text-2xl font-semibold">{items.length}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Net Change</p>
                  <p className="text-2xl font-semibold">
                    {items.reduce((sum, item) => sum + item.difference, 0)}
                  </p>
                </div>
              </CardContent>
            </Card>

            <div className="flex flex-col gap-2">
              <Button
                type="submit"
                disabled={
                  items.length === 0 ||
                  products.length === 0 ||
                  !selectedWarehouseId ||
                  saving
                }
                className="gap-2"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {saving ? "Saving..." : "Save Adjustment"}
              </Button>
              <Link href="/products">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full bg-transparent"
                >
                  Cancel
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
