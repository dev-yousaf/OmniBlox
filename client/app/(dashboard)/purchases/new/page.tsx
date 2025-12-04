"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import PurchaseOrderForm from "@/components/purchases/PurchaseOrderForm";

export default function NewPurchasePage() {
  const { user } = useAuth();
  const role = user?.role;
  const canManage = role === "OWNER" || role === "ADMIN" || role === "MANAGER";

  if (!canManage) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/purchases">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">
              New Purchase
            </h1>
            <p className="text-sm text-muted-foreground">
              You don't have permission to create purchase orders.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/purchases">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            New Purchase
          </h1>
          <p className="text-sm text-muted-foreground">
            Create a new purchase order
          </p>
        </div>
      </div>

      <PurchaseOrderForm />
    </div>
  );
}
