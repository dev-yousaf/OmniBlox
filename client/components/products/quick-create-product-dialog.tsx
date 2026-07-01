"use client";

import { useState, useId } from "react";
import { Plus, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ProductForm } from "./product-form";
import type { Product } from "@/lib/types";

interface QuickCreateProductDialogProps {
  onProductCreated: (product: Product) => void;
  trigger?: React.ReactNode;
}

export function QuickCreateProductDialog({
  onProductCreated,
  trigger,
}: QuickCreateProductDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const formId = useId();

  const handleSuccess = (product?: Product) => {
    if (product) {
      onProductCreated(product);
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger || (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-[34px] text-xs shrink-0"
          onClick={() => setOpen(true)}
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          New
        </Button>
      )}
      <DialogContent className="max-w-[95vw] w-full max-h-[90vh] overflow-y-auto sm:max-w-[90vw] lg:max-w-[1200px]">
        <DialogHeader>
          <DialogTitle>Create New Product</DialogTitle>
          <DialogDescription>
            Fill in the product details. The product will be created and added to your purchase.
          </DialogDescription>
        </DialogHeader>
        <ProductForm formId={formId} onSuccess={handleSuccess} hideWarehouse showSubmit={false} onSubmittingChange={setIsSubmitting} />
        <div className="flex items-center justify-end gap-2 mt-4 pt-4 border-t">
          <Button variant="outline" size="sm" onClick={() => setOpen(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" form={formId} size="sm" disabled={isSubmitting}>
            {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : "Save Product & Select"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
