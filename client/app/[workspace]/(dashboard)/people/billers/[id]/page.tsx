"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useWorkspace } from "@/hooks/use-workspace";
import { WorkspaceLink as Link } from "@/components/workspace-link";
import { PageLoadingSkeleton } from "@/components/ui/page-loading-skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, ChevronRight, Building2, Mail, MapPin, Phone,
  Pencil, Trash2, CheckCircle, XCircle, IdCard, Hash, CalendarDays,
} from "lucide-react";
import { useBillersApi, type Biller } from "@/hooks/use-billers-api";
import { useToast } from "@/hooks/use-toast";
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

const statusConfig: Record<string, { label: string; className: string }> = {
  ACTIVE: { label: "Active", className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  INACTIVE: { label: "Inactive", className: "bg-gray-100 text-gray-700 border-gray-200" },
};

export default function BillerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const ws = useWorkspace();
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [biller, setBiller] = useState<Biller | null>(null);
  const { getBiller, deleteBiller } = useBillersApi();
  const { toast } = useToast();

  useEffect(() => {
    const load = async () => {
      if (!params.id) return;
      try {
        setLoading(true);
        const data = await getBiller(params.id as string);
        setBiller(data);
      } catch (error) {
        toast({ title: "Error", description: "Failed to load biller.", variant: "destructive" });
        router.push(`/${ws}/people/billers`);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [params.id, getBiller, toast, router]);

  const handleDelete = async () => {
    if (!biller) return;
    try {
      setDeleting(true);
      await deleteBiller(biller.id);
      toast({ title: "Deleted", description: "Biller deleted successfully." });
      router.push(`/${ws}/people/billers`);
    } catch (error: any) {
      toast({ title: "Error", description: error?.message || "Failed to delete biller.", variant: "destructive" });
    } finally {
      setDeleting(false);
      setDeleteOpen(false);
    }
  };

  if (loading || !biller) return <PageLoadingSkeleton />;

  const statusInfo = statusConfig[biller.status] || statusConfig.INACTIVE;

  return (
    <div className="space-y-5">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1 text-sm text-muted-foreground mb-0.5">
        <Link href="/dashboard" className="hover:text-foreground transition-colors">Dashboard</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link href="/people/billers" className="hover:text-foreground transition-colors">Billers</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground">{biller.name}</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/people/billers" className="flex items-center justify-center h-8 w-8 rounded-[5px] border hover:bg-accent transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-[18px] font-bold text-foreground">{biller.name}</h1>
              <Badge variant="outline" className={`font-medium text-xs ${statusInfo.className}`}>
                {statusInfo.label}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">Code: {biller.code} &middot; Created {format(new Date(biller.createdAt), "MMM dd, yyyy")}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-[34px] rounded-[5px] text-[13px] text-destructive" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="mr-1.5 h-3.5 w-3.5" />Delete
          </Button>
          <Link href={`/people/billers/${biller.id}/edit`}>
            <Button variant="outline" size="sm" className="h-[34px] rounded-[5px] text-[13px]">
              <Pencil className="mr-1.5 h-3.5 w-3.5" />Edit
            </Button>
          </Link>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="border rounded-[5px] bg-card shadow-sm p-5">
          <div className="flex items-center gap-2 mb-1">
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Created</p>
          </div>
          <p className="text-lg font-bold">{format(new Date(biller.createdAt), "MMM dd, yyyy")}</p>
        </div>
        <div className="border rounded-[5px] bg-card shadow-sm p-5">
          <div className="flex items-center gap-2 mb-1">
            <Hash className="h-4 w-4 text-muted-foreground" />
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Biller Code</p>
          </div>
          <p className="text-lg font-bold font-mono">{biller.code}</p>
        </div>
        <div className="border rounded-[5px] bg-card shadow-sm p-5">
          <div className="flex items-center gap-2 mb-1">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</p>
          </div>
          <Badge variant="outline" className={`font-medium text-xs mt-1 ${statusInfo.className}`}>
            {statusInfo.label}
          </Badge>
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
            {biller.contactPerson && (
              <div>
                <p className="text-xs text-muted-foreground">Contact Person</p>
                <p className="text-sm font-semibold mt-0.5 flex items-center gap-1.5">
                  <IdCard className="h-3.5 w-3.5 text-muted-foreground" />{biller.contactPerson}
                </p>
              </div>
            )}
            <div>
              <p className="text-xs text-muted-foreground">Email</p>
              <p className="text-sm mt-0.5 flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-muted-foreground" />{biller.email || "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Phone</p>
              <p className="text-sm mt-0.5 flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 text-muted-foreground" />{biller.phone || "—"}
              </p>
            </div>
          </div>
        </div>

        {/* Business Information */}
        <div className="border rounded-[5px] bg-card shadow-sm">
          <div className="px-5 py-[15px] border-b">
            <h2 className="text-sm font-semibold text-foreground">Business Information</h2>
          </div>
          <div className="p-5 space-y-3">
            <div>
              <p className="text-xs text-muted-foreground">GST Number</p>
              <p className="text-sm font-semibold mt-0.5">{biller.gstNumber || "N/A"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Address</p>
              <p className="text-sm mt-0.5 flex items-start gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />{biller.address || "—"}
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
            <p className="text-sm font-semibold mt-0.5">{format(new Date(biller.createdAt), "MMM dd, yyyy h:mm a")}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Last Updated</p>
            <p className="text-sm font-semibold mt-0.5">{format(new Date(biller.updatedAt), "MMM dd, yyyy h:mm a")}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Status</p>
            <div className="mt-0.5">
              <Badge variant="outline" className={`font-medium text-xs ${statusInfo.className}`}>
                {statusInfo.label}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Dialog */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this biller?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The biller {biller.name} will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-white hover:bg-destructive/90" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Deleting..." : "Delete Biller"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
