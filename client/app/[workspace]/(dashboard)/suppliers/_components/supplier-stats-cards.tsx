"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, UserCheck, DollarSign, ShoppingCart } from "lucide-react"
import type { SupplierStatsCardsProps } from "../_types"

export function SupplierStatsCards({ stats }: SupplierStatsCardsProps) {
  const cards = [
    {
      title: "Total Suppliers",
      value: stats.totalSuppliers.toString(),
      icon: Users,
      description: "All registered suppliers",
    },
    {
      title: "Active Suppliers",
      value: stats.activeSuppliers.toString(),
      icon: UserCheck,
      description: "Currently active",
    },
    {
      title: "Total Balance",
      value: `$${stats.totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: DollarSign,
      description: "Outstanding payables",
    },
    {
      title: "Total Purchases",
      value: `$${stats.totalPurchases.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: ShoppingCart,
      description: "All-time purchases",
    },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card, index) => {
        const Icon = card.icon
        return (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {card.title}
              </CardTitle>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
              <p className="text-xs text-muted-foreground">
                {card.description}
              </p>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
