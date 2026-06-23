"use client";

import { Building2, Activity, Users, DollarSign } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCompactCurrency } from "./types";

interface StatCardsProps {
  totalCompanies: number;
  companiesChange: number;
  activeCompanies: number;
  activeCompaniesChange: number;
  totalSubscribers: number;
  subscribersChange: number;
  totalEarnings: number;
  earningsChange: number;
  loading: boolean;
}

function MiniChart({ color, heights }: { color: string; heights: number[] }) {
  const maxH = Math.max(...heights, 1);
  return (
    <div className="flex items-end gap-[4px] shrink-0">
      {heights.map((h, i) => (
        <div
          key={i}
          className="rounded-tl-[10px] rounded-tr-[10px] w-[3.924px]"
          style={{ height: `${(h / maxH) * 40}px`, backgroundColor: color }}
        />
      ))}
    </div>
  );
}

function Badge({ value, positive }: { value: number; positive: boolean }) {
  const color = positive ? "#3eb780" : "#e70d0d";
  const prefix = value > 0 ? "+" : "";
  return (
    <div
      className="flex items-center justify-center p-[6px] rounded-[5px] shrink-0"
      style={{ backgroundColor: color }}
    >
      <span className="text-[10px] font-medium text-white leading-[8px]">
        {prefix}{value.toFixed(1)}%
      </span>
    </div>
  );
}

const barSets: Record<string, number[]> = {
  companies: [21, 40, 28, 21, 40, 28, 21],
  active: [21, 10, 28, 21, 10, 38, 21],
  subscribers: [21, 28, 28, 21, 21, 28, 21],
  earnings: [21, 40, 28, 21, 40, 28, 21],
};

export function SuperadminStatCards({
  totalCompanies, companiesChange,
  activeCompanies, activeCompaniesChange,
  totalSubscribers, subscribersChange,
  totalEarnings, earningsChange,
  loading,
}: StatCardsProps) {
  const cards = [
    {
      label: "Total Companies",
      value: String(totalCompanies),
      change: companiesChange,
      icon: Building2,
      chartColor: "#fe9f43",
      bars: barSets.companies,
    },
    {
      label: "Active Companies",
      value: String(activeCompanies),
      change: activeCompaniesChange,
      icon: Activity,
      chartColor: "#6938ef",
      bars: barSets.active,
    },
    {
      label: "Total Subscribers",
      value: String(totalSubscribers),
      change: subscribersChange,
      icon: Users,
      chartColor: "#06aed4",
      bars: barSets.subscribers,
    },
    {
      label: "Total Earnings",
      value: formatCompactCurrency(totalEarnings),
      change: earningsChange,
      icon: DollarSign,
      chartColor: "#3eb780",
      bars: barSets.earnings,
    },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-card border border-border rounded-[5px] p-[20px]">
            <Skeleton className="h-[36px] w-[36px] rounded-[5px] mb-4" />
            <Skeleton className="h-6 w-16 mb-2" />
            <Skeleton className="h-4 w-24" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-4 gap-6">
      {cards.map((card) => {
        const Icon = card.icon;
        const isPositive = card.change >= 0;
        return (
          <div
            key={card.label}
            className="bg-card border border-border rounded-[5px] p-[20px] shadow-[0px_1px_1px_1px_rgba(198,198,198,0.2)]"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="bg-[#1b2850] flex items-center p-[10px] rounded-[5px]">
                <Icon className="h-4 w-4 text-white" />
              </div>
              <Badge value={card.change} positive={isPositive} />
            </div>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-[24px] font-bold text-[#212b36] dark:text-[#f1f3f4] leading-[36px]">
                  {card.value}
                </p>
                <p className="text-[13px] font-medium text-[#646b72] dark:text-[#a6b0c0] leading-[19.5px]">
                  {card.label}
                </p>
              </div>
              <MiniChart color={card.chartColor} heights={card.bars} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
