"use client";

import { useEffect, useMemo, useState } from "react";
import { WorkspaceLink as Link } from "@/components/workspace-link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Search, Loader2, ChevronLeft, ChevronRight, RefreshCw, Plus,
  FileText, Eye, CheckCircle2, DollarSign, ShoppingBag,
} from "lucide-react";
import { usePurchasesApi, type PurchaseOrder } from "@/hooks/use-purchases-api";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";

const ROWS_PER_PAGE = 20;

const paymentStatusStyles: Record<string, string> = {
  PAID: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
  PENDING: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800",
  PARTIAL: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800",
};

const paymentStatusLabels: Record<string, string> = {
  PAID: "Paid", PENDING: "Pending", PARTIAL: "Partial",
};

export default function BillsPage() {
  const { user } = useAuth();
  const canManage = user?.role === "OWNER" || user?.role === "ADMIN" || user?.role === "MANAGER";
  const { toast } = useToast();
  const { list, markAsPaid } = usePurchasesApi();

  const [bills, setBills] = useState<PurchaseOrder[]>([]);
  const [filtered, setFiltered] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [markingId, setMarkingId] = useState<string | null>(null);

  const formatCurrency = useMemo(
    () => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }),
    []
  );

  useEffect(() => {
    setLoading(true);
    setError(null);
    list()
      .then((data) => setBills(data))
      .catch(() => { setBills([]); setError("Failed to load bills."); })
      .finally(() => setLoading(false));
  }, [list]);

  useEffect(() => {
    let result = [...bills];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (b) =>
          b.referenceNumber.toLowerCase().includes(q) ||
          b.supplier?.name?.toLowerCase().includes(q) ||
          (b.billNumber || "").toLowerCase().includes(q)
      );
    }
    if (statusFilter !== "ALL") {
      result = result.filter((b) => b.paymentStatus === statusFilter);
    }
    setFiltered(result);
  }, [bills, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE));
  const paginated = filtered.slice((page - 1) * ROWS_PER_PAGE, page * ROWS_PER_PAGE);

  const handleMarkAsPaid = async (id: string) => {
    setMarkingId(id);
    try {
      await markAsPaid(id);
      setBills((prev) => prev.map((b) => (b.id === id ? { ...b, paymentStatus: "PAID" } : b)));
      toast({ title: "Bill marked as paid" });
    } catch (e: any) {
      toast({ title: "Failed to mark as paid", description: e?.message || "Try again", variant: "destructive" as any });
    } finally {
      setMarkingId(null);
    }
  };

  const totalBills = filtered.length;
  const totalAmount = filtered.reduce((s, b) => s + b.totalAmount, 0);
  const unpaidAmount = filtered.filter(b => b.paymentStatus !== "PAID").reduce((s, b) => s + b.totalAmount, 0);

  return (
    <div className="space-y-5">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1 text-sm text-muted-foreground mb-0.5">
        <Link href="/dashboard" className="hover:text-foreground transition-colors">Dashboard</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link href="/purchases" className="hover:text-foreground transition-colors">Purchases</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground">Bills</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[18px] font-bold text-foreground">Bills</h1>
          <p className="text-sm text-muted-foreground">{bills.length} bill(s)</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-[34px] rounded-[5px] text-[13px]" onClick={() => { setPage(1); list().then(setBills).catch(() => {}); }}>
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Refresh
          </Button>
          {canManage && (
            <Link href="/purchases/new">
              <Button size="sm" className="h-[34px] rounded-[5px] bg-[#ff9025] hover:bg-[#ff9025]/90 text-white text-[13px] font-medium">
                <Plus className="mr-1.5 h-3.5 w-3.5" /> New Purchase
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="border rounded-[5px] bg-card shadow-sm p-5">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <DollarSign className="h-4 w-4" /> Total Bill Amount
          </div>
          <p className="text-2xl font-bold">{formatCurrency.format(totalAmount)}</p>
        </div>
        <div className="border rounded-[5px] bg-card shadow-sm p-5">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <ShoppingBag className="h-4 w-4" /> Unpaid
          </div>
          <p className="text-2xl font-bold">{formatCurrency.format(unpaidAmount)}</p>
        </div>
        <div className="border rounded-[5px] bg-card shadow-sm p-5">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <FileText className="h-4 w-4" /> Paid Bills
          </div>
          <p className="text-2xl font-bold">{bills.filter(b => b.paymentStatus === "PAID").length}</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by PO#, bill#, or supplier..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
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
      </div>

      {/* Table */}
      <div className="border rounded-[5px] bg-card shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : error ? (
          <div className="flex items-center justify-center py-16 text-destructive"><p>{error}</p></div>
        ) : paginated.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
            <p className="font-medium">No bills found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">PO #</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Bill #</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Supplier</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Date</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Due Date</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Amount</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Payment</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((bill) => (
                  <tr key={bill.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`/purchases/${bill.id}`} className="font-mono text-sm font-medium text-[#ff9025] hover:underline">
                        {bill.referenceNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{bill.billNumber || "-"}</td>
                    <td className="px-4 py-3 text-sm font-medium">{bill.supplier?.name || "-"}</td>
                    <td className="px-4 py-3 text-sm">{new Date(bill.orderDate).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {bill.dueDate ? new Date(bill.dueDate).toLocaleDateString() : "-"}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-medium tabular-nums">{formatCurrency.format(bill.totalAmount)}</td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant="outline" className={`font-medium text-xs ${paymentStatusStyles[bill.paymentStatus] || ""}`}>
                        {paymentStatusLabels[bill.paymentStatus] || bill.paymentStatus}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link href={`/purchases/${bill.id}`}>
                          <Button variant="ghost" size="icon" className="h-7 w-7"><Eye className="h-3.5 w-3.5" /></Button>
                        </Link>
                        {bill.paymentStatus !== "PAID" && (
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-emerald-600" disabled={markingId === bill.id} onClick={() => handleMarkAsPaid(bill.id)}>
                            {markingId === bill.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <div className="text-muted-foreground">{filtered.length} bill(s)</div>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="h-7 w-7" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            {Array.from({ length: totalPages }, (_, i) => (
              <Button key={i} variant={page === i + 1 ? "default" : "outline"} size="icon" className="h-7 w-7 text-xs" onClick={() => setPage(i + 1)}>
                {i + 1}
              </Button>
            ))}
            <Button variant="outline" size="icon" className="h-7 w-7" disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
