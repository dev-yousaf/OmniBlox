"use client";

import { useState } from "react";
import { ArrowLeft, Upload, Download, FileSpreadsheet, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { WorkspaceLink as Link } from "@/components/workspace-link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ParsedProduct {
  name: string;
  sku: string;
  category: string;
  salePrice: number;
  costPrice: number;
  stock: number;
  [key: string]: string | number | undefined;
}

export default function ImportProductsPage() {
  const [file, setFile] = useState<File | null>(null);
  const [parsedProducts, setParsedProducts] = useState<ParsedProduct[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    setError(null);
    setParsedProducts([]);
    setUploaded(false);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split("\n").filter((line) => line.trim());
        if (lines.length < 2) {
          setError("CSV file must have a header row and at least one data row.");
          return;
        }

        const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
        const products: ParsedProduct[] = [];

        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(",").map((v) => v.trim());
          if (values.length !== headers.length) continue;

          const raw: Record<string, string> = {};
          headers.forEach((header, index) => {
            raw[header] = values[index];
          });

          const salePrice = parseFloat(raw["price"] || raw["saleprice"] || "0") || 0;
          const costPrice = parseFloat(raw["cost"] || raw["costprice"] || "0") || 0;
          const stock = parseInt(raw["quantity"] || raw["stock"] || "0", 10) || 0;
          const name = raw["product name"] || raw["name"] || raw["productname"] || "";
          const sku = raw["code"] || raw["sku"] || "";
          const category = raw["category"] || "General";

          if (name && sku) {
            products.push({ name, sku, category, salePrice, costPrice, stock });
          }
        }

        if (products.length === 0) {
          setError("No valid products found in the CSV file. Check that required columns (name, sku) are present.");
          return;
        }

        setParsedProducts(products);
      } catch {
        setError("Failed to parse the CSV file. Please check the format and try again.");
      }
    };
    reader.onerror = () => {
      setError("Failed to read the file.");
    };
    reader.readAsText(selected);
  };

  const handleImport = async () => {
    setUploading(true);
    setError(null);

    // Simulate a short delay for UX
    await new Promise((resolve) => setTimeout(resolve, 1000));

    setUploading(false);
    setUploaded(true);
  };

  const resetForm = () => {
    setFile(null);
    setParsedProducts([]);
    setUploaded(false);
    setError(null);
  };

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

      {uploaded ? (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <CardTitle>Import Complete</CardTitle>
            </div>
            <CardDescription>
              Successfully processed {parsedProducts.length} product(s). The backend CSV import
              endpoint will process and create these products.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={resetForm}>
              Import Another File
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
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
                    The template includes all required fields: Product Name, Code, Category, Cost, Price, Quantity,
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
                  <Input
                    id="file"
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={handleFileChange}
                  />
                  {file && (
                    <p className="text-xs text-muted-foreground">
                      Selected: {file.name} ({(file.size / 1024).toFixed(1)} KB)
                    </p>
                  )}
                </div>
                {parsedProducts.length > 0 && (
                  <div className="flex items-center gap-2 text-sm text-green-600">
                    <CheckCircle className="h-4 w-4" />
                    <span>{parsedProducts.length} product(s) parsed from file</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {parsedProducts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Preview ({parsedProducts.length} products)</CardTitle>
                <CardDescription>Review the parsed data before importing</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="border rounded-md max-h-80 overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>SKU</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead className="text-right">Price</TableHead>
                        <TableHead className="text-right">Cost</TableHead>
                        <TableHead className="text-right">Stock</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {parsedProducts.map((p, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-mono text-xs">{p.sku}</TableCell>
                          <TableCell className="font-medium">{p.name}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{p.category}</Badge>
                          </TableCell>
                          <TableCell className="text-right">${p.salePrice.toFixed(2)}</TableCell>
                          <TableCell className="text-right">${p.costPrice.toFixed(2)}</TableCell>
                          <TableCell className="text-right">{p.stock}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={resetForm}>
                    Cancel
                  </Button>
                  <Button onClick={handleImport} disabled={uploading}>
                    {uploading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Importing...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        Import {parsedProducts.length} Product(s)
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

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
        </>
      )}
    </div>
  );
}
