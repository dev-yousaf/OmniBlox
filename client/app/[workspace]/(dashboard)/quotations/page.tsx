"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import { WorkspaceLink as Link } from "@/components/workspace-link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Plus, Search, Loader2, ChevronRight, ChevronLeft, FileText,
  FileSpreadsheet, RefreshCw, Clock, CheckCircle, XCircle,
} from "lucide-react";
import {
  useQuotationsApi,
  type QuotationWithDetails,
} from "@/hooks/use-quotations-api";
import { format } from "date-fns";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";

const statusConfig: Record<string, { label: string; className: string }> = {
  PENDING: { label: "Sent", className: "bg-amber-100 text-amber-700 border-amber-200" },
  COMPLETED: { label: "Accepted", className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  CANCELLED: { label: "Rejected", className: "bg-red-100 text-red-700 border-red-200" },
};

const ROWS_PER_PAGE = 20;

export default function QuotationsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const canManage = user?.role === "OWNER" || user?.role === "ADMIN" || user?.role === "MANAGER";
  const { getQuotations } = useQuotationsApi();
  const [quotations, setQuotations] = useState<QuotationWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const loadQuotations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getQuotations();
      setQuotations(data);
    } catch (err: any) {
      setError(err.message || "Failed to load quotations");
    } finally {
      setLoading(false);
    }
  }, [getQuotations]);

  useEffect(() => { loadQuotations(); }, [loadQuotations]);

  const filtered = useMemo(() => {
    if (!search) return quotations;
    const q = search.toLowerCase();
    return quotations.filter((qt) =>
      qt.referenceNumber.toLowerCase().includes(q) ||
      qt.customer.name.toLowerCase().includes(q)
    );
  }, [quotations, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE));
  const paged = filtered.slice((page - 1) * ROWS_PER_PAGE, page * ROWS_PER_PAGE);

  const stats = useMemo(() => ({
    total: quotations.length,
    value: quotations.reduce((s, q) => s + Number(q.totalAmount), 0),
    sent: quotations.filter((q) => q.status === "PENDING").length,
    accepted: quotations.filter((q) => q.status === "COMPLETED").length,
  }), [quotations]);

  const exportCSV = () => {
    const headers = ["Reference", "Customer", "Date", "Items", "Amount", "Status"];
    const rows = filtered.map((q) => [
      q.referenceNumber,
      q.customer.name,
      format(new Date(q.quoteDate), "MMM dd, yyyy"),
      String(q.items.length),
      Number(q.totalAmount).toFixed(2),
      statusConfig[q.status]?.label || q.status,
    ]);
    const csv = [headers, ...rows].map((row) =>
      row.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")
    ).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `quotations-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Exported", description: "Quotations data exported as CSV" });
  };

  const formatCurrency = new Intl.NumberFormat("en-US", {
    style: "currency", currency: "USD", minimumFractionDigits: 2,
  });

  return (
    <div className="space-y-5">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1 text-sm text-muted-foreground mb-0.5">
        <Link href="/dashboard" className="hover:text-foreground transition-colors">Dashboard</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground">Quotations</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[18px] font-bold text-foreground">Quotations</h1>
          <p className="text-sm text-muted-foreground">Manage customer quotations and proposals</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="h-[34px] w-[34px] rounded-[5px]" title="Export CSV" onClick={exportCSV}>
            <FileText className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" className="h-[34px] w-[34px] rounded-[5px]" title="Export Excel" onClick={exportCSV}>
            <FileSpreadsheet className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" className="h-[34px] w-[34px] rounded-[5px]" title="Refresh" onClick={loadQuotations}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          {canManage && (
            <Link href="/quotations/new">
              <Button className="h-[34px] rounded-[5px] bg-[#ff9025] hover:bg-[#ff9025]/90 text-white text-[13px] font-medium px-3">
                <Plus className="mr-1.5 h-3.5 w-3.5" />New Quotation
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="border rounded-[5px] bg-card shadow-sm p-5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Total Quotations</p>
          <p className="text-2xl font-bold">{stats.total}</p>
        </div>
        <div className="border rounded-[5px] bg-card shadow-sm p-5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Total Value</p>
          <p className="text-2xl font-bold">{formatCurrency.format(stats.value)}</p>
        </div>
        <div className="border rounded-[5px] bg-card shadow-sm p-5">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Sent</p>
            <Clock className="h-4 w-4 text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-amber-600">{stats.sent}</p>
        </div>
        <div className="border rounded-[5px] bg-card shadow-sm p-5">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Accepted</p>
            <CheckCircle className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-emerald-600">{stats.accepted}</p>
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
              placeholder="Search by reference, customer..."
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
            <Button variant="outline" size="sm" onClick={loadQuotations}>Try Again</Button>
          </div>
        ) : paged.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-muted-foreground">
            <FileText className="h-12 w-12 mb-3 text-muted-foreground/50" />
            <p className="font-medium">
              {search ? "No quotations match your search" : "No quotations yet"}
            </p>
            <p className="text-sm mt-1">
              {search ? "Try a different search term" : "Create a quotation to get started."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted h-[33px]">
                  <th className="px-5 py-2 text-left font-semibold text-foreground min-w-[120px]">Reference</th>
                  <th className="px-5 py-2 text-left font-semibold text-foreground min-w-[140px]">Customer</th>
                  <th className="w-[110px] px-5 py-2 text-left font-semibold text-foreground">Date</th>
                  <th className="w-[70px] px-5 py-2 text-right font-semibold text-foreground">Items</th>
                  <th className="w-[130px] px-5 py-2 text-right font-semibold text-foreground">Amount</th>
                  <th className="w-[110px] px-5 py-2 text-left font-semibold text-foreground">Status</th>
                  <th className="w-[80px] px-5 py-2 text-left font-semibold text-foreground">Action</th>
                </tr>
              </thead>
              <tbody>
                {paged.map((q) => (
                  <tr key={q.id} className="h-[52px] border-b hover:bg-muted/30 transition-colors">
                    <td className="px-5">
                      <Link href={`/quotations/${q.id}`} className="font-mono text-xs font-semibold text-primary hover:underline">
                        {q.referenceNumber}
                      </Link>
                    </td>
                    <td className="px-5">
                      <span className="font-medium text-foreground">{q.customer.name}</span>
                    </td>
                    <td className="px-5 text-muted-foreground">
                      {format(new Date(q.quoteDate), "MMM dd, yyyy")}
                    </td>
                    <td className="px-5 text-right tabular-nums">{q.items.length}</td>
                    <td className="px-5 text-right font-medium tabular-nums">
                      {formatCurrency.format(Number(q.totalAmount))}
                    </td>
                    <td className="px-5">
                      <Badge variant="outline" className={`font-medium text-xs ${statusConfig[q.status]?.className || ""}`}>
                        {statusConfig[q.status]?.label || q.status}
                      </Badge>
                    </td>
                    <td className="px-5">
                      <Link href={`/quotations/${q.id}`}>
                        <Button variant="ghost" size="sm" className="h-[30px] rounded-[5px] text-xs">
                          View
                        </Button>
                      </Link>
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
    </div>
  );
}
