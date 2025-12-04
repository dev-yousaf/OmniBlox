"use client";

import type React from "react";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, ArrowRight, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useInventoryApi, type Warehouse } from "@/hooks/use-inventory-api";
import {
  useProductApi,
  type ProductListResponse,
} from "@/hooks/use-product-api";
import { useToast } from "@/hooks/use-toast";

interface TransferItem {
  id: string;
  productId: string;
  quantity: number;
}

export default function StockTransferPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { getWarehouses, transferStock, getWarehouseInventory } =
    useInventoryApi();
  const { getProducts } = useProductApi();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [products, setProducts] = useState<ProductListResponse["products"]>([]);
  const [fromWarehouse, setFromWarehouse] = useState("");
  const [toWarehouse, setToWarehouse] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<TransferItem[]>([
    { id: "1", productId: "", quantity: 1 },
  ]);
  const [productAvailability, setProductAvailability] = useState<
    Record<string, number>
  >({});

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const [warehousesData, productsData] = await Promise.all([
        getWarehouses(),
        getProducts({ limit: 500 }),
      ]);
      setWarehouses(warehousesData);
      setProducts(productsData.products);
    } catch (error) {
      console.error("Failed to load data:", error);
      toast({
        title: "Error",
        description: "Failed to load warehouses and products",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  // Load availability for source warehouse and clamp quantities
  useEffect(() => {
    (async () => {
      if (!fromWarehouse) {
        setProductAvailability({});
        setItems((prev) => prev.map((row) => ({ ...row, quantity: 0 })));
        return;
      }
      try {
        const data = await getWarehouseInventory(fromWarehouse);
        const map: Record<string, number> = {};
        for (const row of data.inventory || []) {
          map[row.productId] = row.quantity;
        }
        setProductAvailability(map);
        setItems((prev) =>
          prev.map((row) => {
            const avail = map[row.productId] ?? 0;
            const nextQty = avail <= 0 ? 0 : Math.min(row.quantity, avail);
            return { ...row, quantity: nextQty };
          })
        );
      } catch (e) {
        setProductAvailability({});
        setItems((prev) => prev.map((row) => ({ ...row, quantity: 0 })));
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromWarehouse]);

  const addItem = () => {
    setItems([
      ...items,
      { id: Date.now().toString(), productId: "", quantity: 1 },
    ]);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter((item) => item.id !== id));
    }
  };

  const updateItem = (id: string, field: keyof TransferItem, value: any) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          return { ...item, [field]: value };
        }
        return item;
      })
    );
    if (field === "productId") {
      const avail = productAvailability[value as string] ?? 0;
      setItems((prev) =>
        prev.map((row) =>
          row.id === id
            ? {
                ...row,
                quantity: avail <= 0 ? 0 : Math.min(row.quantity, avail),
              }
            : row
        )
      );
    }
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!fromWarehouse || !toWarehouse) {
      toast({
        title: "Validation Error",
        description: "Please select both source and destination warehouses",
        variant: "destructive",
      });
      return;
    }

    if (fromWarehouse === toWarehouse) {
      toast({
        title: "Validation Error",
        description: "Source and destination warehouses must be different",
        variant: "destructive",
      });
      return;
    }

    const validItems = items.filter(
      (item) => item.productId && item.quantity > 0
    );
    if (validItems.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please add at least one product to transfer",
        variant: "destructive",
      });
      return;
    }

    const insufficient = validItems.filter((it) => {
      const available = productAvailability[it.productId] ?? 0;
      return it.quantity > available;
    });
    if (insufficient.length > 0) {
      toast({
        title: "Insufficient stock",
        description:
          "One or more items exceed available quantity in the source warehouse.",
        variant: "destructive",
      });
      return;
    }

    try {
      setSubmitting(true);
      for (const item of validItems) {
        await transferStock({
          productId: item.productId,
          fromWarehouseId: fromWarehouse,
          toWarehouseId: toWarehouse,
          quantity: item.quantity,
          notes: notes || undefined,
        });
      }
      toast({
        title: "Success",
        description: `Successfully transferred ${validItems.length} item(s)`,
      });
      router.push("/inventory");
    } catch (error: any) {
      const message =
        error?.message || "Failed to transfer stock. Please try again.";
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <div className="flex items-center gap-4">
          <Link href="/inventory">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">
              Stock Transfer
            </h1>
            <p className="text-sm text-muted-foreground">
              Transfer inventory between warehouses
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Transfer Information</CardTitle>
            <CardDescription>
              Select source and destination warehouses
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="fromWarehouse">
                  From Warehouse <span className="text-destructive">*</span>
                </Label>
                <Select value={fromWarehouse} onValueChange={setFromWarehouse}>
                  <SelectTrigger id="fromWarehouse">
                    <SelectValue placeholder="Select source warehouse" />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses.map((warehouse) => (
                      <SelectItem key={warehouse.id} value={warehouse.id}>
                        {warehouse.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="toWarehouse">
                  To Warehouse <span className="text-destructive">*</span>
                </Label>
                <Select value={toWarehouse} onValueChange={setToWarehouse}>
                  <SelectTrigger id="toWarehouse">
                    <SelectValue placeholder="Select destination warehouse" />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses.map((warehouse) => (
                      <SelectItem
                        key={warehouse.id}
                        value={warehouse.id}
                        disabled={warehouse.id === fromWarehouse}
                      >
                        {warehouse.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Additional notes about this transfer"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Transfer Items</CardTitle>
                <CardDescription>Add items to transfer</CardDescription>
              </div>
              <Button type="button" onClick={addItem} size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Add Item
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex gap-4 items-end border-b pb-4 last:border-0"
                >
                  <div className="flex-1 grid gap-4 md:grid-cols-3">
                    <div className="flex flex-col gap-2 md:col-span-2">
                      <Label>
                        Product <span className="text-destructive">*</span>
                      </Label>
                      <Select
                        value={item.productId}
                        onValueChange={(value) =>
                          updateItem(item.id, "productId", value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select product" />
                        </SelectTrigger>
                        <SelectContent>
                          {products.map((product) => {
                            const avail = productAvailability[product.id] ?? 0;
                            const disabled = !!fromWarehouse && avail <= 0;
                            return (
                              <SelectItem
                                key={product.id}
                                value={product.id}
                                disabled={disabled}
                              >
                                {product.name} ({product.sku})
                                {fromWarehouse ? `  ${avail} available` : ""}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex flex-col gap-2">
                      <Label>
                        Quantity <span className="text-destructive">*</span>
                      </Label>
                      {(() => {
                        const available = productAvailability[item.productId];
                        const hasAvail = typeof available === "number";
                        const isDisabled =
                          !item.productId ||
                          !fromWarehouse ||
                          (hasAvail && available <= 0);
                        return (
                          <Input
                            type="number"
                            min={hasAvail && available > 0 ? 1 : undefined}
                            max={
                              hasAvail && available > 0 ? available : undefined
                            }
                            value={item.quantity}
                            onChange={(e) =>
                              updateItem(
                                item.id,
                                "quantity",
                                Number.parseInt(e.target.value) || 0
                              )
                            }
                            required={hasAvail && available > 0}
                            disabled={isDisabled}
                          />
                        );
                      })()}
                      <p className="text-xs text-muted-foreground">
                        {!fromWarehouse
                          ? "Select source warehouse"
                          : !item.productId
                          ? "Select product"
                          : (productAvailability[item.productId] ?? 0) <= 0
                          ? "No stock available in source"
                          : `Available in source: ${
                              productAvailability[item.productId]
                            }`}
                      </p>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => removeItem(item.id)}
                    disabled={items.length === 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Link href="/inventory">
            <Button type="button" variant="outline" disabled={submitting}>
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Creating Transfer..." : "Create Transfer"}
            {!submitting && <ArrowRight className="ml-2 h-4 w-4" />}
          </Button>
        </div>
      </form>
    </div>
  );
}
