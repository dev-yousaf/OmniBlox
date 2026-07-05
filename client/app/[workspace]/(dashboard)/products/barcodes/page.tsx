"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Search, RefreshCw, ChevronUp, ChevronRight, Printer, Eye, Power,
  FileText, Loader2,
} from "lucide-react";
import { useProductApi } from "@/hooks/use-product-api";
import { useWarehouses } from "@/hooks/use-warehouses";
import type { Product } from "@/lib/types";
import QRCode from "qrcode";

type LabelSize = "1x2" | "2x3" | "2x4";

const LABEL_SIZE_MAP: Record<LabelSize, { cols: number; rows: number; label: string }> = {
  "1x2": { cols: 2, rows: 2, label: "1x2" },
  "2x3": { cols: 3, rows: 2, label: "2x3" },
  "2x4": { cols: 4, rows: 2, label: "2x4" },
};

function generateLabelHtml(
  products: Product[],
  copies: Record<string, number>,
  showStoreName: boolean,
  showProductName: boolean,
  showPrice: boolean,
  size: LabelSize,
): string {
  const { cols, rows } = LABEL_SIZE_MAP[size];
  const perPage = cols * rows;
  const labelsHtml: string[] = [];

  for (const product of products) {
    const count = copies[product.id] || 0;
    for (let i = 0; i < count; i++) {
      const parts: string[] = [];
      if (showProductName) {
        parts.push(`<div style="font-weight:bold;font-size:11px;margin-bottom:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(product.name)}</div>`);
      }
      if (showStoreName) {
        parts.push(`<div style="font-size:9px;color:#555;margin-bottom:2px">SKU: ${escapeHtml(product.sku)}</div>`);
      }
      if (showPrice) {
        parts.push(`<div style="font-size:10px;margin-bottom:2px">$${product.salePrice.toFixed(2)}</div>`);
      }
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
      labelsHtml.push(
        `<div style="border:1px solid #ccc;padding:6px;border-radius:4px;page-break-inside:avoid;display:flex;flex-direction:column;overflow:hidden">${parts.join("")}</div>`,
      );
    }
  }

  const pages: string[] = [];
  for (let i = 0; i < labelsHtml.length; i += perPage) {
    const chunk = labelsHtml.slice(i, i + perPage);
    pages.push(
      `<div style="display:grid;grid-template-columns:repeat(${cols},1fr);gap:6px;padding:10px;page-break-after:always;width:100%;height:100%">${chunk.join("")}</div>`,
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
  const { getProducts } = useProductApi();
  const { warehouses, loading: warehousesLoading } = useWarehouses();

  const [warehouseId, setWarehouseId] = useState("");
  const [searchCode, setSearchCode] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copies, setCopies] = useState<Record<string, number>>({});
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [showStoreName, setShowStoreName] = useState(true);
  const [showProductName, setShowProductName] = useState(true);
  const [showPrice, setShowPrice] = useState(true);
  const [labelSize, setLabelSize] = useState<LabelSize>("1x2");

  const loadProducts = useCallback(async () => {
    if (!warehouseId) {
      setProducts([]);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const filters: any = { page: 1, limit: 500, warehouseId };
      if (searchCode.trim()) filters.search = searchCode.trim();
      const { products: list } = await getProducts(filters);
      setProducts(list || []);
      setCopies({});
      setSelectedIds(new Set());
    } catch (e: any) {
      setError(e?.message || "Failed to load products");
    } finally {
      setLoading(false);
    }
  }, [warehouseId, searchCode, getProducts]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
    if (!copies[id]) {
      setCopies((prev) => ({ ...prev, [id]: 1 }));
    }
  };

  const toggleAll = () => {
    if (selectedIds.size === products.length && products.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(products.map((p) => p.id)));
    }
  };

  const handleCopyChange = (id: string, value: number) => {
    setCopies((prev) => ({ ...prev, [id]: Math.max(1, value) }));
  };

  const selectedProducts = products.filter((p) => selectedIds.has(p.id));
  const totalLabels = Array.from(selectedIds).reduce((sum, id) => sum + (copies[id] || 0), 0);

  const openPrintWindow = useCallback(
    (autoPrint: boolean) => {
      if (selectedProducts.length === 0) return;
      const html = generateLabelHtml(
        selectedProducts,
        copies,
        showStoreName,
        showProductName,
        showPrice,
        labelSize,
      );
      const win = window.open("", "_blank");
      if (!win) return;
      win.document.write(html);
      win.document.close();
      if (autoPrint) {
        setTimeout(() => {
          win.focus();
          win.print();
        }, 500);
      }
    },
    [selectedProducts, copies, showStoreName, showProductName, showPrice, labelSize],
  );

  const handlePrint = () => openPrintWindow(true);

  const handleGenerateQR = async () => {
    if (selectedProducts.length === 0) return;
    const qrItems: { name: string; sku: string; dataUrl: string }[] = [];
    for (const product of selectedProducts) {
      try {
        const dataUrl = await QRCode.toDataURL(product.sku, {
          width: 200,
          margin: 1,
          color: { dark: "#000000", light: "#ffffff" },
        });
        qrItems.push({ name: product.name, sku: product.sku, dataUrl });
      } catch {
        // skip if QR generation fails
      }
    }
    if (qrItems.length === 0) return;
    const html = `<!DOCTYPE html><html><head><style>
      * { margin:0; padding:0; box-sizing:border-box; }
      body { font-family:Arial,Helvetica,sans-serif; padding:20px; }
    </style></head><body>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px;max-width:800px">
        ${qrItems.map((item) => `<div style="text-align:center"><img src="${item.dataUrl}" style="width:150px;height:150px" /><div style="font-size:10px;margin-top:4px">${escapeHtml(item.name)}</div></div>`).join("")}
      </div>
    </body></html>`;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(html);
    win.document.close();
  };

  const handleReset = () => {
    setWarehouseId("");
    setSearchCode("");
    setProducts([]);
    setCopies({});
    setSelectedIds(new Set());
    setShowStoreName(true);
    setShowProductName(true);
    setShowPrice(true);
    setLabelSize("1x2");
  };

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-1 text-sm text-muted-foreground mb-0.5">
            <span>Dashboard</span>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="text-foreground">Print Barcode</span>
          </div>
          <h1 className="text-[18px] font-bold text-foreground">Print Barcode</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="h-[34px] w-[34px] rounded-[5px]" title="Refresh" onClick={loadProducts}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" className="h-[34px] w-[34px] rounded-[5px]" title="Collapse">
            <ChevronUp className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Main Card */}
      <div className="border rounded-[5px] bg-card shadow-sm p-5">
        <div className="space-y-4">

          {/* Row 1: Warehouse select */}
          <div className="max-w-[616px] space-y-[4px]">
            <label className="text-[14px] font-medium text-foreground">
              Warehouse <span className="text-red-500">*</span>
            </label>
            <Select value={warehouseId} onValueChange={setWarehouseId}>
              <SelectTrigger className="h-[38px] rounded-[5px] px-3 py-[7px] text-[14px]">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                {warehousesLoading ? (
                  <SelectItem value="__loading" disabled>Loading...</SelectItem>
                ) : warehouses.length === 0 ? (
                  <SelectItem value="__none" disabled>No warehouses</SelectItem>
                ) : (
                  warehouses.map((w) => (
                    <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Row 2: Product search */}
          <div className="max-w-[616px] space-y-[4px]">
            <label className="text-[14px] font-medium text-foreground">
              Product <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-2 h-[38px] rounded-[5px] border border-border px-3 py-[7px] bg-card">
              <Search className="h-[14px] w-[14px] text-muted-foreground shrink-0" />
              <input
                className="flex-1 bg-transparent text-[14px] outline-none placeholder:text-muted-foreground"
                placeholder="Search Product by Code"
                value={searchCode}
                onChange={(e) => setSearchCode(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") loadProducts(); }}
              />
            </div>
          </div>

          {/* Products Table */}
          <div className="bg-muted/50 rounded-[5px] p-4 w-full">
            {/* Table Header */}
            <div className="bg-muted rounded-tl-[5px] rounded-tr-[5px] px-[15px] py-[15px]">
              <div className="flex items-center gap-[44px]">
                <div className="flex items-center w-[245px] gap-2">
                  <Checkbox
                    checked={selectedIds.size === products.length && products.length > 0}
                    onCheckedChange={toggleAll}
                  />
                  <span className="text-[14px] font-semibold text-foreground">Product</span>
                </div>
                <span className="text-[14px] font-semibold text-foreground w-[114px]">SKU</span>
                <span className="text-[14px] font-semibold text-foreground w-[151px]">Code</span>
                <span className="text-[14px] font-semibold text-foreground w-[404px]">Qty</span>
              </div>
            </div>

            {/* Table Body */}
            <div className="relative min-h-[70px]">
              {loading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : error ? (
                <div className="text-sm text-destructive text-center py-10">{error}</div>
              ) : !warehouseId ? (
                <div className="flex items-center justify-center gap-2 py-[23px] text-muted-foreground">
                  <FileText className="h-4 w-4" />
                  <span className="text-[14px] font-medium">Select a warehouse to view products</span>
                </div>
              ) : products.length === 0 ? (
                <div className="flex items-center justify-center gap-2 py-[23px] text-muted-foreground">
                  <FileText className="h-4 w-4" />
                  <span className="text-[14px] font-medium">No Data Available</span>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {products.map((product) => (
                    <div key={product.id} className="flex items-center px-[15px] py-[15px] min-h-[70px]">
                      <div className="flex items-center gap-2 w-[245px]">
                        <Checkbox
                          checked={selectedIds.has(product.id)}
                          onCheckedChange={() => toggleSelect(product.id)}
                        />
                        <span className="text-[14px] text-foreground truncate">{product.name}</span>
                      </div>
                      <span className="text-[14px] text-muted-foreground w-[114px]">{product.sku}</span>
                      <span className="text-[14px] text-muted-foreground w-[151px]">{product.itemCode || "-"}</span>
                      <div className="w-[404px]">
                        {selectedIds.has(product.id) ? (
                          <Input
                            type="number"
                            min="1"
                            value={copies[product.id] || 1}
                            onChange={(e) => handleCopyChange(product.id, Number(e.target.value))}
                            className="h-[34px] w-[80px] rounded-[5px] text-[14px]"
                          />
                        ) : (
                          <span className="text-[14px] text-muted-foreground">-</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Row 3: Paper Size + Toggles */}
          <div className="flex gap-6 items-end">
            <div className="flex-1 max-w-[538px] space-y-[4px]">
              <label className="text-[14px] font-medium text-foreground">
                Paper Size <span className="text-red-500">*</span>
              </label>
              <Select value={labelSize} onValueChange={(v) => setLabelSize(v as LabelSize)}>
                <SelectTrigger className="h-[38px] rounded-[5px] px-3 py-[7px] text-[14px]">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1x2">1x2 (Standard)</SelectItem>
                  <SelectItem value="2x3">2x3 (Large)</SelectItem>
                  <SelectItem value="2x4">2x4 (Shipping)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-[25px] items-end">
              <div className="flex flex-col gap-[4px] w-[196px]">
                <span className="text-[14px] font-medium text-foreground">Show Store Name</span>
                <Switch checked={showStoreName} onCheckedChange={setShowStoreName} />
              </div>
              <div className="flex flex-col gap-[4px] w-[196px]">
                <span className="text-[14px] font-medium text-foreground">Show Product Name</span>
                <Switch checked={showProductName} onCheckedChange={setShowProductName} />
              </div>
              <div className="flex flex-col gap-[4px] flex-1 min-w-[96px]">
                <span className="text-[14px] font-medium text-foreground">Show Price</span>
                <Switch checked={showPrice} onCheckedChange={setShowPrice} />
              </div>
            </div>
          </div>

          {/* Divider */}
          <hr className="border-t border-border" />

          {/* Buttons */}
          <div className="flex items-center justify-end gap-[15px]">
            <Button
              onClick={handleGenerateQR}
              disabled={selectedProducts.length === 0}
              className="h-[34px] rounded-[5px] bg-primary hover:bg-primary/90 text-primary-foreground text-[13px] font-medium px-3 gap-1"
            >
              <Eye className="h-[13px] w-[13px]" />
              Generate QR Code
            </Button>
            <Button
              onClick={handleReset}
              variant="secondary"
              className="h-[34px] rounded-[5px] bg-[#092c4c] hover:bg-[#092c4c]/90 text-white text-[13px] font-medium px-3 gap-1"
            >
              <Power className="h-[13px] w-[13px]" />
              Reset Barcode
            </Button>
            <Button
              onClick={handlePrint}
              disabled={selectedProducts.length === 0}
              className="h-[34px] rounded-[5px] bg-destructive hover:bg-destructive/90 text-destructive-foreground text-[13px] font-medium px-3 gap-1"
            >
              <Printer className="h-[13px] w-[13px]" />
              Print Barcode
            </Button>
          </div>

        </div>
      </div>
    </div>
  );
}
