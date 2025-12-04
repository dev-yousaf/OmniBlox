"use client";

import { useEffect, useState } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Printer, Download } from "lucide-react";
import Link from "next/link";
import { useProductApi } from "@/hooks/use-product-api";
import type { Product } from "@/lib/types";

export default function BarcodesPage() {
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [copies, setCopies] = useState<Record<string, number>>({});
  const { getProducts } = useProductApi();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const { products: list } = await getProducts({ page: 1, limit: 200 });
        if (!cancelled) setProducts(list || []);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Failed to load products");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [getProducts]);

  const toggleProduct = (id: string) => {
    setSelectedProducts((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
    if (!copies[id]) {
      setCopies({ ...copies, [id]: 1 });
    }
  };

  const handlePrint = () => {
    console.log("Printing barcodes for:", selectedProducts, copies);
    window.print();
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
            Barcode Labels
          </h1>
          <p className="text-sm text-muted-foreground">
            Generate and print product barcode labels
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Select Products</CardTitle>
            <CardDescription>
              Choose products and specify number of labels
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {loading && (
                <div className="text-sm text-muted-foreground">
                  Loading products...
                </div>
              )}
              {!loading && error && (
                <div className="text-sm text-destructive">{error}</div>
              )}
              {!loading && !error && products.length === 0 && (
                <div className="text-sm text-muted-foreground">
                  No products found.
                </div>
              )}
              {!loading &&
                !error &&
                products.map((product) => (
                  <div
                    key={product.id}
                    className="flex items-center justify-between border-b border-border pb-4 last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={selectedProducts.includes(product.id)}
                        onCheckedChange={() => toggleProduct(product.id)}
                      />
                      <div>
                        <p className="font-medium">{product.name}</p>
                        <p className="text-sm text-muted-foreground">
                          SKU: {product.sku}
                        </p>
                      </div>
                    </div>
                    {selectedProducts.includes(product.id) && (
                      <div className="flex items-center gap-2">
                        <Label
                          htmlFor={`copies-${product.id}`}
                          className="text-sm"
                        >
                          Copies:
                        </Label>
                        <Input
                          id={`copies-${product.id}`}
                          type="number"
                          min="1"
                          value={copies[product.id] || 1}
                          onChange={(e) =>
                            setCopies({
                              ...copies,
                              [product.id]: Number(e.target.value),
                            })
                          }
                          className="w-20"
                        />
                      </div>
                    )}
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium">Selected Products</p>
                <p className="text-2xl font-semibold">
                  {selectedProducts.length}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium">Total Labels</p>
                <p className="text-2xl font-semibold">
                  {Object.values(copies).reduce((sum, count) => sum + count, 0)}
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-col gap-2">
            <Button
              onClick={handlePrint}
              disabled={selectedProducts.length === 0}
              className="gap-2"
            >
              <Printer className="h-4 w-4" />
              Print Labels
            </Button>
            <Button
              variant="outline"
              disabled={selectedProducts.length === 0}
              className="gap-2 bg-transparent"
            >
              <Download className="h-4 w-4" />
              Download PDF
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
