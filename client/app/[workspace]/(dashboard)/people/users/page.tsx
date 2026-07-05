"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import { WorkspaceLink as Link } from "@/components/workspace-link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Plus, Search, Loader2, ChevronRight, ChevronLeft, FileText,
  FileSpreadsheet, RefreshCw, Users, Shield, Crown, Briefcase,
} from "lucide-react";
import { useTeamApi, type TeamUser } from "@/hooks/use-team-api";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";
import { PageError, checkRoleAccess } from "@/components/ui/page-error";

const roleConfig: Record<string, { label: string; className: string }> = {
  OWNER: { label: "Owner", className: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  ADMIN: { label: "Admin", className: "bg-purple-100 text-purple-700 border-purple-200" },
  MANAGER: { label: "Manager", className: "bg-blue-100 text-blue-700 border-blue-200" },
  OBSERVER: { label: "Observer", className: "bg-gray-100 text-gray-700 border-gray-200" },
};

const statusConfig: Record<string, { label: string; className: string }> = {
  ACTIVE: { label: "Active", className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  INVITED: { label: "Invited", className: "bg-amber-100 text-amber-700 border-amber-200" },
  SUSPENDED: { label: "Suspended", className: "bg-red-100 text-red-700 border-red-200" },
};

const ROWS_PER_PAGE = 20;

export default function UsersPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const currentRole = (user?.role || "").toUpperCase();
  const canView = checkRoleAccess(currentRole, ["OWNER", "ADMIN", "MANAGER"]);
  const canCreateUser = currentRole === "OWNER" || currentRole === "ADMIN";
  const { getUsers, getTeamStats } = useTeamApi();
  const [users, setUsers] = useState<TeamUser[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [usersResponse, statsResponse] = await Promise.all([
        getUsers(),
        getTeamStats(),
      ]);
      const list = Array.isArray(usersResponse) ? usersResponse : (usersResponse as any).users || [];
      setUsers(list);
      setStats(statsResponse);
    } catch (err: any) {
      setError(err.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, [getUsers, getTeamStats]);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const filtered = useMemo(() => {
    if (!search) return users;
    const q = search.toLowerCase();
    return users.filter((u) =>
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q)
    );
  }, [users, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE));
  const paged = filtered.slice((page - 1) * ROWS_PER_PAGE, page * ROWS_PER_PAGE);

  const exportCSV = () => {
    const headers = ["Name", "Email", "Role", "Status", "Last Login"];
    const rows = filtered.map((u) => [
      u.name, u.email, u.role,
      (u as any).status || "ACTIVE",
      (u as any).lastLogin ? new Date((u as any).lastLogin).toLocaleString() : "Never",
    ]);
    const csv = [headers, ...rows].map((row) =>
      row.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")
    ).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `users-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Exported", description: "Users data exported as CSV" });
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "OWNER": return Crown;
      case "ADMIN": return Shield;
      case "MANAGER": return Briefcase;
      default: return Users;
    }
  };

  if (!canView) {
    return <PageError type="forbidden" />;
  }

  return (
    <div className="space-y-5">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1 text-sm text-muted-foreground mb-0.5">
        <Link href="/dashboard" className="hover:text-foreground transition-colors">Dashboard</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground">Users</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[18px] font-bold text-foreground">Users</h1>
          <p className="text-sm text-muted-foreground">Manage system users and permissions</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="h-[34px] w-[34px] rounded-[5px]" title="Export CSV" onClick={exportCSV}>
            <FileText className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" className="h-[34px] w-[34px] rounded-[5px]" title="Export Excel" onClick={exportCSV}>
            <FileSpreadsheet className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" className="h-[34px] w-[34px] rounded-[5px]" title="Refresh" onClick={loadUsers}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          {canCreateUser && (
            <Link href="/people/users/new">
              <Button className="h-[34px] rounded-[5px] bg-[#ff9025] hover:bg-[#ff9025]/90 text-white text-[13px] font-medium px-3">
                <Plus className="mr-1.5 h-3.5 w-3.5" />Add User
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <div className="border rounded-[5px] bg-card shadow-sm p-5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Total Users</p>
          <p className="text-2xl font-bold">{stats?.totalUsers || 0}</p>
        </div>
        <div className="border rounded-[5px] bg-card shadow-sm p-5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Active</p>
          <p className="text-2xl font-bold text-emerald-600">{stats?.activeUsers || 0}</p>
        </div>
        <div className="border rounded-[5px] bg-card shadow-sm p-5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Admins</p>
          <p className="text-2xl font-bold">{stats?.adminCount || 0}</p>
        </div>
        <div className="border rounded-[5px] bg-card shadow-sm p-5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Staff</p>
          <p className="text-2xl font-bold">{stats?.staffCount || 0}</p>
        </div>
        <div className="border rounded-[5px] bg-card shadow-sm p-5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Invited</p>
          <p className="text-2xl font-bold text-amber-600">{stats?.inactiveUsers || 0}</p>
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
              placeholder="Search by name, email..."
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
            <Button variant="outline" size="sm" onClick={loadUsers}>Try Again</Button>
          </div>
        ) : paged.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-muted-foreground">
            <Users className="h-12 w-12 mb-3 text-muted-foreground/50" />
            <p className="font-medium">
              {search ? "No users match your search" : "No users yet"}
            </p>
            <p className="text-sm mt-1">
              {search ? "Try a different search term" : "Invite a user to get started."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted h-[33px]">
                  <th className="px-5 py-2 text-left font-semibold text-foreground min-w-[180px]">User</th>
                  <th className="px-5 py-2 text-left font-semibold text-foreground min-w-[200px]">Email</th>
                  <th className="w-[110px] px-5 py-2 text-left font-semibold text-foreground">Role</th>
                  <th className="w-[100px] px-5 py-2 text-left font-semibold text-foreground">Status</th>
                  <th className="w-[140px] px-5 py-2 text-left font-semibold text-foreground">Last Login</th>
                  <th className="w-[80px] px-5 py-2 text-left font-semibold text-foreground">Action</th>
                </tr>
              </thead>
              <tbody>
                {paged.map((u) => {
                  const RoleIcon = getRoleIcon(u.role);
                  const userStatus = (u as any).status || "ACTIVE";
                  return (
                    <tr key={u.id} className="h-[52px] border-b hover:bg-muted/30 transition-colors">
                      <td className="px-5">
                        <Link href={`/people/users/${u.id}`} className="flex items-center gap-2.5 hover:underline">
                          <Avatar className="size-[30px]">
                            <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                              {u.name.split(" ").map((n) => n[0]).join("")}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium text-foreground">{u.name}</span>
                        </Link>
                      </td>
                      <td className="px-5 text-muted-foreground">{u.email}</td>
                      <td className="px-5">
                        <Badge variant="outline" className={`font-medium text-xs ${roleConfig[u.role]?.className || ""}`}>
                          <RoleIcon className="h-3 w-3 mr-1" />
                          {roleConfig[u.role]?.label || u.role}
                        </Badge>
                      </td>
                      <td className="px-5">
                        <Badge variant="outline" className={`font-medium text-xs ${statusConfig[userStatus]?.className || ""}`}>
                          {statusConfig[userStatus]?.label || userStatus}
                        </Badge>
                      </td>
                      <td className="px-5 text-muted-foreground">
                        {(u as any).lastLogin ? new Date((u as any).lastLogin).toLocaleDateString() : "Never"}
                      </td>
                      <td className="px-5">
                        <Link href={`/people/users/${u.id}`}>
                          <Button variant="ghost" size="sm" className="h-[30px] rounded-[5px] text-xs">View</Button>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
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
