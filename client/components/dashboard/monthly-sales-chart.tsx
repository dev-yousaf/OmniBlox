"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Line, LineChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

const data = [
  { month: "Jan", sales: 12500, profit: 4200 },
  { month: "Feb", sales: 15800, profit: 5300 },
  { month: "Mar", sales: 18200, profit: 6100 },
  { month: "Apr", sales: 16500, profit: 5500 },
  { month: "May", sales: 21000, profit: 7000 },
  { month: "Jun", sales: 24500, profit: 8200 },
]

export function MonthlySalesChart() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Monthly Sales & Profit</CardTitle>
        <CardDescription>Revenue and profit trends over the last 6 months</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={{
            sales: {
              label: "Sales",
              color: "hsl(var(--chart-1))",
            },
            profit: {
              label: "Profit",
              color: "hsl(var(--chart-3))",
            },
          }}
          className="h-[300px]"
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="month" className="text-xs" />
              <YAxis className="text-xs" />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line type="monotone" dataKey="sales" stroke="var(--color-sales)" strokeWidth={2} />
              <Line type="monotone" dataKey="profit" stroke="var(--color-profit)" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
