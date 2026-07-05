import { ArrowLeft, Upload, Download, FileSpreadsheet } from "lucide-react"
import { WorkspaceLink as Link } from "@/components/workspace-link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function ImportSalesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/sales">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Import Sales</h1>
          <p className="text-muted-foreground">Bulk upload sales from CSV/Excel file</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Download Template</CardTitle>
            <CardDescription>Download the CSV template with required columns</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <FileSpreadsheet className="h-4 w-4" />
              <AlertDescription>
                The template includes: Date, Customer, Products, Quantities, Prices, Tax, Payment Status
              </AlertDescription>
            </Alert>
            <Button variant="outline" className="w-full bg-transparent">
              <Download className="mr-2 h-4 w-4" />
              Download CSV Template
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Upload File</CardTitle>
            <CardDescription>Select your CSV/Excel file to import sales</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="file">Choose File</Label>
              <Input id="file" type="file" accept=".csv,.xlsx,.xls" />
            </div>
            <Button className="w-full">
              <Upload className="mr-2 h-4 w-4" />
              Upload & Import
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
