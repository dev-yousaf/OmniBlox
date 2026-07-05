"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus, Search, MoreHorizontal, Edit, Trash2, Eye, Loader2, CheckCircle2,
  RotateCcw, ChevronLeft, ChevronRight, RefreshCw, FileText, FileSpreadsheet, DollarSign, TrendingUp,
  Package, CalendarIcon, Warehouse,
} from "lucide-react";
import { WorkspaceLink as Link } from "@/components/workspace-link";
import { useSalesList } from "./_hooks/use-sales";
import type { SaleSummary } from "./_types";
import { useAuth } from "@/contexts/auth-context";
import { useWorkspace } from "@/hooks/use-workspace";
import { useToast } from "@/hooks/use-toast";
import { useInventoryApi } from "@/hooks/use-inventory-api";
import { useProductApi } from "@/hooks/use-product-api";
import type { Product } from "@/lib/types";

const ROWS_PER_PAGE = 20;

const statusStyles: Record<string, string> = {
  PAID: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
  PENDING: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800",
  PARTIAL: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800",
  OVERDUE: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800",
};

const statusLabels: Record<string, string> = {
  PAID: "Paid",
  PENDING: "Pending",
  PARTIAL: "Partial",
  OVERDUE: "Overdue",
};

export default function SalesPage() {
  const { user } = useAuth();
  const canManage = user?.role === "OWNER" || user?.role === "ADMIN" || user?.role === "MANAGER";
  const router = useRouter();
  const ws = useWorkspace();
  const { toast } = useToast();
  const {
    sales,
    stats,
    total,
    pages,
    filters,
    setFilters,
    loading,
    error,
    deleteSale,
    deletingId,
    markSalePaid,
    markPaidId,
    refresh,
  } = useSalesList();

  const { getWarehouses } = useInventoryApi();
  const { getProducts } = useProductApi();

  const [warehouseNames, setWarehouseNames] = useState<string[]>([]);
  const [warehouseIds, setWarehouseIds] = useState<Record<string, string>>({});
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const [wh, prods] = await Promise.all([
          getWarehouses(),
          getProducts({ page: 1, limit: 200 }).then(r => r.products ?? []),
        ]);
        setWarehouseNames(wh.map((w) => w.name));
        setWarehouseIds(Object.fromEntries(wh.map((w) => [w.name, w.id])));
        setProducts(prods);
      } catch { /* ignore */ }
    };
    load();
  }, [getWarehouses, getProducts]);

  const [pendingDelete, setPendingDelete] = useState<{
    id: string; customer: string; invoice: string;
  } | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);

  const formatCurrency = useMemo(
    () => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }),
    []
  );

  const totalRevenue = stats?.totalRevenue ?? 0;
  const pendingAmount = stats?.pendingAmount ?? 0;
  const overdueAmount = stats?.overdueAmount ?? 0;

  const getStatus = (sale: SaleSummary) => {
    if (sale.paymentStatus === "PAID") return "PAID";
    if (sale.isOverdue) return "OVERDUE";
    if (sale.paymentStatus === "PARTIAL") return "PARTIAL";
    return "PENDING";
  };

  const handleSearchChange = (value: string) => {
    setFilters({ search: value });
    setPage(1);
  };

  const handlePageChange = (p: number) => {
    setPage(p);
    setFilters({ page: p });
  };

  const handleConfirmDelete = async () => {
    if (!pendingDelete) return;
    try {
      await deleteSale(pendingDelete.id);
      setPendingDelete(null);
    } catch { /* handled */ }
  };

  const toggleSelect = (id: string) => {
    const n = new Set(selectedIds);
    n.has(id) ? n.delete(id) : n.add(id);
    setSelectedIds(n);
  };
  const toggleAll = () => {
    const pagedSales = sales;
    if (selectedIds.size === pagedSales.length && pagedSales.length > 0) setSelectedIds(new Set());
    else setSelectedIds(new Set(pagedSales.map((s) => s.id)));
  };

  const exportCSV = () => {
    const headers = ["Invoice", "Customer", "Email", "Date", "Due", "Amount", "Status", "Payment"];
    const rows = sales.map((s) => [
      s.invoiceNumber,
      s.customerName,
      s.customerEmail || "",
      new Date(s.saleDate).toLocaleDateString(),
      new Date(s.dueDate).toLocaleDateString(),
      formatCurrency.format(s.totalAmount),
      s.paymentStatus,
      getStatus(s),
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sales-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Exported", description: "Sales data exported as CSV" });
  };

  const handleRefresh = () => refresh();

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-1 text-sm text-muted-foreground mb-0.5">
            <span>Dashboard</span>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="text-foreground">Sales</span>
          </div>
          <h1 className="text-[18px] font-bold text-foreground">Sales & Invoices</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="h-[34px] w-[34px] rounded-[5px]" title="Export CSV" onClick={exportCSV}>
            <FileText className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" className="h-[34px] w-[34px] rounded-[5px]" title="Export Excel" onClick={exportCSV}>
            <FileSpreadsheet className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" className="h-[34px] w-[34px] rounded-[5px]" title="Refresh" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          {canManage && (
            <Link href="/sales/new">
              <Button className="h-[34px] rounded-[5px] bg-[#ff9025] hover:bg-[#ff9025]/90 text-white text-[13px] font-medium px-3">
                <Plus className="mr-1.5 h-3.5 w-3.5" />New Sale
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="border rounded-[5px] bg-card shadow-sm p-5">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Sales</p>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="text-2xl font-bold">{stats?.totalSales ?? 0}</p>
          <p className="text-xs text-muted-foreground mt-0.5">All time invoices</p>
        </div>
        <div className="border rounded-[5px] bg-card shadow-sm p-5">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Revenue</p>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="text-2xl font-bold">{formatCurrency.format(totalRevenue)}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Paid invoices</p>
        </div>
        <div className="border rounded-[5px] bg-card shadow-sm p-5">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Pending</p>
            <TrendingUp className="h-4 w-4 text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-amber-600">{formatCurrency.format(pendingAmount)}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Awaiting payment</p>
        </div>
        <div className="border rounded-[5px] bg-card shadow-sm p-5">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Overdue</p>
            <TrendingUp className="h-4 w-4 text-destructive" />
          </div>
          <p className="text-2xl font-bold text-destructive">{formatCurrency.format(overdueAmount)}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Past due date</p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-5 py-3 bg-destructive/10 text-destructive text-sm border rounded-[5px]">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="border rounded-[5px] bg-card shadow-sm overflow-hidden">
        {/* Table Toolbar */}
        <div className="flex items-center gap-4 px-5 py-[15px] border-b flex-wrap">
          <div className="flex items-center gap-2 border rounded-[5px] px-2.5 py-1.5 w-[200px]">
            <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <input
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground min-w-0"
              placeholder="Search invoices..."
              value={filters.search ?? ""}
              onChange={(e) => handleSearchChange(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 ml-auto flex-wrap">
            {/* Date Range */}
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <CalendarIcon className="h-3.5 w-3.5" />
              <Input
                type="date"
                value={filters.dateFrom ?? ""}
                onChange={(e) => { setFilters({ dateFrom: e.target.value || undefined }); setPage(1); }}
                className="h-[34px] w-[140px] rounded-[5px] text-xs"
                placeholder="From"
              />
              <span className="text-muted-foreground">-</span>
              <Input
                type="date"
                value={filters.dateTo ?? ""}
                onChange={(e) => { setFilters({ dateTo: e.target.value || undefined }); setPage(1); }}
                className="h-[34px] w-[140px] rounded-[5px] text-xs"
                placeholder="To"
              />
            </div>

            {/* Warehouse Filter */}
            <Select
              value={filters.warehouseId || "ALL"}
              onValueChange={(v) => { setFilters({ warehouseId: v === "ALL" ? undefined : v }); setPage(1); }}
            >
              <SelectTrigger className="h-[34px] w-[150px] text-sm rounded-[5px]">
                <Warehouse className="mr-1 h-3.5 w-3.5 text-muted-foreground" />
                <SelectValue placeholder="Warehouse" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Warehouses</SelectItem>
                {warehouseNames.map((name) => (
                  <SelectItem key={name} value={warehouseIds[name] || name}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Status Filter */}
            <Select
              value={filters.status || "ALL"}
              onValueChange={(v) => { setFilters({ status: v as any }); setPage(1); }}
            >
              <SelectTrigger className="h-[34px] w-[130px] text-sm rounded-[5px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Status</SelectItem>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={filters.paymentStatus || "ALL"}
              onValueChange={(v) => { setFilters({ paymentStatus: v as any }); setPage(1); }}
            >
              <SelectTrigger className="h-[34px] w-[140px] text-sm rounded-[5px]">
                <SelectValue placeholder="Payment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Payments</SelectItem>
                <SelectItem value="PAID">Paid</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="PARTIAL">Partial</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Product quick filter chips */}
        {products.length > 0 && (
          <div className="flex items-center gap-2 px-5 py-2.5 border-b bg-muted/20 flex-wrap">
            <span className="text-xs font-medium text-muted-foreground">Product:</span>
            <select
              className="h-[30px] rounded-[5px] border border-border bg-card px-2 text-xs outline-none"
              value={filters.productId || ""}
              onChange={(e) => { setFilters({ productId: e.target.value || undefined }); setPage(1); }}
            >
              <option value="">All Products</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Table Content */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : sales.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-muted-foreground">
            <Package className="h-12 w-12 mb-3 text-muted-foreground/50" />
            <p className="font-medium">
              {filters.search || filters.status || filters.paymentStatus || filters.warehouseId || filters.dateFrom || filters.productId
                ? "No sales match your filters" : "No sales yet"}
            </p>
            <p className="text-sm mt-1">Create a new sale to get started.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted h-[33px]">
                  <th className="w-[50px] px-5 py-2 text-left font-semibold text-foreground">
                    <Checkbox
                      checked={selectedIds.size === sales.length && sales.length > 0}
                      onCheckedChange={toggleAll}
                    />
                  </th>
                  <th className="px-5 py-2 text-left font-semibold text-foreground min-w-[120px]">Invoice</th>
                  <th className="px-5 py-2 text-left font-semibold text-foreground min-w-[140px]">Customer</th>
                  <th className="w-[100px] px-5 py-2 text-left font-semibold text-foreground">Date</th>
                  <th className="w-[100px] px-5 py-2 text-left font-semibold text-foreground">Due</th>
                  <th className="w-[120px] px-5 py-2 text-right font-semibold text-foreground">Amount</th>
                  <th className="w-[100px] px-5 py-2 text-left font-semibold text-foreground">Status</th>
                  <th className="w-[60px] px-5 py-2 text-center font-semibold text-foreground">Returns</th>
                  <th className="w-[80px] px-5 py-2 text-left font-semibold text-foreground">Action</th>
                </tr>
              </thead>
              <tbody>
                {sales.map((sale) => {
                  const status = getStatus(sale);
                  const isDeleting = deletingId === sale.id;
                  const isMarking = markPaidId === sale.id;
                  return (
                    <tr
                      key={sale.id}
                      className="h-[56px] border-b hover:bg-muted/30 transition-colors cursor-pointer"
                      onClick={() => router.push(`/${ws}/sales/${sale.id}`)}
                    >
                      <td className="w-[50px] px-5" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedIds.has(sale.id)}
                          onCheckedChange={() => toggleSelect(sale.id)}
                        />
                      </td>
                      <td className="px-5 font-mono text-xs font-semibold text-foreground">{sale.invoiceNumber}</td>
                      <td className="px-5">
                        <div className="min-w-0">
                          <p className="font-medium text-foreground truncate max-w-[200px]">{sale.customerName}</p>
                          {sale.customerEmail && (
                            <p className="text-xs text-muted-foreground truncate max-w-[200px]">{sale.customerEmail}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-5 text-xs text-muted-foreground">
                        {new Date(sale.saleDate).toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" })}
                      </td>
                      <td className="px-5 text-xs text-muted-foreground">
                        {new Date(sale.dueDate).toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" })}
                      </td>
                      <td className="w-[120px] px-5 text-right font-semibold tabular-nums">
                        {formatCurrency.format(sale.netTotal ?? sale.totalAmount)}
                      </td>
                      <td className="w-[100px] px-5">
                        <Badge variant="outline" className={`font-medium text-xs ${statusStyles[status] || ""}`}>
                          {statusLabels[status] || status}
                        </Badge>
                      </td>
                      <td className="w-[60px] px-5 text-center">
                        {sale.returnStatus === "ALL" ? (
                          <Badge variant="outline" className="font-medium text-xs text-purple-600 border-purple-200 bg-purple-50 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800">
                            <RotateCcw className="mr-1 h-3 w-3" /> All Returned
                          </Badge>
                        ) : (sale.processingReturnCount ?? 0) > 0 ? (
                          <Badge variant="outline" className="font-medium text-xs text-blue-600 border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800">
                            <RotateCcw className="mr-1 h-3 w-3" /> Processing
                          </Badge>
                        ) : (sale.pendingReturnCount ?? 0) > 0 ? (
                          <Badge variant="outline" className="font-medium text-xs text-amber-600 border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800">
                            <RotateCcw className="mr-1 h-3 w-3" /> Pending
                          </Badge>
                        ) : sale.hasReturns ? (
                          <Badge variant="outline" className="font-medium text-xs text-emerald-600 border-emerald-200 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800">
                            <RotateCcw className="mr-1 h-3 w-3" /> Returned
                          </Badge>
                        ) : null}
                      </td>
                      <td className="w-[80px] px-5" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                              <MoreHorizontal className="h-3.5 w-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-[160px]">
                            <DropdownMenuLabel className="text-xs">Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem asChild>
                              <Link href={`/sales/${sale.id}`}>
                                <Eye className="mr-2 h-3.5 w-3.5" /> View Details
                              </Link>
                            </DropdownMenuItem>
                            {canManage && (
                              <DropdownMenuItem asChild>
                                <Link href={`/sales/${sale.id}/edit`}>
                                  <Edit className="mr-2 h-3.5 w-3.5" /> Edit
                                </Link>
                              </DropdownMenuItem>
                            )}
                            {sale.paymentStatus !== "PAID" && canManage && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onSelect={(event) => { event.preventDefault(); markSalePaid(sale.id).catch(() => {}); }}
                                >
                                  <CheckCircle2 className="mr-2 h-3.5 w-3.5" />
                                  {isMarking ? "Marking..." : "Mark Paid"}
                                </DropdownMenuItem>
                              </>
                            )}
                            {(user?.role === "OWNER" || user?.role === "ADMIN") && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onSelect={(event) => {
                                    event.preventDefault();
                                    setPendingDelete({ id: sale.id, customer: sale.customerName, invoice: sale.invoiceNumber });
                                  }}
                                >
                                  <Trash2 className="mr-2 h-3.5 w-3.5" />
                                  {isDeleting ? "Deleting..." : "Delete"}
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && sales.length > 0 && (
          <div className="flex items-center justify-between px-5 py-[15px] border-t">
            <div className="text-sm text-muted-foreground">
              Showing page {page} of {pages} ({total} total)
            </div>
            <div className="flex items-center gap-3">
              <button
                className="disabled:opacity-30 disabled:cursor-not-allowed"
                disabled={page <= 1}
                onClick={() => handlePageChange(page - 1)}
              >
                <ChevronLeft className="h-4 w-4 text-muted-foreground" />
              </button>
              <div className="flex items-center gap-1.5">
                {Array.from({ length: Math.min(pages, 5) }, (_, i) => {
                  let p: number;
                  if (pages <= 5) p = i + 1;
                  else if (page <= 3) p = i + 1;
                  else if (page >= pages - 2) p = pages - 4 + i;
                  else p = page - 2 + i;
                  return (
                    <button
                      key={p}
                      className={`h-7 w-7 rounded-full text-xs flex items-center justify-center border transition-colors ${
                        p === page
                          ? "bg-primary text-primary-foreground border-primary"
                          : "text-muted-foreground border-border hover:bg-muted"
                      }`}
                      onClick={() => handlePageChange(p)}
                    >
                      {p}
                    </button>
                  );
                })}
              </div>
              <button
                className="disabled:opacity-30 disabled:cursor-not-allowed"
                disabled={page >= pages}
                onClick={() => handlePageChange(page + 1)}
              >
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={Boolean(pendingDelete)} onOpenChange={(o) => { if (!o) setPendingDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this sale?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The sale {pendingDelete?.invoice} for {pendingDelete?.customer} will be removed permanently.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingId === pendingDelete?.id} className="rounded-[5px]">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="rounded-[5px] bg-destructive hover:bg-destructive/90"
              disabled={deletingId === pendingDelete?.id}
            >
              {deletingId === pendingDelete?.id ? "Deleting..." : "Delete Sale"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
