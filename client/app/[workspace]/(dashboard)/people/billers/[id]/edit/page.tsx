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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useBillersApi, type Biller, type UpdateBillerData } from "@/hooks/use-billers-api";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, ChevronRight, Loader2, Save } from "lucide-react";

export default function EditBillerPage() {
  const params = useParams();
  const router = useRouter();
  const ws = useWorkspace();
  const { toast } = useToast();
  const { getBiller, updateBiller, checkCodeAvailability } = useBillersApi();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [checkingCode, setCheckingCode] = useState(false);
  const [codeAvailable, setCodeAvailable] = useState<boolean | null>(null);
  const [biller, setBiller] = useState<Biller | null>(null);
  const [formData, setFormData] = useState<UpdateBillerData>({});

  useEffect(() => {
    const load = async () => {
      if (!params.id) return;
      try {
        setLoading(true);
        const data = await getBiller(params.id as string);
        setBiller(data);
        setFormData({
          code: data.code, name: data.name, address: data.address ?? "",
          phone: data.phone ?? "", email: data.email ?? "",
          contactPerson: data.contactPerson ?? "", gstNumber: data.gstNumber ?? "",
          status: data.status,
        });
      } catch (error) {
        toast({ title: "Error", description: "Failed to load biller.", variant: "destructive" });
        router.push(`/${ws}/${ws}/people/billers`);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [params.id, getBiller, toast, router]);

  const handleCodeChange = async (code: string) => {
    setFormData({ ...formData, code });
    if (!biller) return;
    if (code.length >= 3) {
      setCheckingCode(true);
      try {
        const result = await checkCodeAvailability(code, biller.id);
        setCodeAvailable(result.available);
      } catch (error) {
        console.error("Error checking code:", error);
      } finally {
        setCheckingCode(false);
      }
    } else {
      setCodeAvailable(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!biller) return;
    if (codeAvailable === false) {
      toast({ title: "Error", description: "Please use an available biller code.", variant: "destructive" });
      return;
    }
    try {
      setSaving(true);
      const updated = await updateBiller(biller.id, {
        code: formData.code?.trim(),
        name: formData.name?.trim(),
        address: formData.address?.toString().trim() || undefined,
        phone: formData.phone?.toString().trim() || undefined,
        email: formData.email?.toString().trim() || undefined,
        contactPerson: formData.contactPerson?.toString().trim() || undefined,
        gstNumber: formData.gstNumber?.toString().trim() || undefined,
        status: formData.status,
      });
      toast({ title: "Saved", description: "Biller updated successfully." });
      router.push(`/${ws}/people/billers/${updated.id}`);
    } catch (error: any) {
      toast({ title: "Error", description: error?.message || "Failed to update biller.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading || !biller) return <PageLoadingSkeleton />;

  return (
    <div className="space-y-5">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1 text-sm text-muted-foreground mb-0.5">
        <Link href="/dashboard" className="hover:text-foreground transition-colors">Dashboard</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link href="/people/billers" className="hover:text-foreground transition-colors">Billers</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link href={`/people/billers/${biller.id}`} className="hover:text-foreground transition-colors">{biller.name}</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground">Edit</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href={`/people/billers/${biller.id}`} className="flex items-center justify-center h-8 w-8 rounded-[5px] border hover:bg-accent transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-[18px] font-bold text-foreground">Edit Biller</h1>
            <p className="text-sm text-muted-foreground">{biller.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/people/billers/${biller.id}`}>
            <Button type="button" variant="outline" size="sm" className="h-[34px] rounded-[5px] text-[13px]">Cancel</Button>
          </Link>
          <Button type="submit" form="edit-biller-form" disabled={saving} size="sm" className="h-[34px] rounded-[5px] bg-[#ff9025] hover:bg-[#ff9025]/90 text-white text-[13px] font-medium px-3 gap-1.5">
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>

      {/* Form */}
      <form id="edit-biller-form" onSubmit={handleSubmit}>
        <div className="border rounded-[5px] bg-card shadow-sm">
          <div className="px-5 py-[15px] border-b">
            <h2 className="text-sm font-semibold text-foreground">Biller Details</h2>
          </div>
          <div className="p-5 space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="code" className="text-xs font-medium">Biller Code *</Label>
                <div className="relative">
                  <Input id="code" value={formData.code ?? ""} onChange={(e) => handleCodeChange(e.target.value.toUpperCase())} placeholder="BR-001" required
                    className={`h-[34px] rounded-[5px] text-sm ${codeAvailable === false ? "border-destructive" : codeAvailable === true ? "border-green-500" : ""}`}
                  />
                  {checkingCode && <div className="absolute right-3 top-1/2 -translate-y-1/2"><div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>}
                </div>
                {codeAvailable === false && <p className="text-sm text-destructive">This code is already in use</p>}
                {codeAvailable === true && <p className="text-sm text-green-600">Code is available</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="name" className="text-xs font-medium">Biller Name *</Label>
                <Input id="name" value={formData.name ?? ""} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Main Branch" required className="h-[34px] rounded-[5px] text-sm" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address" className="text-xs font-medium">Address</Label>
              <Textarea id="address" value={(formData.address as string) ?? ""} onChange={(e) => setFormData({ ...formData, address: e.target.value })} placeholder="123 Business Street, City, State, ZIP" rows={3} className="rounded-[5px] text-sm" />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-xs font-medium">Phone</Label>
                <Input id="phone" type="tel" value={(formData.phone as string) ?? ""} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="+1 234 567 8900" className="h-[34px] rounded-[5px] text-sm" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs font-medium">Email</Label>
                <Input id="email" type="email" value={(formData.email as string) ?? ""} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="branch@company.com" className="h-[34px] rounded-[5px] text-sm" />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="contactPerson" className="text-xs font-medium">Contact Person</Label>
                <Input id="contactPerson" value={(formData.contactPerson as string) ?? ""} onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })} placeholder="Manager Name" className="h-[34px] rounded-[5px] text-sm" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gstNumber" className="text-xs font-medium">GST Number</Label>
                <Input id="gstNumber" value={(formData.gstNumber as string) ?? ""} onChange={(e) => setFormData({ ...formData, gstNumber: e.target.value })} placeholder="22AAAAA0000A1Z5" className="h-[34px] rounded-[5px] text-sm" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status" className="text-xs font-medium">Status *</Label>
              <Select value={formData.status} onValueChange={(value: "ACTIVE" | "INACTIVE") => setFormData({ ...formData, status: value })}>
                <SelectTrigger className="h-[34px] rounded-[5px] text-sm">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="INACTIVE">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
