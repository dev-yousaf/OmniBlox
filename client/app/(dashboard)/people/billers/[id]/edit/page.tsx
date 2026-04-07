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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useBillersApi,
  type Biller,
  type UpdateBillerData,
} from "@/hooks/use-billers-api";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Save, Building2 } from "lucide-react";

export default function EditBillerPage() {
  const params = useParams();
  const router = useRouter();
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
          code: data.code,
          name: data.name,
          address: data.address ?? "",
          phone: data.phone ?? "",
          email: data.email ?? "",
          contactPerson: data.contactPerson ?? "",
          gstNumber: data.gstNumber ?? "",
          status: data.status,
        });
      } catch (error) {
        console.error("Error loading biller:", error);
        toast({
          title: "Error",
          description: "Failed to load biller for editing.",
          variant: "destructive",
        });
        router.push("/people/billers");
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
        console.error("Error checking code availability:", error);
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
      toast({
        title: "Error",
        description: "Please use an available biller code.",
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);
      const payload: UpdateBillerData = {
        code: formData.code?.trim(),
        name: formData.name?.trim(),
        address: formData.address?.toString().trim() || undefined,
        phone: formData.phone?.toString().trim() || undefined,
        email: formData.email?.toString().trim() || undefined,
        contactPerson: formData.contactPerson?.toString().trim() || undefined,
        gstNumber: formData.gstNumber?.toString().trim() || undefined,
        status: formData.status,
      };

      const updated = await updateBiller(biller.id, payload);
      toast({ title: "Saved", description: "Biller updated successfully." });
      router.push(`/people/billers/${updated.id}`);
    } catch (error: any) {
      console.error("Error updating biller:", error);
      toast({
        title: "Error",
        description: error?.message || "Failed to update biller.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading || !biller) {
    return <PageLoadingSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <Link href={`/people/billers/${biller.id}`}>
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Biller
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Edit Biller</h1>
          <p className="text-sm text-muted-foreground">Update biller details</p>
        </div>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" /> Biller Details
          </CardTitle>
          <CardDescription>Modify the details for this biller.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="code">Biller Code *</Label>
                <div className="relative">
                  <Input
                    id="code"
                    value={formData.code ?? ""}
                    onChange={(e) =>
                      handleCodeChange(e.target.value.toUpperCase())
                    }
                    placeholder="BR-001"
                    required
                    className={
                      codeAvailable === false
                        ? "border-destructive"
                        : codeAvailable === true
                        ? "border-green-500"
                        : ""
                    }
                  />
                  {checkingCode && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    </div>
                  )}
                </div>
                {codeAvailable === false && (
                  <p className="text-sm text-destructive">
                    This code is already in use
                  </p>
                )}
                {codeAvailable === true && (
                  <p className="text-sm text-green-600">Code is available</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Biller Name *</Label>
                <Input
                  id="name"
                  value={formData.name ?? ""}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Main Branch"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                value={(formData.address as string) ?? ""}
                onChange={(e) =>
                  setFormData({ ...formData, address: e.target.value })
                }
                placeholder="123 Business Street, City, State, ZIP"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
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
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={(formData.email as string) ?? ""}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  placeholder="branch@company.com"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contactPerson">Contact Person</Label>
                <Input
                  id="contactPerson"
                  value={(formData.contactPerson as string) ?? ""}
                  onChange={(e) =>
                    setFormData({ ...formData, contactPerson: e.target.value })
                  }
                  placeholder="Manager Name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gstNumber">GST Number</Label>
                <Input
                  id="gstNumber"
                  value={(formData.gstNumber as string) ?? ""}
                  onChange={(e) =>
                    setFormData({ ...formData, gstNumber: e.target.value })
                  }
                  placeholder="22AAAAA0000A1Z5"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status *</Label>
              <Select
                value={formData.status}
                onValueChange={(value: "ACTIVE" | "INACTIVE") =>
                  setFormData({ ...formData, status: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="INACTIVE">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-4 pt-4">
              <Link href={`/people/billers/${biller.id}`}>
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



