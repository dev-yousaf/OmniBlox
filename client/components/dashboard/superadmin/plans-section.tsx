"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import type { PlanDistributionItem } from "./types";

interface PlansSectionProps {
  data: PlanDistributionItem[];
  loading: boolean;
}

export function PlansSection({ data, loading }: PlansSectionProps) {
  if (loading) {
    return <Skeleton className="h-[323px] w-[267px] rounded-[5px]" />;
  }

  const total = data.reduce((s, d) => s + d.count, 0);

  return (
    <div className="border border-border rounded-[5px] flex flex-col h-full">
      <div className="bg-card border-b border-border flex items-center gap-[10px] px-[20px] py-[15px] rounded-tl-[5px] rounded-tr-[5px]">
        <p className="flex-1 text-[16px] font-semibold text-[#212b36] dark:text-[#f1f3f4] leading-[24px]">
          Users by Role
        </p>
      </div>
      <div className="bg-card flex-1 p-[20px] rounded-bl-[5px] rounded-br-[5px] drop-shadow-[0px_1px_0.5px_rgba(198,198,198,0.2)]">
        <div className="flex flex-col items-center gap-[16px] h-full">
          <div className="relative w-[137px] h-[137px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={total > 0 ? data : [{ name: 'No Data', count: 1, color: '#e6eaed' }]}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={60}
                  dataKey="count"
                  startAngle={90}
                  endAngle={-270}
                >
                  {(total > 0 ? data : [{ name: 'No Data', count: 1, color: '#e6eaed' }]).map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            {total > 0 && (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[12px] font-bold text-[#092c4c] dark:text-[#d1d5db]">{total}</span>
              </div>
            )}
          </div>
          <div className="w-full flex items-start justify-between">
            <div className="flex flex-col gap-1">
              {data.map((item) => (
                <div key={item.name} className="flex items-center gap-[4px]">
                  <div className="w-[10px] h-[10px] rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                  <span className="text-[13px] text-[#646b72] dark:text-[#a6b0c0] leading-[20px]">{item.name}</span>
                </div>
              ))}
            </div>
            <div className="flex flex-col gap-1 text-right">
              {data.map((item) => (
                <span key={item.name} className="text-[13px] text-[#212b36] dark:text-[#f1f3f4] leading-[20px]">
                  {item.count}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
