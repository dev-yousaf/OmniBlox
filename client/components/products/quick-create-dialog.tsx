"use client";

import { useState } from "react";
import { Plus, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useProductCategoriesApi } from "@/hooks/use-product-categories-api";
import { useSubCategoriesApi } from "@/hooks/use-sub-categories-api";
import { useUnitsApi } from "@/hooks/use-units-api";
import { useWarrantiesApi } from "@/hooks/use-warranties-api";
import { useBrandsApi } from "@/hooks/use-brands-api";
import { useInventoryApi } from "@/hooks/use-inventory-api";

export type QuickCreateType =
  | "category"
  | "subcategory"
  | "unit"
  | "warranty"
  | "brand"
  | "warehouse";

export interface QuickCreateOptions {
  type: QuickCreateType;
  categoryId?: string;
  onCreated: () => void;
}

const TITLES: Record<QuickCreateType, string> = {
  category: "Create Category",
  subcategory: "Create Sub Category",
  unit: "Create Unit",
  warranty: "Create Warranty",
  brand: "Create Brand",
  warehouse: "Create Warehouse",
};

const DESCRIPTIONS: Record<QuickCreateType, string> = {
  category: "Add a new product category.",
  subcategory: "Add a new sub category under the selected category.",
  unit: "Add a new unit of measure (e.g. pcs, kg, box).",
  warranty: "Add a new warranty option (e.g. 1 Year).",
  brand: "Add a new brand.",
  warehouse: "Add a new warehouse location.",
};

interface QuickCreateDialogProps {
  options: QuickCreateOptions | null;
  onClose: () => void;
}

export function QuickCreateDialog({
  options,
  onClose,
}: QuickCreateDialogProps) {
  const { createCategory } = useProductCategoriesApi();
  const { createSubCategory } = useSubCategoriesApi();
  const { createUnit } = useUnitsApi();
  const { createWarranty } = useWarrantiesApi();
  const { createBrand } = useBrandsApi();
  const { createWarehouse } = useInventoryApi();

  const [name, setName] = useState("");
  const [shortName, setShortName] = useState("");
  const [location, setLocation] = useState("");
  const [duration, setDuration] = useState("1");
  const [durationType, setDurationType] = useState("Year");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setName("");
    setShortName("");
    setLocation("");
    setDuration("1");
    setDurationType("Year");
    setError(null);
  };

  const handleClose = () => {
    if (isSubmitting) return;
    reset();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!options) return;
    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      switch (options.type) {
        case "category":
          await createCategory({ name: name.trim() });
          break;
        case "subcategory":
          if (!options.categoryId) {
            setError("No category selected. Pick a category first.");
            return;
          }
          await createSubCategory({
            name: name.trim(),
            categoryId: options.categoryId,
          });
          break;
        case "unit":
          if (!shortName.trim()) {
            setError("Short name is required (e.g. pcs, kg)");
            return;
          }
          await createUnit({ name: name.trim(), shortName: shortName.trim() });
          break;
        case "warranty":
          await createWarranty({
            name: name.trim(),
            duration: Number(duration) || 1,
            durationType,
          });
          break;
        case "brand":
          await createBrand({ name: name.trim() });
          break;
        case "warehouse":
          await createWarehouse({
            name: name.trim(),
            location: location.trim() || undefined,
          });
          break;
      }
      options.onCreated();
      reset();
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to create. It may already exist.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={!!options} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>
            {options ? TITLES[options.type] : "Create"}
          </DialogTitle>
          <DialogDescription>
            {options ? DESCRIPTIONS[options.type] : ""}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="qc-name">Name</Label>
            <Input
              id="qc-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={
                options?.type === "warehouse"
                  ? "e.g. Main Warehouse"
                  : options?.type === "unit"
                  ? "e.g. Piece"
                  : options?.type === "warranty"
                  ? "e.g. 1 Year Warranty"
                  : options?.type === "brand"
                  ? "e.g. Samsung"
                  : options?.type === "subcategory"
                  ? "e.g. Smartphones"
                  : "e.g. Electronics"
              }
              autoFocus
              className="h-[38px] rounded-[5px] px-3 py-[7px] text-[14px]"
            />
          </div>

          {options?.type === "unit" && (
            <div className="space-y-2">
              <Label htmlFor="qc-short">Short Name</Label>
              <Input
                id="qc-short"
                value={shortName}
                onChange={(e) => setShortName(e.target.value)}
                placeholder="e.g. pcs"
                className="h-[38px] rounded-[5px] px-3 py-[7px] text-[14px]"
              />
            </div>
          )}

          {options?.type === "warehouse" && (
            <div className="space-y-2">
              <Label htmlFor="qc-location">Location (optional)</Label>
              <Input
                id="qc-location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Warehouse 1, Main Street"
                className="h-[38px] rounded-[5px] px-3 py-[7px] text-[14px]"
              />
            </div>
          )}

          {options?.type === "warranty" && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="qc-duration">Duration</Label>
                <Input
                  id="qc-duration"
                  type="number"
                  min={1}
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="h-[38px] rounded-[5px] px-3 py-[7px] text-[14px]"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="qc-duration-type">Type</Label>
                <select
                  id="qc-duration-type"
                  value={durationType}
                  onChange={(e) => setDurationType(e.target.value)}
                  className="flex h-[38px] w-full rounded-[5px] border border-input bg-background px-3 py-[7px] text-[14px]"
                >
                  <option value="Year">Year</option>
                  <option value="Month">Month</option>
                  <option value="Day">Day</option>
                </select>
              </div>
            </div>
          )}

          {error && <p className="text-[13px] text-red-500">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating...
                </>
              ) : (
                <>
                  <Plus className="mr-1.5 h-3.5 w-3.5" /> Create
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
