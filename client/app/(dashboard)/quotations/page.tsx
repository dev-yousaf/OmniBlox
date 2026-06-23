"use client";

import { useState, useEffect } from "react";
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
import {
  Plus,
  Search,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import {
  useQuotationsApi,
  type QuotationWithDetails,
} from "@/hooks/use-quotations-api";
import { format } from "date-fns";
import { useAuth } from "@/contexts/auth-context";

const statusConfig = {
  PENDING: {
    label: "Sent",
    icon: Clock,
    className: "bg-amber-100 text-amber-700 border-amber-200",
  },
  COMPLETED: {
    label: "Accepted",
    icon: CheckCircle,
    className: "bg-emerald-100 text-emerald-700 border-emerald-200",
  },
  CANCELLED: {
    label: "Rejected",
    icon: XCircle,
    className: "bg-red-100 text-red-700 border-red-200",
  },
};

export default function QuotationsPage() {
  const { user } = useAuth();
  const canManage = user?.role === "OWNER" || user?.role === "ADMIN" || user?.role === "MANAGER";
  const { getQuotations } = useQuotationsApi();
  const [quotations, setQuotations] = useState<QuotationWithDetails[]>([]);
  const [filteredQuotations, setFilteredQuotations] = useState<
    QuotationWithDetails[]
  >([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadQuotations();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredQuotations(quotations);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredQuotations(
        quotations.filter(
          (q) =>
            q.referenceNumber.toLowerCase().includes(query) ||
            q.customer.name.toLowerCase().includes(query)
        )
      );
    }
  }, [searchQuery, quotations]);

  const loadQuotations = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getQuotations();
      setQuotations(data);
      setFilteredQuotations(data);
    } catch (err: any) {
      setError(err.message || "Failed to load quotations");
    } finally {
      setLoading(false);
    }
  };

  const totalQuotations = quotations.length;
  const totalValue = quotations.reduce(
    (sum, q) => sum + Number(q.totalAmount),
    0
  );
  const pendingCount = quotations.filter((q) => q.status === "PENDING").length;
  const acceptedCount = quotations.filter(
    (q) => q.status === "COMPLETED"
  ).length;

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h1 className="text-3xl font-semibold tracking-tight">Quotations</h1>
        <p className="text-sm text-muted-foreground">
          Manage customer quotations and proposals
        </p>
      </div>

      <div className="flex items-center justify-between">
        <div></div>
        {canManage && (
          <Link href="/quotations/new">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              New Quotation
            </Button>
          </Link>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Quotations</CardDescription>
            <CardTitle className="text-3xl">
              {loading ? "..." : totalQuotations}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Value</CardDescription>
            <CardTitle className="text-3xl">
              {loading
                ? "..."
                : `$${totalValue.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}`}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Sent</CardDescription>
            <CardTitle className="text-3xl text-amber-600">
              {loading ? "..." : pendingCount}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Accepted</CardDescription>
            <CardTitle className="text-3xl text-emerald-600">
              {loading ? "..." : acceptedCount}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>All Quotations</CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search quotations..."
                  className="pl-9 w-[300px]"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-sm text-destructive">{error}</p>
              <Button
                variant="outline"
                onClick={loadQuotations}
                className="mt-4"
              >
                Try Again
              </Button>
            </div>
          ) : filteredQuotations.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-sm text-muted-foreground">
                {searchQuery
                  ? "No quotations found matching your search"
                  : "No quotations yet. Create your first quotation to get started."}
              </p>
              {!searchQuery && canManage && (
                <Link href="/quotations/new">
                  <Button className="mt-4 gap-2">
                    <Plus className="h-4 w-4" />
                    New Quotation
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredQuotations.map((quotation) => {
                const StatusIcon =
                  statusConfig[quotation.status as keyof typeof statusConfig]
                    .icon;
                return (
                  <Link key={quotation.id} href={`/quotations/${quotation.id}`}>
                    <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <FileText className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <div className="font-medium">
                            {quotation.referenceNumber}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {quotation.customer.name}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <div className="text-sm text-muted-foreground">
                            Date
                          </div>
                          <div className="font-medium">
                            {format(
                              new Date(quotation.quoteDate),
                              "MMM dd, yyyy"
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-muted-foreground">
                            Items
                          </div>
                          <div className="font-medium">
                            {quotation.items.length}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-muted-foreground">
                            Total
                          </div>
                          <div className="font-semibold">
                            $
                            {Number(quotation.totalAmount).toLocaleString(
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
                              quotation.status as keyof typeof statusConfig
                            ].className
                          }
                        >
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {
                            statusConfig[
                              quotation.status as keyof typeof statusConfig
                            ].label
                          }
                        </Badge>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
