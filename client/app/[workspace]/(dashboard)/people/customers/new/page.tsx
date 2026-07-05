"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useWorkspace } from "@/hooks/use-workspace";
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
  useCustomersApi,
  type CreateCustomerData,
} from "@/hooks/use-customers-api";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, ChevronRight, Loader2, Save, UserPlus } from "lucide-react";

export default function CreateCustomerPage() {
  const [formData, setFormData] = useState<CreateCustomerData>({
    name: "",
    email: "",
    phone: "",
    address: "",
    creditLimit: undefined,
  });
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const router = useRouter();
  const ws = useWorkspace();
  const { toast } = useToast();
  const { createCustomer } = useCustomersApi();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      setSubmitError("Name is required");
      return;
    }

    setSubmitError(null);
    setLoading(true);

    try {
      await createCustomer({
        name: formData.name.trim(),
        email: formData.email?.trim() || undefined,
        phone: formData.phone?.trim() || undefined,
        address: formData.address?.trim() || undefined,
        creditLimit: formData.creditLimit,
      });

      toast({
        title: "Success",
        description: "Customer created successfully.",
      });
      router.push(`/${ws}/people/customers`);
    } catch (error: any) {
      const message = error?.message || "Failed to create customer.";
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
        <Link href="/people/customers" className="hover:text-foreground transition-colors">Customers</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground">New Customer</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/people/customers"
            className="flex items-center justify-center h-8 w-8 rounded-[5px] border hover:bg-accent transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-[18px] font-bold text-foreground">New Customer</h1>
            <p className="text-sm text-muted-foreground">Create a new customer account</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/people/customers">
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
            form="create-customer-form"
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
                <UserPlus className="h-3.5 w-3.5" />
                <span>Create Customer</span>
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
        id="create-customer-form"
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
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Jane Cooper"
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
                  placeholder="jane@example.com"
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
                  {formData.email || "—"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Phone</span>
                <span className="font-medium truncate max-w-[160px] text-right">
                  {formData.phone || "—"}
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
