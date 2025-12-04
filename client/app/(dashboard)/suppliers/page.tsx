"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw, AlertCircle } from "lucide-react";

import {
  SupplierFilters,
  SupplierStatsCards,
  SuppliersTable,
} from "./_components";
import { useSupplierFilters, useSuppliers } from "./_hooks/use-suppliers";
import type { SupplierFilters as SupplierFiltersType } from "./_types";

export default function SuppliersPage() {
  const router = useRouter();
  const { suppliers, loading, error, loadSuppliers } = useSuppliers();
  const { filters, setFilters, filteredSuppliers } =
    useSupplierFilters(suppliers);

  const stats = useMemo(() => {
    const totalSuppliers = suppliers.length;
    const activeSuppliers = suppliers.filter(
      (supplier) => supplier.status === "active"
    ).length;
    const totalBalance = suppliers.reduce(
      (sum, supplier) => sum + Math.abs(supplier.balance),
      0
    );
    const totalPurchases = suppliers.reduce(
      (sum, supplier) => sum + supplier.totalPurchases,
      0
    );

    return {
      totalSuppliers,
      activeSuppliers,
      totalBalance,
      totalPurchases,
    };
  }, [suppliers]);

  const handleFiltersChange = (newFilters: SupplierFiltersType) => {
    setFilters(newFilters);
  };

  const handleSupplierClick = (supplierId: string) => {
    router.push(`/suppliers/${supplierId}`);
  };

  const handleRetry = () => {
    loadSuppliers();
  };

  if (error) {
    return (
      <div className="p-6 space-y-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>{error}</span>
            <Button variant="outline" size="sm" onClick={handleRetry}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Suppliers</h1>
        <p className="text-muted-foreground">
          Manage your suppliers and track purchases
        </p>
      </div>

      {/* Stats Cards */}
      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16 mb-1" />
                <Skeleton className="h-3 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <SupplierStatsCards stats={stats} />
      )}

      {/* Suppliers List */}
      <Card>
        <CardHeader>
          <CardTitle>Supplier List</CardTitle>
          <CardDescription>View and manage all your suppliers</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <SupplierFilters
            filters={filters}
            onFiltersChange={handleFiltersChange}
          />

          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : (
            <SuppliersTable
              suppliers={filteredSuppliers}
              onSupplierClick={handleSupplierClick}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
