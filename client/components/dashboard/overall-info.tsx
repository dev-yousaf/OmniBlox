"use client";

import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from "recharts";
import { Info, Truck, Users, ClipboardList, ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

interface OverallInfoProps {
  suppliersCount: number;
  customersCount: number;
  ordersCount: number;
  firstTimeCustomers: number;
  firstTimeCustomersPercent: number;
  returnCustomers: number;
  returnCustomersPercent: number;
  loading: boolean;
}

const PIE_COLORS = ["#3B82F6", "#10B981"];

export function OverallInfo({
  suppliersCount,
  customersCount,
  ordersCount,
  firstTimeCustomers,
  firstTimeCustomersPercent,
  returnCustomers,
  returnCustomersPercent,
  loading,
}: OverallInfoProps) {
  const pieData = [
    { name: "First Time Customers", value: firstTimeCustomers, color: PIE_COLORS[0] },
    { name: "Return Customers", value: returnCustomers, color: PIE_COLORS[1] },
  ];

  return (
    <div className="border border-border rounded-lg h-full">
      <div className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <Info className="h-5 w-5 text-muted-foreground" />
          <h3 className="text-base font-semibold text-card-foreground">
            Overall Information
          </h3>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-5">
          {loading ? (
            <>
              {[1, 2, 3].map((i) => (
                <div key={i} className="text-center p-3 rounded-lg bg-muted">
                  <Skeleton className="h-8 w-8 mx-auto rounded-full" />
                  <Skeleton className="h-5 w-10 mx-auto mt-2" />
                  <Skeleton className="h-3 w-12 mx-auto mt-1" />
                </div>
              ))}
            </>
          ) : (
            <>
              <div className="text-center p-3 rounded-lg bg-muted">
                <div className="w-8 h-8 mx-auto rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                  <Truck className="h-4 w-4 text-blue-600 dark:text-blue-300" />
                </div>
                <p className="text-lg font-bold text-card-foreground mt-1.5">
                  {suppliersCount}
                </p>
                <p className="text-xs text-muted-foreground">Suppliers</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted">
                <div className="w-8 h-8 mx-auto rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                  <Users className="h-4 w-4 text-green-600 dark:text-green-300" />
                </div>
                <p className="text-lg font-bold text-card-foreground mt-1.5">
                  {customersCount}
                </p>
                <p className="text-xs text-muted-foreground">Customers</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted">
                <div className="w-8 h-8 mx-auto rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                  <ClipboardList className="h-4 w-4 text-purple-600 dark:text-purple-300" />
                </div>
                <p className="text-lg font-bold text-card-foreground mt-1.5">
                  {ordersCount}
                </p>
                <p className="text-xs text-muted-foreground">Orders</p>
              </div>
            </>
          )}
        </div>

        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-card-foreground">
            Customer Overview
          </h4>
          <div className="flex items-center gap-1 text-xs text-muted-foreground border border-border rounded-md px-2 py-1">
            <span>Today</span>
            <ChevronDown className="h-3 w-3" />
          </div>
        </div>

        <div className="flex items-start gap-3">
          {loading ? (
            <Skeleton className="h-[100px] w-[100px] rounded-full" />
          ) : (
            <div className="shrink-0">
              <ResponsiveContainer width={100} height={100}>
                <RechartsPieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={28}
                    outerRadius={44}
                    dataKey="value"
                    stroke="none"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                First Time Customers
              </span>
              {loading ? (
                <Skeleton className="h-4 w-16" />
              ) : (
                <span className="text-sm font-semibold text-card-foreground">
                  {firstTimeCustomers}
                </span>
              )}
            </div>
            {loading ? (
              <Skeleton className="h-5 w-16" />
            ) : (
              <Badge
                variant="outline"
                className="text-xs font-medium text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950 mb-2"
              >
                +{firstTimeCustomersPercent}% Today
              </Badge>
            )}

            <Separator />

            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-muted-foreground">
                Return Customers
              </span>
              {loading ? (
                <Skeleton className="h-4 w-16" />
              ) : (
                <span className="text-sm font-semibold text-card-foreground">
                  {returnCustomers}
                </span>
              )}
            </div>
            {loading ? (
              <Skeleton className="h-5 w-16" />
            ) : (
              <Badge
                variant="outline"
                className="text-xs font-medium text-green-600 dark:text-green-400 border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950"
              >
                +{returnCustomersPercent}% Today
              </Badge>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
