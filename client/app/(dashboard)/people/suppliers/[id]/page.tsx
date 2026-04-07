"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { PageLoadingSkeleton } from "@/components/ui/page-loading-skeleton";
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Edit,
  Trash2,
  Factory,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useSuppliersApi, type Supplier } from "@/hooks/use-suppliers-api";
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
export default function SupplierDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const { getSupplier, deleteSupplier } = useSuppliersApi();
  const { toast } = useToast();

  const [deleteOpen, setDeleteOpen] = useState(false);
  useEffect(() => {
    const load = async () => {
      if (!params.id) return;
      try {
        setLoading(true);
        const data = await getSupplier(params.id as string);
        setSupplier(data);
      } catch (error) {
        console.error("Error loading supplier:", error);
        toast({
          title: "Error",
          description: "Failed to load supplier.",
          variant: "destructive",
        });
        router.push("/people/suppliers");
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
      toast({
        title: "Deleted",
        description: "Supplier deleted successfully.",
      });
      router.push("/people/suppliers");
    } catch (error: any) {
      console.error("Error deleting supplier:", error);
      toast({
        title: "Error",
        description: error?.message || "Failed to delete supplier.",
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

  if (!supplier) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <p className="text-muted-foreground">Supplier not found</p>
          </div>
        </div>
      </div>
    );
  }

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
              <Factory className="h-6 w-6 text-primary" /> {supplier.name}
            </h1>
            <p className="text-sm text-muted-foreground">Supplier</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/people/suppliers/${supplier.id}/edit`}>
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
            {supplier.email && (
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>{supplier.email}</span>
              </div>
            )}
            {supplier.phone && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{supplier.phone}</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Address</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {supplier.address ? (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>{supplier.address}</span>
              </div>
            ) : (
              <p className="text-muted-foreground">No address provided</p>
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
              {new Date(supplier.createdAt).toLocaleString()}
            </p>
          </div>
          <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this supplier?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. The supplier {supplier?.name}{" "}
                  will be permanently removed.
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
                  {deleting ? "Deleting..." : "Delete Supplier"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <div>
            <p className="text-sm text-muted-foreground">Last Updated</p>
            <p className="font-medium">
              {new Date(supplier.updatedAt).toLocaleString()}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}



