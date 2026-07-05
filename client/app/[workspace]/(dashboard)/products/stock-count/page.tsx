import { ArrowLeft, Save, Plus } from "lucide-react"
import { WorkspaceLink as Link } from "@/components/workspace-link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export default function StockCountPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/products">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Stock Count</h1>
            <p className="text-muted-foreground">Physical inventory count tool</p>
          </div>
        </div>
        <Button>
          <Save className="mr-2 h-4 w-4" />
          Save Count
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Count Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="date">Count Date *</Label>
              <Input id="date" type="date" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="warehouse">Warehouse *</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select warehouse" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="main">Main Warehouse</SelectItem>
                  <SelectItem value="secondary">Secondary Warehouse</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reference">Reference</Label>
              <Input id="reference" placeholder="SC-001" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Count Items</CardTitle>
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Add Item
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>System Qty</TableHead>
                <TableHead>Counted Qty</TableHead>
                <TableHead>Difference</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>Wireless Mouse</TableCell>
                <TableCell>150</TableCell>
                <TableCell>
                  <Input type="number" defaultValue="148" className="w-24" />
                </TableCell>
                <TableCell className="text-red-600">-2</TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm">
                    Remove
                  </Button>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>USB Cable</TableCell>
                <TableCell>200</TableCell>
                <TableCell>
                  <Input type="number" defaultValue="205" className="w-24" />
                </TableCell>
                <TableCell className="text-green-600">+5</TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm">
                    Remove
                  </Button>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
