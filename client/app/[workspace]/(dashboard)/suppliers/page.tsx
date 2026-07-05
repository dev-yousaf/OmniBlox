"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import { WorkspaceLink as Link } from "@/components/workspace-link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Plus, Search, Loader2, ChevronRight, ChevronLeft, FileText,
  FileSpreadsheet, RefreshCw, Building2,
} from "lucide-react";
import {
  useSuppliersApi,
  type Supplier,
} from "@/hooks/use-suppliers-api";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";

const ROWS_PER_PAGE = 20;

export default function SuppliersPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const canManage = user?.role === "OWNER" || user?.role === "ADMIN" || user?.role === "MANAGER";
  const { getSuppliers } = useSuppliersApi();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const loadSuppliers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getSuppliers({ limit: 1000 });
      const list = Array.isArray(res) ? res : (res as any).suppliers || [];
      setSuppliers(list);
    } catch (err: any) {
      setError(err.message || "Failed to load suppliers");
    } finally {
      setLoading(false);
    }
  }, [getSuppliers]);

  useEffect(() => { loadSuppliers(); }, [loadSuppliers]);

  const filtered = useMemo(() => {
    if (!search) return suppliers;
    const q = search.toLowerCase();
    return suppliers.filter((s) =>
      s.name.toLowerCase().includes(q) ||
      s.email?.toLowerCase().includes(q) ||
      s.phone?.toLowerCase().includes(q)
    );
  }, [suppliers, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE));
  const paged = filtered.slice((page - 1) * ROWS_PER_PAGE, page * ROWS_PER_PAGE);

  const exportCSV = () => {
    const headers = ["Name", "Email", "Phone", "Address"];
    const rows = filtered.map((s) => [
      s.name,
      s.email || "",
      s.phone || "",
      s.address || "",
    ]);
    const csv = [headers, ...rows].map((row) =>
      row.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")
    ).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `suppliers-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Exported", description: "Suppliers data exported as CSV" });
  };

  return (
    <div className="space-y-5">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1 text-sm text-muted-foreground mb-0.5">
        <Link href="/dashboard" className="hover:text-foreground transition-colors">Dashboard</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground">Suppliers</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[18px] font-bold text-foreground">Suppliers</h1>
          <p className="text-sm text-muted-foreground">Manage your suppliers and track purchases</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="h-[34px] w-[34px] rounded-[5px]" title="Export CSV" onClick={exportCSV}>
            <FileText className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" className="h-[34px] w-[34px] rounded-[5px]" title="Export Excel" onClick={exportCSV}>
            <FileSpreadsheet className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" className="h-[34px] w-[34px] rounded-[5px]" title="Refresh" onClick={loadSuppliers}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          {canManage && (
            <Link href="/suppliers/new">
              <Button className="h-[34px] rounded-[5px] bg-[#ff9025] hover:bg-[#ff9025]/90 text-white text-[13px] font-medium px-3">
                <Plus className="mr-1.5 h-3.5 w-3.5" />Add Supplier
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-1">
        <div className="border rounded-[5px] bg-card shadow-sm p-5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Total Suppliers</p>
          <p className="text-2xl font-bold">{suppliers.length}</p>
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-[5px] bg-card shadow-sm overflow-hidden">
        <div className="flex items-center gap-4 px-5 py-[15px] border-b">
          <div className="flex items-center gap-2 border rounded-[5px] px-2.5 py-1.5 w-[250px]">
            <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <input
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground min-w-0"
              placeholder="Search by name, email, phone..."
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
            <Button variant="outline" size="sm" onClick={loadSuppliers}>Try Again</Button>
          </div>
        ) : paged.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-muted-foreground">
            <Building2 className="h-12 w-12 mb-3 text-muted-foreground/50" />
            <p className="font-medium">
              {search ? "No suppliers match your search" : "No suppliers yet"}
            </p>
            <p className="text-sm mt-1">
              {search ? "Try a different search term" : "Add a supplier to get started."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted h-[33px]">
                  <th className="px-5 py-2 text-left font-semibold text-foreground min-w-[180px]">Supplier</th>
                  <th className="px-5 py-2 text-left font-semibold text-foreground min-w-[160px]">Email</th>
                  <th className="px-5 py-2 text-left font-semibold text-foreground w-[130px]">Phone</th>
                  <th className="px-5 py-2 text-left font-semibold text-foreground min-w-[150px]">Address</th>
                  <th className="w-[80px] px-5 py-2 text-left font-semibold text-foreground">Action</th>
                </tr>
              </thead>
              <tbody>
                {paged.map((s) => (
                  <tr key={s.id} className="h-[52px] border-b hover:bg-muted/30 transition-colors">
                    <td className="px-5">
                      <Link href={`/suppliers/${s.id}`} className="font-medium text-foreground hover:underline">
                        {s.name}
                      </Link>
                    </td>
                    <td className="px-5 text-muted-foreground">{s.email || "\u2014"}</td>
                    <td className="px-5 text-muted-foreground">{s.phone || "\u2014"}</td>
                    <td className="px-5 text-muted-foreground truncate max-w-[200px]">{s.address || "\u2014"}</td>
                    <td className="px-5">
                      <Link href={`/suppliers/${s.id}`}>
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
