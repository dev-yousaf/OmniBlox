"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useWorkspace } from "@/hooks/use-workspace"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Upload, Download, FileText } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function ImportPurchasesPage() {
  const router = useRouter()
  const ws = useWorkspace()
  const [file, setFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)

  const handleImport = async () => {
    if (!file) return
    setImporting(true)
    // Simulate import
    setTimeout(() => {
      setImporting(false)
      router.push(`/${ws}/purchases`)
    }, 2000)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Import Purchases</h1>
          <p className="text-muted-foreground">Upload CSV file to import multiple purchases</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upload CSV File</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <FileText className="h-4 w-4" />
            <AlertDescription>
              Download the sample CSV template to see the required format. Make sure your file includes all required
              columns.
            </AlertDescription>
          </Alert>

          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => {}}>
              <Download className="h-4 w-4 mr-2" />
              Download Sample CSV
            </Button>
          </div>

          <div className="border-2 border-dashed rounded-lg p-12 text-center">
            <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <div className="space-y-2">
              <p className="text-sm font-medium">Drop your CSV file here or click to browse</p>
              <p className="text-xs text-muted-foreground">Maximum file size: 10MB</p>
            </div>
            <input
              type="file"
              accept=".csv"
              className="hidden"
              id="csv-upload"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
            <label htmlFor="csv-upload">
              <Button variant="outline" className="mt-4 bg-transparent" asChild>
                <span>Select File</span>
              </Button>
            </label>
          </div>

          {file && (
            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="h-8 w-8 text-primary" />
                  <div>
                    <p className="font-medium">{file.name}</p>
                    <p className="text-sm text-muted-foreground">{(file.size / 1024).toFixed(2)} KB</p>
                  </div>
                </div>
                <Button variant="ghost" onClick={() => setFile(null)}>
                  Remove
                </Button>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-4">
            <Button variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button onClick={handleImport} disabled={!file || importing}>
              {importing ? "Importing..." : "Import Purchases"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
