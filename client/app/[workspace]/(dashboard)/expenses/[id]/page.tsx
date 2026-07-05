"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useWorkspace } from "@/hooks/use-workspace";
import { WorkspaceLink as Link } from "@/components/workspace-link";
import { PageLoadingSkeleton } from "@/components/ui/page-loading-skeleton";
import {
  useExpensesApi,
  type Expense,
  ExpenseStatus,
} from "@/hooks/use-expenses-api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, ChevronRight, Loader2, Pencil, CheckCircle, XCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const statusConfig: Record<string, { label: string; className: string }> = {
  [ExpenseStatus.PENDING]: { label: "Pending", className: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  [ExpenseStatus.APPROVED]: { label: "Approved", className: "bg-blue-100 text-blue-700 border-blue-200" },
  [ExpenseStatus.PAID]: { label: "Paid", className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  [ExpenseStatus.REJECTED]: { label: "Rejected", className: "bg-red-100 text-red-700 border-red-200" },
};

export default function ExpenseDetailPage() {
  const params = useParams();
  const expenseId = params?.id as string;
  const [expense, setExpense] = useState<Expense | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const api = useExpensesApi();
  const { toast } = useToast();
  const router = useRouter();
  const ws = useWorkspace();

  useEffect(() => {
    if (!expenseId) return;
    fetchData();
  }, [expenseId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const data = await api.getExpense(expenseId);
      setExpense(data);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to fetch expense",
        variant: "destructive",
      });
      router.push(`/${ws}/expenses`);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: ExpenseStatus) => {
    if (!expense) return;
    try {
      setSubmitting(true);
      await api.updateExpenseStatus(expense.id, { status: newStatus });
      toast({ title: "Success", description: `Expense ${newStatus.toLowerCase()} successfully` });
      fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update status",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = new Intl.NumberFormat("en-US", {
    style: "currency", currency: "USD", minimumFractionDigits: 2,
  });

  if (loading || !expense) {
    return <PageLoadingSkeleton />;
  }

  return (
    <div className="space-y-5">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1 text-sm text-muted-foreground mb-0.5">
        <Link href="/dashboard" className="hover:text-foreground transition-colors">Dashboard</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link href="/expenses" className="hover:text-foreground transition-colors">Expenses</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground">{expense.reference}</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-[18px] font-bold text-foreground">{expense.reference}</h1>
              <Badge variant="outline" className={`font-medium text-xs ${statusConfig[expense.status]?.className || ""}`}>
                {statusConfig[expense.status]?.label || expense.status}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Created {format(new Date(expense.createdAt), "MMM dd, yyyy")}
              {expense.createdBy?.firstName && ` by ${expense.createdBy.firstName} ${expense.createdBy.lastName || ""}`}
            </p>
          </div>
        </div>
        <Link href={`/expenses/${expense.id}/edit`}>
          <Button variant="outline" className="h-[34px] rounded-[5px] text-[13px]">
            <Pencil className="mr-1.5 h-3.5 w-3.5" />Edit
          </Button>
        </Link>
      </div>

      {/* Info Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="border rounded-[5px] bg-card shadow-sm p-5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Amount</p>
          <p className="text-2xl font-bold">{formatCurrency.format(expense.amount)}</p>
        </div>
        <div className="border rounded-[5px] bg-card shadow-sm p-5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Vendor</p>
          <p className="text-lg font-semibold">{expense.vendor || "—"}</p>
        </div>
        <div className="border rounded-[5px] bg-card shadow-sm p-5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Category</p>
          <p className="text-lg font-semibold">{expense.category?.name || "—"}</p>
        </div>
        <div className="border rounded-[5px] bg-card shadow-sm p-5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Date</p>
          <p className="text-lg font-semibold">{format(new Date(expense.expenseDate), "MMM dd, yyyy")}</p>
        </div>
      </div>

      {/* Description */}
      {expense.description && (
        <div className="border rounded-[5px] bg-card shadow-sm p-5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Description</p>
          <p className="text-sm text-foreground">{expense.description}</p>
        </div>
      )}

      {/* Links */}
      {(expense.purchaseOrderId || expense.saleId) && (
        <div className="border rounded-[5px] bg-card shadow-sm p-5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Linked To</p>
          <div className="flex gap-3">
            {expense.purchaseOrderId && (
              <Link href={`/purchases/${expense.purchaseOrderId}`}>
                <Button variant="outline" size="sm" className="h-[30px] rounded-[5px] text-xs">
                  View Purchase Order
                </Button>
              </Link>
            )}
            {expense.saleId && (
              <Link href={`/sales/${expense.saleId}`}>
                <Button variant="outline" size="sm" className="h-[30px] rounded-[5px] text-xs">
                  View Sale
                </Button>
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Status Management */}
      <div className="border rounded-[5px] bg-card shadow-sm">
        <div className="px-5 py-[15px] border-b">
          <h2 className="text-sm font-semibold text-foreground">Status Management</h2>
        </div>
        <div className="p-5">
          <div className="flex flex-wrap gap-3">
            {expense.status === ExpenseStatus.PENDING && (
              <>
                <Button
                  onClick={() => handleStatusChange(ExpenseStatus.APPROVED)}
                  disabled={submitting}
                  className="h-[34px] rounded-[5px] text-[13px]"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve
                </Button>
                <Button
                  onClick={() => handleStatusChange(ExpenseStatus.REJECTED)}
                  disabled={submitting}
                  variant="destructive"
                  className="h-[34px] rounded-[5px] text-[13px]"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject
                </Button>
              </>
            )}
            {expense.status === ExpenseStatus.APPROVED && (
              <Button
                onClick={() => handleStatusChange(ExpenseStatus.PAID)}
                disabled={submitting}
                className="h-[34px] rounded-[5px] text-[13px]"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Mark as Paid
              </Button>
            )}
            {expense.status === ExpenseStatus.REJECTED && (
              <Button
                onClick={() => handleStatusChange(ExpenseStatus.PENDING)}
                disabled={submitting}
                variant="outline"
                className="h-[34px] rounded-[5px] text-[13px]"
              >
                Reset to Pending
              </Button>
            )}
            {expense.status === ExpenseStatus.PAID && (
              <p className="text-sm text-muted-foreground py-2">This expense has been paid</p>
            )}
          </div>
          {submitting && <Loader2 className="h-4 w-4 mt-3 animate-spin" />}
        </div>
      </div>
    </div>
  );
}
