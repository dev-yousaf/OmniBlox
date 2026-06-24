"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { useUnitsApi, Unit } from "@/hooks/use-units-api";
import { Plus, Eye, Pencil, Trash2, Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

const statusColors: Record<string, string> = {
  ACTIVE: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  INACTIVE: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

export default function UnitsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { getUnits, createUnit, updateUnit, deleteUnit, bulkDeleteUnits } = useUnitsApi();

  const [items, setItems] = useState<Unit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [dialogMode, setDialogMode] = useState<"create" | "edit" | "view">("create");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [editing, setEditing] = useState<Unit | null>(null);
  const [deleting, setDeleting] = useState<Unit | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formName, setFormName] = useState("");
  const [formShortName, setFormShortName] = useState("");
  const [formSlug, setFormSlug] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formStatus, setFormStatus] = useState("ACTIVE");

  const canManage = user?.role === "OWNER" || user?.role === "ADMIN" || user?.role === "MANAGER";

  useEffect(() => { load(); }, []);

  const load = async () => {
    try { setIsLoading(true); const data = await getUnits(); setItems(data); }
    catch (err: any) { toast({ title: "Error", description: err.message || "Failed to load", variant: "destructive" }); }
    finally { setIsLoading(false); }
  };

  const toggleSelect = (id: string) => { const n = new Set(selectedIds); n.has(id) ? n.delete(id) : n.add(id); setSelectedIds(n); };
  const toggleAll = () => { if (selectedIds.size === items.length) setSelectedIds(new Set()); else setSelectedIds(new Set(items.map(i => i.id))); };

  const openCreate = () => { setDialogMode("create"); setEditing(null); setFormName(""); setFormShortName(""); setFormSlug(""); setFormDesc(""); setFormStatus("ACTIVE"); setDialogOpen(true); };
  const openEdit = (c: Unit) => { setDialogMode("edit"); setEditing(c); setFormName(c.name); setFormShortName(c.shortName); setFormSlug(c.slug); setFormDesc(c.description || ""); setFormStatus(c.status); setDialogOpen(true); };
  const openView = (c: Unit) => { setDialogMode("view"); setEditing(c); setDialogOpen(true); };
  const openDelete = (c: Unit) => { setDeleting(c); setDeleteDialogOpen(true); };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formShortName.trim()) return;
    try {
      setIsSubmitting(true);
      if (editing) { await updateUnit(editing.id, { name: formName.trim(), shortName: formShortName.trim(), slug: formSlug.trim() || undefined, description: formDesc.trim() || undefined, status: formStatus }); toast({ title: "Success", description: "Unit updated" }); }
      else { await createUnit({ name: formName.trim(), shortName: formShortName.trim(), slug: formSlug.trim() || undefined, description: formDesc.trim() || undefined, status: formStatus }); toast({ title: "Success", description: "Unit created" }); }
      setDialogOpen(false); load();
    } catch (err: any) { toast({ title: "Error", description: err.message || "Failed", variant: "destructive" }); }
    finally { setIsSubmitting(false); }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try { setIsSubmitting(true); await deleteUnit(deleting.id); toast({ title: "Success", description: "Unit deleted" }); setDeleteDialogOpen(false); setDeleting(null); load(); }
    catch (err: any) { toast({ title: "Error", description: err.message || "Failed", variant: "destructive" }); }
    finally { setIsSubmitting(false); }
  };

  const handleBulkDelete = async () => {
    try { setIsSubmitting(true); await bulkDeleteUnits(Array.from(selectedIds)); toast({ title: "Deleted", description: `${selectedIds.size} units deleted` }); setSelectedIds(new Set()); setBulkDeleteOpen(false); load(); }
    catch (err: any) { toast({ title: "Error", description: err.message || "Failed", variant: "destructive" }); }
    finally { setIsSubmitting(false); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-3xl font-bold tracking-tight">Units</h1><p className="text-muted-foreground">Manage units of measurement</p></div>
        {canManage && <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Add Unit</Button>}
      </div>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle>All Units</CardTitle>
            {canManage && selectedIds.size > 0 && <Button variant="destructive" size="sm" onClick={() => setBulkDeleteOpen(true)}><Trash2 className="mr-2 h-4 w-4" />Delete ({selectedIds.size})</Button>}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
          : items.length === 0 ? <div className="text-center py-8 text-muted-foreground">No units found.</div>
          : <Table>
              <TableHeader>
                <TableRow>
                  {canManage && <TableHead className="w-[60px]"><Checkbox checked={selectedIds.size === items.length && items.length > 0} onCheckedChange={toggleAll} /></TableHead>}
                  <TableHead className="w-[200px]">Unit Name</TableHead>
                  <TableHead className="w-[150px]">Short Name</TableHead>
                  <TableHead className="w-[200px]">Slug</TableHead>
                  <TableHead className="w-[120px]">Status</TableHead>
                  {canManage && <TableHead className="w-[197px]">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map(item => (
                  <TableRow key={item.id}>
                    {canManage && <TableCell><Checkbox checked={selectedIds.has(item.id)} onCheckedChange={() => toggleSelect(item.id)} /></TableCell>}
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell><code className="rounded bg-muted px-1.5 py-0.5 text-sm font-mono">{item.shortName}</code></TableCell>
                    <TableCell className="text-muted-foreground">{item.slug}</TableCell>
                    <TableCell><span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[item.status] || statusColors.ACTIVE}`}>{item.status}</span></TableCell>
                    {canManage && <TableCell><div className="flex items-center gap-1"><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openView(item)}><Eye className="h-4 w-4" /></Button><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(item)}><Pencil className="h-4 w-4" /></Button><Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => openDelete(item)}><Trash2 className="h-4 w-4" /></Button></div></TableCell>}
                  </TableRow>
                ))}
              </TableBody>
            </Table>}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen && dialogMode !== "view"} onOpenChange={o => { if (!o) setDialogOpen(false); }}>
        <DialogContent>
          <form onSubmit={handleSave}>
            <DialogHeader><DialogTitle>{editing ? "Edit Unit" : "Add Unit"}</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label htmlFor="name">Unit Name</Label><Input id="name" value={formName} onChange={e => setFormName(e.target.value)} placeholder="e.g. Kilograms" required maxLength={100} className="mt-1.5" /></div>
                <div><Label htmlFor="shortName">Short Name</Label><Input id="shortName" value={formShortName} onChange={e => setFormShortName(e.target.value)} placeholder="e.g. kg" required maxLength={20} className="mt-1.5" /></div>
              </div>
              <div><Label htmlFor="slug">Slug</Label><Input id="slug" value={formSlug} onChange={e => setFormSlug(e.target.value)} placeholder="Auto-generated from name" maxLength={100} className="mt-1.5" /></div>
              <div><Label htmlFor="desc">Description (optional)</Label><Input id="desc" value={formDesc} onChange={e => setFormDesc(e.target.value)} placeholder="Enter description" className="mt-1.5" /></div>
              <div><Label htmlFor="status">Status</Label><Select value={formStatus} onValueChange={setFormStatus}><SelectTrigger className="mt-1.5" id="status"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ACTIVE">Active</SelectItem><SelectItem value="INACTIVE">Inactive</SelectItem></SelectContent></Select></div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={isSubmitting}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting || !formName.trim() || !formShortName.trim()}>{isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : editing ? "Update" : "Create"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogOpen && dialogMode === "view"} onOpenChange={o => { if (!o) setDialogOpen(false); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing?.name}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-4 text-sm">
            <div className="flex justify-between border-b pb-2"><span className="text-muted-foreground">Short Name</span><span>{editing?.shortName}</span></div>
            <div className="flex justify-between border-b pb-2"><span className="text-muted-foreground">Slug</span><span>{editing?.slug}</span></div>
            <div className="flex justify-between border-b pb-2"><span className="text-muted-foreground">Description</span><span>{editing?.description || "—"}</span></div>
            <div className="flex justify-between border-b pb-2"><span className="text-muted-foreground">Status</span><span>{editing?.status}</span></div>
            <div className="flex justify-between border-b pb-2"><span className="text-muted-foreground">Created</span><span>{editing ? new Date(editing.createdAt).toLocaleString() : "—"}</span></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)}>Close</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete Unit?</AlertDialogTitle><AlertDialogDescription>You are about to delete &quot;{deleting?.name}&quot;. This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isSubmitting} className="bg-destructive hover:bg-destructive/90">{isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Deleting...</> : "Delete"}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete Units?</AlertDialogTitle><AlertDialogDescription>{selectedIds.size} units will be permanently deleted.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} disabled={isSubmitting} className="bg-destructive hover:bg-destructive/90">{isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Deleting...</> : `Delete ${selectedIds.size}`}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
