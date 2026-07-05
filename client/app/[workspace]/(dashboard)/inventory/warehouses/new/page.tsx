"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useWorkspace } from "@/hooks/use-workspace";
import { WorkspaceLink as Link } from "@/components/workspace-link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useInventoryApi } from "@/hooks/use-inventory-api";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, ChevronRight, Loader2, Plus } from "lucide-react";

export default function NewWarehousePage() {
  const router = useRouter();
  const ws = useWorkspace();
  const { toast } = useToast();
  const { createWarehouse } = useInventoryApi();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ name: "", location: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast({ title: "Error", description: "Warehouse name is required", variant: "destructive" });
      return;
    }
    try {
      setLoading(true);
      await createWarehouse({ name: formData.name.trim(), location: formData.location?.trim() || undefined });
      toast({ title: "Success", description: "Warehouse created successfully" });
      router.push(`/${ws}/inventory/warehouses`);
    } catch (error: any) {
      toast({ title: "Error", description: error?.message || "Failed to create warehouse", variant: "destructive" });
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
        <Link href="/inventory/warehouses" className="hover:text-foreground transition-colors">Warehouses</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground">New Warehouse</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/inventory/warehouses" className="flex items-center justify-center h-8 w-8 rounded-[5px] border hover:bg-accent transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-[18px] font-bold text-foreground">New Warehouse</h1>
            <p className="text-sm text-muted-foreground">Create a new warehouse location</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/inventory/warehouses">
            <Button type="button" variant="outline" size="sm" className="h-[34px] rounded-[5px] text-[13px]">Cancel</Button>
          </Link>
          <Button type="submit" form="create-warehouse-form" disabled={loading} size="sm" className="h-[34px] rounded-[5px] bg-[#ff9025] hover:bg-[#ff9025]/90 text-white text-[13px] font-medium px-3 gap-1.5">
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            {loading ? "Creating..." : "Create Warehouse"}
          </Button>
        </div>
      </div>

      {/* Form */}
      <form id="create-warehouse-form" onSubmit={handleSubmit} className="max-w-2xl">
        <div className="border rounded-[5px] bg-card shadow-sm">
          <div className="px-5 py-[15px] border-b">
            <h2 className="text-sm font-semibold text-foreground">Warehouse Information</h2>
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
