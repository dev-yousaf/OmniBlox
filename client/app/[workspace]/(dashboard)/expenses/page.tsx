"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import { WorkspaceLink as Link } from "@/components/workspace-link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Plus, Search, Loader2, ChevronRight, ChevronLeft, FileText,
  FileSpreadsheet, RefreshCw, DollarSign,
} from "lucide-react";
import { useExpensesApi, type Expense, ExpenseStatus } from "@/hooks/use-expenses-api";
import { format } from "date-fns";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";

const statusConfig: Record<string, { label: string; className: string }> = {
  [ExpenseStatus.PENDING]: { label: "Pending", className: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  [ExpenseStatus.APPROVED]: { label: "Approved", className: "bg-blue-100 text-blue-700 border-blue-200" },
  [ExpenseStatus.PAID]: { label: "Paid", className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  [ExpenseStatus.REJECTED]: { label: "Rejected", className: "bg-red-100 text-red-700 border-red-200" },
};

const ROWS_PER_PAGE = 20;

export default function ExpensesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const canManage = user?.role === "OWNER" || user?.role === "ADMIN" || user?.role === "MANAGER";
  const api = useExpensesApi();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const loadExpenses = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getExpenses();
      setExpenses(data);
    } catch (err: any) {
      setError(err.message || "Failed to load expenses");
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => { loadExpenses(); }, [loadExpenses]);

  const filtered = useMemo(() => {
    if (!search) return expenses;
    const q = search.toLowerCase();
    return expenses.filter((e) =>
      e.reference.toLowerCase().includes(q) ||
      e.vendor?.toLowerCase().includes(q) ||
      e.category?.name?.toLowerCase().includes(q)
    );
  }, [expenses, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE));
  const paged = filtered.slice((page - 1) * ROWS_PER_PAGE, page * ROWS_PER_PAGE);

  const stats = useMemo(() => ({
    total: expenses.length,
    totalAmount: expenses.reduce((s, e) => s + Number(e.amount), 0),
    pending: expenses.filter((e) => e.status === ExpenseStatus.PENDING).length,
    pendingAmount: expenses.filter((e) => e.status === ExpenseStatus.PENDING).reduce((s, e) => s + Number(e.amount), 0),
    approved: expenses.filter((e) => e.status === ExpenseStatus.APPROVED).length,
    approvedAmount: expenses.filter((e) => e.status === ExpenseStatus.APPROVED).reduce((s, e) => s + Number(e.amount), 0),
    paid: expenses.filter((e) => e.status === ExpenseStatus.PAID).length,
    paidAmount: expenses.filter((e) => e.status === ExpenseStatus.PAID).reduce((s, e) => s + Number(e.amount), 0),
  }), [expenses]);

  const exportCSV = () => {
    const headers = ["Reference", "Vendor", "Category", "Date", "Amount", "Status"];
    const rows = filtered.map((e) => [
      e.reference,
      e.vendor || "",
      e.category?.name || "",
      format(new Date(e.expenseDate), "MMM dd, yyyy"),
      Number(e.amount).toFixed(2),
      statusConfig[e.status]?.label || e.status,
    ]);
    const csv = [headers, ...rows].map((row) =>
      row.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")
    ).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `expenses-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Exported", description: "Expenses data exported as CSV" });
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
        <span className="text-foreground">Expenses</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[18px] font-bold text-foreground">All Expenses</h1>
          <p className="text-sm text-muted-foreground">Track and manage business expenses</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="h-[34px] w-[34px] rounded-[5px]" title="Export CSV" onClick={exportCSV}>
            <FileText className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" className="h-[34px] w-[34px] rounded-[5px]" title="Export Excel" onClick={exportCSV}>
            <FileSpreadsheet className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" className="h-[34px] w-[34px] rounded-[5px]" title="Refresh" onClick={loadExpenses}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          {canManage && (
            <Link href="/expenses/new">
              <Button className="h-[34px] rounded-[5px] bg-[#ff9025] hover:bg-[#ff9025]/90 text-white text-[13px] font-medium px-3">
                <Plus className="mr-1.5 h-3.5 w-3.5" />New Expense
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="border rounded-[5px] bg-card shadow-sm p-5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Total Expenses</p>
          <p className="text-2xl font-bold">{stats.total}</p>
        </div>
        <div className="border rounded-[5px] bg-card shadow-sm p-5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Total Amount</p>
          <p className="text-2xl font-bold">{formatCurrency.format(stats.totalAmount)}</p>
        </div>
        <div className="border rounded-[5px] bg-card shadow-sm p-5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Pending</p>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-bold text-amber-600">{stats.pending}</p>
            <p className="text-sm text-muted-foreground">{formatCurrency.format(stats.pendingAmount)}</p>
          </div>
        </div>
        <div className="border rounded-[5px] bg-card shadow-sm p-5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Paid</p>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-bold text-emerald-600">{stats.paid}</p>
            <p className="text-sm text-muted-foreground">{formatCurrency.format(stats.paidAmount)}</p>
          </div>
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
              placeholder="Search by reference, vendor..."
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
            <Button variant="outline" size="sm" onClick={loadExpenses}>Try Again</Button>
          </div>
        ) : paged.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-muted-foreground">
            <DollarSign className="h-12 w-12 mb-3 text-muted-foreground/50" />
            <p className="font-medium">
              {search ? "No expenses match your search" : "No expenses yet"}
            </p>
            <p className="text-sm mt-1">
              {search ? "Try a different search term" : "Create an expense to get started."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted h-[33px]">
                  <th className="px-5 py-2 text-left font-semibold text-foreground min-w-[120px]">Reference</th>
                  <th className="px-5 py-2 text-left font-semibold text-foreground min-w-[140px]">Vendor</th>
                  <th className="px-5 py-2 text-left font-semibold text-foreground min-w-[120px]">Category</th>
                  <th className="w-[110px] px-5 py-2 text-left font-semibold text-foreground">Date</th>
                  <th className="w-[130px] px-5 py-2 text-right font-semibold text-foreground">Amount</th>
                  <th className="w-[100px] px-5 py-2 text-left font-semibold text-foreground">Status</th>
                  <th className="w-[90px] px-5 py-2 text-center font-semibold text-foreground">Action</th>
                </tr>
              </thead>
              <tbody>
                {paged.map((expense) => (
                  <tr key={expense.id} className="h-[52px] border-b hover:bg-muted/30 transition-colors">
                    <td className="px-5">
                      <Link href={`/expenses/${expense.id}`} className="font-mono text-xs font-semibold text-primary hover:underline">
                        {expense.reference}
                      </Link>
                    </td>
                    <td className="px-5">
                      <span className="font-medium text-foreground">{expense.vendor || "—"}</span>
                    </td>
                    <td className="px-5 text-muted-foreground">{expense.category?.name || "—"}</td>
                    <td className="px-5 text-muted-foreground">
                      {format(new Date(expense.expenseDate), "MMM dd, yyyy")}
                    </td>
                    <td className="px-5 text-right font-medium tabular-nums">
                      {formatCurrency.format(Number(expense.amount))}
                    </td>
                    <td className="px-5">
                      <Badge variant="outline" className={`font-medium text-xs ${statusConfig[expense.status]?.className || ""}`}>
                        {statusConfig[expense.status]?.label || expense.status}
                      </Badge>
                    </td>
                    <td className="px-5 text-center">
                      <Link href={`/expenses/${expense.id}`}>
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
