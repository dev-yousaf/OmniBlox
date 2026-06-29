"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { Warehouse, Package } from "lucide-react";
import type { TopCompanyItem } from "./types";

interface TopCompaniesProps {
  data: TopCompanyItem[];
  loading: boolean;
}

export function TopCompanies({ data, loading }: TopCompaniesProps) {
  if (loading) {
    return <Skeleton className="h-[379px] w-full rounded-[5px]" />;
  }

  return (
    <div className="border border-border rounded-[5px] flex flex-col h-full">
      <div className="bg-card border-b border-border flex items-center px-[20px] py-[15px] rounded-tl-[5px] rounded-tr-[5px]">
        <p className="flex-1 text-[16px] font-semibold text-[#212b36] dark:text-[#f1f3f4] leading-[24px]">
          Warehouse Stock
        </p>
      </div>
      <div className="bg-card flex-1 p-[20px] rounded-bl-[5px] rounded-br-[5px] drop-shadow-[0px_1px_0.5px_rgba(198,198,198,0.2)]">
        {data.length === 0 || (data.length === 1 && data[0].usersCount === 0) ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-[13px] text-[#646b72]">No warehouses</p>
          </div>
        ) : (
          <div className="flex flex-col gap-0">
            {data.map((w) => (
              <div key={w.id} className="flex items-center justify-between py-[10px] border-b border-border last:border-b-0">
                <div className="flex items-center gap-[8px]">
                  <div className="w-[36px] h-[36px] bg-[#f4f6f8] dark:bg-[#1e2a3a] rounded-full flex items-center justify-center">
                    <Warehouse className="h-4 w-4 text-[#646b72]" />
                  </div>
                  <div>
                    <p className="text-[13px] font-medium text-[#212b36] dark:text-[#f1f3f4] leading-[21px]">{w.name}</p>
                    <p className="text-[12px] text-[#646b72] leading-[20px]">Warehouse</p>
                  </div>
                </div>
                <div className="flex items-center gap-[4px]">
                  <Package className="h-3 w-3 text-[#646b72]" />
                  <span className="text-[13px] text-[#212b36] dark:text-[#f1f3f4] leading-[21px]">{w.usersCount} units</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}