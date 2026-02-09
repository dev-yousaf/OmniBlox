"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Package,
  FileText,
  Warehouse,
  TrendingUp,
  BarChart3,
  PieChart,
  Users,
  ShoppingCart,
  Star,
} from "lucide-react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip as TooltipUI,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";

const palette = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444"];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-card p-3 border border-border rounded-lg shadow-lg">
        <p className="font-semibold text-card-foreground">{`Month: ${label}`}</p>
        <p className="text-primary">
          {`Sales: $${Number(data.sales).toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}`}
        </p>
        <p className="text-accent">
          {`Purchases: $${Number(data.purchases).toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}`}
        </p>
        <p
          className={`font-semibold ${
            data.profit >= 0 ? "text-green-600" : "text-red-600"
          }`}
        >
          {`Profit: $${Number(data.profit).toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}`}
        </p>
      </div>
    );
  }
  return null;
};

export default function DashboardPage() {
  const [dashboard, setDashboard] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let mounted = true;
    setLoading(true);
    api
      .get("/dashboard/stats")
      .then((d) => {
        if (mounted) setDashboard(d);
      })
      .catch((err) => {
        // Keep static fallbacks on error; log for debugging
        console.warn("Failed to load dashboard stats:", err);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  // Sales data for monthly chart (use API monthlySeries when available,
  // fall back to static sample data). Normalize the API shape to the
  // chart fields (sales/purchases/profit) so the chart works either way.
  const rawMonthlySeries = dashboard?.sales?.monthlySeries ?? [];

  // If purchases are produced separately by the backend (dashboard.purchases.monthlySeries),
  // build a quick lookup keyed by month so we can populate the purchases column in the
  // combined monthly chart.
  const purchasesSeries = dashboard?.purchases?.monthlySeries ?? null;
  const purchasesLookup: Record<string, number> = purchasesSeries
    ? purchasesSeries.reduce((acc: Record<string, number>, item: any) => {
        const m = item.month || item.label || "";
        acc[m] = Number(
          item.total ?? item.purchases ?? item.amount ?? item.value ?? 0
        );
        return acc;
      }, {})
    : {};

  const monthlySalesData = rawMonthlySeries.map((e: any) => {
    // Server monthlySeries may use different keys (e.g. { month, invoices, revenue })
    const month = e.month || e.label || "";
    const sales = Number(e.revenue ?? e.sales ?? e.invoices ?? 0);
    // prefer purchases on the sales series, otherwise consult purchasesLookup
    const purchases = Number(e.purchases ?? purchasesLookup[month] ?? 0);
    const profit = Number(e.profit ?? sales - purchases);
    return { month, sales, purchases, profit };
  });

  // Stock overview data for pie chart (from API)
  const stockOverviewData =
    dashboard?.products?.stockOverviewByCategory?.map((c: any, i: number) => ({
      name: c.categoryName || c.name || "Uncategorized",
      value: c.totalQuantity || c.quantity || c.value || 0,
      color: palette[i % palette.length],
    })) ?? [];

  // Best sellers mapped from API or fallback
  const num = (v: any) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };
  const formatCurrency = (v: any) => {
    const n = Number(v);
    if (!Number.isFinite(n)) return String(v ?? "$0");
    return `$${n.toLocaleString()}`;
  };

  const bestSellers =
    dashboard?.products?.bestSellers?.map((b: any, idx: number) => ({
      rank: idx + 1,
      product: b.name ?? b.productName ?? b.productId,
      sku: b.sku ?? b.product?.sku ?? "",
      // accept multiple possible fields from API
      sales: num(
        b.quantitySold ??
          b.sold ??
          b.totalSold ??
          b.qty ??
          b.quantity ??
          b.sales
      ),
      revenue: formatCurrency(
        b.revenue ?? b.totalRevenue ?? b.total ?? b.amount
      ),
      growth: b.growth ?? b.change ?? "",
    })) ?? [];

  // Top customers, suppliers, etc.
  interface TopCustomer {
    name: string;
    purchases: string;
    orders: number;
  }

  const topCustomers: TopCustomer[] =
    dashboard?.sales?.topCustomers?.map((c: any) => ({
      name: c.name || c.customerName || "Unknown",
      purchases: formatCurrency(
        c.total ?? c.totalAmount ?? c.totalSpent ?? c.amount ?? c.revenue
      ),
      orders: num(
        c.count ?? c.orders ?? c.orderCount ?? c.ordersCount ?? c.numOrders
      ),
    })) ?? [];
  interface TopSupplier {
    name: string;
    supplies: string;
    orders: number;
  }

  const topSuppliers: TopSupplier[] =
    dashboard?.purchases?.topSuppliers?.map((s: any) => ({
      name: s.name || "Unknown",
      supplies: formatCurrency(
        s.total ?? s.totalAmount ?? s.totalSupplied ?? s.amount
      ),
      orders: num(s.count ?? s.orders ?? s.orderCount ?? s.numOrders),
    })) ?? [];
  // helper to format percent change and select color
  const formatChange = (
    prev: number | null | undefined,
    curr: number | null | undefined
  ) => {
    if (prev == null || curr == null)
      return { text: "—", className: "text-gray-600" };
    if (prev === 0) return { text: "—", className: "text-gray-600" };
    const diff = curr - prev;
    const pct = (diff / prev) * 100;
    const rounded = Math.abs(Number(pct.toFixed(1)));
    const sign = pct >= 0 ? "+" : "-";
    const className = pct >= 0 ? "text-green-600" : "text-red-600";
    return { text: `${sign}${rounded}%`, className };
  };

  const invoicesThisMonth = Number(
    dashboard?.sales?.invoicesThisMonth ?? monthlySalesData.at(-1)?.sales ?? 0
  );
  const prevInvoices = dashboard?.sales?.previousMonth?.invoices ?? null;
  const invoicesChange = formatChange(prevInvoices, invoicesThisMonth);

  const totalRevenue = Number(
    dashboard?.sales?.totalRevenue ?? monthlySalesData.at(-1)?.sales ?? 0
  );
  const prevRevenue = dashboard?.sales?.previousMonth?.revenue ?? null;
  const revenueChange = formatChange(prevRevenue, totalRevenue);

  const totalProducts = Number(dashboard?.products?.totalProducts ?? 0);
  const prevProducts =
    dashboard?.products?.previousMonth?.totalProducts ?? null;
  const productsChange = formatChange(prevProducts, totalProducts);

  const lowStock = Number(dashboard?.products?.lowStockCount ?? 0);
  const prevLowStock =
    dashboard?.products?.previousMonth?.lowStockCount ?? null;
  const lowStockChange = formatChange(prevLowStock, lowStock);

  const stats = [
    {
      title: "Total Products",
      value: String(dashboard?.products?.totalProducts ?? 0),
      changeText: productsChange.text,
      changeClass: productsChange.className,
      icon: Package,
    },
    {
      title: "Invoices This Month",
      value: String(dashboard?.sales?.invoicesThisMonth ?? 0),
      changeText: invoicesChange.text,
      changeClass: invoicesChange.className,
      icon: FileText,
    },
    {
      title: "Low Stock Items",
      value: String(dashboard?.products?.lowStockCount ?? 0),
      changeText: lowStockChange.text,
      changeClass: lowStockChange.className,
      icon: Warehouse,
    },
    {
      title: "Revenue",
      value:
        dashboard?.sales?.totalRevenue != null
          ? `$${Number(dashboard.sales.totalRevenue).toLocaleString()}`
          : "$0",
      changeText: revenueChange.text,
      changeClass: revenueChange.className,
      icon: TrendingUp,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Welcome back! Here's an overview of your business.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {loading ? (
                  <>
                    <Skeleton className="h-8 w-20 mb-2" />
                    <Skeleton className="h-4 w-16" />
                  </>
                ) : (
                  <>
                    <div className="text-2xl font-bold">{stat.value}</div>
                    <p className="text-xs text-muted-foreground">
                      <span className={stat.changeClass}>
                        {stat.changeText}
                      </span>{" "}
                      from last month
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Analytics Charts */}
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {/* Monthly Sales Chart */}
        <Card className="border border-border">
          <CardHeader className="border-b border-border">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-card-foreground">
                Monthly Sales Trend
              </CardTitle>
            </div>
            <CardDescription className="text-muted-foreground">
              Revenue, purchases, and profit over time
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            {loading || monthlySalesData.length === 0 ? (
              <div className="space-y-4">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-64 w-full" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthlySalesData}>
                  <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" />
                  <XAxis dataKey="month" axisLine={{ stroke: 'var(--color-border)' }} tick={{ fill: 'var(--color-muted-foreground)' }} />
                  <YAxis axisLine={{ stroke: 'var(--color-border)' }} tick={{ fill: 'var(--color-muted-foreground)' }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar dataKey="sales" fill="var(--color-chart-1)" name="Sales" />
                  <Bar dataKey="purchases" fill="var(--color-chart-5)" name="Purchases" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Stock Overview Chart */}
        <Card className="border border-border">
          <CardHeader className="border-b border-border">
            <div className="flex items-center gap-2">
              <PieChart className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-card-foreground">Stock Overview</CardTitle>
            </div>
            <CardDescription className="text-muted-foreground">
              Stock distribution by category
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            {loading || stockOverviewData.length === 0 ? (
              <div className="space-y-4">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-64 w-full rounded-full" />
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsPieChart>
                      <Pie
                        data={stockOverviewData}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        dataKey="value"
                        stroke="var(--color-background)"
                      >
                        {stockOverviewData.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </RechartsPieChart>
                </ResponsiveContainer>
                {/* Legend */}
                <div className="flex flex-wrap justify-center gap-4 mt-4">
                  {stockOverviewData.map((entry: any, index: number) => (
                    <div key={index} className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: entry.color }}
                      />
                      <span className="text-sm text-muted-foreground">
                        {entry.name}: {entry.value}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top 5 Section with Tabs */}
      <div className="mt-8">
        <Card className="border border-border">
          <CardHeader className="border-b border-border">
            <div className="flex items-center gap-2">
              <Star className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-card-foreground">Top Performers</CardTitle>
            </div>
            <CardDescription className="text-muted-foreground">
              Best performing entities across different categories
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <Tabs defaultValue="customers" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="customers">Top Customers</TabsTrigger>
                <TabsTrigger value="suppliers">Top Suppliers</TabsTrigger>
                <TabsTrigger value="products">Best Sellers</TabsTrigger>
              </TabsList>

              <TabsContent value="customers" className="mt-6">
                {loading || topCustomers.length === 0 ? (
                  <div className="space-y-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-4 rounded-lg bg-card border border-border"
                      >
                        <div className="flex items-center gap-3">
                          <Skeleton className="w-8 h-8 rounded-full" />
                          <div className="space-y-2">
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-3 w-16" />
                          </div>
                        </div>
                        <Skeleton className="h-6 w-20" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {topCustomers.map((customer, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-4 rounded-lg bg-card border border-border"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gray-800 text-white flex items-center justify-center font-bold">
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-semibold text-card-foreground">
                              {customer.name}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {customer.orders} orders
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-card-foreground">
                            {customer.purchases}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="suppliers" className="mt-6">
                {loading || topSuppliers.length === 0 ? (
                  <div className="space-y-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-4 rounded-lg bg-card border border-border"
                      >
                        <div className="flex items-center gap-3">
                          <Skeleton className="w-8 h-8 rounded-full" />
                          <div className="space-y-2">
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-3 w-16" />
                          </div>
                        </div>
                        <Skeleton className="h-6 w-20" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {topSuppliers.map((supplier, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-4 rounded-lg bg-card border border-border"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gray-800 text-white flex items-center justify-center font-bold">
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-semibold text-card-foreground">
                              {supplier.name}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {supplier.orders} orders
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-card-foreground">
                            {supplier.supplies}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="products" className="mt-6">
                {loading || bestSellers.length === 0 ? (
                  <div className="space-y-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-4 rounded-lg bg-card border border-border"
                      >
                        <div className="flex items-center gap-3">
                          <Skeleton className="w-8 h-8 rounded-full" />
                          <div className="space-y-2">
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-3 w-16" />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <Skeleton className="h-6 w-20" />
                          <Skeleton className="h-3 w-12" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {bestSellers.map((product: any) => (
                      <div
                        key={product.rank}
                        className="flex items-center justify-between p-4 rounded-lg bg-card border border-border"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gray-800 text-white flex items-center justify-center font-bold">
                            {product.rank}
                          </div>
                          <div>
                            <TooltipUI>
                              <TooltipTrigger asChild>
                                <p className="font-semibold text-card-foreground truncate w-48">
                                  {product.product}
                                </p>
                              </TooltipTrigger>
                              <TooltipContent>
                                <span className="max-w-xs break-words">
                                  {product.product}
                                </span>
                              </TooltipContent>
                            </TooltipUI>
                            <p className="text-sm text-muted-foreground">
                              {product.sku} • {product.sales} sold
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-card-foreground">
                            {product.revenue}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {product.growth}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="mt-8">
        <Card className="border border-border">
          <CardHeader className="border-b border-border">
            <CardTitle className="text-card-foreground">Quick Actions</CardTitle>
            <CardDescription className="text-muted-foreground">
              Common tasks and shortcuts
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Link href="/products/new">
                <button className="p-4 text-center rounded-lg border border-border bg-card transition-colors w-full">
                  <Package className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <div className="font-semibold text-card-foreground">Add Product</div>
                  <div className="text-xs text-muted-foreground">New inventory</div>
                </button>
              </Link>
              <Link href="/sales/new">
                <button className="p-4 text-center rounded-lg border border-border bg-card transition-colors w-full">
                  <FileText className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <div className="font-semibold text-card-foreground">
                    Create Invoice
                  </div>
                  <div className="text-xs text-muted-foreground">New sale</div>
                </button>
              </Link>
              <Link href="/people/customers/new">
                <button className="p-4 text-center rounded-lg border border-border bg-card transition-colors w-full">
                  <Users className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <div className="font-semibold text-card-foreground">
                    Add Customer
                  </div>
                  <div className="text-xs text-muted-foreground">New client</div>
                </button>
              </Link>
              <Link href="/reports">
                <button className="p-4 text-center rounded-lg border border-border bg-card transition-colors w-full">
                  <BarChart3 className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <div className="font-semibold text-card-foreground">
                    View Reports
                  </div>
                  <div className="text-xs text-muted-foreground">Analytics</div>
                </button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
