"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { WorkspaceLink as Link } from "@/components/workspace-link";
import { PageLoadingSkeleton } from "@/components/ui/page-loading-skeleton";
import {
  ArrowLeft, Edit, Trash2, ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useSuppliersApi, type Supplier } from "@/hooks/use-suppliers-api";
import { usePurchasesApi, type PurchaseOrder } from "@/hooks/use-purchases-api";
import { useAuth } from "@/contexts/auth-context";
import { useWorkspace } from "@/hooks/use-workspace";

const statusStyles: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800",
  RECEIVED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
  CANCELLED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800",
};

const statusLabels: Record<string, string> = {
  PENDING: "Pending",
  RECEIVED: "Received",
  CANCELLED: "Cancelled",
};

export default function SupplierDetailPage() {
  const { user } = useAuth();
  const canManage = user?.role === "OWNER" || user?.role === "ADMIN" || user?.role === "MANAGER";
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const ws = useWorkspace();
  const supplierId = params?.id ?? "";
  const { getSupplier, deleteSupplier } = useSuppliersApi();
  const { list: listPurchases } = usePurchasesApi();
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [purchases, setPurchases] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const formatCurrency = useMemo(
    () => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }),
    []
  );

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  useEffect(() => {
    if (!supplierId) return;
    let cancelled = false;

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [supplierData, purchasesData] = await Promise.all([
          getSupplier(supplierId),
          listPurchases(),
        ]);
        if (cancelled) return;
        setSupplier(supplierData);
        setPurchases(
          Array.isArray(purchasesData)
            ? purchasesData.filter((p) => p.supplier?.id === supplierId)
            : []
        );
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load supplier details");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchData();
    return () => { cancelled = true; };
  }, [supplierId, getSupplier, listPurchases]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteSupplier(supplierId);
      router.push(`/${ws}/suppliers`);
    } catch { /* handled */ }
    setDeleting(false);
  };

  if (!supplierId) return <div className="p-6">Supplier identifier is missing.</div>;
  if (loading) return <PageLoadingSkeleton />;

  if (!supplier) {
    return (
      <div className="space-y-5">
        <div className="flex items-center gap-1 text-sm text-muted-foreground mb-0.5">
          <Link href="/dashboard" className="hover:text-foreground transition-colors">Dashboard</Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <Link href="/suppliers" className="hover:text-foreground transition-colors">Suppliers</Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-foreground">Supplier Detail</span>
        </div>
        <div className="border rounded-[5px] bg-card shadow-sm py-12 text-center text-muted-foreground">
          <p className="font-medium">Supplier not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1 text-sm text-muted-foreground mb-0.5">
        <Link href="/dashboard" className="hover:text-foreground transition-colors">Dashboard</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link href="/suppliers" className="hover:text-foreground transition-colors">Suppliers</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground">{supplier.name}</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/suppliers">
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <Avatar className="size-9">
            <AvatarFallback className="text-xs font-semibold">{getInitials(supplier.name)}</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-[18px] font-bold text-foreground">{supplier.name}</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {canManage && (
            <>
              <Link href={`/suppliers/${supplier.id}/edit`}>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-[34px] rounded-[5px] text-[13px]"
                >
                  <Edit className="mr-1.5 h-3.5 w-3.5" /> Edit
                </Button>
              </Link>
              <Button
                variant="outline"
                size="sm"
                className="h-[34px] rounded-[5px] text-[13px] text-destructive hover:text-destructive"
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete
              </Button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-5 py-3 bg-destructive/10 text-destructive text-sm border rounded-[5px]">
          {error}
        </div>
      )}

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="border rounded-[5px] bg-card shadow-sm p-5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Email</p>
          <p className="text-sm font-semibold truncate">{supplier.email || "—"}</p>
        </div>
        <div className="border rounded-[5px] bg-card shadow-sm p-5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Phone</p>
          <p className="text-sm font-semibold">{supplier.phone || "—"}</p>
        </div>
        <div className="border rounded-[5px] bg-card shadow-sm p-5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Address</p>
          <p className="text-sm font-semibold truncate">{supplier.address || "—"}</p>
        </div>
        <div className="border rounded-[5px] bg-card shadow-sm p-5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Total Orders</p>
          <p className="text-lg font-semibold">{purchases.length}</p>
        </div>
      </div>

      {/* Main Content: Two Columns */}
      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        {/* Left: Supplier Information + Supplier Purchases */}
        <div className="space-y-5">
          {/* Supplier Information Card */}
          <div className="border rounded-[5px] bg-card shadow-sm p-5">
            <h3 className="text-sm font-semibold text-foreground mb-3">Supplier Information</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-3">
                <p className="text-muted-foreground w-20 shrink-0">Name</p>
                <p className="text-foreground font-medium">{supplier.name}</p>
              </div>
              <div className="flex items-start gap-3">
                <p className="text-muted-foreground w-20 shrink-0">Email</p>
                <p className="text-foreground">{supplier.email || "—"}</p>
              </div>
              <div className="flex items-start gap-3">
                <p className="text-muted-foreground w-20 shrink-0">Phone</p>
                <p className="text-foreground">{supplier.phone || "—"}</p>
              </div>
              <div className="flex items-start gap-3">
                <p className="text-muted-foreground w-20 shrink-0">Address</p>
                <p className="text-foreground">{supplier.address || "—"}</p>
              </div>
            </div>
          </div>

          {/* Supplier Purchases Table */}
          <div className="border rounded-[5px] bg-card shadow-sm overflow-hidden">
            <div className="px-5 py-[15px] border-b">
              <h2 className="text-sm font-semibold text-foreground">Supplier Purchases</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted h-[33px]">
                    <th className="px-4 py-2 text-left font-semibold text-foreground text-xs">Date</th>
                    <th className="px-4 py-2 text-left font-semibold text-foreground text-xs">Reference</th>
                    <th className="px-4 py-2 text-left font-semibold text-foreground text-xs">Status</th>
                    <th className="w-[120px] px-4 py-2 text-right font-semibold text-foreground text-xs">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {purchases.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                        No purchase orders found.
                      </td>
                    </tr>
                  ) : (
                    purchases.map((purchase) => {
                      const statusKey = purchase.status in statusLabels ? purchase.status : "PENDING";
                      return (
                        <tr key={purchase.id} className="h-[52px] border-b hover:bg-muted/30 transition-colors">
                          <td className="px-4 text-muted-foreground">
                            {new Date(purchase.orderDate).toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" })}
                          </td>
                          <td className="px-4">
                            <Link href={`/purchases/${purchase.id}`} className="font-medium text-foreground hover:text-primary transition-colors">
                              {purchase.referenceNumber}
                            </Link>
                          </td>
                          <td className="px-4">
                            <Badge variant="outline" className={`font-medium text-xs ${statusStyles[statusKey] || ""}`}>
                              {statusLabels[statusKey] || statusKey}
                            </Badge>
                          </td>
                          <td className="px-4 text-right font-semibold tabular-nums">{formatCurrency.format(purchase.totalAmount)}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right: Summary Card */}
        <div className="border rounded-[5px] bg-card shadow-sm p-5 space-y-4 h-fit">
          <h3 className="text-sm font-semibold text-foreground">Summary</h3>
          <div className="space-y-3 text-sm">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Name</p>
              <p className="font-semibold text-foreground mt-0.5">{supplier.name}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Email</p>
              <p className="text-foreground mt-0.5 break-all">{supplier.email || "—"}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Phone</p>
              <p className="text-foreground mt-0.5">{supplier.phone || "—"}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Address</p>
              <p className="text-foreground mt-0.5">{supplier.address || "—"}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this supplier?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. Supplier {supplier.name} will be removed permanently.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting} className="rounded-[5px]">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="rounded-[5px] bg-destructive hover:bg-destructive/90"
              disabled={deleting}
            >
              {deleting ? "Deleting..." : "Delete Supplier"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
