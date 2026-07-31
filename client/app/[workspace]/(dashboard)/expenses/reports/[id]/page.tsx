"use client";

import React, { Suspense, useCallback, useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useWorkspace } from "@/hooks/use-workspace";
import { ArrowLeft, FileDown, Loader2, TrendingUp, DollarSign, FileText, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useReportsApi, ExpenseReportResponse } from "@/hooks/use-reports-api";
import { useToast } from "@/hooks/use-toast";

const toDateInput = (date: Date) => date.toISOString().split("T")[0];

function ExpenseReportDetailContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const ws = useWorkspace();
  const { toast } = useToast();
  const { generateExpenseReport } = useReportsApi();

  const [reportData, setReportData] = useState<ExpenseReportResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadReport = useCallback(async () => {
    const today = new Date();
    const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const filters: any = {
      startDate: searchParams.get("startDate") || toDateInput(firstOfMonth),
      endDate: searchParams.get("endDate") || toDateInput(today),
    };
    const categoryId = searchParams.get("categoryId");
    const vendor = searchParams.get("vendor");
    if (categoryId) filters.categoryId = categoryId;
    if (vendor) filters.vendor = vendor;

    setLoading(true);
    setError(null);
    try {
      const data = await generateExpenseReport(filters);
      setReportData(data);
    } catch (err: any) {
      setError(err?.message || "Failed to load report");
      setReportData(null);
    } finally {
      setLoading(false);
    }
  }, [generateExpenseReport, searchParams]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const handleExportCSV = () => {
    if (!reportData) return;
    const headers = [
      "Date",
      "Description",
      "Category",
      "Vendor",
      "Amount",
      "Payment Method",
      "Receipt Number",
      "Notes",
    ];
    const rows = reportData.expenses.map((expense) => [
      new Date(expense.expenseDate).toLocaleDateString(),
      expense.description,
      expense.category.name,
      expense.vendor,
      Number(expense.amount).toFixed(2),
      expense.paymentMethod,
      expense.receiptNumber || "",
      expense.notes || "",
    ]);
    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        row
          .map((cell) => `"${(cell ?? "").toString().replace(/"/g, '""')}"`)
          .join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `expense-report-${reportData.summary.startDate}-to-${reportData.summary.endDate}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);

    toast({
      title: "Export Started",
      description: `Exporting ${reportData.expenses.length} expenses to CSV`,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Expense Report</h1>
            <p className="text-muted-foreground">Report ID: {params.id}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {reportData && (
            <Button variant="outline" onClick={handleExportCSV}>
              <FileDown className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          )}
          <Button variant="outline" onClick={() => router.push(`/${ws}/expenses/reports`)}>
            Back to Reports
          </Button>
        </div>
      </div>

      {loading && (
        <Card>
          <CardContent className="flex items-center justify-center gap-2 py-16">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-muted-foreground">Generating report...</span>
          </CardContent>
        </Card>
      )}

      {!loading && error && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button className="mt-4" onClick={loadReport}>
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {!loading && !error && reportData && (
        <>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>
              {new Date(reportData.summary.startDate).toLocaleDateString()} -{" "}
              {new Date(reportData.summary.endDate).toLocaleDateString()}
            </span>
            {reportData.summary.categoryFilter && (
              <Badge variant="outline">Category filtered</Badge>
            )}
            {reportData.summary.vendorFilter && (
              <Badge variant="outline">Vendor: {reportData.summary.vendorFilter}</Badge>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ${Number(reportData.summary.totalAmount).toFixed(2)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{reportData.summary.totalExpenses}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Categories</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{reportData.categoryBreakdown.length}</div>
              </CardContent>
            </Card>
          </div>

          {reportData.categoryBreakdown.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Category Breakdown</CardTitle>
                <CardDescription>Expenses grouped by category</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {reportData.categoryBreakdown.map((breakdown) => {
                  const pct =
                    Number(reportData.summary.totalAmount) > 0
                      ? (Number(breakdown.totalAmount) /
                          Number(reportData.summary.totalAmount)) *
                        100
                      : 0;
                  return (
                    <div key={breakdown.categoryId} className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{breakdown.categoryName}</span>
                        <span className="text-muted-foreground">
                          {breakdown.count} expense{breakdown.count === 1 ? "" : "s"} - $
                          {Number(breakdown.totalAmount).toFixed(2)} ({pct.toFixed(1)}%)
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${Math.min(pct, 100)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Expenses</CardTitle>
              <CardDescription>
                {reportData.expenses.length} expense
                {reportData.expenses.length === 1 ? "" : "s"} found in this period
              </CardDescription>
            </CardHeader>
            <CardContent>
              {reportData.expenses.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No expenses found for the selected period.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Vendor</TableHead>
                      <TableHead>Payment Method</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportData.expenses.map((expense) => (
                      <TableRow key={expense.id}>
                        <TableCell>
                          {new Date(expense.expenseDate).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="max-w-[260px] truncate">
                          {expense.description}
                        </TableCell>
                        <TableCell>{expense.category.name}</TableCell>
                        <TableCell>{expense.vendor}</TableCell>
                        <TableCell>{expense.paymentMethod}</TableCell>
                        <TableCell className="text-right font-medium">
                          ${Number(expense.amount).toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

export default function ExpenseReportDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      }
    >
      <ExpenseReportDetailContent />
    </Suspense>
  );
}
