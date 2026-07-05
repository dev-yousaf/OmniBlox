"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { WorkspaceLink as Link } from "@/components/workspace-link";
import { PageLoadingSkeleton } from "@/components/ui/page-loading-skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, ChevronRight, Building2, Mail, MapPin, Phone,
  Pencil, Trash2, DollarSign, CalendarDays, CreditCard,
} from "lucide-react";
import { useSuppliersApi, type Supplier } from "@/hooks/use-suppliers-api";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { useWorkspace } from "@/hooks/use-workspace";
import { format } from "date-fns";
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

export default function SupplierDetailPage() {
  const params = useParams();
  const router = useRouter();
  const ws = useWorkspace();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const { getSupplier, deleteSupplier } = useSuppliersApi();
  const { toast } = useToast();
  const canManage = user?.role === "OWNER" || user?.role === "ADMIN" || user?.role === "MANAGER";

  useEffect(() => {
    const load = async () => {
      if (!params.id) return;
      try {
        setLoading(true);
        const data = await getSupplier(params.id as string);
        setSupplier(data);
      } catch (error) {
        toast({ title: "Error", description: "Failed to load supplier.", variant: "destructive" });
        router.push(`/${ws}/people/suppliers`);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [params.id, getSupplier, toast, router]);

  const handleDelete = async () => {
    if (!supplier) return;
    try {
      setDeleting(true);
      await deleteSupplier(supplier.id);
      toast({ title: "Deleted", description: "Supplier deleted successfully." });
      router.push(`/${ws}/people/suppliers`);
    } catch (error: any) {
      toast({ title: "Error", description: error?.message || "Failed to delete supplier.", variant: "destructive" });
    } finally {
      setDeleting(false);
      setDeleteOpen(false);
    }
  };

  if (loading || !supplier) return <PageLoadingSkeleton />;

  const formatCurrency = new Intl.NumberFormat("en-US", {
    style: "currency", currency: "USD", minimumFractionDigits: 2,
  });

  return (
    <div className="space-y-5">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1 text-sm text-muted-foreground mb-0.5">
        <Link href="/dashboard" className="hover:text-foreground transition-colors">Dashboard</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link href="/people/suppliers" className="hover:text-foreground transition-colors">Suppliers</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground">{supplier.name}</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/people/suppliers" className="flex items-center justify-center h-8 w-8 rounded-[5px] border hover:bg-accent transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-[18px] font-bold text-foreground">{supplier.name}</h1>
              <Badge variant="outline" className="bg-emerald-100 text-emerald-700 border-emerald-200 font-medium text-xs">Active</Badge>
            </div>
            <p className="text-sm text-muted-foreground">Supplier &middot; Created {format(new Date(supplier.createdAt), "MMM dd, yyyy")}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {(user?.role === "OWNER" || user?.role === "ADMIN") && (
            <Button variant="outline" size="sm" className="h-[34px] rounded-[5px] text-[13px] text-destructive" onClick={() => setDeleteOpen(true)}>
              <Trash2 className="mr-1.5 h-3.5 w-3.5" />Delete
            </Button>
          )}
          {canManage && (
            <Link href={`/people/suppliers/${supplier.id}/edit`}>
              <Button variant="outline" size="sm" className="h-[34px] rounded-[5px] text-[13px]">
                <Pencil className="mr-1.5 h-3.5 w-3.5" />Edit
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="border rounded-[5px] bg-card shadow-sm p-5">
          <div className="flex items-center gap-2 mb-1">
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Created</p>
          </div>
          <p className="text-lg font-bold">{format(new Date(supplier.createdAt), "MMM dd, yyyy")}</p>
        </div>
        <div className="border rounded-[5px] bg-card shadow-sm p-5">
          <div className="flex items-center gap-2 mb-1">
            <CreditCard className="h-4 w-4 text-muted-foreground" />
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Credit Limit</p>
          </div>
          <p className="text-lg font-bold">{supplier.creditLimit ? formatCurrency.format(supplier.creditLimit) : "—"}</p>
        </div>
        <div className="border rounded-[5px] bg-card shadow-sm p-5">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Balance</p>
          </div>
          <p className="text-lg font-bold">{supplier.balance != null ? formatCurrency.format(supplier.balance) : "—"}</p>
        </div>
      </div>

      {/* Details grid */}
      <div className="grid gap-5 md:grid-cols-2">
        {/* Contact Information */}
        <div className="border rounded-[5px] bg-card shadow-sm">
          <div className="px-5 py-[15px] border-b">
            <h2 className="text-sm font-semibold text-foreground">Contact Information</h2>
          </div>
          <div className="p-5 space-y-3">
            <div>
              <p className="text-xs text-muted-foreground">Email</p>
              <p className="text-sm mt-0.5 flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-muted-foreground" />{supplier.email || "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Phone</p>
              <p className="text-sm mt-0.5 flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 text-muted-foreground" />{supplier.phone || "—"}
              </p>
            </div>
          </div>
        </div>

        {/* Address */}
        <div className="border rounded-[5px] bg-card shadow-sm">
          <div className="px-5 py-[15px] border-b">
            <h2 className="text-sm font-semibold text-foreground">Address</h2>
          </div>
          <div className="p-5 space-y-3">
            <div>
              <p className="text-xs text-muted-foreground">Location</p>
              <p className="text-sm mt-0.5 flex items-start gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />{supplier.address || "No address provided"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Meta */}
      <div className="border rounded-[5px] bg-card shadow-sm">
        <div className="px-5 py-[15px] border-b">
          <h2 className="text-sm font-semibold text-foreground">Meta</h2>
        </div>
        <div className="p-5 grid gap-4 md:grid-cols-3">
          <div>
            <p className="text-xs text-muted-foreground">Created</p>
            <p className="text-sm font-semibold mt-0.5">{format(new Date(supplier.createdAt), "MMM dd, yyyy h:mm a")}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Last Updated</p>
            <p className="text-sm font-semibold mt-0.5">{format(new Date(supplier.updatedAt), "MMM dd, yyyy h:mm a")}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Credit Limit</p>
            <p className="text-sm font-semibold mt-0.5">{supplier.creditLimit ? formatCurrency.format(supplier.creditLimit) : "N/A"}</p>
          </div>
        </div>
      </div>

      {/* Delete Dialog */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this supplier?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The supplier {supplier.name} will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-white hover:bg-destructive/90" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Deleting..." : "Delete Supplier"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
