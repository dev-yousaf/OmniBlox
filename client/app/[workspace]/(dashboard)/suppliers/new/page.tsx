"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { WorkspaceLink as Link } from "@/components/workspace-link";
import {
  Alert,
  AlertDescription,
} from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  useSuppliersApi,
  type CreateSupplierData,
} from "@/hooks/use-suppliers-api";
import { useToast } from "@/hooks/use-toast";
import { useWorkspace } from "@/hooks/use-workspace";
import { ArrowLeft, ChevronRight, Loader2, Save, Truck } from "lucide-react";

export default function CreateSupplierPage() {
  const [formData, setFormData] = useState<CreateSupplierData>({
    name: "",
    email: "",
    phone: "",
    address: "",
  });
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const router = useRouter();
  const ws = useWorkspace();
  const { toast } = useToast();
  const { createSupplier } = useSuppliersApi();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      setSubmitError("Name is required");
      return;
    }

    setSubmitError(null);
    setLoading(true);

    try {
      await createSupplier({
        name: formData.name.trim(),
        email: formData.email?.trim() || undefined,
        phone: formData.phone?.trim() || undefined,
        address: formData.address?.trim() || undefined,
      });

      toast({
        title: "Success",
        description: "Supplier created successfully.",
      });
      router.push(`/${ws}/suppliers`);
    } catch (error: any) {
      const message = error?.message || "Failed to create supplier.";
      setSubmitError(message);
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1 text-sm text-muted-foreground mb-0.5">
        <Link href="/dashboard" className="hover:text-foreground transition-colors">Dashboard</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link href="/suppliers" className="hover:text-foreground transition-colors">Suppliers</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground">New Supplier</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/suppliers"
            className="flex items-center justify-center h-8 w-8 rounded-[5px] border hover:bg-accent transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-[18px] font-bold text-foreground">New Supplier</h1>
            <p className="text-sm text-muted-foreground">Create a new supplier account</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/suppliers">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-[34px] rounded-[5px] text-[13px]"
            >
              Cancel
            </Button>
          </Link>
          <Button
            type="submit"
            form="create-supplier-form"
            disabled={loading}
            size="sm"
            className="h-[34px] rounded-[5px] text-[13px] gap-1.5"
          >
            {loading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Creating...</span>
              </>
            ) : (
              <>
                <Truck className="h-3.5 w-3.5" />
                <span>Create Supplier</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {submitError && (
        <Alert variant="destructive">
          <AlertDescription>{submitError}</AlertDescription>
        </Alert>
      )}

      <form
        id="create-supplier-form"
        onSubmit={handleSubmit}
        className="grid gap-5 lg:grid-cols-[1fr_320px]"
      >
        {/* Left Column */}
        <div className="space-y-5">
          <Card className="border rounded-[5px] bg-card shadow-sm">
            <CardHeader className="px-5 py-[15px] border-b">
              <CardTitle className="text-sm font-semibold">Supplier Information</CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-xs font-medium">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Acme Corp"
                  className="h-[34px] rounded-[5px] text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs font-medium">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  placeholder="contact@acme.com"
                  className="h-[34px] rounded-[5px] text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="text-xs font-medium">Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  placeholder="+1 234 567 8900"
                  className="h-[34px] rounded-[5px] text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address" className="text-xs font-medium">Address</Label>
                <Textarea
                  id="address"
                  rows={3}
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                  placeholder="123 Business Street, City, State, ZIP"
                  className="rounded-[5px] text-sm"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-4">
          <Card className="border rounded-[5px] bg-card shadow-sm p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4">Summary</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Name</span>
                <span className="font-medium truncate max-w-[160px] text-right">
                  {formData.name || "\u2014"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Email</span>
                <span className="font-medium truncate max-w-[160px] text-right">
                  {formData.email || "\u2014"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Phone</span>
                <span className="font-medium truncate max-w-[160px] text-right">
                  {formData.phone || "\u2014"}
                </span>
              </div>
            </div>
          </Card>

          <Card className="border rounded-[5px] bg-card shadow-sm p-5 space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Quick Stats</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Suppliers</span>
                <span className="font-semibold">{"\u2014"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Avg. Purchase</span>
                <span className="font-semibold">{"\u2014"}</span>
              </div>
            </div>
          </Card>
        </div>
      </form>
    </div>
  );
}
