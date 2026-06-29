"use client";

import { useState } from "react";
import Link from "next/link";
import { Flag } from "lucide-react";
import type { RecentSale } from "./types";

const TABS = ["Sale", "Purchase", "Quotation", "Expenses", "Invoices"] as const;

const FALLBACK_TRANSACTIONS: RecentSale[] = [
  { id: "1", customerName: "Andrea Willer", productName: "Product A", categoryName: "Electronics", totalAmount: 4560, status: "Completed", saleDate: "24 May 2025" },
  { id: "2", customerName: "Timothy Sands", productName: "Product B", categoryName: "Sports", totalAmount: 3569, status: "Completed", saleDate: "23 May 2025" },
  { id: "3", customerName: "Bonnie Rodrigues", productName: "Product C", categoryName: "Lifestyle", totalAmount: 2659, status: "Draft", saleDate: "22 May 2025" },
  { id: "4", customerName: "Randy McCree", productName: "Product D", categoryName: "Electronics", totalAmount: 2155, status: "Completed", saleDate: "21 May 2025" },
];

const STATUS_STYLES: Record<string, string> = {
  Completed: "bg-[#3eb780]",
  Draft: "bg-[#dd2590]",
  Pending: "bg-[#fe9f43]",
};

interface RecentTransactionsProps {
  sales?: RecentSale[];
  loading?: boolean;
}

export function RecentTransactions({ sales, loading }: RecentTransactionsProps) {
  const [activeTab, setActiveTab] = useState("Sale");
  const list = sales && sales.length > 0 ? sales : FALLBACK_TRANSACTIONS;

  return (
    <div className="border border-border rounded-lg h-full">
      <div className="border-b border-border px-5 py-[15px] flex items-center gap-2">
        <div className="bg-[#ffeee9] dark:bg-[#3d2a20] rounded-lg p-2">
          <Flag className="h-4 w-4 text-[#e04f16]" />
        </div>
        <h3 className="text-lg font-bold text-card-foreground flex-1">
          Recent Transactions
        </h3>
        <Link href="/sales" className="text-[13px] font-medium text-card-foreground underline cursor-pointer">
          View All
        </Link>
      </div>

      <div className="border-b border-border">
        <div className="flex px-4 py-2.5 gap-2">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 text-center text-sm font-semibold py-0.5 transition-colors ${
                tab === activeTab ? "text-[#e04f16]" : "text-card-foreground"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-muted">
              <th className="text-left text-[13px] font-bold text-card-foreground px-4 py-2">Date</th>
              <th className="text-left text-[13px] font-bold text-card-foreground px-4 py-2">Customer</th>
              <th className="text-left text-[13px] font-bold text-card-foreground px-4 py-2">Status</th>
              <th className="text-left text-[13px] font-bold text-card-foreground px-4 py-2">Total</th>
            </tr>
          </thead>
          <tbody>
            {list.map((tx) => (
              <tr key={tx.id} className="border-b border-border last:border-b-0">
                <td className="text-sm text-muted-foreground px-4 py-3 whitespace-nowrap">
                  {tx.saleDate}
                </td>
                <td className="px-4 py-3">
                  <Link href={`/sales/${tx.id}`} className="flex items-center gap-2">
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 flex items-center justify-center text-gray-600 dark:text-gray-300 font-bold text-sm shrink-0">
                      {tx.customerName.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-card-foreground">{tx.customerName}</p>
                      <p className="text-[13px] text-[#e04f16]">#{tx.id}</p>
                    </div>
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center gap-1 ${STATUS_STYLES[tx.status] || "bg-gray-500"} text-white text-[10px] font-medium px-1.5 py-1 rounded-[5px]`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-white" />
                    {tx.status}
                  </span>
                </td>
                <td className="text-base font-bold text-card-foreground px-4 py-3">
                  ${tx.totalAmount.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
