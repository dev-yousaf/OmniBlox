import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown } from "lucide-react"

const bestSellers = [
  {
    rank: 1,
    product: "Wireless Mouse",
    sku: "PRD-001",
    category: "Electronics",
    unitsSold: 245,
    revenue: "$7,347.55",
    trend: "up" as const,
    change: "+15%",
  },
  {
    rank: 2,
    product: "Mechanical Keyboard",
    sku: "PRD-002",
    category: "Electronics",
    unitsSold: 189,
    revenue: "$16,998.11",
    trend: "up" as const,
    change: "+22%",
  },
  {
    rank: 3,
    product: "USB-C Cable",
    sku: "PRD-003",
    category: "Accessories",
    unitsSold: 567,
    revenue: "$7,365.33",
    trend: "up" as const,
    change: "+8%",
  },
  {
    rank: 4,
    product: "Laptop Stand",
    sku: "PRD-004",
    category: "Accessories",
    unitsSold: 134,
    revenue: "$6,698.66",
    trend: "down" as const,
    change: "-3%",
  },
  {
    rank: 5,
    product: "Webcam HD",
    sku: "PRD-005",
    category: "Electronics",
    unitsSold: 98,
    revenue: "$7,839.02",
    trend: "up" as const,
    change: "+12%",
  },
]

export function BestSellersTable() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Best Sellers This Month</CardTitle>
        <CardDescription>Top performing products ranked by revenue</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">Rank</TableHead>
              <TableHead>Product</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Units Sold</TableHead>
              <TableHead className="text-right">Revenue</TableHead>
              <TableHead className="text-right">Trend</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bestSellers.map((item) => {
              const TrendIcon = item.trend === "up" ? TrendingUp : TrendingDown
              return (
                <TableRow key={item.rank}>
                  <TableCell>
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                      {item.rank}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{item.product}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{item.sku}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{item.category}</Badge>
                  </TableCell>
                  <TableCell className="text-right">{item.unitsSold}</TableCell>
                  <TableCell className="text-right font-semibold">{item.revenue}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <TrendIcon className={`h-4 w-4 ${item.trend === "up" ? "text-success" : "text-destructive"}`} />
                      <span
                        className={`text-sm font-medium ${item.trend === "up" ? "text-success" : "text-destructive"}`}
                      >
                        {item.change}
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
