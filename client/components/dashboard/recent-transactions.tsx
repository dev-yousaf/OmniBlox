"use client";

import { useState } from "react";
import { Flag } from "lucide-react";

const TABS = ["Sale", "Purchase", "Quotation", "Expenses", "Invoices"] as const;

const TRANSACTIONS = [
  { date: "24 May 2025", customer: "Andrea Willer", id: "#114589", status: "Completed", total: "$4560" },
  { date: "23 May 2025", customer: "Timothy Sands", id: "#114589", status: "Completed", total: "$3569" },
  { date: "22 May 2025", customer: "Bonnie Rodrigues", id: "#114589", status: "Draft", total: "$2659" },
  { date: "21 May 2025", customer: "Randy McCree", id: "#114589", status: "Completed", total: "$2155" },
] as const;

const STATUS_STYLES: Record<string, string> = {
  Completed: "bg-[#3eb780]",
  Draft: "bg-[#dd2590]",
  Pending: "bg-[#fe9f43]",
};

export function RecentTransactions() {
  const [activeTab, setActiveTab] = useState("Sale");

  return (
    <div className="border border-border rounded-lg h-full">
      <div className="border-b border-border px-5 py-[15px] flex items-center gap-2">
        <div className="bg-[#ffeee9] dark:bg-[#3d2a20] rounded-lg p-2">
          <Flag className="h-4 w-4 text-[#e04f16]" />
        </div>
        <h3 className="text-lg font-bold text-card-foreground flex-1">
          Recent Transactions
        </h3>
        <span className="text-[13px] font-medium text-card-foreground underline cursor-pointer">
          View All
        </span>
      </div>

      <div className="border-b border-border">
        <div className="flex px-4 py-2.5 gap-2">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 text-center text-sm font-semibold py-0.5 transition-colors ${
                tab === activeTab
                  ? "text-[#e04f16]"
                  : "text-card-foreground"
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
            {TRANSACTIONS.map((tx) => (
              <tr key={tx.date + tx.customer} className="border-b border-border last:border-b-0">
                <td className="text-sm text-muted-foreground px-4 py-3 whitespace-nowrap">{tx.date}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 flex items-center justify-center text-gray-600 dark:text-gray-300 font-bold text-sm shrink-0">
                      {tx.customer.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-card-foreground">{tx.customer}</p>
                      <p className="text-[13px] text-[#e04f16]">{tx.id}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center gap-1 ${STATUS_STYLES[tx.status] || "bg-gray-500"} text-white text-[10px] font-medium px-1.5 py-1 rounded-[5px]`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-white" />
                    {tx.status}
                  </span>
                </td>
                <td className="text-base font-bold text-card-foreground px-4 py-3">{tx.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
