"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import { WorkspaceLink as Link } from "@/components/workspace-link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Plus, Search, Loader2, ChevronRight, ChevronLeft, FileText,
  FileSpreadsheet, RefreshCw, Receipt, CheckCircle, XCircle,
} from "lucide-react";
import { useBillersApi, type Biller } from "@/hooks/use-billers-api";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";

const statusConfig: Record<string, { label: string; className: string }> = {
  ACTIVE: { label: "Active", className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  INACTIVE: { label: "Inactive", className: "bg-gray-100 text-gray-700 border-gray-200" },
};

const ROWS_PER_PAGE = 20;

export default function BillersPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const canManage = user?.role === "OWNER" || user?.role === "ADMIN" || user?.role === "MANAGER";
  const { getBillers, getBillersStats } = useBillersApi();
  const [billers, setBillers] = useState<Biller[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const loadBillers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [billersResponse, statsResponse] = await Promise.all([
        getBillers(),
        getBillersStats(),
      ]);
      const list = Array.isArray(billersResponse) ? billersResponse : (billersResponse as any).billers || [];
      setBillers(list);
      setStats(statsResponse);
    } catch (err: any) {
      setError(err.message || "Failed to load billers");
    } finally {
      setLoading(false);
    }
  }, [getBillers, getBillersStats]);

  useEffect(() => { loadBillers(); }, [loadBillers]);

  const filtered = useMemo(() => {
    if (!search) return billers;
    const q = search.toLowerCase();
    return billers.filter((b) =>
      b.name.toLowerCase().includes(q) ||
      b.code.toLowerCase().includes(q) ||
      b.email?.toLowerCase().includes(q)
    );
  }, [billers, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE));
  const paged = filtered.slice((page - 1) * ROWS_PER_PAGE, page * ROWS_PER_PAGE);

  const exportCSV = () => {
    const headers = ["Code", "Name", "Email", "Phone", "Address", "Status"];
    const rows = filtered.map((b) => [
      b.code, b.name, b.email || "", b.phone || "", b.address || "",
      statusConfig[b.status]?.label || b.status,
    ]);
    const csv = [headers, ...rows].map((row) =>
      row.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")
    ).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `billers-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Exported", description: "Billers data exported as CSV" });
  };

  return (
    <div className="space-y-5">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1 text-sm text-muted-foreground mb-0.5">
        <Link href="/dashboard" className="hover:text-foreground transition-colors">Dashboard</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground">Billers</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[18px] font-bold text-foreground">Billers</h1>
          <p className="text-sm text-muted-foreground">Manage billing entities and branches</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="h-[34px] w-[34px] rounded-[5px]" title="Export CSV" onClick={exportCSV}>
            <FileText className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" className="h-[34px] w-[34px] rounded-[5px]" title="Export Excel" onClick={exportCSV}>
            <FileSpreadsheet className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" className="h-[34px] w-[34px] rounded-[5px]" title="Refresh" onClick={loadBillers}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          {canManage && (
            <Link href="/people/billers/new">
              <Button className="h-[34px] rounded-[5px] bg-[#ff9025] hover:bg-[#ff9025]/90 text-white text-[13px] font-medium px-3">
                <Plus className="mr-1.5 h-3.5 w-3.5" />Add Biller
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="border rounded-[5px] bg-card shadow-sm p-5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Total Billers</p>
          <p className="text-2xl font-bold">{stats?.totalBillers || 0}</p>
        </div>
        <div className="border rounded-[5px] bg-card shadow-sm p-5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Active</p>
          <p className="text-2xl font-bold text-emerald-600">{stats?.activeBillers || 0}</p>
        </div>
        <div className="border rounded-[5px] bg-card shadow-sm p-5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Recently Added (30d)</p>
          <p className="text-2xl font-bold">{stats?.recentlyAdded || 0}</p>
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
              placeholder="Search by name, code, email..."
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
            <Button variant="outline" size="sm" onClick={loadBillers}>Try Again</Button>
          </div>
        ) : paged.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-muted-foreground">
            <Receipt className="h-12 w-12 mb-3 text-muted-foreground/50" />
            <p className="font-medium">
              {search ? "No billers match your search" : "No billers yet"}
            </p>
            <p className="text-sm mt-1">
              {search ? "Try a different search term" : "Add a biller to get started."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted h-[33px]">
                  <th className="px-5 py-2 text-left font-semibold text-foreground min-w-[100px]">Code</th>
                  <th className="px-5 py-2 text-left font-semibold text-foreground min-w-[160px]">Name</th>
                  <th className="px-5 py-2 text-left font-semibold text-foreground min-w-[160px]">Email</th>
                  <th className="px-5 py-2 text-left font-semibold text-foreground w-[120px]">Phone</th>
                  <th className="px-5 py-2 text-left font-semibold text-foreground min-w-[160px]">Address</th>
                  <th className="w-[90px] px-5 py-2 text-left font-semibold text-foreground">Status</th>
                  <th className="w-[80px] px-5 py-2 text-left font-semibold text-foreground">Action</th>
                </tr>
              </thead>
              <tbody>
                {paged.map((biller) => (
                  <tr key={biller.id} className="h-[52px] border-b hover:bg-muted/30 transition-colors">
                    <td className="px-5 font-mono text-xs font-semibold text-primary">{biller.code}</td>
                    <td className="px-5">
                      <Link href={`/people/billers/${biller.id}`} className="font-medium text-foreground hover:underline">
                        {biller.name}
                      </Link>
                    </td>
                    <td className="px-5 text-muted-foreground">{biller.email || "—"}</td>
                    <td className="px-5 text-muted-foreground">{biller.phone || "—"}</td>
                    <td className="px-5 text-muted-foreground max-w-[160px] truncate">{biller.address || "—"}</td>
                    <td className="px-5">
                      <Badge variant="outline" className={`font-medium text-xs ${statusConfig[biller.status]?.className || ""}`}>
                        {biller.status === "ACTIVE" ? <CheckCircle className="h-3 w-3 mr-1" /> : <XCircle className="h-3 w-3 mr-1" />}
                        {statusConfig[biller.status]?.label || biller.status}
                      </Badge>
                    </td>
                    <td className="px-5">
                      <Link href={`/people/billers/${biller.id}`}>
                        <Button variant="ghost" size="sm" className="h-[30px] rounded-[5px] text-xs">View</Button>
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
              <Button variant="outline" size="icon" className="h-[30px] w-[30px] rounded-[5px]" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                const start = Math.max(1, Math.min(page - 2, totalPages - 4));
                const p = start + i;
                if (p > totalPages) return null;
                return (
                  <Button key={p} variant={p === page ? "default" : "outline"} size="icon" className="h-[30px] w-[30px] rounded-[5px] text-xs" onClick={() => setPage(p)}>
                    {p}
                  </Button>
                );
              })}
              <Button variant="outline" size="icon" className="h-[30px] w-[30px] rounded-[5px]" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
