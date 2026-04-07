"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { PageLoadingSkeleton } from "@/components/ui/page-loading-skeleton";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  useSuppliersApi,
  type Supplier,
  type UpdateSupplierData,
} from "@/hooks/use-suppliers-api";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Save, Factory } from "lucide-react";

export default function EditSupplierPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { getSupplier, updateSupplier } = useSuppliersApi();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [formData, setFormData] = useState<UpdateSupplierData>({});

  useEffect(() => {
    const load = async () => {
      if (!params.id) return;
      try {
        setLoading(true);
        const data = await getSupplier(params.id as string);
        setSupplier(data);
        setFormData({
          name: data.name,
          email: data.email ?? "",
          phone: data.phone ?? "",
          address: data.address ?? "",
        });
      } catch (error) {
        console.error("Error loading supplier:", error);
        toast({
          title: "Error",
          description: "Failed to load supplier for editing.",
          variant: "destructive",
        });
        router.push("/people/suppliers");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [params.id, getSupplier, toast, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplier) return;

    try {
      setSaving(true);
      const payload: UpdateSupplierData = {
        name: formData.name?.trim(),
        email: formData.email?.toString().trim() || undefined,
        phone: formData.phone?.toString().trim() || undefined,
        address: formData.address?.toString().trim() || undefined,
      };

      const updated = await updateSupplier(supplier.id, payload);
      toast({ title: "Saved", description: "Supplier updated successfully." });
      router.push(`/people/suppliers/${updated.id}`);
    } catch (error: any) {
      console.error("Error updating supplier:", error);
      toast({
        title: "Error",
        description: error?.message || "Failed to update supplier.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading || !supplier) {
    return <PageLoadingSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <Link href={`/people/suppliers/${supplier.id}`}>
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Supplier
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            Edit Supplier
          </h1>
          <p className="text-sm text-muted-foreground">
            Update supplier details
          </p>
        </div>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Factory className="h-5 w-5" /> Supplier Details
          </CardTitle>
          <CardDescription>
            Modify the details for this supplier.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  value={formData.name ?? ""}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Acme Supplies"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={(formData.email as string) ?? ""}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  placeholder="sales@acme.com"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={(formData.phone as string) ?? ""}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  placeholder="+1 234 567 8900"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                rows={3}
                value={(formData.address as string) ?? ""}
                onChange={(e) =>
                  setFormData({ ...formData, address: e.target.value })
                }
                placeholder="123 Industrial Park, City, State, ZIP"
              />
            </div>

            <div className="flex justify-end gap-4 pt-4">
              <Link href={`/people/suppliers/${supplier.id}`}>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
              <Button type="submit" disabled={saving}>
                <Save className="h-4 w-4 mr-2" />{" "}
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}



