"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { PageLoadingSkeleton } from "@/components/ui/page-loading-skeleton";
import {
  ArrowLeft,
  Building2,
  Mail,
  MapPin,
  Phone,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  IdCard,
  Hash,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useBillersApi, type Biller } from "@/hooks/use-billers-api";
import { useToast } from "@/hooks/use-toast";
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

const statusConfig = {
  ACTIVE: {
    label: "Active",
    className: "bg-emerald-100 text-emerald-700 border-emerald-200",
    icon: CheckCircle,
  },
  INACTIVE: {
    label: "Inactive",
    className: "bg-gray-100 text-gray-700 border-gray-200",
    icon: XCircle,
  },
};

export default function BillerDetailPage() {
  const params = useParams();
  const router = useRouter();
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
        console.error("Error loading biller:", error);
        toast({
          title: "Error",
          description: "Failed to load biller.",
          variant: "destructive",
        });
        router.push("/people/billers");
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
      router.push("/people/billers");
    } catch (error: any) {
      console.error("Error deleting biller:", error);
      toast({
        title: "Error",
        description: error?.message || "Failed to delete biller.",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
      setDeleteOpen(false);
    }
  };

  if (loading) {
    return <PageLoadingSkeleton />;
  }

  if (!biller) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <p className="text-muted-foreground">Biller not found</p>
          </div>
        </div>
      </div>
    );
  }

  const statusInfo = statusConfig[biller.status];
  const StatusIcon = statusInfo.icon;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Building2 className="h-6 w-6 text-primary" /> {biller.name}
            </h1>
            <p className="text-sm text-muted-foreground">Code: {biller.code}</p>
          </div>
          <Badge variant="outline" className={statusInfo.className}>
            <StatusIcon className="h-3 w-3 mr-1" />
            {statusInfo.label}
          </Badge>
        </div>
        <div className="flex gap-2">
          <Link href={`/people/billers/${biller.id}/edit`}>
            <Button variant="outline">
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Button>
          </Link>
          <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="mr-2 h-4 w-4" /> Delete
          </Button>
        </div>
      </div>

      <Separator />

      {/* Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {biller.contactPerson && (
              <div className="flex items-center gap-2">
                <IdCard className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{biller.contactPerson}</span>
              </div>
            )}
            {biller.email && (
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>{biller.email}</span>
              </div>
            )}
            {biller.phone && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{biller.phone}</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Business Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <Hash className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">GST Number</span>
            </div>
            <div className="font-medium">{biller.gstNumber || "N/A"}</div>
            {biller.address && (
              <div className="flex items-center gap-2 mt-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>{biller.address}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Meta</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Created</p>
            <p className="font-medium">
              {new Date(biller.createdAt).toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Last Updated</p>
            <p className="font-medium">
              {new Date(biller.updatedAt).toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Status</p>
            <Badge variant="outline" className={statusInfo.className}>
              <StatusIcon className="h-3 w-3 mr-1" />
              {statusInfo.label}
            </Badge>
          </div>
          <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this biller?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. The biller {biller?.name} will
                  be permanently removed.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={deleting}>
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-white hover:bg-destructive/90"
                  onClick={() => handleDelete()}
                  disabled={deleting}
                >
                  {deleting ? "Deleting..." : "Delete Biller"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
}



