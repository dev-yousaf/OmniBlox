"use client";

import { useEffect, useState, useCallback } from "react";
import { WorkspaceLink as Link } from "@/components/workspace-link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthenticatedApi } from "@/hooks/use-authenticated-api";
import {
  History, ChevronRight, Loader2, RefreshCw,
  Search, ChevronLeft, ChevronRight as ChevronRightIcon,
} from "lucide-react";

interface AuditLogEntry {
  id: string;
  userId: string;
  userName: string;
  userRole: string;
  action: string;
  entity: string;
  entityId?: string;
  details?: string;
  createdAt: string;
}

interface AuditLogResponse {
  logs: AuditLogEntry[];
  total: number;
  page: number;
  limit: number;
}

const actionColors: Record<string, string> = {
  CREATE: "text-emerald-600 bg-emerald-50 border-emerald-200",
  UPDATE: "text-blue-600 bg-blue-50 border-blue-200",
  DELETE: "text-red-600 bg-red-50 border-red-200",
  MARK_PAID: "text-green-600 bg-green-50 border-green-200",
  RECEIVE: "text-purple-600 bg-purple-50 border-purple-200",
  LOGIN: "text-gray-600 bg-gray-50 border-gray-200",
};

export default function AuditLogPage() {
  const { get } = useAuthenticatedApi();
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const limit = 50;
  const totalPages = Math.ceil(total / limit);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      setError(null);
      const data = await get(`/audit-logs?page=${page}&limit=${limit}`) as AuditLogResponse;
      setLogs(data.logs || []);
      setTotal(data.total || 0);
    } catch {
      setLogs([]);
      setError("Failed to load audit logs.");
    } finally {
      setLoading(false);
    }
  }, [get, page]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const filtered = search
    ? logs.filter((l) =>
        l.userName.toLowerCase().includes(search.toLowerCase()) ||
        l.action.toLowerCase().includes(search.toLowerCase()) ||
        l.entity.toLowerCase().includes(search.toLowerCase()) ||
        (l.details || "").toLowerCase().includes(search.toLowerCase())
      )
    : logs;

  return (
    <div className="space-y-5">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1 text-sm text-muted-foreground mb-0.5">
        <Link href="/dashboard" className="hover:text-foreground transition-colors">Dashboard</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground">Audit Log</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[18px] font-bold text-foreground">Audit Log</h1>
          <p className="text-sm text-muted-foreground">{total} total entries</p>
        </div>
        <Button variant="outline" size="sm" className="h-[34px] rounded-[5px] text-[13px]" onClick={fetchLogs} disabled={loading}>
          <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      {/* Search */}
      <div className="relative w-full max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search logs..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 h-[34px] text-[13px] rounded-[5px]"
        />
      </div>

      {/* Table */}
      <div className="border rounded-[5px] bg-card shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : error ? (
          <div className="flex items-center justify-center py-16 text-destructive"><p>{error}</p></div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground">
            <History className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
            <p className="font-medium">No audit log entries</p>
            <p className="text-sm mt-1">Activity logs will appear here as users perform actions.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/30 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <th className="text-left px-5 py-3 w-[180px]">Timestamp</th>
                  <th className="text-left px-5 py-3 w-[140px]">User</th>
                  <th className="text-left px-5 py-3 w-[100px]">Role</th>
                  <th className="text-left px-5 py-3 w-[110px]">Action</th>
                  <th className="text-left px-5 py-3 w-[100px]">Entity</th>
                  <th className="text-left px-5 py-3">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y text-sm">
                {filtered.map((entry) => (
                  <tr key={entry.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-5 py-3 text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(entry.createdAt).toLocaleDateString("en-US", {
                        month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit",
                      })}
                    </td>
                    <td className="px-5 py-3 font-medium">{entry.userName}</td>
                    <td className="px-5 py-3 text-xs text-muted-foreground">{entry.userRole}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-block px-2 py-0.5 text-[11px] font-semibold rounded-full border ${actionColors[entry.action] || "text-gray-600 bg-gray-50 border-gray-200"}`}>
                        {entry.action}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">{entry.entity}</td>
                    <td className="px-5 py-3 text-xs text-muted-foreground max-w-[300px] truncate">
                      {entry.details ? (() => {
                        try { return JSON.stringify(JSON.parse(entry.details), null, 1); }
                        catch { return entry.details; }
                      })() : "—"}
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
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Page {page} of {totalPages} ({total} entries)</span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-[30px] rounded-[5px] text-xs" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
              <ChevronLeft className="h-3.5 w-3.5" /> Previous
            </Button>
            <Button variant="outline" size="sm" className="h-[30px] rounded-[5px] text-xs" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              Next <ChevronRightIcon className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
