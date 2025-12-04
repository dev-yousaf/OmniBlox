"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/auth-context";
import { usePurchasesApi, type PurchaseOrder } from "@/hooks/use-purchases-api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus } from "lucide-react";
import PurchasesTable from "@/components/purchases/PurchasesTable";
import { ReceivePurchaseDialog } from "@/components/purchases/ReceivePurchaseDialog";
import { toast } from "@/hooks/use-toast";

export default function PurchasesPage() {
  const { user, isAuthenticated } = useAuth();
  const { list, receive } = usePurchasesApi();
  const [purchases, setPurchases] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [receivingPurchase, setReceivingPurchase] =
    useState<PurchaseOrder | null>(null);

  const canManage = useMemo(() => {
    const role = user?.role;
    return role === "OWNER" || role === "ADMIN" || role === "MANAGER";
  }, [user?.role]);

  async function load() {
    try {
      setLoading(true);
      setError(null);
      const data = await list();
      setPurchases(data);
    } catch (e: any) {
      setError(e?.message || "Failed to load purchases");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  const filtered = useMemo(() => {
    if (!search) return purchases;
    const q = search.toLowerCase();
    return purchases.filter(
      (p) =>
        (p.referenceNumber || "").toLowerCase().includes(q) ||
        (p.supplier?.name || "").toLowerCase().includes(q) ||
        (p.warehouse?.name || "").toLowerCase().includes(q)
    );
  }, [purchases, search]);

  const markReceived = async (purchase: PurchaseOrder) => {
    setReceivingPurchase(purchase);
  };

  const handleReceiveConfirm = async (warehouseId: string) => {
    if (!receivingPurchase) return;

    try {
      await receive(receivingPurchase.id, warehouseId);
      toast({ title: "Purchase received", description: "Inventory updated." });
      await load();
    } catch (e: any) {
      toast({
        title: "Failed to receive",
        description: e?.message || "Try again",
        variant: "destructive" as any,
      });
      throw e; // Re-throw to keep dialog open on error
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            All Purchases
          </h1>
          <p className="text-sm text-muted-foreground">
            View and manage your purchase orders.
          </p>
        </div>
        {canManage && (
          <Link href="/purchases/new">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              New Purchase
            </Button>
          </Link>
        )}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Purchases</CardTitle>
              <CardDescription>List of all purchase orders</CardDescription>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by reference, supplier, warehouse..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="text-sm text-destructive">{error}</div>
          ) : loading ? (
            <div className="text-sm text-muted-foreground">
              Loading purchases…
            </div>
          ) : (
            <PurchasesTable
              purchases={filtered}
              canManage={canManage}
              onReceive={markReceived}
            />
          )}
        </CardContent>
      </Card>

      <ReceivePurchaseDialog
        open={!!receivingPurchase}
        onOpenChange={(open) => !open && setReceivingPurchase(null)}
        onConfirm={handleReceiveConfirm}
        purchaseReference={receivingPurchase?.referenceNumber || ""}
      />
    </div>
  );
}
