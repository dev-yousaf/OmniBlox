"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
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
  useCustomersApi,
  type Customer,
  type UpdateCustomerData,
} from "@/hooks/use-customers-api";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Save, User2 } from "lucide-react";

export default function EditCustomerPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { getCustomer, updateCustomer } = useCustomersApi();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState<UpdateCustomerData>({});

  useEffect(() => {
    const load = async () => {
      if (!params.id) return;
      try {
        setLoading(true);
        const data = await getCustomer(params.id as string);
        setCustomer(data);
        setFormData({
          name: data.name,
          email: data.email ?? "",
          phone: data.phone ?? "",
          address: data.address ?? "",
          creditLimit: data.creditLimit,
        });
      } catch (error) {
        console.error("Error loading customer:", error);
        toast({
          title: "Error",
          description: "Failed to load customer for editing.",
          variant: "destructive",
        });
        router.push("/people/customers");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [params.id, getCustomer, toast, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer) return;

    try {
      setSaving(true);
      const payload: UpdateCustomerData = {
        name: formData.name?.trim(),
        email: formData.email?.toString().trim() || undefined,
        phone: formData.phone?.toString().trim() || undefined,
        address: formData.address?.toString().trim() || undefined,
        creditLimit: formData.creditLimit,
      };

      const updated = await updateCustomer(customer.id, payload);
      toast({ title: "Saved", description: "Customer updated successfully." });
      router.push(`/people/customers/${updated.id}`);
    } catch (error: any) {
      console.error("Error updating customer:", error);
      toast({
        title: "Error",
        description: error?.message || "Failed to update customer.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading || !customer) {
    return (
      <div className="p-6">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <Link href={`/people/customers/${customer.id}`}>
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Customer
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            Edit Customer
          </h1>
          <p className="text-sm text-muted-foreground">
            Update customer details
          </p>
        </div>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User2 className="h-5 w-5" /> Customer Details
          </CardTitle>
          <CardDescription>
            Modify the details for this customer.
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
                  placeholder="Jane Cooper"
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
                  placeholder="jane@example.com"
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
              <div className="space-y-2">
                <Label htmlFor="creditLimit">Credit Limit</Label>
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
                placeholder="123 Business Street, City, State, ZIP"
              />
            </div>

            <div className="flex justify-end gap-4 pt-4">
              <Link href={`/people/customers/${customer.id}`}>
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
