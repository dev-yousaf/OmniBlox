"use client";

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from "recharts";
import { ChevronDown, CalendarDays, Box } from "lucide-react";

const PIE_DATA = [
  { name: "Electronics", value: 24, color: "#3538cd", sales: 698 },
  { name: "Sports", value: 50, color: "#e04f16", sales: 545 },
  { name: "Lifestyles", value: 16, color: "#dd2590", sales: 456 },
];

export function TopCategories() {
  return (
    <div className="border border-border rounded-lg h-full">
      <div className="border-b border-border px-5 py-[15px] flex items-center gap-2">
        <div className="bg-[#fcebf5] dark:bg-[#3d1f32] rounded-lg p-2">
          <Box className="h-4 w-4 text-[#dd2590]" />
        </div>
        <h3 className="text-lg font-bold text-card-foreground flex-1">
          Top Categories
        </h3>
        <div className="flex items-center gap-1.5 border border-border rounded px-3 py-1.5">
          <CalendarDays className="h-3 w-3 text-card-foreground" />
          <span className="text-xs font-semibold text-card-foreground">Weekly</span>
          <ChevronDown className="h-3 w-3 text-card-foreground" />
        </div>
      </div>
      <div className="p-5 flex flex-col gap-4">
        <div className="flex items-start gap-5">
          <div className="shrink-0">
            <ResponsiveContainer width={165} height={165}>
              <PieChart>
                <Pie
                  data={PIE_DATA}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={82}
                  dataKey="value"
                  stroke="none"
                  startAngle={90}
                  endAngle={-270}
                >
                  {PIE_DATA.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex-1 space-y-3 min-w-0">
            {PIE_DATA.map((cat) => (
              <div key={cat.name}>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">{cat.name}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-base font-bold text-card-foreground">{cat.sales}</span>
                  <span className="text-sm text-muted-foreground">Sales</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="border border-border rounded-lg">
          <div className="border-b border-border px-4 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-sm bg-[#3538cd]" />
              <span className="text-sm text-muted-foreground">Total Number Of Categories</span>
            </div>
            <span className="text-base font-bold text-card-foreground">698</span>
          </div>
          <div className="px-4 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-sm bg-[#e04f16]" />
              <span className="text-sm text-muted-foreground">Total Number Of Products</span>
            </div>
            <span className="text-base font-bold text-card-foreground">7899</span>
          </div>
        </div>
      </div>
    </div>
  );
}
