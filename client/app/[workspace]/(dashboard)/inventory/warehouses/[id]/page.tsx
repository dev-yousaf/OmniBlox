"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { WorkspaceLink as Link } from "@/components/workspace-link";
import { PageLoadingSkeleton } from "@/components/ui/page-loading-skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, ChevronRight, Package, MapPin, Pencil, Trash2,
  DollarSign, CalendarDays, Building2,
} from "lucide-react";
import { useInventoryApi } from "@/hooks/use-inventory-api";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { useWorkspace } from "@/hooks/use-workspace";
import { format } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Warehouse {
  id: string;
  name: string;
  location?: string;
  createdAt: string;
  updatedAt: string;
  _count?: { inventory: number };
  inventory?: Array<{
    quantity: number;
    product: {
      id: string;
      name: string;
      sku: string;
      salePrice: number;
      category?: { name: string };
      brand?: { name: string };
    };
  }>;
}

export default function WarehouseDetailPage() {
  const { user } = useAuth();
  const canManage = user?.role === "OWNER" || user?.role === "ADMIN" || user?.role === "MANAGER";
  const params = useParams();
  const router = useRouter();
  const ws = useWorkspace();
  const { toast } = useToast();
  const { getWarehouse, deleteWarehouse } = useInventoryApi();

  const [loading, setLoading] = useState(true);
  const [warehouse, setWarehouse] = useState<Warehouse | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadWarehouse();
  }, [params.id]);

  async function loadWarehouse() {
    try {
      setLoading(true);
      const data = await getWarehouse(params.id as string);
      setWarehouse(data);
    } catch (error) {
      toast({ title: "Error", description: "Failed to load warehouse details", variant: "destructive" });
      router.push(`/${ws}/inventory/warehouses`);
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteConfirm() {
    if (!warehouse) return;
    try {
      setDeleting(true);
      await deleteWarehouse(warehouse.id);
      toast({ title: "Success", description: "Warehouse deleted successfully" });
      router.push(`/${ws}/inventory/warehouses`);
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete warehouse", variant: "destructive" });
    } finally {
      setDeleting(false);
      setDeleteOpen(false);
    }
  }

  const totalInventoryItems = warehouse?.inventory?.length || 0;
  const totalQuantity = warehouse?.inventory?.reduce((sum, item) => sum + item.quantity, 0) || 0;
  const totalValue = warehouse?.inventory?.reduce(
    (sum, item) => sum + item.quantity * Number(item.product.salePrice), 0
  ) || 0;

  const formatCurrency = new Intl.NumberFormat("en-US", {
    style: "currency", currency: "USD", minimumFractionDigits: 2,
  });

  if (loading || !warehouse) return <PageLoadingSkeleton />;

  return (
    <div className="space-y-5">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1 text-sm text-muted-foreground mb-0.5">
        <Link href="/dashboard" className="hover:text-foreground transition-colors">Dashboard</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link href="/inventory/warehouses" className="hover:text-foreground transition-colors">Warehouses</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground">{warehouse.name}</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/inventory/warehouses" className="flex items-center justify-center h-8 w-8 rounded-[5px] border hover:bg-accent transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-[18px] font-bold text-foreground">{warehouse.name}</h1>
              <Badge variant="outline" className="bg-emerald-100 text-emerald-700 border-emerald-200 font-medium text-xs">Active</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {warehouse.location || "No location specified"} &middot; Created {format(new Date(warehouse.createdAt), "MMM dd, yyyy")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {(user?.role === "OWNER" || user?.role === "ADMIN") && (
            <Button variant="outline" size="sm" className="h-[34px] rounded-[5px] text-[13px] text-destructive" onClick={() => setDeleteOpen(true)}>
              <Trash2 className="mr-1.5 h-3.5 w-3.5" />Delete
            </Button>
          )}
          {canManage && (
            <Link href={`/inventory/warehouses/${warehouse.id}/edit`}>
              <Button variant="outline" size="sm" className="h-[34px] rounded-[5px] text-[13px]">
                <Pencil className="mr-1.5 h-3.5 w-3.5" />Edit
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="border rounded-[5px] bg-card shadow-sm p-5">
          <div className="flex items-center gap-2 mb-1">
            <Package className="h-4 w-4 text-muted-foreground" />
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Products</p>
          </div>
          <p className="text-2xl font-bold">{totalInventoryItems}</p>
          <p className="text-xs text-muted-foreground mt-0.5">unique products</p>
        </div>
        <div className="border rounded-[5px] bg-card shadow-sm p-5">
          <div className="flex items-center gap-2 mb-1">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Quantity</p>
          </div>
          <p className="text-2xl font-bold">{totalQuantity}</p>
          <p className="text-xs text-muted-foreground mt-0.5">total items</p>
        </div>
        <div className="border rounded-[5px] bg-card shadow-sm p-5">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Inventory Value</p>
          </div>
          <p className="text-2xl font-bold">{formatCurrency.format(totalValue)}</p>
          <p className="text-xs text-muted-foreground mt-0.5">estimated value</p>
        </div>
      </div>

      {/* Details + Inventory sections */}
      <div className="grid gap-5 md:grid-cols-3">
        {/* Warehouse Details */}
        <div className="md:col-span-1 border rounded-[5px] bg-card shadow-sm">
          <div className="px-5 py-[15px] border-b">
            <h2 className="text-sm font-semibold text-foreground">Warehouse Details</h2>
          </div>
          <div className="p-5 space-y-3">
            <div>
              <p className="text-xs text-muted-foreground">Warehouse ID</p>
              <p className="font-mono text-xs font-semibold mt-0.5 break-all">{warehouse.id}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Name</p>
              <p className="text-sm font-semibold mt-0.5">{warehouse.name}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Location</p>
              <p className="text-sm font-semibold mt-0.5">{warehouse.location || "Not specified"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Status</p>
              <Badge variant="outline" className="bg-emerald-100 text-emerald-700 border-emerald-200 font-medium text-xs mt-0.5">Active</Badge>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Created</p>
              <p className="text-sm mt-0.5">{format(new Date(warehouse.createdAt), "MMM dd, yyyy")}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Last Updated</p>
              <p className="text-sm mt-0.5">{format(new Date(warehouse.updatedAt), "MMM dd, yyyy")}</p>
            </div>
          </div>
        </div>

        {/* Inventory */}
        <div className="md:col-span-2 border rounded-[5px] bg-card shadow-sm overflow-hidden">
          <div className="px-5 py-[15px] border-b">
            <h2 className="text-sm font-semibold text-foreground">Current Inventory</h2>
          </div>
          {warehouse.inventory && warehouse.inventory.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted h-[33px]">
                    <th className="px-5 py-2 text-left font-semibold text-foreground min-w-[100px]">SKU</th>
                    <th className="px-5 py-2 text-left font-semibold text-foreground min-w-[140px]">Product Name</th>
                    <th className="w-[80px] px-5 py-2 text-right font-semibold text-foreground">Qty</th>
                    <th className="w-[120px] px-5 py-2 text-left font-semibold text-foreground">Category</th>
                    <th className="w-[100px] px-5 py-2 text-right font-semibold text-foreground">Price</th>
                    <th className="w-[120px] px-5 py-2 text-right font-semibold text-foreground">Total Value</th>
                  </tr>
                </thead>
                <tbody>
                  {warehouse.inventory.map((item) => (
                    <tr key={item.product.id} className="h-[52px] border-b hover:bg-muted/30 transition-colors">
                      <td className="px-5 font-mono text-xs text-foreground">{item.product.sku}</td>
                      <td className="px-5 font-medium text-foreground">{item.product.name}</td>
                      <td className="px-5 text-right font-semibold tabular-nums">{item.quantity}</td>
                      <td className="px-5 text-muted-foreground">{item.product.category?.name || "N/A"}</td>
                      <td className="px-5 text-right tabular-nums">{formatCurrency.format(Number(item.product.salePrice))}</td>
                      <td className="px-5 text-right font-semibold tabular-nums">
                        {formatCurrency.format(item.quantity * Number(item.product.salePrice))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center py-12 text-muted-foreground">
              <Package className="h-12 w-12 mb-3 text-muted-foreground/50" />
              <p className="font-medium">No inventory in this warehouse</p>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this warehouse?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The warehouse will be permanently removed.
              {totalInventoryItems > 0 && (
                <span className="block mt-2 text-destructive font-medium">
                  Warning: This warehouse has {totalInventoryItems} product(s) in inventory. They will need to be moved first.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={handleDeleteConfirm}
              disabled={deleting}
            >
              {deleting ? "Deleting..." : "Delete Warehouse"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
