"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { DashboardData, UserProfile } from "@/components/dashboard/types";
import { WelcomeHeader } from "@/components/dashboard/welcome-header";
import { NotificationBar } from "@/components/dashboard/notification-bar";
import { SummaryCards } from "@/components/dashboard/summary-cards";
import { FinancialCards } from "@/components/dashboard/financial-cards";
import { SalesPurchaseChart } from "@/components/dashboard/sales-purchase-chart";
import { OverallInfo } from "@/components/dashboard/overall-info";
import { TopSellingProducts } from "@/components/dashboard/top-selling-products";
import { LowStockProducts } from "@/components/dashboard/low-stock-products";
import { RecentSales } from "@/components/dashboard/recent-sales";
import { SalesStatistics } from "@/components/dashboard/sales-statistics";
import { RecentTransactions } from "@/components/dashboard/recent-transactions";


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

  const summaryAmounts = [
    data?.totalSales ?? 0,
    data?.totalSalesReturn ?? 0,
    data?.totalPurchase ?? 0,
    data?.totalPurchaseReturn ?? 0,
  ];

  const summaryChanges = [
    data?.salesChange ?? 0,
    data?.salesReturnChange ?? 0,
    data?.purchaseChange ?? 0,
    data?.purchaseReturnChange ?? 0,
  ];

  const financialAmounts = [
    data?.profit ?? 0,
    data?.invoiceDue ?? 0,
    data?.totalExpenses ?? 0,
    data?.totalPaymentReturns ?? 0,
  ];

  const financialChanges = [
    data?.profitChange ?? 0,
    data?.invoiceDueChange ?? 0,
    data?.expensesChange ?? 0,
    data?.paymentReturnsChange ?? 0,
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-[1440px] mx-auto flex flex-col gap-6">
        <WelcomeHeader user={user} ordersCount={data?.ordersCount} period={period} onPeriodChange={setPeriod} loading={loading} />
        <NotificationBar visible={notificationVisible} onDismiss={() => setNotificationVisible(false)} lowStockProducts={data?.lowStockProducts ?? []} />
        <SummaryCards amounts={summaryAmounts} changes={summaryChanges} loading={loading} />
        <FinancialCards amounts={financialAmounts} changes={financialChanges} loading={loading} />

        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-8">
            <SalesPurchaseChart />
          </div>
          <div className="col-span-4">
            <OverallInfo
              suppliersCount={data?.suppliersCount ?? 0}
              customersCount={data?.customersCount ?? 0}
              ordersCount={data?.ordersCount ?? 0}
              firstTimeCustomers={data?.firstTimeCustomers ?? 0}
              firstTimeCustomersPercent={data?.firstTimeCustomersPercent ?? 0}
              returnCustomers={data?.returnCustomers ?? 0}
              returnCustomersPercent={data?.returnCustomersPercent ?? 0}
              loading={loading}
            />
          </div>
        </div>

        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-4">
            <TopSellingProducts />
          </div>
          <div className="col-span-4">
            <LowStockProducts products={data?.lowStockProducts ?? []} loading={loading} />
          </div>
          <div className="col-span-4">
            <RecentSales />
          </div>
        </div>

        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-7">
            <SalesStatistics />
          </div>
          <div className="col-span-5">
            <RecentTransactions sales={data?.recentSales} loading={loading} />
          </div>
        </div>

        <div className="py-4 border-t border-border">
          <p className="text-xs text-muted-foreground text-center">
            &copy; {new Date().getFullYear()} OmniBlox. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
