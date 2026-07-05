"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useWorkspace } from "@/hooks/use-workspace";
import { WorkspaceLink as Link } from "@/components/workspace-link";
import { PageLoadingSkeleton } from "@/components/ui/page-loading-skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useSuppliersApi, type Supplier, type UpdateSupplierData } from "@/hooks/use-suppliers-api";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, ChevronRight, Loader2, Save } from "lucide-react";

export default function EditSupplierPage() {
  const params = useParams();
  const router = useRouter();
  const ws = useWorkspace();
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
          name: data.name, email: data.email ?? "",
          phone: data.phone ?? "", address: data.address ?? "",
          creditLimit: data.creditLimit,
        });
      } catch (error) {
        toast({ title: "Error", description: "Failed to load supplier.", variant: "destructive" });
        router.push(`/${ws}/${ws}/people/suppliers`);
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
      const updated = await updateSupplier(supplier.id, {
        name: formData.name?.trim(), email: formData.email?.toString().trim() || undefined,
        phone: formData.phone?.toString().trim() || undefined, address: formData.address?.toString().trim() || undefined,
        creditLimit: formData.creditLimit,
      });
      toast({ title: "Saved", description: "Supplier updated successfully." });
      router.push(`/${ws}/people/suppliers/${updated.id}`);
    } catch (error: any) {
      toast({ title: "Error", description: error?.message || "Failed to update supplier.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading || !supplier) return <PageLoadingSkeleton />;

  return (
    <div className="space-y-5">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1 text-sm text-muted-foreground mb-0.5">
        <Link href="/dashboard" className="hover:text-foreground transition-colors">Dashboard</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link href="/people/suppliers" className="hover:text-foreground transition-colors">Suppliers</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link href={`/people/suppliers/${supplier.id}`} className="hover:text-foreground transition-colors">{supplier.name}</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground">Edit</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href={`/people/suppliers/${supplier.id}`} className="flex items-center justify-center h-8 w-8 rounded-[5px] border hover:bg-accent transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-[18px] font-bold text-foreground">Edit Supplier</h1>
            <p className="text-sm text-muted-foreground">{supplier.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/people/suppliers/${supplier.id}`}>
            <Button type="button" variant="outline" size="sm" className="h-[34px] rounded-[5px] text-[13px]">Cancel</Button>
          </Link>
          <Button type="submit" form="edit-supplier-form" disabled={saving} size="sm" className="h-[34px] rounded-[5px] bg-[#ff9025] hover:bg-[#ff9025]/90 text-white text-[13px] font-medium px-3 gap-1.5">
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>

      {/* Form */}
      <form id="edit-supplier-form" onSubmit={handleSubmit}>
        <div className="border rounded-[5px] bg-card shadow-sm">
          <div className="px-5 py-[15px] border-b">
            <h2 className="text-sm font-semibold text-foreground">Supplier Details</h2>
          </div>
          <div className="p-5 space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-xs font-medium">Name *</Label>
                <Input id="name" value={formData.name ?? ""} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Acme Supplies" required className="h-[34px] rounded-[5px] text-sm" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs font-medium">Email</Label>
                <Input id="email" type="email" value={(formData.email as string) ?? ""} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="sales@acme.com" className="h-[34px] rounded-[5px] text-sm" />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-xs font-medium">Phone</Label>
                <Input id="phone" type="tel" value={(formData.phone as string) ?? ""} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="+1 234 567 8900" className="h-[34px] rounded-[5px] text-sm" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="creditLimit" className="text-xs font-medium">Credit Limit</Label>
                <Input id="creditLimit" type="number" value={formData.creditLimit ?? ""} onChange={(e) => setFormData({ ...formData, creditLimit: e.target.value ? Number(e.target.value) : undefined })} placeholder="5000" className="h-[34px] rounded-[5px] text-sm" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address" className="text-xs font-medium">Address</Label>
              <Textarea id="address" rows={3} value={(formData.address as string) ?? ""} onChange={(e) => setFormData({ ...formData, address: e.target.value })} placeholder="123 Industrial Park, City, State, ZIP" className="rounded-[5px] text-sm" />
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
