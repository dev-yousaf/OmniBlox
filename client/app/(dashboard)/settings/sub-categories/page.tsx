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
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import {
  useSubCategoriesApi,
  SubCategory,
} from "@/hooks/use-sub-categories-api";
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

export default function SubCategoriesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { getSubCategories, createSubCategory, updateSubCategory, deleteSubCategory, bulkDeleteSubCategories } =
    useSubCategoriesApi();
  const { getCategories } = useProductCategoriesApi();

  const [items, setItems] = useState<SubCategory[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [dialogMode, setDialogMode] = useState<"create" | "edit" | "view">("create");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [editing, setEditing] = useState<SubCategory | null>(null);
  const [deleting, setDeleting] = useState<SubCategory | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filterCategoryId, setFilterCategoryId] = useState<string>("all");

  const [formName, setFormName] = useState("");
  const [formSlug, setFormSlug] = useState("");
  const [formCategoryId, setFormCategoryId] = useState("");
  const [formCode, setFormCode] = useState("");
  const [formImageUrl, setFormImageUrl] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formStatus, setFormStatus] = useState("ACTIVE");

  const canManage =
    user?.role === "OWNER" || user?.role === "ADMIN" || user?.role === "MANAGER";

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      setError(null);
      setIsLoading(true);
      const [subs, cats] = await Promise.all([
        getSubCategories(filterCategoryId !== "all" ? filterCategoryId : undefined),
        getCategories(),
      ]);
      setItems(subs);
      setCategories(cats);
    } catch (err: any) {
      setError(err?.message || "Failed to load sub categories.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { load(); }, [filterCategoryId]);

  const sorted = [...items].sort((a, b) => {
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
    setFormCategoryId("");
    setFormCode("");
    setFormImageUrl("");
    setFormDesc("");
    setFormStatus("ACTIVE");
    setDialogOpen(true);
  };

  const openEdit = (c: SubCategory) => {
    setDialogMode("edit");
    setEditing(c);
    setFormName(c.name);
    setFormSlug(c.slug);
    setFormCategoryId(c.categoryId);
    setFormCode(c.code || "");
    setFormImageUrl(c.imageUrl || "");
    setFormDesc(c.description || "");
    setFormStatus(c.status);
    setDialogOpen(true);
  };

  const openView = (c: SubCategory) => {
    setDialogMode("view");
    setEditing(c);
    setDialogOpen(true);
  };

  const openDelete = (c: SubCategory) => {
    setDeleting(c);
    setDeleteDialogOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formCategoryId) return;
    try {
      setIsSubmitting(true);
      if (editing) {
        await updateSubCategory(editing.id, {
          name: formName.trim(),
          slug: formSlug.trim() || undefined,
          categoryId: formCategoryId,
          code: formCode.trim() || undefined,
          imageUrl: formImageUrl.trim() || undefined,
          description: formDesc.trim() || undefined,
          status: formStatus,
        });
        toast({ title: "Success", description: "Sub category updated" });
      } else {
        await createSubCategory({
          name: formName.trim(),
          slug: formSlug.trim() || undefined,
          categoryId: formCategoryId,
          code: formCode.trim() || undefined,
          imageUrl: formImageUrl.trim() || undefined,
          description: formDesc.trim() || undefined,
          status: formStatus,
        });
        toast({ title: "Success", description: "Sub category created" });
      }
      setDialogOpen(false);
      load();
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      setIsSubmitting(true);
      await deleteSubCategory(deleting.id);
      toast({ title: "Success", description: "Sub category deleted" });
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
      await bulkDeleteSubCategories(Array.from(selectedIds));
      toast({ title: "Deleted", description: `${selectedIds.size} sub categories deleted` });
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
          <h1 className="text-3xl font-bold tracking-tight">Sub Category</h1>
          <p className="text-muted-foreground">Manage your product sub categories</p>
        </div>
        {canManage && (
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Add Sub Category
          </Button>
        )}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle>All Sub Categories</CardTitle>
            <div className="flex items-center gap-3">
              <Select value={filterCategoryId} onValueChange={setFilterCategoryId}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {canManage && selectedIds.size > 0 && (
                <Button variant="destructive" size="sm" onClick={() => setBulkDeleteOpen(true)}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete ({selectedIds.size})
                </Button>
              )}
            </div>
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
            <div className="text-center py-8 text-muted-foreground">No sub categories found.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  {canManage && <TableHead className="w-[60px]"><Checkbox checked={selectedIds.size === sorted.length && sorted.length > 0} onCheckedChange={toggleAll} /></TableHead>}
                  <TableHead className="w-[71px]">Image</TableHead>
                  <TableHead className="w-[161px]">Sub Category</TableHead>
                  <TableHead className="w-[163px]">Category</TableHead>
                  <TableHead className="w-[154px] cursor-pointer select-none" onClick={toggleSort}>
                    <span className="inline-flex items-center gap-1">
                      Category Code
                      <ArrowUpDown className="h-3 w-3" />
                    </span>
                  </TableHead>
                  <TableHead className="w-[209px]">Description</TableHead>
                  <TableHead className="w-[96px]">Status</TableHead>
                  {canManage && <TableHead className="w-[226px]">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((item) => (
                  <TableRow key={item.id}>
                    {canManage && (
                      <TableCell>
                        <Checkbox checked={selectedIds.has(item.id)} onCheckedChange={() => toggleSelect(item.id)} />
                      </TableCell>
                    )}
                    <TableCell>
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt="" className="h-8 w-8 rounded object-cover" />
                      ) : (
                        <div className="h-8 w-8 rounded bg-muted flex items-center justify-center text-xs text-muted-foreground">N/A</div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell className="text-muted-foreground">{item.category?.name || "—"}</TableCell>
                    <TableCell className="font-mono text-xs">{item.code || "—"}</TableCell>
                    <TableCell className="text-muted-foreground max-w-[209px] truncate">{item.description || "—"}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[item.status] || statusColors.ACTIVE}`}>
                        {item.status}
                      </span>
                    </TableCell>
                    {canManage && (
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openView(item)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(item)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => openDelete(item)}>
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
        <DialogContent className="sm:max-w-[500px]">
          <form onSubmit={handleSave}>
            <DialogHeader>
              <DialogTitle>{editing ? "Edit Sub Category" : "Add Sub Category"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="sub-name">Sub Category Name</Label>
                  <Input id="sub-name" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Enter name" required maxLength={100} className="mt-1.5" />
                </div>
                <div>
                  <Label htmlFor="sub-slug">Slug</Label>
                  <Input id="sub-slug" value={formSlug} onChange={(e) => setFormSlug(e.target.value)} placeholder="Auto-generated" maxLength={100} className="mt-1.5" />
                </div>
              </div>
              <div>
                <Label htmlFor="sub-category">Category</Label>
                <Select value={formCategoryId} onValueChange={setFormCategoryId}>
                  <SelectTrigger className="mt-1.5" id="sub-category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="sub-code">Code (optional)</Label>
                  <Input id="sub-code" value={formCode} onChange={(e) => setFormCode(e.target.value)} placeholder="SC001" className="mt-1.5" />
                </div>
                <div>
                  <Label htmlFor="sub-image">Image URL (optional)</Label>
                  <Input id="sub-image" value={formImageUrl} onChange={(e) => setFormImageUrl(e.target.value)} placeholder="https://..." className="mt-1.5" />
                </div>
              </div>
              <div>
                <Label htmlFor="sub-desc">Description (optional)</Label>
                <Textarea id="sub-desc" value={formDesc} onChange={(e) => setFormDesc(e.target.value)} placeholder="Enter description" className="mt-1.5" rows={3} />
              </div>
              <div>
                <Label htmlFor="sub-status">Status</Label>
                <Select value={formStatus} onValueChange={setFormStatus}>
                  <SelectTrigger className="mt-1.5" id="sub-status">
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
              <Button type="submit" disabled={isSubmitting || !formName.trim() || !formCategoryId}>
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
            <div className="flex justify-between border-b pb-2"><span className="text-muted-foreground">Category</span><span>{editing?.category?.name || "—"}</span></div>
            <div className="flex justify-between border-b pb-2"><span className="text-muted-foreground">Code</span><span>{editing?.code || "—"}</span></div>
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
            <AlertDialogTitle>Delete Sub Category?</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to delete &quot;{deleting?.name}&quot;. This action cannot be undone.
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
            <AlertDialogTitle>Delete Sub Categories?</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedIds.size} sub categories will be permanently deleted.
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
