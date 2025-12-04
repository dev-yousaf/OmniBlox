"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

const data = [
  { category: "Electronics", stock: 450, reorder: 150 },
  { category: "Accessories", stock: 380, reorder: 120 },
  { category: "Furniture", stock: 220, reorder: 80 },
  { category: "Office", stock: 310, reorder: 100 },
  { category: "Hardware", stock: 180, reorder: 60 },
]

export function StockOverviewChart() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Stock Overview by Category</CardTitle>
        <CardDescription>Current stock levels vs reorder points</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={{
            stock: {
              label: "Current Stock",
              color: "hsl(var(--chart-1))",
            },
            reorder: {
              label: "Reorder Level",
              color: "hsl(var(--chart-2))",
            },
          }}
          className="h-[300px]"
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="category" className="text-xs" />
              <YAxis className="text-xs" />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="stock" fill="var(--color-stock)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="reorder" fill="var(--color-reorder)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
