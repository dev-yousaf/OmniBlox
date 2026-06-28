"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { PageLoadingSkeleton } from "@/components/ui/page-loading-skeleton";
import {
  useExpensesApi,
  type Expense,
} from "@/hooks/use-expenses-api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, ArrowRight, DollarSign, Package } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";

const statusColors: Record<string, string> = {
  PENDING: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  APPROVED: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  PAID: "bg-green-500/10 text-green-500 border-green-500/20",
  REJECTED: "bg-red-500/10 text-red-500 border-red-500/20",
};

export default function ExpenseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const api = useExpensesApi();
  const id = params?.id as string;
  const [expense, setExpense] = useState<Expense | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    api.getExpense(id).then(setExpense).catch(() => setExpense(null)).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <PageLoadingSkeleton />;

  if (!expense) {
    return (
      <div className="p-6 space-y-4">
        <Button variant="ghost" onClick={() => router.push("/purchases/expenses")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Expenses
        </Button>
        <div className="border rounded-[5px] bg-card shadow-sm py-12 text-center text-muted-foreground">
          <Package className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
          <p className="font-medium">Expense not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/purchases/expenses">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight flex items-center gap-3">
            {expense.reference}
            <Badge variant="outline" className={statusColors[expense.status]}>
              {expense.status}
            </Badge>
          </h1>
          <p className="text-sm text-muted-foreground">Expense Details</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Expense Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Amount</span>
              <span className="text-lg font-bold">
                ${Number(expense.amount).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Date</span>
              <span className="text-sm font-medium">
                {format(new Date(expense.expenseDate), "MMM dd, yyyy")}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Vendor</span>
              <span className="text-sm font-medium">{expense.vendor || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Category</span>
              <span className="text-sm font-medium">{expense.category?.name || "—"}</span>
            </div>
            {expense.description && (
              <div>
                <span className="text-sm text-muted-foreground block mb-1">Description</span>
                <p className="text-sm">{expense.description}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
