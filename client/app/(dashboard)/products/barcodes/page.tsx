"use client";

import { useEffect, useState, useCallback } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TableLoadingSkeleton } from "@/components/ui/page-loading-skeleton";
import { ArrowLeft, Printer, Download } from "lucide-react";
import Link from "next/link";
import { useProductApi } from "@/hooks/use-product-api";
import type { Product } from "@/lib/types";

type LabelSize = "1x2" | "2x3" | "2x4";

interface LabelFields {
  name: boolean;
  sku: boolean;
  price: boolean;
  unit: boolean;
  barcode: boolean;
}

const LABEL_SIZE_MAP: Record<LabelSize, { cols: number; rows: number; label: string }> = {
  "1x2": { cols: 2, rows: 2, label: "1x2" },
  "2x3": { cols: 3, rows: 2, label: "2x3" },
  "2x4": { cols: 4, rows: 2, label: "2x4" },
};

function CssBarcode({ sku }: { sku: string }) {
  const bars = sku.split("").flatMap((char, i) => {
    const code = char.charCodeAt(0);
    const pattern = [];
    for (let j = 0; j < 8; j++) {
      pattern.push((code >> (7 - j)) & 1);
    }
    return pattern;
  });

  return (
    <div className="flex items-center overflow-hidden" style={{ gap: "1px", height: 24 }}>
      {bars.map((bit, i) => (
        <div
          key={i}
          style={{
            width: bit ? 2 : 1,
            height: "100%",
            backgroundColor: bit ? "#000" : "transparent",
            flexShrink: 0,
          }}
        />
      ))}
    </div>
  );
}

function generateLabelHtml(
  products: Product[],
  copies: Record<string, number>,
  fields: LabelFields,
  size: LabelSize
): string {
  const { cols, rows } = LABEL_SIZE_MAP[size];
  const perPage = cols * rows;
  const labelsHtml: string[] = [];

  for (const product of products) {
    const count = copies[product.id] || 0;
    for (let i = 0; i < count; i++) {
      const parts: string[] = [];
      if (fields.name) parts.push(`<div style="font-weight:bold;font-size:11px;margin-bottom:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(product.name)}</div>`);
      if (fields.sku) parts.push(`<div style="font-size:9px;color:#555;margin-bottom:2px">SKU: ${escapeHtml(product.sku)}</div>`);
      if (fields.price) parts.push(`<div style="font-size:10px;margin-bottom:2px">$${product.salePrice.toFixed(2)}</div>`);
      if (fields.unit) parts.push(`<div style="font-size:9px;color:#555;margin-bottom:2px">${escapeHtml(product.unit)}</div>`);
      if (fields.barcode) {
        const bars = product.sku.split("").flatMap((char) => {
          const code = char.charCodeAt(0);
          const pattern: number[] = [];
          for (let j = 0; j < 8; j++) pattern.push((code >> (7 - j)) & 1);
          return pattern;
        });
        const inner = bars
          .map((b) => `<div style="width:${b ? 2 : 1}px;height:100%;background:${b ? "#000" : "transparent"};flex-shrink:0"></div>`)
          .join("");
        parts.push(`<div style="display:flex;align-items:center;overflow:hidden;gap:1px;height:20px;margin-top:2px">${inner}</div>`);
      }
      labelsHtml.push(
        `<div style="border:1px solid #ccc;padding:6px;border-radius:4px;page-break-inside:avoid;display:flex;flex-direction:column;overflow:hidden">${parts.join("")}</div>`
      );
    }
  }

  const pages: string[] = [];
  for (let i = 0; i < labelsHtml.length; i += perPage) {
    const chunk = labelsHtml.slice(i, i + perPage);
    pages.push(
      `<div style="display:grid;grid-template-columns:repeat(${cols},1fr);gap:6px;padding:10px;page-break-after:always;width:100%;height:100%">${chunk.join("")}</div>`
    );
  }

  return `<!DOCTYPE html><html><head><style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family:Arial,Helvetica,sans-serif; }
    @media print {
      @page { margin: 0.5in; }
    }
  </style></head><body>${pages.join("")}</body></html>`;
}

function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.appendChild(document.createTextNode(text));
  return div.innerHTML;
}

export default function BarcodesPage() {
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [copies, setCopies] = useState<Record<string, number>>({});
  const { getProducts } = useProductApi();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [labelFields, setLabelFields] = useState<LabelFields>({
    name: true,
    sku: true,
    price: false,
    unit: false,
    barcode: true,
  });
  const [labelSize, setLabelSize] = useState<LabelSize>("1x2");

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

  const toggleField = (field: keyof LabelFields) => {
    setLabelFields((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const selectedProductObjects = products.filter((p) =>
    selectedProducts.includes(p.id)
  );
  const totalLabels = Object.values(copies).reduce((sum, count) => sum + count, 0);

  const openPrintWindow = useCallback(
    (autoPrint: boolean) => {
      const html = generateLabelHtml(
        selectedProductObjects,
        copies,
        labelFields,
        labelSize
      );
      const win = window.open("", "_blank");
      if (!win) return;
      win.document.write(html);
      win.document.close();
      if (autoPrint) {
        win.onload = () => {
          win.focus();
          win.print();
        };
      }
    },
    [selectedProductObjects, copies, labelFields, labelSize]
  );

  const handlePrint = () => {
    openPrintWindow(true);
  };

  const handleDownloadPdf = () => {
    openPrintWindow(false);
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
              {loading && <TableLoadingSkeleton rows={6} />}
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
                <p className="text-2xl font-semibold">{totalLabels}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Label Fields</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(
                [
                  { key: "name", label: "Product Name" },
                  { key: "sku", label: "SKU" },
                  { key: "price", label: "Sale Price" },
                  { key: "unit", label: "Unit" },
                  { key: "barcode", label: "Barcode" },
                ] as { key: keyof LabelFields; label: string }[]
              ).map(({ key, label }) => (
                <div key={key} className="flex items-center gap-2">
                  <Checkbox
                    id={`field-${key}`}
                    checked={labelFields[key]}
                    onCheckedChange={() => toggleField(key)}
                  />
                  <Label
                    htmlFor={`field-${key}`}
                    className="text-sm font-normal cursor-pointer"
                  >
                    {label}
                  </Label>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Label Size</CardTitle>
            </CardHeader>
            <CardContent>
              <Select
                value={labelSize}
                onValueChange={(v) => setLabelSize(v as LabelSize)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select size" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1x2">1x2 (Standard)</SelectItem>
                  <SelectItem value="2x3">2x3 (Large)</SelectItem>
                  <SelectItem value="2x4">2x4 (Shipping)</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {selectedProducts.length > 0 && totalLabels > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  className="grid gap-2"
                  style={{
                    gridTemplateColumns: `repeat(${LABEL_SIZE_MAP[labelSize].cols}, 1fr)`,
                  }}
                >
                  {selectedProductObjects.flatMap((product) => {
                    const count = copies[product.id] || 0;
                    return Array.from({ length: count }, (_, i) => (
                      <div
                        key={`${product.id}-${i}`}
                        className="border border-border rounded p-2 text-xs overflow-hidden"
                      >
                        {labelFields.name && (
                          <div className="font-semibold truncate">
                            {product.name}
                          </div>
                        )}
                        {labelFields.sku && (
                          <div className="text-muted-foreground">
                            SKU: {product.sku}
                          </div>
                        )}
                        {labelFields.price && (
                          <div>${product.salePrice.toFixed(2)}</div>
                        )}
                        {labelFields.unit && (
                          <div className="text-muted-foreground">
                            {product.unit}
                          </div>
                        )}
                        {labelFields.barcode && (
                          <div className="mt-1">
                            <CssBarcode sku={product.sku} />
                          </div>
                        )}
                      </div>
                    ));
                  })}
                </div>
              </CardContent>
            </Card>
          )}

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
              onClick={handleDownloadPdf}
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
