"use client";

import { useEffect, useState } from "react";
import { PageLoadingSkeleton } from "@/components/ui/page-loading-skeleton";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Plus,
  Search,
  TrendingDown,
  TrendingUp,
  Loader2,
  AlertCircle,
  Info,
} from "lucide-react";
import Link from "next/link";
import { useReturnsApi, type UnifiedReturn } from "@/hooks/use-returns-api";
import { format } from "date-fns";
import { useAuth } from "@/contexts/auth-context";

const statusConfig = {
  PENDING: {
    label: "Pending",
    className: "bg-amber-100 text-amber-700 border-amber-200",
  },
  PROCESSING: {
    label: "Processing",
    className: "bg-blue-100 text-blue-700 border-blue-200",
  },
  COMPLETED: {
    label: "Completed",
    className: "bg-emerald-100 text-emerald-700 border-emerald-200",
  },
  CANCELLED: {
    label: "Cancelled",
    className: "bg-red-100 text-red-700 border-red-200",
  },
};

export default function ReturnsPage() {
  const { user } = useAuth();
  const canManage = user?.role === "OWNER" || user?.role === "ADMIN" || user?.role === "MANAGER";
  const { getAllReturns } = useReturnsApi();
  const [returns, setReturns] = useState<UnifiedReturn[]>([]);
  const [filteredReturns, setFilteredReturns] = useState<UnifiedReturn[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadReturns();
  }, []);

  useEffect(() => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      setFilteredReturns(
        returns.filter((ret) => {
          return (
            ret.referenceNumber.toLowerCase().includes(query) ||
            ret.reason?.toLowerCase().includes(query) ||
            (ret.type === "supplier" &&
              ret.supplier?.name.toLowerCase().includes(query))
          );
        })
      );
    } else {
      setFilteredReturns(returns);
    }
  }, [searchQuery, returns]);

  const loadReturns = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getAllReturns();
      setReturns(data);
      setFilteredReturns(data);
    } catch (err: any) {
      setError(err.message || "Failed to load returns");
    } finally {
      setLoading(false);
    }
  };

  const totalReturns = returns.length;
  const totalValue = returns.reduce((sum, r) => sum + Number(r.totalAmount), 0);
  const customerReturns = returns.filter((r) => r.type === "customer").length;
  const supplierReturns = returns.filter((r) => r.type === "supplier").length;

  if (loading) {
    return <PageLoadingSkeleton />;
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="max-w-2xl mx-auto text-center py-12">
          <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
          <h2 className="text-2xl font-semibold mb-2">Error Loading Returns</h2>
          <p className="text-muted-foreground mb-6">{error}</p>
          <Button onClick={loadReturns}>Try Again</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h1 className="text-3xl font-semibold tracking-tight">Returns</h1>
        <p className="text-sm text-muted-foreground">
          Manage customer and supplier returns
        </p>
      </div>

      {/* Info Banner about Return Workflow */}
      <Alert className="border-blue-200 bg-blue-50">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800">
          <strong>Important:</strong> Returns with references to sales or
          purchase orders must be marked as <strong>Completed</strong> before
          the original invoices will show return indicators.
        </AlertDescription>
      </Alert>

      <div className="flex items-center justify-between">
        <div></div>
        {canManage && (
          <Link href="/returns/new">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              New Return
            </Button>
          </Link>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Returns</CardDescription>
            <CardTitle className="text-3xl">{totalReturns}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Value</CardDescription>
            <CardTitle className="text-3xl">
              ${totalValue.toLocaleString()}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Customer Returns</CardDescription>
            <CardTitle className="text-3xl text-red-600">
              {customerReturns}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Supplier Returns</CardDescription>
            <CardTitle className="text-3xl text-emerald-600">
              {supplierReturns}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>All Returns</CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search returns..."
                  className="pl-9 w-[300px]"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredReturns.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {searchQuery
                ? "No returns found matching your search"
                : "No returns yet. Create your first return to get started."}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredReturns.map((returnItem) => (
                <Link key={returnItem.id} href={`/returns/${returnItem.id}`}>
                  <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div
                        className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                          returnItem.type === "customer"
                            ? "bg-red-100"
                            : "bg-emerald-100"
                        }`}
                      >
                        {returnItem.type === "customer" ? (
                          <TrendingDown className="h-5 w-5 text-red-600" />
                        ) : (
                          <TrendingUp className="h-5 w-5 text-emerald-600" />
                        )}
                      </div>
                      <div>
                        <div className="font-medium">
                          {returnItem.referenceNumber}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {returnItem.type === "supplier" &&
                            returnItem.supplier?.name}
                          {returnItem.type === "customer" && "Customer Return"}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <Badge
                        variant="outline"
                        className={
                          returnItem.type === "customer"
                            ? "border-red-200 bg-red-50 text-red-700"
                            : "border-emerald-200 bg-emerald-50 text-emerald-700"
                        }
                      >
                        {returnItem.type === "customer"
                          ? "Customer Return"
                          : "Supplier Return"}
                      </Badge>
                      <div className="text-right">
                        <div className="text-sm text-muted-foreground">
                          Date
                        </div>
                        <div className="font-medium">
                          {format(
                            new Date(returnItem.returnDate),
                            "MMM dd, yyyy"
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-muted-foreground">
                          Items
                        </div>
                        <div className="font-medium">
                          {returnItem.items.length}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-muted-foreground">
                          Amount
                        </div>
                        <div className="font-semibold">
                          $
                          {Number(returnItem.totalAmount).toLocaleString(
                            undefined,
                            {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            }
                          )}
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className={
                          statusConfig[
                            returnItem.status as keyof typeof statusConfig
                          ].className
                        }
                      >
                        {
                          statusConfig[
                            returnItem.status as keyof typeof statusConfig
                          ].label
                        }
                      </Badge>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}




