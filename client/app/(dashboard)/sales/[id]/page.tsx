"use client";

import { useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Edit,
  Printer,
  Download,
  Mail,
  Loader2,
  CheckCircle2,
  RotateCcw,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";

import { useSaleDetail } from "../_hooks/use-sales";

export default function SaleDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const saleId = params?.id ?? "";

  const { sale, loading, updating, error, markAsPaid } = useSaleDetail(saleId);

  const formatCurrency = useMemo(
    () =>
      new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
      }),
    []
  );

  const statusBadge = useMemo(() => {
    if (!sale) return { label: "", variant: "secondary" as const };
    if (sale.paymentStatus === "PAID")
      return { label: "Paid", variant: "default" as const };
    if (sale.isOverdue)
      return { label: "Overdue", variant: "destructive" as const };
    if (sale.paymentStatus === "PARTIAL")
      return { label: "Partial", variant: "secondary" as const };
    return { label: "Pending", variant: "secondary" as const };
  }, [sale]);

  if (!saleId) {
    return <div className="p-6">Sale identifier is missing.</div>;
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Loading sale...</span>
        </div>
      </div>
    );
  }

  if (!sale) {
    return <div className="p-6">Sale not found.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/sales">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">
              {sale.invoiceNumber}
            </h1>
            <div className="flex items-center gap-2">
              <p className="text-sm text-muted-foreground">
                {sale.customerName}
              </p>
              {sale.hasReturns && (
                <Badge
                  variant="outline"
                  className="text-orange-600 border-orange-600"
                >
                  <RotateCcw className="mr-1 h-3 w-3" />
                  Has Returns
                </Badge>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-2 bg-transparent"
            disabled={!sale.customerEmail}
          >
            <Mail className="h-4 w-4" />
            Email
          </Button>
          <Button variant="outline" size="sm" className="gap-2 bg-transparent">
            <Download className="h-4 w-4" />
            Download
          </Button>
          <Button variant="outline" size="sm" className="gap-2 bg-transparent">
            <Printer className="h-4 w-4" />
            Print
          </Button>
          <Link href={`/sales/${sale.id}/edit`}>
            <Button size="sm" className="gap-2">
              <Edit className="h-4 w-4" />
              Edit
            </Button>
          </Link>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Invoice Details</CardTitle>
                <CardDescription>Complete invoice information</CardDescription>
              </div>
              <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Invoice Number
                </p>
                <p className="text-sm font-mono">{sale.invoiceNumber}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Customer
                </p>
                <p className="text-sm font-medium">{sale.customerName}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Customer Email
                </p>
                <p className="text-sm font-medium">
                  {sale.customerEmail ? (
                    <a
                      href={`mailto:${sale.customerEmail}`}
                      className="underline"
                    >
                      {sale.customerEmail}
                    </a>
                  ) : (
                    "—"
                  )}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Invoice Date
                </p>
                <p className="text-sm">
                  {new Date(sale.saleDate).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Due Date
                </p>
                <p className="text-sm">
                  {new Date(sale.dueDate).toLocaleDateString()}
                </p>
              </div>
            </div>

            <div>
              <h3 className="mb-4 font-semibold">Items</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead className="text-right">Returned</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sale.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">
                        {item.productName}
                      </TableCell>
                      <TableCell className="text-right">
                        {item.quantity}
                      </TableCell>
                      <TableCell className="text-right">
                        {item.returnedQuantity > 0 && (
                          <span className="text-orange-600 font-medium">
                            {item.returnedQuantity}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency.format(item.unitPrice)}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatCurrency.format(item.total)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="border-t border-border pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium">
                  {formatCurrency.format(sale.subtotal)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tax</span>
                <span className="font-medium">
                  {formatCurrency.format(sale.tax)}
                </span>
              </div>
              {sale.discount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Discount</span>
                  <span className="font-medium">
                    - {formatCurrency.format(sale.discount)}
                  </span>
                </div>
              )}
              <div className="flex justify-between border-t border-border pt-2">
                <span className="font-semibold">Total</span>
                <span className="text-2xl font-semibold">
                  {formatCurrency.format(sale.totalAmount)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Payment Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Status
                </p>
                <Badge variant={statusBadge.variant} className="mt-1">
                  {statusBadge.label}
                </Badge>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Amount Due
                </p>
                <p className="mt-1 text-2xl font-semibold">
                  {formatCurrency.format(
                    sale.paymentStatus === "PAID" ? 0 : sale.balanceDue
                  )}
                </p>
              </div>
              {sale.paymentStatus !== "PAID" && (
                <Button
                  className="w-full gap-2"
                  disabled={updating}
                  onClick={() =>
                    markAsPaid().catch(() => {
                      /* error handled by hook */
                    })
                  }
                >
                  {updating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Marking...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Mark as Paid</span>
                    </>
                  )}
                </Button>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Invoice Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Total Items
                </p>
                <p className="text-2xl font-semibold">{sale.items.length}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Total Units
                </p>
                <p className="text-2xl font-semibold">
                  {sale.items.reduce((sum, item) => sum + item.quantity, 0)}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
