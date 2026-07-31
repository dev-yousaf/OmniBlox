"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useProductApi } from "@/hooks/use-product-api";
import { useVariantAttributesApi } from "@/hooks/use-variant-attributes-api";
import type { Product } from "@/lib/types";

export interface VariantAttributeRow {
  id?: string;
  name: string;
  values: string;
}

export interface VariantDraft {
  id: string;
  combo: string;
  sku: string;
  name: string;
  attributes?: Record<string, string>;
  salePrice: string;
  costPrice: string;
  stock: string;
}

export interface VariantPayload {
  sku: string;
  name: string;
  salePrice: number;
  costPrice: number;
  stock: number;
  attributes?: Record<string, string>;
}

export interface VariantStockInput {
  warehouseId: string;
  warehouseName: string;
  quantity: string;
}

export interface ExistingVariantRow {
  product: Product;
  salePrice: string;
  costPrice: string;
  stocks: VariantStockInput[];
  initialStocks: Record<string, number>;
  dirty: boolean;
}

export interface UseProductVariantsOptions {
  parentId?: string;
  parentName: string;
  parentSku: string;
  parentCategory?: string;
  warehouseId?: string;
  defaultSalePrice?: string;
  defaultCostPrice?: string;
  initialAttributes?: Record<string, string> | null;
}

const getAttrValues = (values: string): string[] =>
  values
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);

export function useProductVariants({
  parentId,
  parentName,
  parentSku,
  parentCategory,
  warehouseId,
  defaultSalePrice = "",
  defaultCostPrice = "",
  initialAttributes,
}: UseProductVariantsOptions) {
  const {
    getVariants,
    createProduct,
    updateProduct,
    deleteProduct,
    updateStock,
  } = useProductApi();
  const { getVariantAttributes } = useVariantAttributesApi();

  const [attributes, setAttributes] = useState<VariantAttributeRow[]>([]);
  const [drafts, setDrafts] = useState<VariantDraft[]>([]);
  const [presets, setPresets] = useState<VariantAttributeRow[]>([]);
  const [rows, setRows] = useState<ExistingVariantRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    const seed = (attrs?: Record<string, string> | null) => {
      if (!attrs || Object.keys(attrs).length === 0) return;
      setAttributes(
        Object.entries(attrs).map(([name, values]) => ({
          id: `seed-${name}`,
          name,
          values,
        })),
      );
    };
    if (initialAttributes) {
      seed(initialAttributes);
    } else if (typeof initialAttributes === "string") {
      try {
        seed(JSON.parse(initialAttributes as string));
      } catch {
        // ignore malformed seed
      }
    }
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await getVariantAttributes();
        if (!active) return;
        setPresets((data as unknown as VariantAttributeRow[]).map((a) => ({
          id: a.id,
          name: a.name,
          values: Array.isArray(a.values) ? (a.values as string[]).join(", ") : String(a.values ?? ""),
        })));
      } catch {
        // presets are optional
      }
    })();
    return () => {
      active = false;
    };
  }, [getVariantAttributes]);

  const refresh = useCallback(async () => {
    if (!parentId) return;
    setLoading(true);
    try {
      const variants = await getVariants(parentId);
      setRows(
        variants.map((v) => {
          const stocks = (v.inventory && v.inventory.length > 0
            ? v.inventory
            : v.stock > 0
              ? [{ warehouseId: "", warehouseName: "Default", quantity: v.stock }]
              : []
          ).map((s) => ({
            warehouseId: s.warehouseId,
            warehouseName: s.warehouseName,
            quantity: String(s.quantity),
          }));
          const initialStocks: Record<string, number> = {};
          stocks.forEach((s) => {
            initialStocks[s.warehouseId] = parseInt(s.quantity) || 0;
          });
          return {
            product: v,
            salePrice: String(v.salePrice ?? ""),
            costPrice: String(v.costPrice ?? ""),
            stocks,
            initialStocks,
            dirty: false,
          };
        }),
      );
    } catch {
      // surface via parent component toast on demand
    } finally {
      setLoading(false);
    }
  }, [parentId, getVariants]);

  useEffect(() => {
    if (parentId) refresh();
  }, [parentId, refresh]);

  const addAttribute = () => {
    setAttributes((prev) => [...prev, { name: "", values: "" }]);
  };

  const updateAttribute = (index: number, field: keyof VariantAttributeRow, value: string) => {
    setAttributes((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
    setDrafts([]);
  };

  const removeAttribute = (index: number) => {
    setAttributes((prev) => prev.filter((_, i) => i !== index));
    setDrafts([]);
  };

  const applyPreset = (preset: VariantAttributeRow) => {
    setAttributes((prev) =>
      prev.some((a) => a.name === preset.name)
        ? prev
        : [...prev, { id: preset.id, name: preset.name, values: preset.values }],
    );
    setDrafts([]);
  };

  const cartesianProduct = (arrays: string[][]): string[][] => {
    if (arrays.length === 0) return [[]];
    return arrays.reduce<string[][]>(
      (acc, curr) => acc.flatMap((a) => curr.map((c) => [...a, c])),
      [[]],
    );
  };

  const generate = () => {
    const valid = attributes.filter(
      (a) => a.name.trim() && getAttrValues(a.values).length > 0,
    );
    if (valid.length === 0) return false;

    const combos = cartesianProduct(valid.map((a) => getAttrValues(a.values)));

    const existingSkus = new Set(
      rows.map((r) => r.product.sku).concat(drafts.map((d) => d.sku)),
    );

    const next: VariantDraft[] = combos.map((combo) => {
      const attrRecord: Record<string, string> = {};
      valid.forEach((a, i) => {
        attrRecord[a.name.trim()] = combo[i];
      });
      const skuSuffix = combo.map((v) => v.toUpperCase().replace(/\s+/g, "-")).join("-");
      let sku = `${parentSku}-${skuSuffix}`;
      if (existingSkus.has(sku)) {
        sku = `${parentSku}-${skuSuffix}-${Date.now().toString(36).toUpperCase().slice(-3)}`;
      }
      return {
        id: crypto.randomUUID(),
        combo: combo.join(" - "),
        sku,
        name: `${parentName} - ${combo.join(" / ")}`,
        attributes: attrRecord,
        salePrice: defaultSalePrice,
        costPrice: defaultCostPrice,
        stock: "0",
      };
    });

    setDrafts(next);
    return true;
  };

  const updateDraft = (index: number, field: keyof VariantDraft, value: string) => {
    setDrafts((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const removeDraft = (index: number) => {
    setDrafts((prev) => prev.filter((_, i) => i !== index));
  };

  const createVariants = async (
    payloads: VariantPayload[],
  ): Promise<Product[]> => {
    if (!parentId) return [];
    const created: Product[] = [];
    for (const payload of payloads) {
      const p = await createProduct({
        name: payload.name,
        sku: payload.sku,
        category: parentCategory || "",
        salePrice: payload.salePrice,
        costPrice: payload.costPrice,
        stock: payload.stock,
        attributes: payload.attributes,
        parentId,
        warehouseId,
        status: "ACTIVE",
      });
      created.push(p);
    }
    return created;
  };

  const updateRowPrice = (index: number, field: "salePrice" | "costPrice", value: string) => {
    setRows((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value, dirty: true };
      return next;
    });
  };

  const updateRowStock = (
    index: number,
    warehouseId: string,
    value: string,
  ) => {
    setRows((prev) => {
      const next = [...prev];
      const stocks = next[index].stocks.some((s) => s.warehouseId === warehouseId)
        ? next[index].stocks.map((s) =>
            s.warehouseId === warehouseId ? { ...s, quantity: value } : s,
          )
        : [
            ...next[index].stocks,
            {
              warehouseId,
              warehouseName: "Default",
              quantity: value,
            },
          ];
      next[index] = { ...next[index], stocks, dirty: true };
      return next;
    });
  };

  const saveRow = async (index: number): Promise<boolean> => {
    const row = rows[index];
    if (!row) return false;
    setSavingId(row.product.id);
    try {
      const salePrice = parseFloat(row.salePrice);
      const costPrice = parseFloat(row.costPrice);
      if (!isNaN(salePrice)) {
        await updateProduct(row.product.id, {
          salePrice,
          ...(!isNaN(costPrice) ? { costPrice } : {}),
        });
      }
      for (const stock of row.stocks) {
        const prev = row.initialStocks[stock.warehouseId] ?? 0;
        const next = parseInt(stock.quantity) || 0;
        const delta = next - prev;
        if (delta === 0) continue;
        if (!stock.warehouseId) continue;
        await updateStock(
          row.product.id,
          Math.abs(delta),
          delta > 0 ? "add" : "subtract",
          stock.warehouseId,
        );
      }
      await refresh();
      return true;
    } catch {
      return false;
    } finally {
      setSavingId(null);
    }
  };

  const deleteRow = async (index: number): Promise<{ softDeleted: boolean }> => {
    const row = rows[index];
    if (!row) return { softDeleted: false };
    setDeletingId(row.product.id);
    try {
      const res = (await deleteProduct(row.product.id)) as unknown as
        | { softDeleted?: boolean }
        | undefined;
      await refresh();
      return { softDeleted: !!res?.softDeleted };
    } finally {
      setDeletingId(null);
    }
  };

  const parentAttributes = useMemo(() => {
    const valid = attributes.filter(
      (a) => a.name.trim() && getAttrValues(a.values).length > 0,
    );
    if (valid.length === 0) return null;
    const record: Record<string, string> = {};
    valid.forEach((a) => {
      record[a.name.trim()] = getAttrValues(a.values).join(", ");
    });
    return record;
  }, [attributes]);

  const clearGenerator = () => {
    setAttributes([]);
    setDrafts([]);
  };

  return {
    attributes,
    presets,
    drafts,
    rows,
    loading,
    savingId,
    deletingId,
    parentAttributes,
    addAttribute,
    updateAttribute,
    removeAttribute,
    applyPreset,
    generate,
    updateDraft,
    removeDraft,
    createVariants,
    updateRowPrice,
    updateRowStock,
    saveRow,
    deleteRow,
    refresh,
    clearGenerator,
  };
}