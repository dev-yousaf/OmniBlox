import { Card, CardContent } from "@/components/ui/card"
import { Package, FileText, ShoppingCart, FileQuestion, RotateCcw, Users, Warehouse, BarChart3 } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"

const quickLinks = [
  { name: "New Product", href: "/products/new", icon: Package, color: "text-blue-500" },
  { name: "New Sale", href: "/sales/new", icon: FileText, color: "text-green-500" },
  { name: "New Purchase", href: "/purchases/new", icon: ShoppingCart, color: "text-purple-500" },
  { name: "New Quotation", href: "/quotations/new", icon: FileQuestion, color: "text-orange-500" },
  { name: "Stock Transfer", href: "/inventory/transfer", icon: Warehouse, color: "text-cyan-500" },
  { name: "Process Return", href: "/returns/new", icon: RotateCcw, color: "text-red-500" },
  { name: "Add Customer", href: "/people/customers/new", icon: Users, color: "text-pink-500" },
  { name: "View Reports", href: "/reports", icon: BarChart3, color: "text-indigo-500" },
]

export function QuickLinksGrid() {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {quickLinks.map((link) => {
            const Icon = link.icon
            return (
              <Link key={link.name} href={link.href}>
                <div className="flex flex-col items-center gap-2 rounded-lg border border-border p-4 transition-colors hover:bg-accent">
                  <Icon className={cn("h-6 w-6", link.color)} />
                  <span className="text-center text-sm font-medium">{link.name}</span>
                </div>
              </Link>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
