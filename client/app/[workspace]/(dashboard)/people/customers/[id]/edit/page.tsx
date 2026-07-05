"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useWorkspace } from "@/hooks/use-workspace";
import { WorkspaceLink as Link } from "@/components/workspace-link";
import { PageLoadingSkeleton } from "@/components/ui/page-loading-skeleton";
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
  useCustomersApi,
  type Customer,
  type UpdateCustomerData,
} from "@/hooks/use-customers-api";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, ChevronRight, Loader2, Save } from "lucide-react";

export default function EditCustomerPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const ws = useWorkspace();
  const { toast } = useToast();
  const customerId = params?.id ?? "";
  const { getCustomer, updateCustomer } = useCustomersApi();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState<UpdateCustomerData>({});

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!customerId) return;
      try {
        setLoading(true);
        const data = await getCustomer(customerId);
        if (!active) return;
        setCustomer(data);
        setFormData({
          name: data.name,
          email: data.email ?? "",
          phone: data.phone ?? "",
          address: data.address ?? "",
          creditLimit: data.creditLimit,
        });
      } catch (error) {
        if (!active) return;
        console.error("Error loading customer:", error);
        toast({
          title: "Error",
          description: "Failed to load customer for editing.",
          variant: "destructive",
        });
        router.push(`/${ws}/${ws}/people/customers`);
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => { active = false; };
  }, [customerId, getCustomer, toast, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer) return;

    if (!formData.name?.trim()) {
      setSubmitError("Name is required");
      return;
    }

    setSubmitError(null);
    setSaving(true);

    try {
      const payload: UpdateCustomerData = {
        name: formData.name.trim(),
        email: formData.email?.toString().trim() || undefined,
        phone: formData.phone?.toString().trim() || undefined,
        address: formData.address?.toString().trim() || undefined,
        creditLimit: formData.creditLimit,
      };

      const updated = await updateCustomer(customer.id, payload);
      toast({ title: "Saved", description: "Customer updated successfully." });
      router.push(`/${ws}/people/customers/${updated.id}`);
    } catch (error: any) {
      const message = error?.message || "Failed to update customer.";
      setSubmitError(message);
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (!customerId) {
    return <div className="p-6">Customer identifier is missing.</div>;
  }

  if (loading || !customer) {
    return <PageLoadingSkeleton />;
  }

  return (
    <div className="space-y-5">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1 text-sm text-muted-foreground mb-0.5">
        <Link href="/dashboard" className="hover:text-foreground transition-colors">Dashboard</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link href="/people/customers" className="hover:text-foreground transition-colors">Customers</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link href={`/people/customers/${customer.id}`} className="hover:text-foreground transition-colors">{customer.name}</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground">Edit</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href={`/people/customers/${customer.id}`}
            className="flex items-center justify-center h-8 w-8 rounded-[5px] border hover:bg-accent transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-[18px] font-bold text-foreground">Edit Customer</h1>
            <p className="text-sm text-muted-foreground">{customer.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/people/customers/${customer.id}`}>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-[34px] rounded-[5px] text-[13px]"
              disabled={saving}
            >
              Cancel
            </Button>
          </Link>
          <Button
            type="submit"
            form="edit-customer-form"
            disabled={saving}
            size="sm"
            className="h-[34px] rounded-[5px] text-[13px] gap-1.5"
          >
            {saving ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="h-3.5 w-3.5" />
                <span>Save Changes</span>
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
        id="edit-customer-form"
        onSubmit={handleSubmit}
        className="grid gap-5 lg:grid-cols-[1fr_320px]"
      >
        {/* Left Column */}
        <div className="space-y-5">
          <Card className="border rounded-[5px] bg-card shadow-sm">
            <CardHeader className="px-5 py-[15px] border-b">
              <CardTitle className="text-sm font-semibold">Customer Information</CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-xs font-medium">Name *</Label>
                <Input
                  id="name"
                  value={formData.name ?? ""}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Jane Cooper"
                  required
                  className="h-[34px] rounded-[5px] text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs font-medium">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={(formData.email as string) ?? ""}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  placeholder="jane@example.com"
                  className="h-[34px] rounded-[5px] text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="text-xs font-medium">Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={(formData.phone as string) ?? ""}
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
                  value={(formData.address as string) ?? ""}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                  placeholder="123 Business Street, City, State, ZIP"
                  className="rounded-[5px] text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="creditLimit" className="text-xs font-medium">Credit Limit</Label>
                <Input
                  id="creditLimit"
                  type="number"
                  value={formData.creditLimit ?? ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      creditLimit: e.target.value
                        ? Number(e.target.value)
                        : undefined,
                    })
                  }
                  placeholder="5000"
                  className="h-[34px] rounded-[5px] text-sm"
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
                  {formData.name || "—"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Email</span>
                <span className="font-medium truncate max-w-[160px] text-right">
                  {(formData.email as string) || "—"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Phone</span>
                <span className="font-medium truncate max-w-[160px] text-right">
                  {(formData.phone as string) || "—"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Address</span>
                <span className="font-medium truncate max-w-[160px] text-right">
                  {(formData.address as string) || "—"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Credit Limit</span>
                <span className="font-medium">
                  {formData.creditLimit
                    ? `$${formData.creditLimit.toLocaleString()}`
                    : "—"}
                </span>
              </div>
            </div>
          </Card>

          <Card className="border rounded-[5px] bg-card shadow-sm p-5 space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Quick Stats</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Customers</span>
                <span className="font-semibold">—</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Avg. Credit Limit</span>
                <span className="font-semibold">—</span>
              </div>
            </div>
          </Card>
        </div>
      </form>
    </div>
  );
}
