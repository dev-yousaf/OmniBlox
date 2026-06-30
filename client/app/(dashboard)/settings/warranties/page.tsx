"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { useWarrantiesApi, Warranty } from "@/hooks/use-warranties-api";
import {
  Plus, Eye, Pencil, Trash2, Loader2, ArrowUpDown,
  Search, ChevronLeft, ChevronRight, ChevronDown,
  RefreshCw, ChevronUp, FileText, FileSpreadsheet,
} from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const statusColors: Record<string, string> = {
  ACTIVE: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  INACTIVE: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

const durationTypeLabels: Record<string, string> = {
  DAYS: "Days",
  MONTHS: "Months",
  YEARS: "Years",
};

const ROWS_PER_PAGE = 10;

export default function WarrantiesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const api = useWarrantiesApi();

  const [items, setItems] = useState<Warranty[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [dialogMode, setDialogMode] = useState<"create" | "edit" | "view">("create");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [editing, setEditing] = useState<Warranty | null>(null);
  const [deleting, setDeleting] = useState<Warranty | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [fName, setFName] = useState("");
  const [fDuration, setFDuration] = useState("12");
  const [fDurationType, setFDurationType] = useState("MONTHS");
  const [fDesc, setFDesc] = useState("");
  const [fStatus, setFStatus] = useState("ACTIVE");

  const canManage = user?.role === "OWNER" || user?.role === "ADMIN" || user?.role === "MANAGER";

  useEffect(() => { load(); }, []);

  const load = async () => {
    setError(null);
    try { setIsLoading(true); setItems(await api.getWarranties()); }
    catch (err: any) { setError(err?.message || "Failed to load warranties."); }
    finally { setIsLoading(false); }
  };

  const filtered = useMemo(() => {
    let result = [...items];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(i => i.name.toLowerCase().includes(q) || (i.description || "").toLowerCase().includes(q));
    }
    if (statusFilter !== "all") result = result.filter(i => i.status === statusFilter);
    result.sort((a, b) => {
      const d = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return sortDir === "asc" ? d : -d;
    });
    return result;
  }, [items, search, statusFilter, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE));
  const paged = filtered.slice((page - 1) * ROWS_PER_PAGE, page * ROWS_PER_PAGE);

  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [page, totalPages]);

  const toggleSort = () => setSortDir(d => d === "asc" ? "desc" : "asc");

  const toggleSelect = (id: string) => {
    const n = new Set(selectedIds); n.has(id) ? n.delete(id) : n.add(id); setSelectedIds(n);
  };
  const toggleAll = () => {
    if (selectedIds.size === paged.length && paged.length > 0)
      setSelectedIds(new Set());
    else setSelectedIds(new Set(paged.map(i => i.id)));
  };

  const openCreate = () => {
    setDialogMode("create"); setEditing(null);
    setFName(""); setFDuration("12"); setFDurationType("MONTHS"); setFDesc(""); setFStatus("ACTIVE");
    setDialogOpen(true);
  };
  const openEdit = (c: Warranty) => {
    setDialogMode("edit"); setEditing(c);
    setFName(c.name); setFDuration(String(c.duration)); setFDurationType(c.durationType); setFDesc(c.description || ""); setFStatus(c.status);
    setDialogOpen(true);
  };
  const openView = (c: Warranty) => { setDialogMode("view"); setEditing(c); setDialogOpen(true); };
  const openDelete = (c: Warranty) => { setDeleting(c); setDeleteOpen(true); };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fName.trim() || !fDuration) return;
    try {
      setSubmitting(true);
      const dto = { name: fName.trim(), duration: parseInt(fDuration), durationType: fDurationType, description: fDesc.trim() || undefined, status: fStatus };
      if (editing) { await api.updateWarranty(editing.id, dto); toast({ title: "Success", description: "Warranty updated" }); }
      else { await api.createWarranty(dto); toast({ title: "Success", description: "Warranty created" }); }
      setDialogOpen(false); load();
    } catch (err: any) { toast({ title: "Error", description: err.message || "Failed", variant: "destructive" }); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try { setSubmitting(true); await api.deleteWarranty(deleting.id); toast({ title: "Success", description: "Warranty deleted" }); setDeleteOpen(false); setDeleting(null); load(); }
    catch (err: any) { toast({ title: "Error", description: err.message || "Failed", variant: "destructive" }); }
    finally { setSubmitting(false); }
  };

  const handleBulkDelete = async () => {
    try { setSubmitting(true); await api.bulkDeleteWarranties(Array.from(selectedIds)); toast({ title: "Deleted", description: `${selectedIds.size} warranties deleted` }); setSelectedIds(new Set()); setBulkDeleteOpen(false); load(); }
    catch (err: any) { toast({ title: "Error", description: err.message || "Failed", variant: "destructive" }); }
    finally { setSubmitting(false); }
  };

  const formatDuration = (w: Warranty) => {
    const label = durationTypeLabels[w.durationType] || w.durationType;
    return `${w.duration} ${label}`;
  };

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-1 text-sm text-muted-foreground mb-0.5">
            <span>Dashboard</span>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="text-foreground">Warranties</span>
          </div>
          <h1 className="text-[18px] font-bold text-foreground">Warranties</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="h-[34px] w-[34px] rounded-[5px]" title="Export PDF"><FileText className="h-4 w-4" /></Button>
          <Button variant="outline" size="icon" className="h-[34px] w-[34px] rounded-[5px]" title="Export Excel"><FileSpreadsheet className="h-4 w-4" /></Button>
          <Button variant="outline" size="icon" className="h-[34px] w-[34px] rounded-[5px]" title="Refresh" onClick={load}><RefreshCw className="h-4 w-4" /></Button>
          <Button variant="outline" size="icon" className="h-[34px] w-[34px] rounded-[5px]" title="Collapse"><ChevronUp className="h-4 w-4" /></Button>
          {canManage && (
            <Button className="h-[34px] rounded-[5px] bg-primary hover:bg-primary/90 text-primary-foreground text-[13px] font-medium px-3" onClick={openCreate}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />Add Warranty
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-[5px] bg-card shadow-sm overflow-hidden">
        {/* Table Toolbar */}
        <div className="flex items-center gap-4 px-5 py-[15px] border-b">
          <div className="flex items-center gap-2 border rounded-[5px] px-2.5 py-1.5 w-[200px]">
            <Search className="h-3.5 w-3.5 text-muted-foreground" />
            <input
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              placeholder="Search"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(1); }}>
              <SelectTrigger className="h-[34px] w-[100px] text-sm rounded-[5px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="INACTIVE">Inactive</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center gap-1.5 text-sm text-foreground font-semibold">
              Sort By :
              <Select defaultValue="last7">
                <SelectTrigger className="h-[34px] w-[130px] text-sm rounded-[5px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="last7">Last 7 Days</SelectItem>
                  <SelectItem value="last30">Last 30 Days</SelectItem>
                  <SelectItem value="last90">Last 90 Days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Table Content */}
        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
        ) : error ? (
          <div className="flex items-center justify-center py-16 text-destructive"><p>{error}</p></div>
        ) : paged.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">No warranties found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted h-[33px]">
                  <th className="w-[60px] px-5 py-2 text-left font-semibold text-foreground">
                    <Checkbox checked={selectedIds.size === paged.length && paged.length > 0} onCheckedChange={toggleAll} />
                  </th>
                  <th className="w-[232px] px-5 py-2 text-left font-semibold text-foreground">Warranty</th>
                  <th className="w-[366px] px-5 py-2 text-left font-semibold text-foreground cursor-pointer select-none" onClick={toggleSort}>
                    <span className="inline-flex items-center gap-1.5">
                      Description
                      <ArrowUpDown className="h-3 w-3" />
                    </span>
                  </th>
                  <th className="w-[186px] px-5 py-2 text-left font-semibold text-foreground cursor-pointer select-none" onClick={toggleSort}>
                    <span className="inline-flex items-center gap-1.5">
                      Duration
                      <ArrowUpDown className="h-3 w-3" />
                    </span>
                  </th>
                  <th className="w-[147px] px-5 py-2 text-left font-semibold text-foreground">Status</th>
                  {canManage && <th className="w-[149px] px-5 py-2 text-left font-semibold text-foreground">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {paged.map(item => (
                  <tr key={item.id} className="h-[56px] border-b">
                    <td className="w-[60px] px-5">
                      <Checkbox checked={selectedIds.has(item.id)} onCheckedChange={() => toggleSelect(item.id)} />
                    </td>
                    <td className="w-[232px] px-5 text-foreground font-medium">{item.name}</td>
                    <td className="w-[366px] px-5 text-foreground truncate max-w-[366px]">{item.description || "—"}</td>
                    <td className="w-[186px] px-5 text-foreground">{formatDuration(item)}</td>
                    <td className="w-[147px] px-5">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[item.status] || statusColors.ACTIVE}`}>
                        {item.status}
                      </span>
                    </td>
                    {canManage && (
                      <td className="w-[149px] px-5">
                        <div className="flex items-center gap-1">
                          <Button variant="outline" size="icon" className="h-[30px] w-[30px] rounded-[5px]" onClick={() => openView(item)}>
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="outline" size="icon" className="h-[30px] w-[30px] rounded-[5px]" onClick={() => openEdit(item)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="outline" size="icon" className="h-[30px] w-[30px] rounded-[5px] text-destructive hover:text-destructive" onClick={() => openDelete(item)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Table Footer */}
        {!isLoading && paged.length > 0 && (
          <div className="flex items-center justify-between px-5 py-[15px] border-t">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Row Per Page</span>
              <Select defaultValue="10">
                <SelectTrigger className="h-8 w-16 text-xs rounded-[5px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
              <span>Entries</span>
            </div>
            <div className="flex items-center gap-3">
              <button className="disabled:opacity-30" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>
                <ChevronLeft className="h-4 w-4 text-muted-foreground" />
              </button>
              <div className="flex items-center gap-2">
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 5) pageNum = i + 1;
                  else if (page <= 3) pageNum = i + 1;
                  else if (page >= totalPages - 2) pageNum = totalPages - 4 + i;
                  else pageNum = page - 2 + i;
                  return (
                    <button key={pageNum}
                      className={`h-6 w-6 rounded-full text-xs flex items-center justify-center border ${pageNum === page ? "bg-primary text-primary-foreground border-primary" : "text-muted-foreground"}`}
                      onClick={() => setPage(pageNum)}>
                      {pageNum}
                    </button>
                  );
                })}
                {totalPages > 5 && page < totalPages - 2 && (
                  <span className="text-xs text-muted-foreground">...</span>
                )}
                {totalPages > 5 && page < totalPages - 2 && (
                  <button className="h-6 w-6 rounded-full text-xs flex items-center justify-center border text-muted-foreground"
                    onClick={() => setPage(totalPages)}>
                    {totalPages}
                  </button>
                )}
              </div>
              <button className="disabled:opacity-30" disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen && dialogMode !== "view"} onOpenChange={o => { if (!o) setDialogOpen(false); }}>
        <DialogContent className="sm:max-w-[480px]">
          <form onSubmit={handleSave}>
            <DialogHeader><DialogTitle className="text-lg font-bold">{editing ? "Edit Warranty" : "Add Warranty"}</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label className="text-sm font-medium">Warranty Name</Label>
                <Input value={fName} onChange={e => setFName(e.target.value)} placeholder="e.g. Standard Warranty" required maxLength={100} className="mt-1.5 h-[38px] rounded-[5px]" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Duration</Label>
                  <Input type="number" min={1} value={fDuration} onChange={e => setFDuration(e.target.value)} placeholder="12" required className="mt-1.5 h-[38px] rounded-[5px]" />
                </div>
                <div>
                  <Label className="text-sm font-medium">Period</Label>
                  <Select value={fDurationType} onValueChange={setFDurationType}>
                    <SelectTrigger className="mt-1.5 h-[38px] rounded-[5px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DAYS">Days</SelectItem>
                      <SelectItem value="MONTHS">Months</SelectItem>
                      <SelectItem value="YEARS">Years</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium">Description</Label>
                <Input value={fDesc} onChange={e => setFDesc(e.target.value)} placeholder="Enter description" className="mt-1.5 h-[38px] rounded-[5px]" />
              </div>
              <div>
                <Label className="text-sm font-medium">Status</Label>
                <Select value={fStatus} onValueChange={setFStatus}>
                  <SelectTrigger className="mt-1.5 h-[38px] rounded-[5px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="INACTIVE">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={submitting} className="rounded-[5px]">Cancel</Button>
              <Button type="submit" disabled={submitting || !fName.trim() || !fDuration} className="rounded-[5px] bg-primary hover:bg-primary/90 text-primary-foreground">
                {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : editing ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={dialogOpen && dialogMode === "view"} onOpenChange={o => { if (!o) setDialogOpen(false); }}>
        <DialogContent>
          <DialogHeader><DialogTitle className="text-lg font-bold">{editing?.name}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-4 text-sm">
            <div className="flex justify-between border-b pb-2"><span className="text-muted-foreground">Duration</span><span>{editing ? formatDuration(editing) : "—"}</span></div>
            <div className="flex justify-between border-b pb-2"><span className="text-muted-foreground">Description</span><span>{editing?.description || "—"}</span></div>
            <div className="flex justify-between border-b pb-2"><span className="text-muted-foreground">Status</span><span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[editing?.status || "ACTIVE"]}`}>{editing?.status}</span></div>
            <div className="flex justify-between border-b pb-2"><span className="text-muted-foreground">Created</span><span>{editing ? new Date(editing.createdAt).toLocaleString() : "—"}</span></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)} className="rounded-[5px]">Close</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete Warranty?</AlertDialogTitle><AlertDialogDescription>You are about to delete &quot;{deleting?.name}&quot;. Products using this warranty will lose their warranty association.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting} className="rounded-[5px]">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={submitting} className="rounded-[5px] bg-destructive hover:bg-destructive/90">{submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Deleting...</> : "Delete"}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete */}
      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete Warranties?</AlertDialogTitle><AlertDialogDescription>{selectedIds.size} warranties will be permanently deleted. Products will lose their warranty association.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting} className="rounded-[5px]">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} disabled={submitting} className="rounded-[5px] bg-destructive hover:bg-destructive/90">{submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Deleting...</> : `Delete ${selectedIds.size}`}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}