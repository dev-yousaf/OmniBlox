"use client";

import { MapPin } from "lucide-react";
import { Separator } from "@/components/ui/separator";

const CUSTOMERS = [
  { name: "Carlos Curran", location: "USA", orders: 24, amount: "$8965" },
  { name: "Stan Gaunter", location: "UAE", orders: 22, amount: "$6985" },
  { name: "Richard Wilson", location: "Germany", orders: 14, amount: "$5366" },
  { name: "Mary Bronson", location: "Belgium", orders: 8, amount: "$4569" },
  { name: "Annie Tremblay", location: "Greenland", orders: 14, amount: "$35,698" },
];

const AVATAR_COLORS = [
  "from-blue-100 to-blue-200 dark:from-blue-800 dark:to-blue-900",
  "from-green-100 to-green-200 dark:from-green-800 dark:to-green-900",
  "from-purple-100 to-purple-200 dark:from-purple-800 dark:to-purple-900",
  "from-pink-100 to-pink-200 dark:from-pink-800 dark:to-pink-900",
  "from-amber-100 to-amber-200 dark:from-amber-800 dark:to-amber-900",
];

export function TopCustomers() {
  return (
    <div className="border border-border rounded-lg h-full">
      <div className="border-b border-border px-5 py-[15px] flex items-center gap-2">
        <div className="bg-[#fcefea] dark:bg-[#3d2a20] rounded-lg p-2">
          <MapPin className="h-4 w-4 text-[#e04f16]" />
        </div>
        <h3 className="text-lg font-bold text-card-foreground flex-1">
          Top Customers
        </h3>
        <span className="text-[13px] font-medium text-card-foreground underline cursor-pointer">
          View All
        </span>
      </div>
      <div className="p-5 space-y-0">
        {CUSTOMERS.map((c, i) => (
          <div key={c.name}>
            <div className="flex items-center justify-between py-3">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div className={`w-12 h-12 rounded-[10px] bg-gradient-to-br ${AVATAR_COLORS[i]} flex items-center justify-center text-gray-700 dark:text-gray-300 font-bold text-sm shrink-0`}>
                  {c.name.charAt(0)}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-card-foreground truncate">
                    {c.name}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <MapPin className="h-3 w-3 text-muted-foreground" />
                    <span className="text-[13px] text-muted-foreground">{c.location}</span>
                    <span className="bg-[#e04f16] rounded-full w-1 h-1" />
                    <span className="text-[13px] text-muted-foreground">{c.orders} Orders</span>
                  </div>
                </div>
              </div>
              <span className="text-base font-bold text-card-foreground shrink-0 ml-2">{c.amount}</span>
            </div>
            {i < CUSTOMERS.length - 1 && <Separator />}
          </div>
        ))}
      </div>
    </div>
  );
}
