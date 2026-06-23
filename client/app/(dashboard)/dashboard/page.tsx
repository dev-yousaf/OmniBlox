"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

import {
  BarChart,
  Bar,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import {
  DollarSign,
  ArrowDownUp,
  ShoppingBag,
  RefreshCcw,
  TrendingUp,
  FileText,
  Receipt,
  Banknote,
  BarChart3,
  Info,
  X,
  Truck,
  Users,
  ClipboardList,
  Box,
  AlertTriangle,
  CalendarDays,
  ChevronDown,
  CircleDot,
} from "lucide-react";

interface TopSellingProduct {
  productId: string;
  name: string;
  imageUrl: string;
  salePrice: number;
  salesCount: number;
  totalRevenue: number;
}

interface LowStockProduct {
  productId: string;
  name: string;
  sku: string;
  imageUrl: string;
  stockQuantity: number;
  alertQuantity: number;
}

interface SalesPurchaseChartItem {
  month: string;
  purchase: number;
  sales: number;
}

interface DashboardData {
  totalSales: number;
  salesChange: number;
  totalSalesReturn: number;
  salesReturnChange: number;
  totalPurchase: number;
  purchaseChange: number;
  totalPurchaseReturn: number;
  purchaseReturnChange: number;
  profit: number;
  profitLabel: string;
  profitChange: number;
  invoiceDue: number;
  invoiceDueLabel: string;
  invoiceDueChange: number;
  totalExpenses: number;
  expensesLabel: string;
  expensesChange: number;
  totalPaymentReturns: number;
  paymentReturnsLabel: string;
  paymentReturnsChange: number;
  salesPurchaseChart: SalesPurchaseChartItem[];
  totalSalesAmount: number;
  totalPurchaseAmount: number;
  suppliersCount: number;
  customersCount: number;
  ordersCount: number;
  firstTimeCustomers: number;
  firstTimeCustomersPercent: number;
  returnCustomers: number;
  returnCustomersPercent: number;
  topSellingProducts: TopSellingProduct[];
  lowStockProducts: LowStockProduct[];
}

interface UserProfile {
  _id: string;
  name: string;
  email: string;
  company?: { name: string };
}

const formatCurrency = (value: number) =>
  `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatCompactCurrency = (value: number) => {
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
};

const PERIODS = ["1D", "1W", "1M", "3M", "6M", "1Y"];

interface SummaryCard {
  title: string;
  amount: number;
  change: number;
  icon: typeof DollarSign;
  iconBg: string;
  iconColor: string;
}

interface FinancialCard {
  title: string;
  amount: number;
  change: number;
  label: string;
  icon: typeof TrendingUp;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("1Y");
  const [notificationVisible, setNotificationVisible] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [dashboardRes, userRes] = await Promise.all([
        api.get<DashboardData>(`/dashboard?period=${period}`),
        api.get<UserProfile>("/auth/me"),
      ]);
      setData(dashboardRes);
      setUser(userRes);
    } catch (err) {
      console.warn("Failed to load dashboard data:", err);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const summaryCards: SummaryCard[] = [
    {
      title: "Total Sales",
      amount: data?.totalSales ?? 0,
      change: data?.salesChange ?? 0,
      icon: DollarSign,
      iconBg: "bg-[#fe9f43]",
      iconColor: "text-[#fe9f43]",
    },
    {
      title: "Total Sales Return",
      amount: data?.totalSalesReturn ?? 0,
      change: data?.salesReturnChange ?? 0,
      icon: ArrowDownUp,
      iconBg: "bg-[#092c4c]",
      iconColor: "text-[#092c4c]",
    },
    {
      title: "Total Purchase",
      amount: data?.totalPurchase ?? 0,
      change: data?.purchaseChange ?? 0,
      icon: ShoppingBag,
      iconBg: "bg-[#0e9384]",
      iconColor: "text-[#0e9384]",
    },
    {
      title: "Total Purchase Return",
      amount: data?.totalPurchaseReturn ?? 0,
      change: data?.purchaseReturnChange ?? 0,
      icon: RefreshCcw,
      iconBg: "bg-[#155eef]",
      iconColor: "text-[#155eef]",
    },
  ];

  const financialCards: { title: string; amount: number; change: number; label: string; icon: typeof TrendingUp; iconBg: string }[] = [
    {
      title: "Profit",
      amount: data?.profit ?? 0,
      change: data?.profitChange ?? 0,
      label: "vs Last Month",
      icon: TrendingUp,
      iconBg: "bg-[#e9f8fb]",
    },
    {
      title: "Invoice Due",
      amount: data?.invoiceDue ?? 0,
      change: data?.invoiceDueChange ?? 0,
      label: "vs Last Month",
      icon: FileText,
      iconBg: "bg-[#e9f5f4]",
    },
    {
      title: "Total Expenses",
      amount: data?.totalExpenses ?? 0,
      change: data?.expensesChange ?? 0,
      label: "vs Last Month",
      icon: Receipt,
      iconBg: "bg-[#fcefea]",
    },
    {
      title: "Total Payment Returns",
      amount: data?.totalPaymentReturns ?? 0,
      change: data?.paymentReturnsChange ?? 0,
      label: "vs Last Month",
      icon: Banknote,
      iconBg: "bg-[#ededfb]",
    },
  ];

  const chartData = data?.salesPurchaseChart ?? [];

  const topProducts = data?.topSellingProducts ?? [];
  const lowStockProducts = data?.lowStockProducts ?? [];

  const pieData = [
    { name: "First Time Customers", value: data?.firstTimeCustomers ?? 0, color: "#3B82F6" },
    { name: "Return Customers", value: data?.returnCustomers ?? 0, color: "#10B981" },
  ];

  const chartTicks = [0, 10000, 20000, 30000, 40000, 50000, 60000];

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="max-w-[1440px] mx-auto px-6 flex flex-col gap-6">
        {/* Header */}
        <div className="pt-6 pb-0 flex items-center justify-between">
          <div>
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-7 w-64" />
                <Skeleton className="h-4 w-72" />
              </div>
            ) : (
              <>
                <h1 className="text-[28px] font-bold text-[#212b36] leading-[42px]">
                  Welcome, {user?.name?.split(" ")[0] ?? "Admin"}
                </h1>
                <p className="text-sm text-[#646b72]">
                  You have <span className="font-bold text-[#fe9f43]">200+</span> Orders, Today
                </p>
              </>
            )}
          </div>
          <div className="flex items-center gap-[7px] px-[10px] py-[10px] border border-[rgba(145,158,171,0.3)] rounded-lg bg-white text-sm text-[#092c4c]">
            <CalendarDays className="h-4 w-4 text-[#092c4c]" />
            <span className="text-[15px]">01 Jan 2024 - 07 Jan 2024</span>
          </div>
        </div>

        {/* Notification Bar */}
        {notificationVisible && (
          <div className="flex items-center justify-between bg-[#fcefea] rounded-lg px-[10px] py-[10px]">
            <div className="flex items-center gap-[10px]">
              <Info className="h-3.5 w-3.5 text-[#e04f16] shrink-0" />
              <p className="text-sm text-[#646b72]">
                Your Product{" "}
                <span className="font-semibold text-[#e04f16]">Apple Iphone 15 is running Low,</span>
                {" "}already below 5 Pcs.,{" "}
                <span className="font-semibold text-[#e04f16] underline">Add Stock</span>
              </p>
            </div>
            <button
              onClick={() => setNotificationVisible(false)}
              className="shrink-0 ml-4 p-0.5 rounded-full hover:bg-orange-200 transition-colors"
            >
              <X className="h-3.5 w-3.5 text-[#e04f16]" />
            </button>
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-4 gap-6">
          {summaryCards.map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.title} className={`rounded-lg h-[92px] p-5 ${card.iconBg}`}>
                <div className="flex items-center gap-3 h-full">
                  <div className="bg-white rounded-lg p-[10px] shrink-0 flex items-center justify-center">
                    <Icon className="h-6 w-6 text-black" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[#f9fafb]">{card.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {loading ? (
                        <Skeleton className="h-7 w-24" />
                      ) : (
                        <span className="text-lg font-bold text-white">
                          {formatCurrency(card.amount)}
                        </span>
                      )}
                      <div className={`flex items-center gap-1 px-[6px] py-[4px] rounded-[5px] ${
                        card.change >= 0 ? "bg-[#eefaf1]" : "bg-[#ffede9]"
                      }`}>
                        <span className={`text-[10px] font-bold ${
                          card.change >= 0 ? "text-[#3eb780]" : "text-[#e70d0d]"
                        }`}>
                          {card.change >= 0 ? "+" : ""}{card.change}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Financial Summary */}
        <div className="grid grid-cols-4 gap-6">
          {financialCards.map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.title} className="bg-white border border-[#e6eaed] rounded-lg p-5 flex flex-col gap-4 shadow-[0px_4px_12px_rgba(236,236,236,0.25)]">
                <div className="flex items-start justify-between gap-1">
                  <div>
                    {loading ? (
                      <>
                        <Skeleton className="h-7 w-24" />
                        <Skeleton className="h-4 w-16 mt-1" />
                      </>
                    ) : (
                      <>
                        <p className="text-lg font-bold text-[#212b36] leading-[27px]">
                          {formatCompactCurrency(card.amount)}
                        </p>
                        <p className="text-sm text-[#7a8086] leading-[21px]">
                          {card.title}
                        </p>
                      </>
                    )}
                  </div>
                  <div className={`w-12 h-12 rounded-lg ${card.iconBg} flex items-center justify-center shrink-0`}>
                    <Icon className="h-4 w-4 text-[#212b36]" />
                  </div>
                </div>
                <div className="h-px bg-[#e6eaed]" />
                <div className="flex items-center justify-between">
                  <p className="text-xs text-[#646b72]">
                    <span
                      className={`font-bold ${
                        card.change >= 0 ? "text-[#3eb780]" : "text-red-500"
                      }`}
                    >
                      {card.change >= 0 ? "+" : ""}{card.change}%
                    </span>{" "}
                    {card.label}
                  </p>
                  <Link
                    href="/reports"
                    className="text-[13px] font-medium text-[#212b36] underline"
                  >
                    View All
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        {/* Sales & Purchase + Overall Info */}
        <div className="grid grid-cols-12 gap-6">
          {/* Sales & Purchase Chart */}
          <div className="col-span-8">
            <div className="border border-[#e6eaed] rounded-lg h-full">
              <div className="border-b border-[#e6eaed] px-5 py-[15px]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="bg-[#fff6ee] rounded-lg p-2">
                      <BarChart3 className="h-3.5 w-3.5 text-[#fe9f43]" />
                    </div>
                    <h3 className="text-lg font-bold text-[#212b36] leading-[27px]">
                      Sales & Purchase
                    </h3>
                  </div>
                  <div className="flex items-center bg-[#f9fafb] rounded-[4px] h-[30px]">
                    {PERIODS.map((tab, idx) => (
                      <button
                        key={tab}
                        onClick={() => setPeriod(tab)}
                        className={`px-3 py-1 text-xs font-medium leading-[18px] transition-colors ${
                          tab === period
                            ? "text-[#212b36]"
                            : "text-[#212b36]"
                        } ${idx < PERIODS.length - 1 ? "border-r border-[#e6eaed]" : ""}`}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="p-5">
                {/* Legend amounts */}
                <div className="flex items-center gap-6 mt-3 mb-4">
                  <div className="flex items-center gap-2">
                    <CircleDot className="h-3 w-3 text-blue-500 fill-blue-500" />
                    <span className="text-sm text-gray-500">Total Purchase</span>
                    <span className="text-sm font-semibold text-gray-900">
                      {loading ? (
                        <Skeleton className="h-4 w-16 inline-block" />
                      ) : (
                        formatCompactCurrency(data?.totalPurchaseAmount ?? 0)
                      )}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CircleDot className="h-3 w-3 text-green-500 fill-green-500" />
                    <span className="text-sm text-gray-500">Total Sales</span>
                    <span className="text-sm font-semibold text-gray-900">
                      {loading ? (
                        <Skeleton className="h-4 w-16 inline-block" />
                      ) : (
                        formatCompactCurrency(data?.totalSalesAmount ?? 0)
                      )}
                    </span>
                  </div>
                </div>

                {/* Chart */}
                {loading ? (
                  <Skeleton className="h-[300px] w-full" />
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={chartData} barGap={4} barCategoryGap="20%">
                      <CartesianGrid
                        stroke="#E5E7EB"
                        strokeDasharray="3 3"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="month"
                        axisLine={{ stroke: "#E5E7EB" }}
                        tickLine={false}
                        tick={{ fill: "#9CA3AF", fontSize: 12 }}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "#9CA3AF", fontSize: 12 }}
                        ticks={chartTicks}
                        tickFormatter={(v: number) => formatCompactCurrency(v)}
                      />
                      <Tooltip
                        contentStyle={{
                          borderRadius: "8px",
                          border: "1px solid #E5E7EB",
                          boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
                        }}
                        formatter={(value: number, name: string) => [
                          formatCurrency(value),
                          name === "purchase" ? "Total Purchase" : "Total Sales",
                        ]}
                        labelStyle={{ fontWeight: 600, marginBottom: 4 }}
                      />
                      <Bar
                        dataKey="purchase"
                        fill="#3B82F6"
                        radius={[4, 4, 0, 0]}
                        name="purchase"
                        maxBarSize={32}
                      />
                      <Bar
                        dataKey="sales"
                        fill="#22C55E"
                        radius={[4, 4, 0, 0]}
                        name="sales"
                        maxBarSize={32}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>

          {/* Overall Information */}
          <div className="col-span-4">
            <div className="border border-[#e6eaed] rounded-lg h-full">
              <div className="p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Info className="h-5 w-5 text-gray-500" />
                  <h3 className="text-base font-semibold text-gray-900">
                    Overall Information
                  </h3>
                </div>

                {/* Three stat cards */}
                <div className="grid grid-cols-3 gap-3 mb-5">
                  {loading ? (
                    <>
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="text-center p-3 rounded-lg bg-gray-50">
                          <Skeleton className="h-8 w-8 mx-auto rounded-full" />
                          <Skeleton className="h-5 w-10 mx-auto mt-2" />
                          <Skeleton className="h-3 w-12 mx-auto mt-1" />
                        </div>
                      ))}
                    </>
                  ) : (
                    <>
                      <div className="text-center p-3 rounded-lg bg-gray-50">
                        <div className="w-8 h-8 mx-auto rounded-full bg-blue-100 flex items-center justify-center">
                          <Truck className="h-4 w-4 text-blue-600" />
                        </div>
                        <p className="text-lg font-bold text-gray-900 mt-1.5">
                          {data?.suppliersCount ?? 0}
                        </p>
                        <p className="text-xs text-gray-500">Suppliers</p>
                      </div>
                      <div className="text-center p-3 rounded-lg bg-gray-50">
                        <div className="w-8 h-8 mx-auto rounded-full bg-green-100 flex items-center justify-center">
                          <Users className="h-4 w-4 text-green-600" />
                        </div>
                        <p className="text-lg font-bold text-gray-900 mt-1.5">
                          {data?.customersCount ?? 0}
                        </p>
                        <p className="text-xs text-gray-500">Customers</p>
                      </div>
                      <div className="text-center p-3 rounded-lg bg-gray-50">
                        <div className="w-8 h-8 mx-auto rounded-full bg-purple-100 flex items-center justify-center">
                          <ClipboardList className="h-4 w-4 text-purple-600" />
                        </div>
                        <p className="text-lg font-bold text-gray-900 mt-1.5">
                          {data?.ordersCount ?? 0}
                        </p>
                        <p className="text-xs text-gray-500">Orders</p>
                      </div>
                    </>
                  )}
                </div>

                {/* Customer Overview */}
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold text-gray-900">
                    Customer Overview
                  </h4>
                  <div className="flex items-center gap-1 text-xs text-gray-500 border border-gray-200 rounded-md px-2 py-1">
                    <span>Today</span>
                    <ChevronDown className="h-3 w-3" />
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  {loading ? (
                    <Skeleton className="h-[100px] w-[100px] rounded-full" />
                  ) : (
                    <div className="shrink-0">
                      <ResponsiveContainer width={100} height={100}>
                        <RechartsPieChart>
                          <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={28}
                            outerRadius={44}
                            dataKey="value"
                            stroke="none"
                          >
                            {pieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                        </RechartsPieChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">
                        First Time Customers
                      </span>
                      {loading ? (
                        <Skeleton className="h-4 w-16" />
                      ) : (
                        <span className="text-sm font-semibold text-gray-900">
                          {data?.firstTimeCustomers ?? 0}
                        </span>
                      )}
                    </div>
                    {loading ? (
                      <Skeleton className="h-5 w-16" />
                    ) : (
                      <Badge
                        variant="outline"
                        className="text-xs font-medium text-blue-600 border-blue-200 bg-blue-50 mb-2"
                      >
                        +{data?.firstTimeCustomersPercent ?? 0}% Today
                      </Badge>
                    )}

                    <Separator />

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-xs text-gray-500">
                        Return Customers
                      </span>
                      {loading ? (
                        <Skeleton className="h-4 w-16" />
                      ) : (
                        <span className="text-sm font-semibold text-gray-900">
                          {data?.returnCustomers ?? 0}
                        </span>
                      )}
                    </div>
                    {loading ? (
                      <Skeleton className="h-5 w-16" />
                    ) : (
                      <Badge
                        variant="outline"
                        className="text-xs font-medium text-green-600 border-green-200 bg-green-50"
                      >
                        +{data?.returnCustomersPercent ?? 0}% Today
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Top Selling Products + Low Stock Products */}
        <div className="grid grid-cols-12 gap-6">
          {/* Top Selling Products */}
          <div className="col-span-4">
            <div className="border border-[#e6eaed] rounded-lg h-full">
              <div className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Box className="h-5 w-5 text-gray-500" />
                    <h3 className="text-base font-semibold text-gray-900">
                      Top Selling Products
                    </h3>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-500 border border-gray-200 rounded-md px-2 py-1">
                    <span>Today</span>
                    <ChevronDown className="h-3 w-3" />
                  </div>
                </div>

                <div className="space-y-0">
                  {loading
                    ? Array.from({ length: 5 }).map((_, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between py-3"
                        >
                          <div className="flex items-center gap-3">
                            <Skeleton className="w-12 h-12 rounded-lg" />
                            <div className="space-y-1.5">
                              <Skeleton className="h-4 w-28" />
                              <Skeleton className="h-3 w-20" />
                            </div>
                          </div>
                          <Skeleton className="h-5 w-14" />
                        </div>
                      ))
                    : topProducts.length > 0
                    ? topProducts.map((product, index) => (
                        <div key={product.productId}>
                          <div className="flex items-center justify-between py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center text-blue-700 font-bold text-sm shrink-0">
                                {product.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="text-sm font-bold text-gray-900">
                                  {product.name}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {formatCurrency(product.salePrice)}
                                  <span className="mx-1.5">&bull;</span>
                                  {product.salesCount} Sales
                                </p>
                              </div>
                            </div>
                            <Badge
                              variant="outline"
                              className="text-xs font-medium text-gray-600 border-gray-200"
                            >
                              #{index + 1}
                            </Badge>
                          </div>
                          {index < topProducts.length - 1 && (
                            <Separator />
                          )}
                        </div>
                      ))
                    : (
                      <p className="text-sm text-gray-400 py-8 text-center">
                        No products found
                      </p>
                    )}
                </div>
              </div>
            </div>
          </div>

          {/* Low Stock Products */}
          <div className="col-span-4">
            <div className="border border-[#e6eaed] rounded-lg h-full">
              <div className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-gray-500" />
                    <h3 className="text-base font-semibold text-gray-900">
                      Low Stock Products
                    </h3>
                  </div>
                  <Link
                    href="/products"
                    className="text-xs font-medium text-blue-600 hover:text-blue-700"
                  >
                    View All
                  </Link>
                </div>

                <div className="space-y-0">
                  {loading
                    ? Array.from({ length: 5 }).map((_, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between py-3"
                        >
                          <div className="flex items-center gap-3">
                            <Skeleton className="w-12 h-12 rounded-lg" />
                            <div className="space-y-1.5">
                              <Skeleton className="h-4 w-28" />
                              <Skeleton className="h-3 w-16" />
                            </div>
                          </div>
                          <div className="text-right space-y-1">
                            <Skeleton className="h-3 w-16" />
                            <Skeleton className="h-4 w-8 ml-auto" />
                          </div>
                        </div>
                      ))
                    : lowStockProducts.length > 0
                    ? lowStockProducts.map((product) => (
                        <div
                          key={product.productId}
                          className="flex items-center justify-between py-3"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-red-100 to-red-200 flex items-center justify-center text-red-700 font-bold text-sm shrink-0">
                              {product.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-gray-900">
                                {product.name}
                              </p>
                              <p className="text-xs text-gray-400">
                                SKU: {product.sku}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-medium text-red-500">
                              Low Stock
                            </p>
                            <p className="text-sm font-bold text-gray-900">
                              {product.stockQuantity}
                            </p>
                          </div>
                        </div>
                      ))
                    : (
                      <p className="text-sm text-gray-400 py-8 text-center">
                        No low stock items
                      </p>
                    )}
                </div>
              </div>
            </div>
          </div>

          {/* Empty spacer to match layout */}
          <div className="col-span-4" />
        </div>

        {/* Footer */}
        <div className="py-4 border-t border-gray-200">
          <p className="text-xs text-gray-400 text-center">
            &copy; {new Date().getFullYear()} OmniBlox. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
