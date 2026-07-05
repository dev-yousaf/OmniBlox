"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import { WorkspaceLink as Link } from "@/components/workspace-link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Plus, Search, Loader2, ChevronRight, ChevronLeft,
  FileText, FileSpreadsheet, RefreshCw, Warehouse,
  MapPin, Package, Edit, Trash2,
} from "lucide-react";
import { useInventoryApi, type Warehouse as WarehouseType } from "@/hooks/use-inventory-api";
import { useProductApi } from "@/hooks/use-product-api";
import { useAuth } from "@/contexts/auth-context";
import { useWorkspace } from "@/hooks/use-workspace";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
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

const ROWS_PER_PAGE = 20;

export default function WarehousesPage() {
  const { user } = useAuth();
  const canManage = user?.role === "OWNER" || user?.role === "ADMIN" || user?.role === "MANAGER";
  const { toast } = useToast();
  const router = useRouter();
  const ws = useWorkspace();
  const { getWarehouses, deleteWarehouse } = useInventoryApi();
  const { getProductStats } = useProductApi();

  const [warehouses, setWarehouses] = useState<WarehouseType[]>([]);
  const [totalProducts, setTotalProducts] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [warehousesData, productsStats] = await Promise.all([
        getWarehouses(),
        getProductStats(),
      ]);
      setWarehouses(warehousesData);
      setTotalProducts(productsStats.totalProducts);
    } catch (err: any) {
      setError(err.message || "Failed to load warehouses");
    } finally {
      setLoading(false);
    }
  }, [getWarehouses, getProductStats]);

  useEffect(() => { loadData(); }, [loadData]);

  const filtered = useMemo(() => {
    if (!search) return warehouses;
    const q = search.toLowerCase();
    return warehouses.filter((wh) =>
      wh.name.toLowerCase().includes(q) ||
      wh.location?.toLowerCase().includes(q)
    );
  }, [warehouses, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE));
  const paged = filtered.slice((page - 1) * ROWS_PER_PAGE, page * ROWS_PER_PAGE);

  const totalInventoryItems = useMemo(
    () => warehouses.reduce((sum, wh) => sum + (wh._count?.inventory || 0), 0),
    [warehouses]
  );

  const stats = useMemo(() => ({
    total: warehouses.length,
    totalProducts,
    totalInventoryItems,
  }), [warehouses.length, totalProducts, totalInventoryItems]);

  const handleDeleteClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setDeletingId(id);
    setDeleteOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingId) return;
    try {
      setDeleting(true);
      await deleteWarehouse(deletingId);
      toast({ title: "Success", description: "Warehouse deleted successfully" });
      loadData();
    } catch (err: any) {
      toast({ title: "Error", description: err?.message || "Failed to delete warehouse", variant: "destructive" });
    } finally {
      setDeleting(false);
      setDeleteOpen(false);
      setDeletingId(null);
    }
  };

  const exportCSV = () => {
    const headers = ["Warehouse Name", "Location", "Products", "Status"];
    const rows = filtered.map((wh) => [
      wh.name,
      wh.location || "",
      String(wh._count?.inventory || 0),
      "Active",
    ]);
    const csv = [headers, ...rows].map((row) =>
      row.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")
    ).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `warehouses-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Exported", description: "Warehouses exported as CSV" });
  };

  return (
    <div className="space-y-5">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1 text-sm text-muted-foreground mb-0.5">
        <Link href="/dashboard" className="hover:text-foreground transition-colors">Dashboard</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground">Warehouses</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[18px] font-bold text-foreground">All Warehouses</h1>
          <p className="text-sm text-muted-foreground">Manage your warehouse locations and inventory</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="h-[34px] w-[34px] rounded-[5px]" title="Export CSV" onClick={exportCSV}>
            <FileText className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" className="h-[34px] w-[34px] rounded-[5px]" title="Export Excel" onClick={exportCSV}>
            <FileSpreadsheet className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" className="h-[34px] w-[34px] rounded-[5px]" title="Refresh" onClick={loadData}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          {canManage && (
            <Link href="/inventory/warehouses/new">
              <Button className="h-[34px] rounded-[5px] bg-[#ff9025] hover:bg-[#ff9025]/90 text-white text-[13px] font-medium px-3">
                <Plus className="mr-1.5 h-3.5 w-3.5" />New Warehouse
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="border rounded-[5px] bg-card shadow-sm p-5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Total Warehouses</p>
          <p className="text-2xl font-bold">{stats.total}</p>
        </div>
        <div className="border rounded-[5px] bg-card shadow-sm p-5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Total Products</p>
          <p className="text-2xl font-bold">{stats.totalProducts}</p>
        </div>
        <div className="border rounded-[5px] bg-card shadow-sm p-5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Total Inventory Items</p>
          <p className="text-2xl font-bold">{stats.totalInventoryItems}</p>
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-[5px] bg-card shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center gap-4 px-5 py-[15px] border-b">
          <div className="flex items-center gap-2 border rounded-[5px] px-2.5 py-1.5 w-[250px]">
            <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <input
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground min-w-0"
              placeholder="Search warehouses..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="px-5 py-8 text-center">
            <p className="text-sm text-destructive mb-3">{error}</p>
            <Button variant="outline" size="sm" onClick={loadData}>Try Again</Button>
          </div>
        ) : paged.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-muted-foreground">
            <Warehouse className="h-12 w-12 mb-3 text-muted-foreground/50" />
            <p className="font-medium">
              {search ? "No warehouses match your search" : "No warehouses yet"}
            </p>
            <p className="text-sm mt-1">
              {search ? "Try a different search term" : "Create a warehouse to get started."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted h-[33px]">
                  <th className="px-5 py-2 text-left font-semibold text-foreground min-w-[180px]">Warehouse Name</th>
                  <th className="px-5 py-2 text-left font-semibold text-foreground min-w-[140px]">Location</th>
                  <th className="w-[120px] px-5 py-2 text-left font-semibold text-foreground">Products</th>
                  <th className="w-[100px] px-5 py-2 text-left font-semibold text-foreground">Status</th>
                  <th className="w-[120px] px-5 py-2 text-center font-semibold text-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paged.map((warehouse) => (
                  <tr
                    key={warehouse.id}
                    className="h-[52px] border-b hover:bg-muted/30 transition-colors cursor-pointer"
                    onClick={() => router.push(`/${ws}/inventory/warehouses/${warehouse.id}`)}
                  >
                    <td className="px-5">
                      <div className="flex items-center gap-2">
                        <Warehouse className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="font-semibold text-foreground">{warehouse.name}</span>
                      </div>
                    </td>
                    <td className="px-5">
                      {warehouse.location ? (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5" />
                          {warehouse.location}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-5 text-muted-foreground">
                      {warehouse._count?.inventory || 0} items
                    </td>
                    <td className="px-5">
                      <Badge variant="outline" className="bg-emerald-100 text-emerald-700 border-emerald-200 font-medium text-xs">Active</Badge>
                    </td>
                    <td className="px-5 text-center" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-1">
                        {canManage && (
                          <>
                            <Link href={`/inventory/warehouses/${warehouse.id}/edit`}>
                              <Button variant="ghost" size="icon" className="h-[30px] w-[30px] rounded-[5px]">
                                <Edit className="h-3.5 w-3.5" />
                              </Button>
                            </Link>
                            <Button variant="ghost" size="icon" className="h-[30px] w-[30px] rounded-[5px] text-destructive" onClick={(e) => handleDeleteClick(e, warehouse.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && !error && filtered.length > 0 && (
          <div className="flex items-center justify-between px-5 py-3 border-t">
            <p className="text-xs text-muted-foreground">
              Showing page {page} of {totalPages} ({filtered.length} total)
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="outline" size="icon" className="h-[30px] w-[30px] rounded-[5px]"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                const start = Math.max(1, Math.min(page - 2, totalPages - 4));
                const p = start + i;
                if (p > totalPages) return null;
                return (
                  <Button
                    key={p}
                    variant={p === page ? "default" : "outline"}
                    size="icon"
                    className="h-[30px] w-[30px] rounded-[5px] text-xs"
                    onClick={() => setPage(p)}
                  >
                    {p}
                  </Button>
                );
              })}
              <Button
                variant="outline" size="icon" className="h-[30px] w-[30px] rounded-[5px]"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Dialog */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this warehouse?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The warehouse will be permanently removed.
              {deletingId && warehouses.find((w) => w.id === deletingId)?._count?.inventory ? (
                <span className="block mt-2 text-destructive font-medium">
                  Warning: This warehouse has inventory items. They will need to be moved first.
                </span>
              ) : null}
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
