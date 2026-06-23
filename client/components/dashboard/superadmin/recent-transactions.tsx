"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { Building } from "lucide-react";
import type { TransactionItem } from "./types";

interface RecentTransactionsProps {
  data: TransactionItem[];
  loading: boolean;
}

export function RecentTransactions({ data, loading }: RecentTransactionsProps) {
  if (loading) {
    return <Skeleton className="h-[379px] w-full rounded-[5px]" />;
  }

  return (
    <div className="border border-border rounded-[5px] flex flex-col h-full">
      <div className="bg-card border-b border-border flex items-center px-[20px] py-[15px] rounded-tl-[5px] rounded-tr-[5px]">
        <p className="flex-1 text-[16px] font-semibold text-[#212b36] dark:text-[#f1f3f4] leading-[24px]">
          Recent Transactions
        </p>
        <button className="text-[13px] text-[#fe9f43] leading-[20px] font-medium">View All</button>
      </div>
      <div className="bg-card flex-1 p-[20px] rounded-bl-[5px] rounded-br-[5px] drop-shadow-[0px_1px_0.5px_rgba(198,198,198,0.2)]">
        {data.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-[13px] text-[#646b72]">No recent transactions</p>
          </div>
        ) : (
          <div className="flex flex-col gap-0">
            {data.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between py-[10px] border-b border-border last:border-b-0">
                <div className="flex items-center gap-[8px]">
                  <div className="w-[36px] h-[36px] bg-[#f4f6f8] dark:bg-[#1e2a3a] rounded-full flex items-center justify-center">
                    <Building className="h-4 w-4 text-[#646b72]" />
                  </div>
                  <div>
                    <p className="text-[13px] font-medium text-[#212b36] dark:text-[#f1f3f4] leading-[21px]">{tx.companyName}</p>
                    <div className="flex items-center gap-[8px] text-[12px] text-[#646b72] leading-[20px]">
                      <span>{tx.transactionId}</span>
                      <span className="w-[3.86px] h-[3.86px] rounded-full bg-[#646b72]" />
                      <span>{tx.date}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[13px] font-medium text-[#212b36] dark:text-[#f1f3f4] leading-[21px]">${tx.amount.toFixed(2)}</p>
                  <p className="text-[12px] text-[#646b72] leading-[20px]">{tx.plan}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
