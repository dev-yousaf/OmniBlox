"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  FileText,
  DollarSign,
  TrendingUp,
  Loader2,
  CheckCircle2,
  RotateCcw,
} from "lucide-react";
import Link from "next/link";
import { useSalesList } from "./_hooks/use-sales";
import type { SaleSummary } from "./_types";

export default function SalesPage() {
  const router = useRouter();
  const {
    sales,
    stats,
    filters,
    setFilters,
    loading,
    error,
    deleteSale,
    deletingId,
    markSalePaid,
    markPaidId,
  } = useSalesList();

  const [pendingDelete, setPendingDelete] = useState<{
    id: string;
    customer: string;
    invoice: string;
  } | null>(null);

  const totalRevenue = stats?.totalRevenue ?? 0;
  const pendingAmount = stats?.pendingAmount ?? 0;
  const overdueAmount = stats?.overdueAmount ?? 0;

  const formatCurrency = useMemo(
    () =>
      new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
      }),
    []
  );

  const formatStatus = (sale: SaleSummary) => {
    if (sale.paymentStatus === "PAID") {
      return { label: "Paid", variant: "default" as const };
    }
    if (sale.isOverdue) {
      return { label: "Overdue", variant: "destructive" as const };
    }
    if (sale.paymentStatus === "PARTIAL") {
      return { label: "Partial", variant: "secondary" as const };
    }
    return { label: "Pending", variant: "secondary" as const };
  };

  const handleSearchChange = (value: string) => {
    setFilters({ search: value });
  };

  const handleConfirmDelete = async () => {
    if (!pendingDelete) return;
    try {
      await deleteSale(pendingDelete.id);
      setPendingDelete(null);
    } catch {
      /* error handled by hook */
    }
  };

  const handleMarkPaid = async (id: string) => {
    await markSalePaid(id);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            Sales & Invoices
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage your sales transactions and invoices
          </p>
        </div>
        <Link href="/sales/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            New Sale
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">
              {stats?.totalSales ?? 0}
            </div>
            <p className="text-xs text-muted-foreground">All time invoices</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">
              {formatCurrency.format(totalRevenue)}
            </div>
            <p className="text-xs text-muted-foreground">Paid invoices</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <TrendingUp className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-warning">
              {formatCurrency.format(pendingAmount)}
            </div>
            <p className="text-xs text-muted-foreground">Awaiting payment</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <TrendingUp className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-destructive">
              {formatCurrency.format(overdueAmount)}
            </div>
            <p className="text-xs text-muted-foreground">Past due date</p>
          </CardContent>
        </Card>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Sales</CardTitle>
              <CardDescription>
                View and manage your sales invoices
              </CardDescription>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search invoices..."
                value={filters.search ?? ""}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Returns</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="py-12 text-center text-muted-foreground"
                  >
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Loading sales...</span>
                    </div>
                  </TableCell>
                </TableRow>
              )}
              {!loading && sales.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="py-12 text-center text-muted-foreground"
                  >
                    No sales found. Try adjusting your filters or create a new
                    sale.
                  </TableCell>
                </TableRow>
              )}
              {!loading &&
                sales.map((sale) => {
                  const statusDisplay = formatStatus(sale);
                  const isDeleting = deletingId === sale.id;
                  const isMarking = markPaidId === sale.id;
                  return (
                    <TableRow
                      key={sale.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => router.push(`/sales/${sale.id}`)}
                    >
                      <TableCell className="font-mono text-xs">
                        {sale.invoiceNumber}
                      </TableCell>
                      <TableCell className="font-medium">
                        {sale.customerName}
                      </TableCell>
                      <TableCell>
                        {new Date(sale.saleDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {new Date(sale.dueDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatCurrency.format(sale.totalAmount)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusDisplay.variant}>
                          {statusDisplay.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {sale.hasReturns && (
                          <Badge
                            variant="outline"
                            className="text-orange-600 border-orange-600"
                          >
                            <RotateCcw className="mr-1 h-3 w-3" />
                            Has Returns
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell
                        className="text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem asChild>
                              <Link href={`/sales/${sale.id}`}>
                                <Eye className="mr-2 h-4 w-4" />
                                View Details
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href={`/sales/${sale.id}/edit`}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {sale.paymentStatus !== "PAID" && (
                              <DropdownMenuItem
                                onSelect={(event) => {
                                  event.preventDefault();
                                  handleMarkPaid(sale.id).catch(() => {
                                    /* handled by hook */
                                  });
                                }}
                              >
                                <CheckCircle2 className="mr-2 h-4 w-4" />
                                {isMarking ? "Marking..." : "Mark as Paid"}
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              className="text-destructive"
                              onSelect={(event) => {
                                event.preventDefault();
                                setPendingDelete({
                                  id: sale.id,
                                  customer: sale.customerName,
                                  invoice: sale.invoiceNumber,
                                });
                              }}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              {isDeleting ? "Deleting..." : "Delete"}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <AlertDialog
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => {
          if (!open) {
            setPendingDelete(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this sale?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The sale
              {pendingDelete ? ` ${pendingDelete.invoice}` : ""} for{" "}
              {pendingDelete?.customer ?? "this customer"} will be removed
              permanently.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingId === pendingDelete?.id}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                handleConfirmDelete().catch(() => {
                  /* handled by hook */
                })
              }
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deletingId === pendingDelete?.id}
            >
              {deletingId === pendingDelete?.id ? "Deleting..." : "Delete Sale"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
