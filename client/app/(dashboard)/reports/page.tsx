"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Package,
  Users,
  Download,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  reportsService,
  FinancialSummary,
  InventorySummary,
  SalesSummary,
  StaffPerformance,
  TaxSummary,
} from "@/services/reports.service";
import { useAuth } from "@/contexts/auth-context";
import { PageError, checkRoleAccess } from "@/components/ui/page-error";
import { useToast } from "@/hooks/use-toast";

// Helper function to format currency
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

// Helper function to format percentage
const formatPercentage = (value: number) => {
  return `${value.toFixed(1)}%`;
};

export default function ReportsPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const currentRole = (user?.role || "").toUpperCase();
  const canView = checkRoleAccess(currentRole, ["OWNER", "ADMIN", "MANAGER"]);
  const [activeTab, setActiveTab] = useState("financial");

  if (!canView) {
    return <PageError type="forbidden" />;
  }

  // Date range state
  const [dateFrom, setDateFrom] = useState(() => {
    const date = new Date();
    date.setMonth(date.getMonth() - 6);
    return date.toISOString().split("T")[0];
  });
  const [dateTo, setDateTo] = useState(
    () => new Date().toISOString().split("T")[0]
  );

  // Loading and error states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Report data states
  const [financialData, setFinancialData] = useState<FinancialSummary | null>(
    null
  );
  const [inventoryData, setInventoryData] = useState<InventorySummary | null>(
    null
  );
  const [salesData, setSalesData] = useState<SalesSummary | null>(null);
  const [staffData, setStaffData] = useState<StaffPerformance | null>(null);
  const [taxData, setTaxData] = useState<TaxSummary | null>(null);

  // Fetch all reports
  const fetchReports = async () => {
    if (!dateFrom || !dateTo) {
      toast({
        title: "Invalid Date Range",
        description: "Please select both start and end dates.",
        variant: "destructive",
      });
      return;
    }

    if (new Date(dateFrom) > new Date(dateTo)) {
      toast({
        title: "Invalid Date Range",
        description: "Start date must be before end date.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [financial, inventory, sales, staff, tax] =
        await reportsService.getAllReports({
          startDate: dateFrom,
          endDate: dateTo,
        });

      setFinancialData(financial);
      setInventoryData(inventory);
      setSalesData(sales);
      setStaffData(staff);
      setTaxData(tax);

      toast({
        title: "Reports Updated",
        description: "All reports have been successfully generated.",
      });
    } catch (err: any) {
      const errorMessage =
        err.message || "Failed to fetch reports. Please try again.";
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Export report based on active tab
  const exportReport = () => {
    let dataToExport: any = null;
    let filename = "report";

    switch (activeTab) {
      case "financial":
        dataToExport = financialData;
        filename = "financial-report";
        break;
      case "inventory":
        dataToExport = inventoryData;
        filename = "inventory-report";
        break;
      case "sales":
        dataToExport = salesData;
        filename = "sales-report";
        break;
      case "staff":
        dataToExport = staffData;
        filename = "staff-performance";
        break;
      case "tax":
        dataToExport = taxData;
        filename = "tax-summary";
        break;
    }

    if (!dataToExport) {
      toast({
        title: "No Data",
        description: "Please generate reports first before exporting.",
        variant: "destructive",
      });
      return;
    }

    // Export as JSON (you can implement CSV/PDF export using libraries like papaparse or jspdf)
    const jsonStr = JSON.stringify(dataToExport, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${filename}_${dateFrom}_to_${dateTo}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: "Export Successful",
      description: `${filename} has been downloaded.`,
    });
  };

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h1 className="text-3xl font-semibold tracking-tight">Reports</h1>
        <p className="text-sm text-muted-foreground">
          Comprehensive business analytics and insights
        </p>
      </div>

      <div className="flex items-center justify-between">
        <div></div>
        <Button className="gap-2" onClick={exportReport} disabled={loading}>
          <Download className="h-4 w-4" />
          Export Report
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Date Range</CardTitle>
          <CardDescription>Select the period for your reports</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-4">
            <div className="flex-1 space-y-2">
              <Label htmlFor="date-from">From</Label>
              <Input
                id="date-from"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="flex-1 space-y-2">
              <Label htmlFor="date-to">To</Label>
              <Input
                id="date-to"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                disabled={loading}
              />
            </div>
            <Button onClick={fetchReports} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading...
                </>
              ) : (
                "Apply Filter"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!financialData && !loading && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Select a date range and click "Apply Filter" to generate reports.
          </AlertDescription>
        </Alert>
      )}

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-6"
      >
        <TabsList>
          <TabsTrigger value="financial">Financial</TabsTrigger>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="sales">Sales</TabsTrigger>
          <TabsTrigger value="staff">Staff</TabsTrigger>
          <TabsTrigger value="tax">Tax</TabsTrigger>
        </TabsList>

        {/* FINANCIAL TAB */}
        <TabsContent value="financial" className="space-y-6">
          {financialData ? (
            <>
              <div className="grid gap-4 md:grid-cols-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardDescription>Total Revenue</CardDescription>
                    <CardTitle className="text-3xl">
                      {formatCurrency(financialData.summary.totalRevenue)}
                    </CardTitle>
                    <div className="flex items-center gap-1 text-sm text-emerald-600">
                      <TrendingUp className="h-4 w-4" />
                      <span>
                        {formatPercentage(financialData.summary.grossMargin)}
                      </span>
                    </div>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardDescription>Total Expenses</CardDescription>
                    <CardTitle className="text-3xl">
                      {formatCurrency(financialData.summary.totalExpenses)}
                    </CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardDescription>Net Profit</CardDescription>
                    <CardTitle
                      className={`text-3xl ${
                        financialData.summary.netProfit >= 0
                          ? "text-emerald-600"
                          : "text-red-600"
                      }`}
                    >
                      {formatCurrency(financialData.summary.netProfit)}
                    </CardTitle>
                    <div
                      className={`flex items-center gap-1 text-sm ${
                        financialData.summary.netProfit >= 0
                          ? "text-emerald-600"
                          : "text-red-600"
                      }`}
                    >
                      {financialData.summary.netProfit >= 0 ? (
                        <TrendingUp className="h-4 w-4" />
                      ) : (
                        <TrendingDown className="h-4 w-4" />
                      )}
                      <span>
                        {formatPercentage(financialData.summary.netMargin)}
                      </span>
                    </div>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardDescription>Profit Margin</CardDescription>
                    <CardTitle className="text-3xl">
                      {formatPercentage(financialData.summary.netMargin)}
                    </CardTitle>
                  </CardHeader>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Profit & Loss Trend</CardTitle>
                  <CardDescription>
                    Revenue trend over the selected period
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={350}>
                    <LineChart data={financialData.pnlChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        name="Revenue"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <div className="grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Revenue by Category</CardTitle>
                    <CardDescription>
                      Sales distribution across product categories
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {financialData.revenueByCategory.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={financialData.revenueByCategory}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            outerRadius={100}
                            fill="#8884d8"
                            dataKey="revenue"
                            label={(entry: any) => String(entry.categoryName)}
                          >
                            {financialData.revenueByCategory.map(
                              (entry, index) => (
                                <Cell
                                  key={`cell-${index}`}
                                  fill={
                                    [
                                      "#3b82f6",
                                      "#10b981",
                                      "#f59e0b",
                                      "#8b5cf6",
                                      "#ec4899",
                                    ][index % 5]
                                  }
                                />
                              )
                            )}
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <p className="text-center text-muted-foreground py-8">
                        No category data available
                      </p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Financial Summary</CardTitle>
                    <CardDescription>Key financial metrics</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                            <DollarSign className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <div className="text-sm text-muted-foreground">
                              Gross Revenue
                            </div>
                            <div className="font-semibold">
                              {formatCurrency(
                                financialData.summary.totalRevenue
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center">
                            <DollarSign className="h-5 w-5 text-amber-600" />
                          </div>
                          <div>
                            <div className="text-sm text-muted-foreground">
                              Cost of Goods Sold
                            </div>
                            <div className="font-semibold">
                              {formatCurrency(financialData.summary.totalCOGS)}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                            <DollarSign className="h-5 w-5 text-purple-600" />
                          </div>
                          <div>
                            <div className="text-sm text-muted-foreground">
                              Gross Profit
                            </div>
                            <div className="font-semibold">
                              {formatCurrency(
                                financialData.summary.grossProfit
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                            <DollarSign className="h-5 w-5 text-emerald-600" />
                          </div>
                          <div>
                            <div className="text-sm text-muted-foreground">
                              Operating Expenses
                            </div>
                            <div className="font-semibold">
                              {formatCurrency(
                                financialData.summary.totalExpenses
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {financialData.revenueByCategory.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Category Performance</CardTitle>
                    <CardDescription>
                      Detailed breakdown by product category
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {financialData.revenueByCategory.map(
                        (category, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-4 border rounded-lg"
                          >
                            <div>
                              <div className="font-medium">
                                {category.categoryName}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {category.itemCount} items sold
                              </div>
                            </div>
                            <div className="flex items-center gap-6">
                              <div className="text-right">
                                <div className="text-sm text-muted-foreground">
                                  Revenue
                                </div>
                                <div className="font-semibold text-emerald-600">
                                  {formatCurrency(category.revenue)}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-sm text-muted-foreground">
                                  Profit
                                </div>
                                <div className="font-semibold">
                                  {formatCurrency(category.profit)}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-sm text-muted-foreground">
                                  Margin
                                </div>
                                <div className="font-semibold">
                                  {formatPercentage(category.margin)}
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          ) : loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : null}
        </TabsContent>

        {/* INVENTORY TAB */}
        <TabsContent value="inventory" className="space-y-6">
          {inventoryData ? (
            <>
              <div className="grid gap-4 md:grid-cols-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardDescription>Total Products</CardDescription>
                    <CardTitle className="text-3xl">
                      {inventoryData.summary.totalProducts}
                    </CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardDescription>Stock Value</CardDescription>
                    <CardTitle className="text-3xl">
                      {formatCurrency(inventoryData.summary.totalStockValue)}
                    </CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardDescription>Low Stock Items</CardDescription>
                    <CardTitle
                      className={`text-3xl ${
                        inventoryData.summary.lowStockCount > 0
                          ? "text-amber-600"
                          : ""
                      }`}
                    >
                      {inventoryData.summary.lowStockCount}
                    </CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardDescription>Potential Profit</CardDescription>
                    <CardTitle className="text-3xl text-emerald-600">
                      {formatCurrency(inventoryData.summary.potentialProfit)}
                    </CardTitle>
                  </CardHeader>
                </Card>
              </div>

              {inventoryData.stockByWarehouse.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Stock by Warehouse</CardTitle>
                    <CardDescription>
                      Inventory distribution across locations
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={350}>
                      <BarChart data={inventoryData.stockByWarehouse}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="warehouseName" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar
                          dataKey="totalQuantity"
                          fill="#3b82f6"
                          name="Total Units"
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {inventoryData.lowStockItems.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Low Stock Alerts</CardTitle>
                    <CardDescription>
                      Products below reorder level
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {inventoryData.lowStockItems.map((item, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-4 border rounded-lg"
                        >
                          <div>
                            <div className="font-medium">{item.productId}</div>
                            <div className="text-sm text-muted-foreground">
                              {item.warehouseName}
                            </div>
                          </div>
                          <div className="flex items-center gap-6">
                            <div className="text-right">
                              <div className="text-sm text-muted-foreground">
                                Current Stock
                              </div>
                              <div className="font-semibold text-red-600">
                                {item.currentQuantity} units
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm text-muted-foreground">
                                Reorder Level
                              </div>
                              <div className="font-medium">
                                {item.reorderLevel} units
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          ) : loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : null}
        </TabsContent>

        {/* SALES TAB */}
        <TabsContent value="sales" className="space-y-6">
          {salesData ? (
            <>
              <div className="grid gap-4 md:grid-cols-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardDescription>Total Sales</CardDescription>
                    <CardTitle className="text-3xl">
                      {formatCurrency(salesData.summary.totalSales)}
                    </CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardDescription>Orders</CardDescription>
                    <CardTitle className="text-3xl">
                      {salesData.summary.orderCount}
                    </CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardDescription>Avg Order Value</CardDescription>
                    <CardTitle className="text-3xl">
                      {formatCurrency(salesData.summary.averageOrderValue)}
                    </CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardDescription>New Customers</CardDescription>
                    <CardTitle className="text-3xl text-emerald-600">
                      {salesData.summary.newCustomers}
                    </CardTitle>
                  </CardHeader>
                </Card>
              </div>

              {salesData.topSellingProducts.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Top Selling Products</CardTitle>
                    <CardDescription>
                      Best performing products by revenue
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {salesData.topSellingProducts.map((product, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-4 border rounded-lg"
                        >
                          <div className="flex items-center gap-4">
                            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                              <Package className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <div className="font-medium">
                                {product.productName}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                SKU: {product.sku} • {product.quantitySold}{" "}
                                units sold
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-6">
                            <div className="text-right">
                              <div className="text-sm text-muted-foreground">
                                Revenue
                              </div>
                              <div className="font-semibold text-emerald-600">
                                {formatCurrency(product.revenue)}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm text-muted-foreground">
                                Avg Price
                              </div>
                              <div className="font-medium">
                                {formatCurrency(product.avgPrice)}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          ) : loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : null}
        </TabsContent>

        {/* STAFF TAB */}
        <TabsContent value="staff" className="space-y-6">
          {staffData ? (
            <>
              {staffData.note && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{staffData.note}</AlertDescription>
                </Alert>
              )}

              <div className="grid gap-4 md:grid-cols-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardDescription>Total Staff</CardDescription>
                    <CardTitle className="text-3xl">
                      {staffData.summary.totalStaff}
                    </CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardDescription>Total Revenue</CardDescription>
                    <CardTitle className="text-3xl">
                      {formatCurrency(staffData.summary.totalRevenue)}
                    </CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardDescription>Total Orders</CardDescription>
                    <CardTitle className="text-3xl">
                      {staffData.summary.totalOrders}
                    </CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardDescription>Avg per Staff</CardDescription>
                    <CardTitle className="text-3xl">
                      {staffData.summary.totalStaff > 0
                        ? formatCurrency(
                            staffData.summary.totalRevenue /
                              staffData.summary.totalStaff
                          )
                        : formatCurrency(0)}
                    </CardTitle>
                  </CardHeader>
                </Card>
              </div>

              {staffData.performance.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Staff Performance</CardTitle>
                    <CardDescription>
                      Sales performance by team member
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {staffData.performance.map((staff, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-4 border rounded-lg"
                        >
                          <div className="flex items-center gap-4">
                            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                              <Users className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <div className="font-medium">{staff.name}</div>
                              <div className="text-sm text-muted-foreground">
                                {staff.role} • {staff.orderCount} sales
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-6">
                            <div className="text-right">
                              <div className="text-sm text-muted-foreground">
                                Revenue
                              </div>
                              <div className="font-semibold">
                                {formatCurrency(staff.revenue)}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm text-muted-foreground">
                                Avg Order
                              </div>
                              <div className="font-medium">
                                {formatCurrency(staff.averageOrderValue)}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          ) : loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : null}
        </TabsContent>

        {/* TAX TAB */}
        <TabsContent value="tax" className="space-y-6">
          {taxData ? (
            <>
              {taxData.note && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{taxData.note}</AlertDescription>
                </Alert>
              )}

              <div className="grid gap-4 md:grid-cols-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardDescription>Total Tax Collected</CardDescription>
                    <CardTitle className="text-3xl">
                      {formatCurrency(taxData.summary.totalTaxCollected)}
                    </CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardDescription>Transactions</CardDescription>
                    <CardTitle className="text-3xl">
                      {taxData.summary.transactionCount}
                    </CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardDescription>Avg Tax per Transaction</CardDescription>
                    <CardTitle className="text-3xl">
                      {taxData.summary.transactionCount > 0
                        ? formatCurrency(
                            taxData.summary.totalTaxCollected /
                              taxData.summary.transactionCount
                          )
                        : formatCurrency(0)}
                    </CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardDescription>Tax Collection Rate</CardDescription>
                    <CardTitle className="text-3xl">100%</CardTitle>
                  </CardHeader>
                </Card>
              </div>

              {taxData.taxTrend.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Tax Collection Trend</CardTitle>
                    <CardDescription>Tax collected over time</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={350}>
                      <BarChart data={taxData.taxTrend}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar
                          dataKey="value"
                          fill="#10b981"
                          name="Tax Collected"
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}
            </>
          ) : loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : null}
        </TabsContent>
      </Tabs>
    </div>
  );
}
