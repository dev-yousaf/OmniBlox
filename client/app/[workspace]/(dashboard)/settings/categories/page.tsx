"use client";

import { useState, useEffect } from "react";
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
  useProductCategoriesApi,
  ProductCategory,
} from "@/hooks/use-product-categories-api";
import { Plus, Eye, Pencil, Trash2, Loader2, ArrowUpDown } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

const statusColors: Record<string, string> = {
  ACTIVE: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  INACTIVE: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

export default function CategoriesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { getCategories, createCategory, updateCategory, deleteCategory, bulkDeleteCategories } =
    useProductCategoriesApi();

  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [dialogMode, setDialogMode] = useState<"create" | "edit" | "view">("create");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [editing, setEditing] = useState<ProductCategory | null>(null);

  const [formName, setFormName] = useState("");
  const [formSlug, setFormSlug] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formStatus, setFormStatus] = useState("ACTIVE");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canManage =
    user?.role === "OWNER" || user?.role === "ADMIN" || user?.role === "MANAGER";

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      setError(null);
      setIsLoading(true);
      const data = await getCategories();
      setCategories(data);
    } catch (err: any) {
      setError(err?.message || "Failed to load categories.");
    } finally {
      setIsLoading(false);
    }
  };

  const sorted = [...categories].sort((a, b) => {
    const d = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    return sortDir === "asc" ? d : -d;
  });

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
    setFormSlug("");
    setFormDesc("");
    setFormStatus("ACTIVE");
    setDialogOpen(true);
  };

  const openEdit = (c: ProductCategory) => {
    setDialogMode("edit");
    setEditing(c);
    setFormName(c.name);
    setFormSlug(c.slug);
    setFormDesc(c.description || "");
    setFormStatus(c.status);
    setDialogOpen(true);
  };

  const openView = (c: ProductCategory) => {
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
        await updateCategory(editing.id, { name: formName.trim(), slug: formSlug.trim() || undefined, description: formDesc.trim() || undefined, status: formStatus });
        toast({ title: "Success", description: "Category updated" });
      } else {
        await createCategory({ name: formName.trim(), slug: formSlug.trim() || undefined, description: formDesc.trim() || undefined, status: formStatus });
        toast({ title: "Success", description: "Category created" });
      }
      setDialogOpen(false);
      load();
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const [deleting, setDeleting] = useState<ProductCategory | null>(null);

  const openDelete = (c: ProductCategory) => {
    setDeleting(c);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      setIsSubmitting(true);
      await deleteCategory(deleting.id);
      toast({ title: "Success", description: "Category deleted" });
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
      const res = await bulkDeleteCategories(Array.from(selectedIds));
      toast({ title: "Deleted", description: `${res.deleted.length} categories deleted` });
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Category</h1>
          <p className="text-muted-foreground">Manage your product categories</p>
        </div>
        {canManage && (
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Add Category
          </Button>
        )}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle>All Categories</CardTitle>
            {canManage && selectedIds.size > 0 && (
              <Button variant="destructive" size="sm" onClick={() => setBulkDeleteOpen(true)}>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete ({selectedIds.size})
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-16 text-destructive"><p>{error}</p></div>
          ) : sorted.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No categories found.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  {canManage && <TableHead className="w-[60px]"><Checkbox checked={selectedIds.size === sorted.length && sorted.length > 0} onCheckedChange={toggleAll} /></TableHead>}
                  <TableHead className="w-[228px]">Category</TableHead>
                  <TableHead className="w-[227px]">Category Slug</TableHead>
                  <TableHead className="w-[222px] cursor-pointer select-none" onClick={toggleSort}>
                    <span className="inline-flex items-center gap-1">
                      Created On
                      <ArrowUpDown className="h-3 w-3" />
                    </span>
                  </TableHead>
                  <TableHead className="w-[206px]">Status</TableHead>
                  {canManage && <TableHead className="w-[197px]">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((cat) => (
                  <TableRow key={cat.id}>
                    {canManage && (
                      <TableCell>
                        <Checkbox checked={selectedIds.has(cat.id)} onCheckedChange={() => toggleSelect(cat.id)} disabled={cat.name === "Uncategorized"} />
                      </TableCell>
                    )}
                    <TableCell className="font-medium">{cat.name}</TableCell>
                    <TableCell className="text-muted-foreground">{cat.slug}</TableCell>
                    <TableCell>{new Date(cat.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[cat.status] || statusColors.ACTIVE}`}>
                        {cat.status}
                      </span>
                    </TableCell>
                    {canManage && (
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openView(cat)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(cat)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => openDelete(cat)} disabled={cat.name === "Uncategorized"}>
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
        <DialogContent>
          <form onSubmit={handleSave}>
            <DialogHeader>
              <DialogTitle>{editing ? "Edit Category" : "Add Category"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="cat-name">Category Name</Label>
                <Input id="cat-name" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Enter category name" required maxLength={100} className="mt-1.5" />
              </div>
              <div>
                <Label htmlFor="cat-slug">Slug</Label>
                <Input id="cat-slug" value={formSlug} onChange={(e) => setFormSlug(e.target.value)} placeholder="Auto-generated from name" maxLength={100} className="mt-1.5" />
              </div>
              <div>
                <Label htmlFor="cat-desc">Description (optional)</Label>
                <Input id="cat-desc" value={formDesc} onChange={(e) => setFormDesc(e.target.value)} placeholder="Enter description" className="mt-1.5" />
              </div>
              <div>
                <Label htmlFor="cat-status">Status</Label>
                <Select value={formStatus} onValueChange={setFormStatus}>
                  <SelectTrigger className="mt-1.5" id="cat-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="INACTIVE">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={isSubmitting}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting || !formName.trim()}>
                {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : editing ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={dialogOpen && dialogMode === "view"} onOpenChange={(o) => { if (!o) setDialogOpen(false); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-4 text-sm">
            <div className="flex justify-between border-b pb-2"><span className="text-muted-foreground">Slug</span><span>{editing?.slug}</span></div>
            <div className="flex justify-between border-b pb-2"><span className="text-muted-foreground">Description</span><span>{editing?.description || "—"}</span></div>
            <div className="flex justify-between border-b pb-2"><span className="text-muted-foreground">Status</span><span>{editing?.status}</span></div>
            <div className="flex justify-between border-b pb-2"><span className="text-muted-foreground">Created</span><span>{editing ? new Date(editing.createdAt).toLocaleString() : "—"}</span></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Single Delete */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category?</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to delete &quot;{deleting?.name}&quot;. Products using this category will be moved to &quot;Uncategorized&quot;.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isSubmitting} className="bg-destructive hover:bg-destructive/90">
              {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Deleting...</> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete */}
      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Categories?</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedIds.size} categories will be deleted. Products will be moved to &quot;Uncategorized&quot;.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} disabled={isSubmitting} className="bg-destructive hover:bg-destructive/90">
              {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Deleting...</> : `Delete ${selectedIds.size}`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
