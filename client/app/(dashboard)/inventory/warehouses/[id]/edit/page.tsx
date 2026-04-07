"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageLoadingSkeleton } from "@/components/ui/page-loading-skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useInventoryApi } from "@/hooks/use-inventory-api";
import { useToast } from "@/hooks/use-toast";

export default function WarehouseEditPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { getWarehouse, updateWarehouse } = useInventoryApi();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    location: "",
  });

  useEffect(() => {
    loadWarehouse();
  }, [params.id]);

  async function loadWarehouse() {
    try {
      setLoading(true);
      const data = await getWarehouse(params.id as string);
      setFormData({
        name: data.name,
        location: data.location || "",
      });
    } catch (error) {
      console.error("Failed to load warehouse:", error);
      toast({
        title: "Error",
        description: "Failed to load warehouse details",
        variant: "destructive",
      });
      router.push("/inventory/warehouses");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Warehouse name is required",
        variant: "destructive",
      });
      return;
    }

    try {
      setSubmitting(true);
      await updateWarehouse(params.id as string, {
        name: formData.name.trim(),
        location: formData.location.trim() || undefined,
      });
      toast({
        title: "Success",
        description: "Warehouse updated successfully",
      });
      router.push(`/inventory/warehouses/${params.id}`);
    } catch (error) {
      console.error("Failed to update warehouse:", error);
      toast({
        title: "Error",
        description: "Failed to update warehouse",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <PageLoadingSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Edit Warehouse</h1>
          <p className="text-muted-foreground">Update warehouse information</p>
        </div>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Warehouse Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">
                Warehouse Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Enter warehouse name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) =>
                  setFormData({ ...formData, location: e.target.value })
                }
                placeholder="Enter warehouse location (optional)"
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button type="submit" disabled={submitting}>
                {submitting ? "Updating..." : "Update Warehouse"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={submitting}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}



