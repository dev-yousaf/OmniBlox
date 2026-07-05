"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useWorkspace } from "@/hooks/use-workspace";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useReportsApi, ExpenseReportResponse } from "@/hooks/use-reports-api";
import { useExpenseCategoriesApi } from "@/hooks/use-expense-categories-api";
import {
  FileDown,
  Loader2,
  TrendingUp,
  DollarSign,
  FileText,
  Calendar,
  Filter,
  ArrowLeft,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function NewExpenseReportPage() {
  const router = useRouter();
  const ws = useWorkspace();
  const { toast } = useToast();
  const { generateExpenseReport } = useReportsApi();
  const { getExpenseCategories } = useExpenseCategoriesApi();

  const [categories, setCategories] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportData, setReportData] = useState<ExpenseReportResponse | null>(
    null
  );

  // Form state
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(1); // First day of current month
    return date.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split("T")[0];
  });
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [vendor, setVendor] = useState("");

  // Load categories
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const data = await getExpenseCategories();
        setCategories(data);
      } catch (error) {
        console.error("Failed to load categories:", error);
      }
    };
    loadCategories();
  }, [getExpenseCategories]);

  const handleGenerateReport = async () => {
    try {
      setIsGenerating(true);

      const filters: any = {
        startDate,
        endDate,
      };

      if (selectedCategory && selectedCategory !== "all-categories") {
        filters.categoryId = selectedCategory;
      }

      if (vendor.trim()) {
        filters.vendor = vendor.trim();
      }

      const data = await generateExpenseReport(filters);
      setReportData(data);

      toast({
        title: "Report Generated",
        description: `Found ${
          data.summary.totalExpenses
        } expenses totaling $${Number(data.summary.totalAmount).toFixed(2)}`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to generate report",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExportCSV = () => {
    if (!reportData) return;

    // Create CSV content
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

    // Create download link
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `expense-report-${startDate}-to-${endDate}.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Export Successful",
      description: "Report has been exported to CSV",
    });
  };

  const formatCurrency = (amount: number | string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(Number(amount));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push(`/${ws}/expenses/reports`)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Generate Expense Report
            </h1>
            <p className="text-muted-foreground">
              Create detailed expense reports with custom filters
            </p>
          </div>
        </div>
      </div>

      {/* Report Generation Form */}
      <Card>
        <CardHeader>
          <CardTitle>Report Parameters</CardTitle>
          <CardDescription>
            Select date range and optional filters to generate your expense
            report
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {/* Date Range */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>

            {/* Optional Filters */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="category">Category (Optional)</Label>
                <Select
                  value={selectedCategory}
                  onValueChange={setSelectedCategory}
                >
                  <SelectTrigger id="category">
                    <SelectValue placeholder="All categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all-categories">
                      All categories
                    </SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="vendor">Vendor (Optional)</Label>
                <Input
                  id="vendor"
                  placeholder="Filter by vendor name"
                  value={vendor}
                  onChange={(e) => setVendor(e.target.value)}
                />
              </div>
            </div>

            {/* Generate Button */}
            <div className="flex gap-2">
              <Button
                onClick={handleGenerateReport}
                disabled={isGenerating || !startDate || !endDate}
                className="flex-1 md:flex-none"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <FileText className="mr-2 h-4 w-4" />
                    Generate Report
                  </>
                )}
              </Button>
              {reportData && (
                <Button
                  variant="outline"
                  onClick={handleExportCSV}
                  disabled={isGenerating}
                >
                  <FileDown className="mr-2 h-4 w-4" />
                  Export CSV
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Report Results */}
      {reportData && (
        <>
          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Amount
                </CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(reportData.summary.totalAmount)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Expenses
                </CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {reportData.summary.totalExpenses}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Date Range
                </CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-sm">
                  {formatDate(reportData.summary.startDate)} -{" "}
                  {formatDate(reportData.summary.endDate)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Active Filters
                </CardTitle>
                <Filter className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-sm">
                  {reportData.summary.categoryFilter ||
                  reportData.summary.vendorFilter
                    ? `${reportData.summary.categoryFilter ? "Category" : ""}${
                        reportData.summary.categoryFilter &&
                        reportData.summary.vendorFilter
                          ? ", "
                          : ""
                      }${reportData.summary.vendorFilter ? "Vendor" : ""}`
                    : "None"}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Category Breakdown */}
          {reportData.categoryBreakdown.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Category Breakdown</CardTitle>
                <CardDescription>Expenses grouped by category</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {reportData.categoryBreakdown.map((breakdown) => (
                    <div key={breakdown.categoryId}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">
                            {breakdown.categoryName}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {breakdown.count} expense
                            {breakdown.count !== 1 ? "s" : ""}
                          </span>
                        </div>
                        <span className="font-semibold">
                          {formatCurrency(breakdown.totalAmount)}
                        </span>
                      </div>
                      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-secondary">
                        <div
                          className="h-full bg-primary"
                          style={{
                            width: `${
                              (Number(breakdown.totalAmount) /
                                Number(reportData.summary.totalAmount)) *
                              100
                            }%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Detailed Expenses Table */}
          <Card>
            <CardHeader>
              <CardTitle>Detailed Expenses</CardTitle>
              <CardDescription>
                All expenses matching your filters
              </CardDescription>
            </CardHeader>
            <CardContent>
              {reportData.expenses.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No expenses found for the selected criteria
                </div>
              ) : (
                <div className="overflow-x-auto">
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
                            {formatDate(expense.expenseDate)}
                          </TableCell>
                          <TableCell className="font-medium">
                            {expense.description}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {expense.category.name}
                            </Badge>
                          </TableCell>
                          <TableCell>{expense.vendor}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">
                              {expense.paymentMethod}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            {formatCurrency(expense.amount)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Empty State */}
      {!reportData && !isGenerating && (
        <Card>
          <CardContent className="py-16">
            <div className="text-center">
              <TrendingUp className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">
                No Report Generated Yet
              </h3>
              <p className="text-sm text-muted-foreground mt-2">
                Configure your filters above and click "Generate Report" to view
                expense analytics
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
