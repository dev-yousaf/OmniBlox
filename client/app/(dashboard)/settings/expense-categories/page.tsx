"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import {
  useExpenseCategoriesApi,
  ExpenseCategory,
} from "@/hooks/use-expense-categories-api";
import {
  Plus,
  Eye,
  Pencil,
  Trash2,
  Loader2,
  ArrowUpDown,
  Search,
  FolderTree,
  Layers,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

export default function ExpenseCategoriesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const {
    getExpenseCategories,
    createExpenseCategory,
    updateExpenseCategory,
    deleteExpenseCategory,
    bulkDeleteExpenseCategories,
  } = useExpenseCategoriesApi();

  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [searchQuery, setSearchQuery] = useState("");

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [dialogMode, setDialogMode] = useState<"create" | "edit" | "view">("create");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [editing, setEditing] = useState<ExpenseCategory | null>(null);

  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canManage =
    user?.role === "OWNER" || user?.role === "ADMIN" || user?.role === "MANAGER";

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      setIsLoading(true);
      const data = await getExpenseCategories();
      setCategories(data);
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to load", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return categories;
    const q = searchQuery.toLowerCase();
    return categories.filter(
      (c) => c.name.toLowerCase().includes(q) || (c.description && c.description.toLowerCase().includes(q))
    );
  }, [categories, searchQuery]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const cmp = a.name.localeCompare(b.name);
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [filtered, sortDir]);

  const toggleSort = () => setSortDir((d) => (d === "asc" ? "desc" : "asc"));

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelectedIds(next);
  };

  const toggleAll = () => {
    if (selectedIds.size === sorted.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(sorted.map((c) => c.id)));
    }
  };

  const openCreate = () => {
    setDialogMode("create");
    setEditing(null);
    setFormName("");
    setFormDesc("");
    setDialogOpen(true);
  };

  const openEdit = (c: ExpenseCategory) => {
    setDialogMode("edit");
    setEditing(c);
    setFormName(c.name);
    setFormDesc(c.description || "");
    setDialogOpen(true);
  };

  const openView = (c: ExpenseCategory) => {
    setDialogMode("view");
    setEditing(c);
    setDialogOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;
    try {
      setIsSubmitting(true);
      if (editing) {
        await updateExpenseCategory(editing.id, { name: formName.trim(), description: formDesc.trim() || undefined });
        toast({ title: "Success", description: "Expense category updated" });
      } else {
        await createExpenseCategory({ name: formName.trim(), description: formDesc.trim() || undefined });
        toast({ title: "Success", description: "Expense category created" });
      }
      setDialogOpen(false);
      load();
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const [deleting, setDeleting] = useState<ExpenseCategory | null>(null);

  const openDelete = (c: ExpenseCategory) => {
    setDeleting(c);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      setIsSubmitting(true);
      await deleteExpenseCategory(deleting.id);
      toast({ title: "Success", description: "Expense category deleted" });
      setDeleteDialogOpen(false);
      setDeleting(null);
      load();
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBulkDelete = async () => {
    try {
      setIsSubmitting(true);
      const res = await bulkDeleteExpenseCategories(Array.from(selectedIds));
      toast({ title: "Deleted", description: `${res.count} expense categories deleted` });
      setSelectedIds(new Set());
      setBulkDeleteOpen(false);
      load();
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-primary/90 via-primary to-chart-4 p-6">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent_60%)]" />
        <div className="absolute -bottom-6 -right-6 h-32 w-32 rounded-full bg-white/5 blur-2xl" />
        <div className="absolute -top-4 -left-4 h-24 w-24 rounded-full bg-white/5 blur-xl" />
        <div className="relative flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-white/80 text-sm font-medium">
              <FolderTree className="h-4 w-4" />
              Finance & Accounts
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Expense Categories</h1>
            <p className="text-white/70 text-sm max-w-md">
              Organize and manage your expense categories to track spending efficiently
            </p>
          </div>
          {canManage && (
            <Button
              onClick={openCreate}
              className="h-10 bg-white text-primary shadow-lg hover:bg-white/90 hover:shadow-xl transition-all"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Category
            </Button>
          )}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-0 shadow-sm bg-card">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-chart-4/20 text-primary">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Categories</p>
              <p className="text-xl font-bold">{categories.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-card">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-chart-4/20 text-primary">
              <FolderTree className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">With Descriptions</p>
              <p className="text-xl font-bold">{categories.filter((c) => c.description).length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-card">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-chart-4/20 text-primary">
              <Trash2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Selected</p>
              <p className="text-xl font-bold">{selectedIds.size}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Table Card */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-4 border-b">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <CardTitle className="text-lg font-semibold">All Expense Categories</CardTitle>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="relative flex-1 sm:flex-initial">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search categories..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 w-full sm:w-[240px]"
                />
              </div>
              {canManage && selectedIds.size > 0 && (
                <Button variant="destructive" size="sm" onClick={() => setBulkDeleteOpen(true)} className="h-9 shrink-0">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete ({selectedIds.size})
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Loading categories...</p>
            </div>
          ) : sorted.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <FolderTree className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-base font-medium text-muted-foreground">
                {searchQuery ? "No categories match your search" : "No expense categories found"}
              </p>
              <p className="text-sm text-muted-foreground">
                {searchQuery
                  ? "Try a different search term"
                  : "Create your first expense category to get started"
                }
              </p>
              {!searchQuery && canManage && (
                <Button onClick={openCreate} variant="outline" className="mt-2">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Category
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  {canManage && <TableHead className="w-[50px] pl-5"><Checkbox checked={selectedIds.size === sorted.length && sorted.length > 0} onCheckedChange={toggleAll} /></TableHead>}
                  <TableHead className="w-[300px] cursor-pointer select-none" onClick={toggleSort}>
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Name
                      <ArrowUpDown className={cn("h-3 w-3 transition-colors", sortDir && "text-primary")} />
                    </span>
                  </TableHead>
                  <TableHead>
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Description</span>
                  </TableHead>
                  {canManage && <TableHead className="w-[160px] text-right pr-5"><span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Actions</span></TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((cat) => (
                  <TableRow
                    key={cat.id}
                    className={cn(
                      "group transition-colors hover:bg-muted/50",
                      selectedIds.has(cat.id) && "bg-primary/5"
                    )}
                  >
                    {canManage && (
                      <TableCell className="pl-5">
                        <Checkbox
                          checked={selectedIds.has(cat.id)}
                          onCheckedChange={() => toggleSelect(cat.id)}
                          className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                        />
                      </TableCell>
                    )}
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-gradient-to-br from-primary/10 to-chart-4/10 text-primary shrink-0">
                          <FolderTree className="h-4 w-4" />
                        </div>
                        <span className="font-medium text-sm">{cat.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {cat.description || <span className="italic text-muted-foreground/50">No description</span>}
                      </span>
                    </TableCell>
                    {canManage && (
                      <TableCell className="text-right pr-5">
                        <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-accent"
                            onClick={() => openView(cat)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-accent"
                            onClick={() => openEdit(cat)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            onClick={() => openDelete(cat)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        {/* Always visible on mobile */}
                        <div className="flex items-center justify-end gap-0.5 sm:hidden">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openView(cat)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(cat)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => openDelete(cat)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen && dialogMode !== "view"} onOpenChange={(o) => { if (!o) setDialogOpen(false); }}>
        <DialogContent className="sm:max-w-[420px]">
          <form onSubmit={handleSave}>
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-chart-4/20 text-primary">
                  {editing ? <Pencil className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
                </div>
                <div>
                  <DialogTitle className="text-lg">{editing ? "Edit Expense Category" : "Add Expense Category"}</DialogTitle>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {editing ? "Update the expense category details" : "Create a new expense category"}
                  </p>
                </div>
              </div>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="cat-name" className="text-sm font-medium">Category Name <span className="text-destructive">*</span></Label>
                <Input
                  id="cat-name"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g., Office Supplies"
                  required
                  maxLength={100}
                  className="h-10"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cat-desc" className="text-sm font-medium">Description</Label>
                <Input
                  id="cat-desc"
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="Brief description of this category (optional)"
                  className="h-10"
                />
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={isSubmitting} className="h-10">
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || !formName.trim()} className="h-10">
                {isSubmitting ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
                ) : editing ? (
                  "Update Category"
                ) : (
                  "Create Category"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={dialogOpen && dialogMode === "view"} onOpenChange={(o) => { if (!o) setDialogOpen(false); }}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-chart-4/20 text-primary">
                <FolderTree className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-lg">{editing?.name}</DialogTitle>
                <p className="text-sm text-muted-foreground mt-0.5">Expense category details</p>
              </div>
            </div>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="rounded-lg bg-muted/50 p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Name</span>
                <span className="text-sm font-medium">{editing?.name}</span>
              </div>
              <div className="border-t border-border/50" />
              <div className="flex justify-between items-start">
                <span className="text-sm text-muted-foreground">Description</span>
                <span className="text-sm text-right max-w-[200px]">{editing?.description || "—"}</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="h-10">Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Single Delete */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="sm:max-w-[400px]">
          <AlertDialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <AlertDialogTitle className="text-lg">Delete Expense Category?</AlertDialogTitle>
                <AlertDialogDescription className="mt-0.5">
                  You are about to delete <span className="font-medium text-foreground">&quot;{deleting?.name}&quot;</span>.
                  This action cannot be undone.
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel disabled={isSubmitting} className="h-10">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isSubmitting}
              className="h-10 bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Deleting...</> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete */}
      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent className="sm:max-w-[400px]">
          <AlertDialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <AlertDialogTitle className="text-lg">Delete Expense Categories?</AlertDialogTitle>
                <AlertDialogDescription className="mt-0.5">
                  You are about to delete <span className="font-medium text-foreground">{selectedIds.size} expense categories</span>.
                  This action cannot be undone.
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel disabled={isSubmitting} className="h-10">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              disabled={isSubmitting}
              className="h-10 bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Deleting...</> : `Delete ${selectedIds.size}`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
