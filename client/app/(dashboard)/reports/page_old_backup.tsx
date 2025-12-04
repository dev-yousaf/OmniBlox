"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"
import { TrendingUp, TrendingDown, DollarSign, Package, Users, Download } from "lucide-react"

const salesData = [
  { month: "Jan", sales: 45000, purchases: 32000, profit: 13000 },
  { month: "Feb", sales: 52000, purchases: 35000, profit: 17000 },
  { month: "Mar", sales: 48000, purchases: 33000, profit: 15000 },
  { month: "Apr", sales: 61000, purchases: 40000, profit: 21000 },
  { month: "May", sales: 55000, purchases: 38000, profit: 17000 },
  { month: "Jun", sales: 67000, purchases: 42000, profit: 25000 },
]

const categoryData = [
  { name: "Electronics", value: 45000, color: "#3b82f6" },
  { name: "Accessories", value: 28000, color: "#10b981" },
  { name: "Software", value: 18000, color: "#f59e0b" },
  { name: "Hardware", value: 32000, color: "#8b5cf6" },
]

const topProducts = [
  { name: 'Laptop Pro 15"', sales: 145, revenue: 217500, trend: "up" },
  { name: "Wireless Mouse", sales: 320, revenue: 9600, trend: "up" },
  { name: "Mechanical Keyboard", sales: 180, revenue: 18000, trend: "down" },
  { name: "USB-C Hub", sales: 250, revenue: 12500, trend: "up" },
  { name: "Monitor 27", sales: 95, revenue: 47500, trend: "up" },
]

const expiringProducts = [
  { name: "Product A", sku: "SKU-001", quantity: 50, expiryDate: "2024-02-15", daysLeft: 15 },
  { name: "Product B", sku: "SKU-002", quantity: 30, expiryDate: "2024-02-20", daysLeft: 20 },
  { name: "Product C", sku: "SKU-003", quantity: 75, expiryDate: "2024-02-25", daysLeft: 25 },
]

const staffPerformance = [
  { name: "John Smith", sales: 45, revenue: 125000, target: 100000, achievement: 125 },
  { name: "Sarah Johnson", sales: 38, revenue: 98000, target: 90000, achievement: 109 },
  { name: "Mike Wilson", sales: 32, revenue: 85000, target: 80000, achievement: 106 },
  { name: "Emily Davis", sales: 28, revenue: 72000, target: 75000, achievement: 96 },
]

export default function ReportsPage() {
  const [dateFrom, setDateFrom] = useState("2024-01-01")
  const [dateTo, setDateTo] = useState("2024-06-30")

  return (
    <div className="p-6 space-y-6">
      <div className="mb-6">
        <h1 className="text-3xl font-semibold tracking-tight">Reports</h1>
        <p className="text-sm text-muted-foreground">Comprehensive business analytics and insights</p>
      </div>
      
      <div className="flex items-center justify-between">
        <div></div>
        <Button className="gap-2">
          <Download className="h-4 w-4" />
          Export Report
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Date Range</CardTitle>
          <CardDescription>Select the period for your reports</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-4">
            <div className="flex-1 space-y-2">
              <Label htmlFor="date-from">From</Label>
              <Input id="date-from" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div className="flex-1 space-y-2">
              <Label htmlFor="date-to">To</Label>
              <Input id="date-to" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
            <Button>Apply Filter</Button>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="financial" className="space-y-6">
        <TabsList>
          <TabsTrigger value="financial">Financial</TabsTrigger>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="sales">Sales</TabsTrigger>
          <TabsTrigger value="staff">Staff</TabsTrigger>
          <TabsTrigger value="tax">Tax</TabsTrigger>
        </TabsList>

        <TabsContent value="financial" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Total Revenue</CardDescription>
                <CardTitle className="text-3xl">$328,000</CardTitle>
                <div className="flex items-center gap-1 text-sm text-emerald-600">
                  <TrendingUp className="h-4 w-4" />
                  <span>+12.5%</span>
                </div>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Total Expenses</CardDescription>
                <CardTitle className="text-3xl">$220,000</CardTitle>
                <div className="flex items-center gap-1 text-sm text-red-600">
                  <TrendingUp className="h-4 w-4" />
                  <span>+8.3%</span>
                </div>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Net Profit</CardDescription>
                <CardTitle className="text-3xl text-emerald-600">$108,000</CardTitle>
                <div className="flex items-center gap-1 text-sm text-emerald-600">
                  <TrendingUp className="h-4 w-4" />
                  <span>+18.2%</span>
                </div>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Profit Margin</CardDescription>
                <CardTitle className="text-3xl">32.9%</CardTitle>
                <div className="flex items-center gap-1 text-sm text-emerald-600">
                  <TrendingUp className="h-4 w-4" />
                  <span>+4.1%</span>
                </div>
              </CardHeader>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Profit & Loss Statement</CardTitle>
              <CardDescription>Monthly revenue, expenses, and profit trends</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={salesData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="sales" stroke="#3b82f6" strokeWidth={2} name="Sales" />
                  <Line type="monotone" dataKey="purchases" stroke="#f59e0b" strokeWidth={2} name="Purchases" />
                  <Line type="monotone" dataKey="profit" stroke="#10b981" strokeWidth={2} name="Profit" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Revenue by Category</CardTitle>
                <CardDescription>Sales distribution across product categories</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                      label
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Financial Summary</CardTitle>
                <CardDescription>Key financial metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                        <DollarSign className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Gross Revenue</div>
                        <div className="font-semibold">$328,000</div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center">
                        <DollarSign className="h-5 w-5 text-amber-600" />
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Operating Expenses</div>
                        <div className="font-semibold">$220,000</div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                        <DollarSign className="h-5 w-5 text-emerald-600" />
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Net Income</div>
                        <div className="font-semibold text-emerald-600">$108,000</div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                        <DollarSign className="h-5 w-5 text-purple-600" />
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">EBITDA</div>
                        <div className="font-semibold">$125,000</div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="inventory" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Total Products</CardDescription>
                <CardTitle className="text-3xl">1,245</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Stock Value</CardDescription>
                <CardTitle className="text-3xl">$485,000</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Low Stock Items</CardDescription>
                <CardTitle className="text-3xl text-amber-600">23</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Out of Stock</CardDescription>
                <CardTitle className="text-3xl text-red-600">5</CardTitle>
              </CardHeader>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Stock by Warehouse</CardTitle>
              <CardDescription>Inventory distribution across locations</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart
                  data={[
                    { warehouse: "Main", stock: 650, value: 285000 },
                    { warehouse: "Downtown", stock: 380, value: 145000 },
                    { warehouse: "Warehouse", stock: 215, value: 55000 },
                  ]}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="warehouse" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="stock" fill="#3b82f6" name="Units" />
                  <Bar dataKey="value" fill="#10b981" name="Value ($)" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Product Expiry Alerts</CardTitle>
              <CardDescription>Products expiring within 30 days</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {expiringProducts.map((product) => (
                  <div key={product.sku} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <div className="font-medium">{product.name}</div>
                      <div className="text-sm text-muted-foreground">SKU: {product.sku}</div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <div className="text-sm text-muted-foreground">Quantity</div>
                        <div className="font-medium">{product.quantity} units</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-muted-foreground">Expiry Date</div>
                        <div className="font-medium">{product.expiryDate}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-muted-foreground">Days Left</div>
                        <div className={`font-semibold ${product.daysLeft <= 15 ? "text-red-600" : "text-amber-600"}`}>
                          {product.daysLeft} days
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sales" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Total Sales</CardDescription>
                <CardTitle className="text-3xl">$328,000</CardTitle>
                <div className="flex items-center gap-1 text-sm text-emerald-600">
                  <TrendingUp className="h-4 w-4" />
                  <span>+12.5%</span>
                </div>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Orders</CardDescription>
                <CardTitle className="text-3xl">1,456</CardTitle>
                <div className="flex items-center gap-1 text-sm text-emerald-600">
                  <TrendingUp className="h-4 w-4" />
                  <span>+8.2%</span>
                </div>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Avg Order Value</CardDescription>
                <CardTitle className="text-3xl">$225</CardTitle>
                <div className="flex items-center gap-1 text-sm text-emerald-600">
                  <TrendingUp className="h-4 w-4" />
                  <span>+3.8%</span>
                </div>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Customers</CardDescription>
                <CardTitle className="text-3xl">342</CardTitle>
                <div className="flex items-center gap-1 text-sm text-emerald-600">
                  <TrendingUp className="h-4 w-4" />
                  <span>+15.3%</span>
                </div>
              </CardHeader>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Top Selling Products</CardTitle>
              <CardDescription>Best performing products by revenue</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {topProducts.map((product, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Package className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <div className="font-medium">{product.name}</div>
                        <div className="text-sm text-muted-foreground">{product.sales} units sold</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <div className="text-sm text-muted-foreground">Revenue</div>
                        <div className="font-semibold text-emerald-600">${product.revenue.toLocaleString()}</div>
                      </div>
                      <div
                        className={`flex items-center gap-1 ${product.trend === "up" ? "text-emerald-600" : "text-red-600"}`}
                      >
                        {product.trend === "up" ? (
                          <TrendingUp className="h-4 w-4" />
                        ) : (
                          <TrendingDown className="h-4 w-4" />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="staff" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Total Staff</CardDescription>
                <CardTitle className="text-3xl">24</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Active Staff</CardDescription>
                <CardTitle className="text-3xl text-emerald-600">22</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Avg Performance</CardDescription>
                <CardTitle className="text-3xl">109%</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Top Performer</CardDescription>
                <CardTitle className="text-xl">John Smith</CardTitle>
              </CardHeader>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Staff Performance</CardTitle>
              <CardDescription>Sales performance vs targets</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {staffPerformance.map((staff, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Users className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <div className="font-medium">{staff.name}</div>
                        <div className="text-sm text-muted-foreground">{staff.sales} sales</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <div className="text-sm text-muted-foreground">Revenue</div>
                        <div className="font-semibold">${staff.revenue.toLocaleString()}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-muted-foreground">Target</div>
                        <div className="font-medium">${staff.target.toLocaleString()}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-muted-foreground">Achievement</div>
                        <div
                          className={`font-semibold ${staff.achievement >= 100 ? "text-emerald-600" : "text-amber-600"}`}
                        >
                          {staff.achievement}%
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tax" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Total Tax Collected</CardDescription>
                <CardTitle className="text-3xl">$32,800</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Sales Tax</CardDescription>
                <CardTitle className="text-3xl">$28,500</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Purchase Tax</CardDescription>
                <CardTitle className="text-3xl">$4,300</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Tax Rate</CardDescription>
                <CardTitle className="text-3xl">10%</CardTitle>
              </CardHeader>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Monthly Tax Summary</CardTitle>
              <CardDescription>Tax collected and paid over time</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart
                  data={[
                    { month: "Jan", collected: 4500, paid: 3200 },
                    { month: "Feb", collected: 5200, paid: 3500 },
                    { month: "Mar", collected: 4800, paid: 3300 },
                    { month: "Apr", collected: 6100, paid: 4000 },
                    { month: "May", collected: 5500, paid: 3800 },
                    { month: "Jun", collected: 6700, paid: 4200 },
                  ]}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="collected" fill="#10b981" name="Tax Collected" />
                  <Bar dataKey="paid" fill="#f59e0b" name="Tax Paid" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
