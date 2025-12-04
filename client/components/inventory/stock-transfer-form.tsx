"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Package, MapPin, ArrowRight, CheckCircle2 } from "lucide-react";
import { useProductApi } from "@/hooks/use-product-api";
import {
  useInventoryApi,
  type Warehouse,
  type StockTransferData,
} from "@/hooks/use-inventory-api";
import type { Product } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";

export function StockTransferForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form data
  const [productId, setProductId] = useState("");
  const [fromWarehouseId, setFromWarehouseId] = useState("");
  const [toWarehouseId, setToWarehouseId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");

  // Data
  const { getProducts } = useProductApi();
  const { getWarehouses, transferStock } = useInventoryApi();
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingWarehouses, setLoadingWarehouses] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoadingProducts(true);
        setLoadingWarehouses(true);
        setLoadError(null);

        const [{ products: list }, warehouseList] = await Promise.all([
          getProducts({ page: 1, limit: 100 }),
          getWarehouses(),
        ]);

        if (!cancelled) {
          setProducts(list || []);
          setWarehouses(warehouseList || []);
        }
      } catch (e: any) {
        if (!cancelled) setLoadError(e?.message || "Failed to load data");
      } finally {
        if (!cancelled) {
          setLoadingProducts(false);
          setLoadingWarehouses(false);
        }
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [getProducts, getWarehouses]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!productId || !fromWarehouseId || !toWarehouseId || quantity <= 0) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    if (fromWarehouseId === toWarehouseId) {
      toast({
        title: "Validation Error",
        description: "Source and destination warehouses must be different.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const transferData: StockTransferData = {
        productId,
        fromWarehouseId,
        toWarehouseId,
        quantity,
        notes: notes.trim() || undefined,
      };

      await transferStock(transferData);

      toast({
        title: "Transfer Created",
        description: "Stock transfer has been processed successfully.",
      });

      router.push("/inventory");
    } catch (e: any) {
      toast({
        title: "Transfer Failed",
        description: e?.message || "Failed to create stock transfer.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedProduct = products.find((p) => p.id === productId);
  const fromWarehouse = warehouses.find((w) => w.id === fromWarehouseId);
  const toWarehouse = warehouses.find((w) => w.id === toWarehouseId);

  const isLoading = loadingProducts || loadingWarehouses;

  if (loadError) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-destructive">{loadError}</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Stock Transfer
          </CardTitle>
          <CardDescription>
            Transfer inventory between warehouses
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Product Selection */}
            <div className="space-y-2">
              <Label htmlFor="product">Product *</Label>
              <Select
                value={productId}
                onValueChange={setProductId}
                disabled={isLoading || isSubmitting}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a product" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      <div className="flex flex-col">
                        <span>{product.name}</span>
                        <span className="text-xs text-muted-foreground">
                          SKU: {product.sku} | Stock: {product.stock}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Warehouse Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fromWarehouse">From Warehouse *</Label>
                <Select
                  value={fromWarehouseId}
                  onValueChange={setFromWarehouseId}
                  disabled={isLoading || isSubmitting}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Source warehouse" />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses.map((warehouse) => (
                      <SelectItem key={warehouse.id} value={warehouse.id}>
                        <div className="flex flex-col">
                          <span>{warehouse.name}</span>
                          {warehouse.location && (
                            <span className="text-xs text-muted-foreground">
                              {warehouse.location}
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="toWarehouse">To Warehouse *</Label>
                <Select
                  value={toWarehouseId}
                  onValueChange={setToWarehouseId}
                  disabled={isLoading || isSubmitting}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Destination warehouse" />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses
                      .filter((w) => w.id !== fromWarehouseId)
                      .map((warehouse) => (
                        <SelectItem key={warehouse.id} value={warehouse.id}>
                          <div className="flex flex-col">
                            <span>{warehouse.name}</span>
                            {warehouse.location && (
                              <span className="text-xs text-muted-foreground">
                                {warehouse.location}
                              </span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Quantity */}
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity *</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                disabled={isSubmitting}
                placeholder="Enter quantity to transfer"
              />
              {selectedProduct && (
                <p className="text-xs text-muted-foreground">
                  Available stock: {selectedProduct.stock}
                </p>
              )}
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={isSubmitting}
                placeholder="Add any notes about this transfer..."
                rows={3}
              />
            </div>

            {/* Transfer Summary */}
            {productId && fromWarehouseId && toWarehouseId && (
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <h4 className="font-semibold">Transfer Summary</h4>
                <div className="flex items-center gap-2 text-sm">
                  <Package className="h-4 w-4" />
                  <span>{selectedProduct?.name}</span>
                  <span className="text-muted-foreground"> {quantity}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4" />
                  <span>{fromWarehouse?.name}</span>
                  <ArrowRight className="h-4 w-4" />
                  <span>{toWarehouse?.name}</span>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  isSubmitting ||
                  isLoading ||
                  !productId ||
                  !fromWarehouseId ||
                  !toWarehouseId ||
                  quantity <= 0 ||
                  fromWarehouseId === toWarehouseId
                }
              >
                {isSubmitting ? (
                  "Processing..."
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Create Transfer
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
