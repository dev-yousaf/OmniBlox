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
  const [notificationVisible, setNotificationVisible] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<SuperadminData>("/superadmin/dashboard");
      setData(res);
    } catch (err) {
      console.warn("Failed to load superadmin data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-[1440px] mx-auto flex flex-col gap-6">
        <SuperadminWelcomeHeader adminName={data?.adminName ?? "Super Admin"} loading={loading} />
        <SuperadminNotificationBar
          newCompaniesToday={data?.newCompaniesToday ?? 0}
          visible={notificationVisible}
          onDismiss={() => setNotificationVisible(false)}
        />
        <SuperadminStatCards
          totalCompanies={data?.totalCompanies ?? 0}
          companiesChange={data?.companiesChange ?? 0}
          activeCompanies={data?.activeCompanies ?? 0}
          activeCompaniesChange={data?.activeCompaniesChange ?? 0}
          totalSubscribers={data?.totalSubscribers ?? 0}
          subscribersChange={data?.subscribersChange ?? 0}
          totalEarnings={data?.totalEarnings ?? 0}
          earningsChange={data?.earningsChange ?? 0}
          loading={loading}
        />

        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-3">
            <CompaniesChart
              data={data?.companiesChart ?? []}
              change={data?.companiesChartChange ?? 0}
              changeText={data?.companiesChartChangeText ?? ""}
              loading={loading}
            />
          </div>
          <div className="col-span-6">
            <RevenueCard
              chartData={data?.revenueChart ?? []}
              amount={data?.revenueAmount ?? 0}
              change={data?.revenueChange ?? 0}
              changeText={data?.revenueChangeText ?? ""}
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
