import { ArrowLeft, Upload, Download, FileSpreadsheet } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function ImportProductsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/products">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Import Products</h1>
          <p className="text-muted-foreground">Bulk upload products from CSV/Excel file</p>
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
                The template includes all required fields: Product Name, Code, Category, Cost, Price, Quantity, Unit,
                Warehouse, Tax Rate, Barcode
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
            <CardDescription>Select your CSV/Excel file to import products</CardDescription>
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

      <Card>
        <CardHeader>
          <CardTitle>Import Instructions</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
            <li>Download the CSV template using the button above</li>
            <li>Fill in your product data following the template format</li>
            <li>Ensure all required fields are filled (marked with *)</li>
            <li>Save your file as CSV or Excel format</li>
            <li>Upload the file using the upload button</li>
            <li>Review the import summary and confirm</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  )
}
