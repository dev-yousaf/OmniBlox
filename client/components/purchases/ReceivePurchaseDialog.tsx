"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useWarehouses } from "@/hooks/use-warehouses";
import { Loader2 } from "lucide-react";

interface ReceivePurchaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (warehouseId: string) => Promise<void>;
  purchaseReference: string;
  defaultWarehouseId?: string | null;
}

export function ReceivePurchaseDialog({
  open,
  onOpenChange,
  onConfirm,
  purchaseReference,
  defaultWarehouseId,
}: ReceivePurchaseDialogProps) {
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>(defaultWarehouseId ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { warehouses, loading } = useWarehouses();

  // Reset to default when dialog opens with a different purchase
  useEffect(() => {
    if (open) {
      setSelectedWarehouse(defaultWarehouseId ?? "");
    }
  }, [open, defaultWarehouseId]);

  const handleConfirm = async () => {
    if (!selectedWarehouse) return;

    setIsSubmitting(true);
    try {
      await onConfirm(selectedWarehouse);
      onOpenChange(false);
      setSelectedWarehouse("");
    } catch (error) {
      // Error handling is done in parent component
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Receive Purchase Order</DialogTitle>
          <DialogDescription>
            Select the warehouse where the stock from purchase order{" "}
            <strong>{purchaseReference}</strong> will be received.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Warehouse</label>
            {loading ? (
              <div className="flex items-center justify-center p-4">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <Select
                value={selectedWarehouse}
                onValueChange={setSelectedWarehouse}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a warehouse" />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.map((warehouse) => (
                    <SelectItem key={warehouse.id} value={warehouse.id}>
                      {warehouse.name}
                      {warehouse.location && ` - ${warehouse.location}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedWarehouse || isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Receiving...
              </>
            ) : (
              "Confirm Receipt"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
