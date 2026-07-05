"use client";

import { useEffect, useMemo, useState } from "react";
import { WorkspaceLink as Link } from "@/components/workspace-link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Plus, Search, Loader2, ChevronLeft, ChevronRight, RefreshCw,
  FileText, Eye, Printer, DollarSign, TrendingUp, AlertCircle,
} from "lucide-react";
import { useSalesApi, type Sale } from "@/hooks/use-sales-api";
import { useAuth } from "@/contexts/auth-context";
import { PageLoadingSkeleton } from "@/components/ui/page-loading-skeleton";

const ROWS_PER_PAGE = 20;

const paymentStatusStyles: Record<string, string> = {
  PAID: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
  PENDING: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800",
  PARTIAL: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800",
  OVERDUE: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800",
};

const paymentStatusLabels: Record<string, string> = {
  PAID: "Paid", PENDING: "Pending", PARTIAL: "Partial", OVERDUE: "Overdue",
};

export default function InvoicesPage() {
  const { user } = useAuth();
  const canManage = user?.role === "OWNER" || user?.role === "ADMIN" || user?.role === "MANAGER";
  const router = useRouter();
  const { getSales } = useSalesApi();

  const [invoices, setInvoices] = useState<Sale[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [page, setPage] = useState(1);

  const formatCurrency = useMemo(
    () => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }),
    []
  );

  const fetchInvoices = async (p: number) => {
    setLoading(true);
    try {
      setError(null);
      const params: any = { limit: ROWS_PER_PAGE, page: p };
      if (search) params.search = search;
      if (statusFilter !== "ALL") params.paymentStatus = statusFilter;
      const res = await getSales(params);
      setInvoices(res.sales);
      setTotal(res.total);
      setPages(res.pages || 1);
    } catch {
      setInvoices([]);
      setError("Failed to load invoices.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices(page);
  }, [page]);

  const handleSearch = () => { setPage(1); fetchInvoices(1); };

  const getPaymentStatus = (inv: Sale) => {
    if (inv.paymentStatus === "PAID") return "PAID";
    if (inv.status === "OVERDUE" || (inv.dueDate && new Date(inv.dueDate) < new Date() && inv.paymentStatus !== "PAID")) return "OVERDUE";
    if (inv.paymentStatus === "PARTIAL") return "PARTIAL";
    return "PENDING";
  };

  const totalRevenue = invoices.reduce((s, i) => s + i.totalAmount, 0);
  const pendingAmount = invoices.filter(i => i.paymentStatus !== "PAID").reduce((s, i) => s + i.totalAmount, 0);

  return (
    <div className="space-y-5">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1 text-sm text-muted-foreground mb-0.5">
        <Link href="/dashboard" className="hover:text-foreground transition-colors">Dashboard</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link href="/sales" className="hover:text-foreground transition-colors">Sales</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground">Invoices</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[18px] font-bold text-foreground">Invoices</h1>
          <p className="text-sm text-muted-foreground">{total} invoice(s)</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-[34px] rounded-[5px] text-[13px]" onClick={() => { setPage(1); fetchInvoices(1); }}>
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Refresh
          </Button>
          {canManage && (
            <Link href="/sales/new">
              <Button size="sm" className="h-[34px] rounded-[5px] bg-[#ff9025] hover:bg-[#ff9025]/90 text-white text-[13px] font-medium">
                <Plus className="mr-1.5 h-3.5 w-3.5" /> New Invoice
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="border rounded-[5px] bg-card shadow-sm p-5">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <DollarSign className="h-4 w-4" /> Total Revenue
          </div>
          <p className="text-2xl font-bold">{formatCurrency.format(totalRevenue)}</p>
        </div>
        <div className="border rounded-[5px] bg-card shadow-sm p-5">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <TrendingUp className="h-4 w-4" /> Pending / Overdue
          </div>
          <p className="text-2xl font-bold">{formatCurrency.format(pendingAmount)}</p>
        </div>
        <div className="border rounded-[5px] bg-card shadow-sm p-5">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <FileText className="h-4 w-4" /> Paid Invoices
          </div>
          <p className="text-2xl font-bold">{invoices.filter(i => i.paymentStatus === "PAID").length}</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by invoice or customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleSearch(); }}
            className="h-[34px] rounded-[5px] pl-9 text-sm"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="h-[34px] rounded-[5px] text-sm w-[140px]">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Status</SelectItem>
            <SelectItem value="PAID">Paid</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="PARTIAL">Partial</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="secondary" size="sm" className="h-[34px] rounded-[5px] text-[13px]" onClick={handleSearch}>
          <Search className="mr-1.5 h-3.5 w-3.5" /> Search
        </Button>
      </div>

      {/* Table */}
      <div className="border rounded-[5px] bg-card shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : error ? (
          <div className="flex items-center justify-center py-16 text-destructive"><p>{error}</p></div>
        ) : invoices.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
            <p className="font-medium">No invoices found</p>
            <p className="text-sm mt-1">Create your first invoice to get started.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Invoice #</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Customer</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Date</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Due Date</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Amount</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => {
                  const ps = getPaymentStatus(inv);
                  return (
                    <tr key={inv.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <Link href={`/sales/${inv.id}`} className="font-mono text-sm font-medium text-[#ff9025] hover:underline">
                          {inv.invoiceNumber}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium">{inv.customerName || inv.customer?.name || "-"}</div>
                        {inv.customer?.email && <div className="text-xs text-muted-foreground">{inv.customer.email}</div>}
                      </td>
                      <td className="px-4 py-3 text-sm">{new Date(inv.saleDate).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{new Date(inv.dueDate).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-right text-sm font-medium tabular-nums">{formatCurrency.format(inv.totalAmount)}</td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant="outline" className={`font-medium text-xs ${paymentStatusStyles[ps] || ""}`}>
                          {paymentStatusLabels[ps] || ps}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Link href={`/sales/${inv.id}`}>
                            <Button variant="ghost" size="icon" className="h-7 w-7"><Eye className="h-3.5 w-3.5" /></Button>
                          </Link>
                          <Link href={`/sales/invoices/${inv.id}/print`}>
                            <Button variant="ghost" size="icon" className="h-7 w-7"><Printer className="h-3.5 w-3.5" /></Button>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <div className="text-muted-foreground">{total} invoice(s)</div>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="h-7 w-7" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            {Array.from({ length: pages }, (_, i) => (
              <Button key={i} variant={page === i + 1 ? "default" : "outline"} size="icon" className="h-7 w-7 text-xs" onClick={() => setPage(i + 1)}>
                {i + 1}
              </Button>
            ))}
            <Button variant="outline" size="icon" className="h-7 w-7" disabled={page >= pages} onClick={() => setPage(p => Math.min(pages, p + 1))}>
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
