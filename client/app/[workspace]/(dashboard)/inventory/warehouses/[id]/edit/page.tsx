"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useWorkspace } from "@/hooks/use-workspace";
import { WorkspaceLink as Link } from "@/components/workspace-link";
import { PageLoadingSkeleton } from "@/components/ui/page-loading-skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useInventoryApi } from "@/hooks/use-inventory-api";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, ChevronRight, Loader2, Save } from "lucide-react";

export default function WarehouseEditPage() {
  const params = useParams();
  const router = useRouter();
  const ws = useWorkspace();
  const { toast } = useToast();
  const { getWarehouse, updateWarehouse } = useInventoryApi();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [warehouse, setWarehouse] = useState<any>(null);
  const [formData, setFormData] = useState({ name: "", location: "" });

  useEffect(() => {
    loadWarehouse();
  }, [params.id]);

  async function loadWarehouse() {
    try {
      setLoading(true);
      const data = await getWarehouse(params.id as string);
      setWarehouse(data);
      setFormData({ name: data.name, location: data.location || "" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to load warehouse.", variant: "destructive" });
      router.push(`/${ws}/${ws}/inventory/warehouses`);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast({ title: "Validation Error", description: "Warehouse name is required", variant: "destructive" });
      return;
    }
    try {
      setSubmitting(true);
      await updateWarehouse(params.id as string, { name: formData.name.trim(), location: formData.location.trim() || undefined });
      toast({ title: "Success", description: "Warehouse updated successfully" });
      router.push(`/${ws}/inventory/warehouses/${params.id}`);
    } catch (error) {
      toast({ title: "Error", description: "Failed to update warehouse", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || !warehouse) return <PageLoadingSkeleton />;

  return (
    <div className="space-y-5">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1 text-sm text-muted-foreground mb-0.5">
        <Link href="/dashboard" className="hover:text-foreground transition-colors">Dashboard</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link href="/inventory/warehouses" className="hover:text-foreground transition-colors">Warehouses</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link href={`/inventory/warehouses/${warehouse.id}`} className="hover:text-foreground transition-colors">{warehouse.name}</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground">Edit</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href={`/inventory/warehouses/${warehouse.id}`} className="flex items-center justify-center h-8 w-8 rounded-[5px] border hover:bg-accent transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-[18px] font-bold text-foreground">Edit Warehouse</h1>
            <p className="text-sm text-muted-foreground">{warehouse.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/inventory/warehouses/${warehouse.id}`}>
            <Button type="button" variant="outline" size="sm" className="h-[34px] rounded-[5px] text-[13px]">Cancel</Button>
          </Link>
          <Button type="submit" form="edit-warehouse-form" disabled={submitting} size="sm" className="h-[34px] rounded-[5px] bg-[#ff9025] hover:bg-[#ff9025]/90 text-white text-[13px] font-medium px-3 gap-1.5">
            {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            {submitting ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>

      {/* Form */}
      <form id="edit-warehouse-form" onSubmit={handleSubmit} className="max-w-2xl">
        <div className="border rounded-[5px] bg-card shadow-sm">
          <div className="px-5 py-[15px] border-b">
            <h2 className="text-sm font-semibold text-foreground">Warehouse Details</h2>
          </div>
          <div className="p-5 space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-xs font-medium">Warehouse Name *</Label>
                <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Main Warehouse" required className="h-[34px] rounded-[5px] text-sm" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location" className="text-xs font-medium">Location</Label>
                <Input id="location" value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} placeholder="New York, NY" className="h-[34px] rounded-[5px] text-sm" />
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
