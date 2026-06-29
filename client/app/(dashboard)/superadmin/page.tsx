"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { SuperadminData } from "@/components/dashboard/superadmin/types";
import { SuperadminWelcomeHeader } from "@/components/dashboard/superadmin/welcome-header";
import { SuperadminNotificationBar } from "@/components/dashboard/superadmin/notification-bar";
import { SuperadminStatCards } from "@/components/dashboard/superadmin/stat-cards";
import { CompaniesChart } from "@/components/dashboard/superadmin/companies-chart";
import { RevenueCard } from "@/components/dashboard/superadmin/revenue-card";
import { PlansSection } from "@/components/dashboard/superadmin/plans-section";
import { RecentTransactions } from "@/components/dashboard/superadmin/recent-transactions";
import { TopCompanies } from "@/components/dashboard/superadmin/top-companies";
import { ExpiringSubscriptions } from "@/components/dashboard/superadmin/expiring-subscriptions";

export default function SuperadminPage() {
  const [data, setData] = useState<SuperadminData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("1Y");
  const [notificationVisible, setNotificationVisible] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<SuperadminData>(`/superadmin/dashboard?period=${period}`);
      setData(res);
    } catch (err) {
      console.warn("Failed to load superadmin data:", err);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-[1440px] mx-auto flex flex-col gap-6">
        <SuperadminWelcomeHeader
          adminName={data?.adminName ?? "Super Admin"}
          storeName={data?.storeName ?? "My Store"}
          totalUsers={data?.totalSubscribers}
          period={period}
          onPeriodChange={setPeriod}
          loading={loading}
        />
        <SuperadminNotificationBar
          newCompaniesToday={data?.newCompaniesToday ?? 0}
          lowStockCount={data?.expiringSubscriptions?.length ?? 0}
          visible={notificationVisible}
          onDismiss={() => setNotificationVisible(false)}
        />
        <SuperadminStatCards
          totalSales={data?.totalEarnings ?? 0}
          salesChange={data?.earningsChange ?? 0}
          teamMembers={data?.activeCompanies ?? 0}
          teamChange={data?.activeCompaniesChange ?? 0}
          totalProducts={data?.totalSubscribers ?? 0}
          productsChange={data?.subscribersChange ?? 0}
          inventoryValue={data?.inventoryValue ?? 0}
          inventoryChange={data?.inventoryChange ?? 0}
          loading={loading}
        />

        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-3">
            <CompaniesChart
              data={data?.companiesChart ?? []}
              change={data?.companiesChartChange ?? 0}
              changeText={data?.companiesChartChangeText ?? ""}
              period={period}
              onPeriodChange={setPeriod}
              loading={loading}
            />
          </div>
          <div className="col-span-6">
            <RevenueCard
              chartData={data?.revenueChart ?? []}
              amount={data?.revenueAmount ?? 0}
              change={data?.revenueChange ?? 0}
              changeText={data?.revenueChangeText ?? ""}
              period={period}
              onPeriodChange={setPeriod}
              loading={loading}
            />
          </div>
          <div className="col-span-3">
            <PlansSection data={data?.plansDistribution ?? []} loading={loading} />
          </div>
        </div>

        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-4">
            <RecentTransactions data={data?.recentTransactions ?? []} loading={loading} />
          </div>
          <div className="col-span-4">
            <TopCompanies data={data?.topCompanies ?? []} loading={loading} />
          </div>
          <div className="col-span-4">
            <ExpiringSubscriptions data={data?.expiringSubscriptions ?? []} loading={loading} />
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
