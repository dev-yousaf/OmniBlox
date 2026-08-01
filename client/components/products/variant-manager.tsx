"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Loader2, Save, Trash2, X, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useProductVariants, type VariantAttributeRow, type VariantPayload } from "@/hooks/use-product-variants";
import type { Product } from "@/lib/types";

export interface VariantManagerProps {
  mode: "create" | "edit";
  parentId?: string;
  parentName: string;
  parentSku: string;
  parentCategory?: string;
  warehouseId?: string;
  warehouses?: { id: string; name: string }[];
  defaultSalePrice?: string;
  defaultCostPrice?: string;
  defaultReorderLevel?: string;
  defaultTaxRate?: string;
  initialAttributes?: Record<string, string> | null;
  canManage?: boolean;
  unified?: boolean;
  onVariantsChange?: (payload: VariantPayload[]) => void;
  onAttributesChange?: (attrs: Record<string, string> | null) => void;
}

function AttributeEditor({
  attributes,
  presets,
  disabled,
  onAdd,
  onUpdate,
  onRemove,
  onApplyPreset,
}: {
  attributes: VariantAttributeRow[];
  presets: VariantAttributeRow[];
  disabled?: boolean;
  onAdd: () => void;
  onUpdate: (index: number, field: keyof VariantAttributeRow, value: string) => void;
  onRemove: (index: number) => void;
  onApplyPreset: (preset: VariantAttributeRow) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-[14px] font-medium text-[#212b36] dark:text-card-foreground shrink-0">
          Attributes
        </span>
        <div className="flex items-center gap-2">
          {presets.length > 0 && (
            <Select
              value=""
              onValueChange={(value) => {
                const preset = presets.find((p) => p.id === value);
                if (preset) onApplyPreset(preset);
              }}
              disabled={disabled}
                >                  <SelectTrigger className="h-8 w-32 text-xs rounded-[5px]">
                    <SelectValue placeholder="Preset" />
                  </SelectTrigger>
              <SelectContent>
                {presets.map((a) => (
                  <SelectItem
                    key={a.id}
                    value={a.id ?? ""}
                    disabled={attributes.some((at) => at.name === a.name)}
                  >
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button type="button" variant="outline" size="sm" onClick={onAdd} disabled={disabled} className="text-[12px] h-[34px]">
            Add Custom
          </Button>
        </div>
      </div>
      {attributes.map((attr, index) => (
        <div key={index} className="flex flex-col sm:flex-row sm:items-start gap-2 rounded border p-3">
          <div className="flex-1 space-y-1">
            <Label className="text-xs text-muted-foreground">Attribute Name</Label>
            <Input
              placeholder='e.g. "Color"'
              value={attr.name}
              disabled={disabled}
              onChange={(e) => onUpdate(index, "name", e.target.value)}
              className="h-[34px] text-[13px]"
            />
          </div>
          <div className="flex-[2] space-y-1">
            <Label className="text-xs text-muted-foreground">Values (comma-separated)</Label>
            <Input
              placeholder='e.g. "Red, Blue, Green"'
              value={attr.values}
              disabled={disabled}
              onChange={(e) => onUpdate(index, "values", e.target.value)}
              className="h-[34px] text-[13px]"
            />
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="mt-5"
            disabled={disabled}
            onClick={() => onRemove(index)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ))}
      {attributes.length === 0 && (
        <p className="text-[13px] text-muted-foreground italic">
          Add attributes (e.g. Color, Size) to generate the variant combinations.
        </p>
      )}
    </div>
  );
}

function DraftsTable({
  drafts,
  warehouses,
  disabled,
  locked,
  lockedValues,
  onUpdate,
  onRemove,
}: {
  drafts: VariantPayload[];
  warehouses?: { id: string; name: string }[];
  disabled?: boolean;
  locked?: boolean;
  lockedValues?: {
    salePrice: number;
    costPrice: number;
    reorderLevel: number;
    taxRate: number;
    warehouseId?: string;
  };
  onUpdate: (
    index: number,
    field: "salePrice" | "costPrice" | "stock" | "sku" | "reorderLevel" | "taxRate" | "warehouseId",
    value: string,
  ) => void;
  onRemove: (index: number) => void;
}) {
  const lockedWarehouse = warehouses?.find((w) => w.id === lockedValues?.warehouseId);
  return (
    <div className="space-y-1">
      {locked && (
        <p className="text-[12px] text-muted-foreground">
          Shared details apply to all variants — edit them in the fields above (only SKU & stock are per variant).
        </p>
      )}
      <div className="overflow-x-auto rounded border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="px-3 py-2 text-left font-medium text-[12px] text-muted-foreground">Variant</th>
            <th className="px-3 py-2 text-left font-medium text-[12px] text-muted-foreground">SKU</th>
            <th className="px-3 py-2 text-left font-medium text-[12px] text-muted-foreground">Sale Price</th>
            <th className="px-3 py-2 text-left font-medium text-[12px] text-muted-foreground">Cost Price</th>
            <th className="px-3 py-2 text-left font-medium text-[12px] text-muted-foreground">Stock</th>
            <th className="px-3 py-2 text-left font-medium text-[12px] text-muted-foreground">Reorder Level</th>
            <th className="px-3 py-2 text-left font-medium text-[12px] text-muted-foreground">Tax</th>
            <th className="px-3 py-2 text-left font-medium text-[12px] text-muted-foreground">Warehouse</th>
            <th className="px-3 py-2" />
          </tr>
        </thead>
        <tbody>
          {drafts.map((variant, index) => (
            <tr key={index} className="border-b">
              <td className="px-3 py-2 text-xs">{variant.name}</td>
              <td className="px-3 py-2">
                <Input
                  className="h-8 text-xs"
                  value={variant.sku}
                  disabled={disabled}
                  onChange={(e) => onUpdate(index, "sku", e.target.value)}
                />
              </td>
              <td className="px-3 py-2">
                {locked && lockedValues ? (
                  <span className="text-xs text-muted-foreground">
                    ${lockedValues.salePrice.toFixed(2)}
                  </span>
                ) : (
                  <Input
                    type="number"
                    step="0.01"
                    className="h-8 text-xs w-24"
                    value={variant.salePrice}
                    disabled={disabled}
                    onChange={(e) => onUpdate(index, "salePrice", e.target.value)}
                  />
                )}
              </td>
              <td className="px-3 py-2">
                {locked && lockedValues ? (
                  <span className="text-xs text-muted-foreground">
                    ${lockedValues.costPrice.toFixed(2)}
                  </span>
                ) : (
                  <Input
                    type="number"
                    step="0.01"
                    className="h-8 text-xs w-24"
                    value={variant.costPrice}
                    disabled={disabled}
                    onChange={(e) => onUpdate(index, "costPrice", e.target.value)}
                  />
                )}
              </td>
              <td className="px-3 py-2">
                <Input
                  type="number"
                  className="h-8 text-xs w-20"
                  value={variant.stock}
                  disabled={disabled}
                  onChange={(e) => onUpdate(index, "stock", e.target.value)}
                />
              </td>
              <td className="px-3 py-2">
                {locked && lockedValues ? (
                  <span className="text-xs text-muted-foreground">
                    {lockedValues.reorderLevel}
                  </span>
                ) : (
                  <Input
                    type="number"
                    className="h-8 text-xs w-20"
                    value={variant.reorderLevel ?? ""}
                    disabled={disabled}
                    onChange={(e) => onUpdate(index, "reorderLevel", e.target.value)}
                  />
                )}
              </td>
              <td className="px-3 py-2">
                {locked && lockedValues ? (
                  <span className="text-xs text-muted-foreground">
                    {lockedValues.taxRate > 0 ? `${lockedValues.taxRate}%` : "No Tax"}
                  </span>
                ) : (
                  <Select
                    value={(variant.taxRate ?? 0).toString()}
                    onValueChange={(value) => onUpdate(index, "taxRate", value)}
                    disabled={disabled}
                  >
                    <SelectTrigger className="h-8 w-20 text-xs rounded-[5px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">No Tax</SelectItem>
                      <SelectItem value="5">5%</SelectItem>
                      <SelectItem value="10">10%</SelectItem>
                      <SelectItem value="12">12%</SelectItem>
                      <SelectItem value="18">18%</SelectItem>
                      <SelectItem value="20">20%</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </td>
              <td className="px-3 py-2">
                {locked && lockedValues ? (
                  <span className="text-xs text-muted-foreground">
                    {lockedWarehouse ? lockedWarehouse.name : "—"}
                  </span>
                ) : (
                  <Select
                    value={variant.warehouseId ?? ""}
                    onValueChange={(value) => onUpdate(index, "warehouseId", value)}
                    disabled={disabled || !warehouses || warehouses.length === 0}
                  >
                    <SelectTrigger className="h-8 w-32 text-xs rounded-[5px]">
                      <SelectValue placeholder="Warehouse" />
                    </SelectTrigger>
                    <SelectContent>
                      {warehouses && warehouses.length > 0 ? (
                        warehouses.map((wh) => (
                          <SelectItem key={wh.id} value={wh.id}>
                            {wh.name}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="__none" disabled>
                          No warehouses
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                )}
              </td>
              <td className="px-3 py-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8"
                  disabled={disabled}
                  onClick={() => onRemove(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}

export function VariantManager({
  mode,
  parentId,
  parentName,
  parentSku,
  parentCategory,
  warehouseId,
  warehouses,
  defaultSalePrice,
  defaultCostPrice,
  defaultReorderLevel,
  defaultTaxRate,
  initialAttributes,
  canManage = true,
  unified = false,
  onVariantsChange,
  onAttributesChange,
}: VariantManagerProps) {
  const { toast } = useToast();
  const [showAddVariant, setShowAddVariant] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);

  const variants = useProductVariants({
    parentId,
    parentName,
    parentSku,
    parentCategory,
    warehouseId,
    warehouses,
    defaultSalePrice,
    defaultCostPrice,
    defaultReorderLevel,
    defaultTaxRate,
    initialAttributes,
  });

  const unifiedValues = useMemo(
    () => ({
      salePrice: parseFloat(defaultSalePrice ?? "") || 0,
      costPrice: parseFloat(defaultCostPrice ?? "") || 0,
      reorderLevel: parseInt(defaultReorderLevel ?? "") || 0,
      taxRate: parseFloat(defaultTaxRate ?? "") || 0,
      warehouseId: warehouseId || undefined,
    }),
    [defaultSalePrice, defaultCostPrice, defaultReorderLevel, defaultTaxRate, warehouseId],
  );

  const payload = useMemo<VariantPayload[]>(
    () =>
      variants.drafts.map((d) => ({
        sku: d.sku,
        name: d.name,
        salePrice: unified ? unifiedValues.salePrice : parseFloat(d.salePrice) || 0,
        costPrice: unified ? unifiedValues.costPrice : parseFloat(d.costPrice) || 0,
        stock: parseInt(d.stock) || 0,
        reorderLevel: unified ? unifiedValues.reorderLevel : parseInt(d.reorderLevel) || 0,
        taxRate: unified ? unifiedValues.taxRate : parseFloat(d.taxRate) || 0,
        warehouseId: unified ? unifiedValues.warehouseId : d.warehouseId || undefined,
        attributes: d.attributes,
      })),
    [variants.drafts, unified, unifiedValues],
  );

  const warehouseColumns = useMemo(() => {
    const seen = new Map<string, string>();
    variants.rows.forEach((row) => {
      row.stocks.forEach((s) => {
        if (s.warehouseId && !seen.has(s.warehouseId)) {
          seen.set(s.warehouseId, s.warehouseName);
        }
      });
    });
    return Array.from(seen.entries()).map(([warehouseId, warehouseName]) => ({
      warehouseId,
      warehouseName,
    }));
  }, [variants.rows]);

  useEffect(() => {
    if (mode === "create") {
      onVariantsChange?.(payload);
      onAttributesChange?.(variants.parentAttributes);
    }
  }, [mode, payload, variants.parentAttributes, onVariantsChange, onAttributesChange]);

  const handleGenerate = () => {
    const ok = variants.generate();
    if (!ok) {
      toast({
        title: "Error",
        description: "Add at least one attribute with values before generating",
        variant: "destructive",
      });
    }
  };

  const handleCreateDrafts = async () => {
    if (!parentId) return;
    setCreating(true);
    try {
      const created = await variants.createVariants(payload);
      toast({
        title: "Success",
        description: `${created.length} variant${created.length === 1 ? "" : "s"} created`,
      });
      setShowAddVariant(false);
      variants.clearGenerator();
      await variants.refresh();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message || "Failed to create variants",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const handleSaveRow = async (index: number) => {
    const ok = await variants.saveRow(index);
    if (ok) {
      toast({ title: "Success", description: "Variant updated" });
    } else {
      toast({
        title: "Error",
        description: "Failed to update variant",
        variant: "destructive",
      });
    }
  };

  const handleDeleteRow = async (index: number) => {
    const result = await variants.deleteRow(index);
    if (result.softDeleted) {
      toast({
        title: "Variant discontinued",
        description:
          "This variant has sale history and was marked DISCONTINUED instead of deleted.",
      });
    } else {
      toast({ title: "Success", description: "Variant deleted" });
    }
  };

  if (mode === "edit" && !parentId) return null;

  return (
    <div className="space-y-4">
      {mode === "edit" && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-[14px] font-medium text-[#212b36] dark:text-card-foreground">
              Existing Variants ({variants.rows.length})
            </span>
            {canManage && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-[12px] h-[34px]"
                onClick={() => setShowAddVariant((v) => !v)}
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Add Variant
              </Button>
            )}
          </div>

          {variants.loading ? (
            <div className="flex items-center gap-2 text-[13px] text-muted-foreground py-4">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading variants...
            </div>
          ) : variants.rows.length > 0 ? (
            <div className="overflow-x-auto rounded border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="text-[12px] font-semibold text-muted-foreground">SKU</TableHead>
                    <TableHead className="text-[12px] font-semibold text-muted-foreground">Name</TableHead>
                    <TableHead className="w-[110px] text-[12px] font-semibold text-muted-foreground">Sale Price</TableHead>
                    <TableHead className="w-[110px] text-[12px] font-semibold text-muted-foreground">Cost Price</TableHead>
                    <TableHead className="w-[110px] text-[12px] font-semibold text-muted-foreground">Reorder Level</TableHead>
                    <TableHead className="w-[90px] text-[12px] font-semibold text-muted-foreground">Tax</TableHead>
                    {warehouseColumns.map((w) => (
                      <TableHead key={w.warehouseId} className="w-[110px] text-[12px] font-semibold text-muted-foreground">
                        Stock ({w.warehouseName})
                      </TableHead>
                    ))}
                    <TableHead className="w-[80px] text-[12px] font-semibold text-muted-foreground">Status</TableHead>
                    {canManage && <TableHead className="w-[110px] text-right text-[12px] font-semibold text-muted-foreground">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {variants.rows.map((row, index) => (
                    <TableRow key={row.product.id}>
                      <TableCell className="font-mono text-xs">{row.product.sku}</TableCell>
                      <TableCell className="text-[13px]">{row.product.name}</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.01"
                          className="h-8 text-xs"
                          value={row.salePrice}
                          disabled={!canManage}
                          onChange={(e) => variants.updateRowField(index, "salePrice", e.target.value)}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.01"
                          className="h-8 text-xs"
                          value={row.costPrice}
                          disabled={!canManage}
                          onChange={(e) => variants.updateRowField(index, "costPrice", e.target.value)}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          className="h-8 text-xs"
                          value={row.reorderLevel}
                          disabled={!canManage}
                          onChange={(e) => variants.updateRowField(index, "reorderLevel", e.target.value)}
                        />
                      </TableCell>
                      <TableCell>
                        <Select
                          value={row.taxRate || "0"}
                          onValueChange={(value) => variants.updateRowField(index, "taxRate", value)}
                          disabled={!canManage}
                        >
                          <SelectTrigger className="h-8 text-xs rounded-[5px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="0">No Tax</SelectItem>
                            <SelectItem value="5">5%</SelectItem>
                            <SelectItem value="10">10%</SelectItem>
                            <SelectItem value="12">12%</SelectItem>
                            <SelectItem value="18">18%</SelectItem>
                            <SelectItem value="20">20%</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      {warehouseColumns.map((w) => {
                        const stock = row.stocks.find(
                          (s) => s.warehouseId === w.warehouseId,
                        );
                        return (
                          <TableCell key={w.warehouseId}>
                            <Input
                              type="number"
                              className="h-8 text-xs"
                              value={stock?.quantity ?? "0"}
                              disabled={!canManage}
                              onChange={(e) =>
                                variants.updateRowStock(
                                  index,
                                  w.warehouseId,
                                  e.target.value,
                                )
                              }
                            />
                          </TableCell>
                        );
                      })}
                      <TableCell>
                        <Badge variant={row.product.status === "ACTIVE" ? "default" : row.product.status === "DISCONTINUED" ? "destructive" : "secondary"} className="text-[10px] capitalize">
                          {row.product.status.toLowerCase()}
                        </Badge>
                      </TableCell>
                      {canManage && (
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8"
                              disabled={!row.dirty || variants.savingId === row.product.id}
                              title={row.dirty ? "Save changes" : "No unsaved changes"}
                              onClick={() => handleSaveRow(index)}
                            >
                              {variants.savingId === row.product.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Save className="h-4 w-4" />
                              )}
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 text-destructive hover:text-destructive"
                                  disabled={variants.deletingId === row.product.id}
                                >
                                  {variants.deletingId === row.product.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Trash2 className="h-4 w-4" />
                                  )}
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete variant?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This permanently deletes "{row.product.name}". If the variant has
                                    sale history it will be marked DISCONTINUED instead.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDeleteRow(index)}
                                    className="bg-destructive text-white hover:bg-destructive/90"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-[13px] text-muted-foreground italic">
              No variants yet. {canManage ? "Use the generator below to add them." : ""}
            </p>
          )}
        </>
      )}

      {mode === "create" ? (
        <>
          <AttributeEditor
            attributes={variants.attributes}
            presets={variants.presets}
            onAdd={variants.addAttribute}
            onUpdate={variants.updateAttribute}
            onRemove={variants.removeAttribute}
            onApplyPreset={variants.applyPreset}
          />
          {variants.attributes.length > 0 && (
            <Button type="button" variant="secondary" onClick={handleGenerate} className="text-[13px]">
              Generate Variants
            </Button>
          )}
          {variants.drafts.length > 0 && (
            <DraftsTable
              drafts={payload}
              warehouses={warehouses}
              locked={unified}
              lockedValues={unified ? unifiedValues : undefined}
              onUpdate={(index, field, value) =>
                variants.updateDraft(index, field, value)
              }
              onRemove={variants.removeDraft}
            />
          )}
        </>
      ) : (
        showAddVariant && (
          <div className="rounded border border-border p-4 space-y-4">
            <p className="text-[14px] font-medium text-[#212b36] dark:text-card-foreground">
              Generate New Variants
            </p>
            <AttributeEditor
              attributes={variants.attributes}
              presets={variants.presets}
              onAdd={variants.addAttribute}
              onUpdate={variants.updateAttribute}
              onRemove={variants.removeAttribute}
              onApplyPreset={variants.applyPreset}
            />
            {variants.attributes.length > 0 && (
              <Button type="button" variant="secondary" onClick={handleGenerate} className="text-[13px]">
                Generate Variants
              </Button>
            )}
            {variants.drafts.length > 0 && (
              <>
                <DraftsTable
                  drafts={payload}
                  warehouses={warehouses}
                  locked={unified}
                  lockedValues={unified ? unifiedValues : undefined}
                  onUpdate={(index, field, value) =>
                    variants.updateDraft(index, field, value)
                  }
                  onRemove={variants.removeDraft}
                />
                <Button
                  type="button"
                  onClick={handleCreateDrafts}
                  disabled={creating}
                  className="h-[34px] px-4 text-[13px]"
                >
                  {creating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating...
                    </>
                  ) : (
                    `Create ${payload.length} Variant${payload.length === 1 ? "" : "s"}`
                  )}
                </Button>
              </>
            )}
          </div>
        )
      )}
    </div>
  );
}
