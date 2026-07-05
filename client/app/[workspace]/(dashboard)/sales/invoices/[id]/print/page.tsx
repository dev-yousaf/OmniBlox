"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { WorkspaceLink as Link } from "@/components/workspace-link";
import { ArrowLeft, Printer, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSalesApi, type Sale } from "@/hooks/use-sales-api";
import { useAuth } from "@/contexts/auth-context";
import { PageLoadingSkeleton } from "@/components/ui/page-loading-skeleton";

export default function PrintInvoicePage() {
  const params = useParams<{ id: string }>();
  const { user } = useAuth();
  const { getSale } = useSalesApi();

  const [sale, setSale] = useState<Sale | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!params?.id) return;
    getSale(params.id)
      .then(setSale)
      .catch(() => setSale(null))
      .finally(() => setLoading(false));
  }, [params?.id, getSale]);

  const formatCurrency = useMemo(
    () => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }),
    []
  );

  if (loading) return <PageLoadingSkeleton />;
  if (!sale) return <div className="p-6 text-center text-muted-foreground">Invoice not found</div>;

  const subtotal = sale.items.reduce((s, i) => s + (i.unitPrice || 0) * i.quantity, 0);
  const tax = sale.tax || subtotal * 0.1;
  const discount = sale.discount || 0;
  const total = sale.totalAmount || (subtotal + tax - discount);

  const handlePrint = () => window.print();

  return (
    <>
      {/* Toolbar - hidden when printing */}
      <div className="no-print space-y-5">
        <div className="flex items-center gap-1 text-sm text-muted-foreground mb-0.5">
          <Link href="/dashboard" className="hover:text-foreground transition-colors">Dashboard</Link>
          <span className="mx-1">/</span>
          <Link href="/sales/invoices" className="hover:text-foreground transition-colors">Invoices</Link>
          <span className="mx-1">/</span>
          <span className="text-foreground">Print</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/sales/invoices" className="flex items-center justify-center h-8 w-8 rounded-[5px] border hover:bg-accent transition-colors">
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <h1 className="text-[18px] font-bold text-foreground">Invoice Preview</h1>
              <p className="text-sm text-muted-foreground">{sale.invoiceNumber}</p>
            </div>
          </div>
          <Button size="sm" className="h-[34px] rounded-[5px] text-[13px]" onClick={handlePrint}>
            <Printer className="mr-1.5 h-3.5 w-3.5" /> Print
          </Button>
        </div>
      </div>

      {/* Invoice Document */}
      <div className="my-6 mx-auto max-w-[210mm] bg-white shadow-sm border rounded-[5px] p-8 print:shadow-none print:border-0 print:rounded-none print:p-0" style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>
        {/* Header */}
        <div className="flex justify-between items-start border-b pb-6 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900" style={{ fontSize: "24px" }}>INVOICE</h1>
            <p className="text-sm text-gray-500 mt-1">#{sale.invoiceNumber}</p>
          </div>
          <div className="text-right">
            <p className="font-bold text-gray-900">OmniBlox</p>
            <p className="text-sm text-gray-500">{user?.email || ""}</p>
          </div>
        </div>

        {/* Info */}
        <div className="grid grid-cols-2 gap-8 mb-8">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Bill To</p>
            <p className="font-medium text-gray-900">{sale.customerName || sale.customer?.name || "N/A"}</p>
            {sale.customer?.email && <p className="text-sm text-gray-500">{sale.customer.email}</p>}
          </div>
          <div className="text-right">
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Invoice Date:</span>
                <span className="font-medium text-gray-900">{new Date(sale.saleDate).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Due Date:</span>
                <span className="font-medium text-gray-900">{new Date(sale.dueDate).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Status:</span>
                <span className={`font-medium ${sale.paymentStatus === "PAID" ? "text-green-600" : "text-amber-600"}`}>
                  {sale.paymentStatus === "PAID" ? "Paid" : sale.paymentStatus === "PARTIAL" ? "Partial" : "Pending"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Items Table */}
        <table className="w-full mb-6" style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr className="border-b border-gray-300">
              <th className="text-left py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">#</th>
              <th className="text-left py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Product</th>
              <th className="text-center py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Qty</th>
              <th className="text-right py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Price</th>
              <th className="text-right py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Total</th>
            </tr>
          </thead>
          <tbody>
            {sale.items.map((item, idx) => {
              const itemTotal = (item.unitPrice || 0) * item.quantity;
              return (
                <tr key={item.id} className="border-b border-gray-200">
                  <td className="py-3 text-sm text-gray-500">{idx + 1}</td>
                  <td className="py-3 text-sm font-medium text-gray-900">{item.product?.name || "Product"}</td>
                  <td className="py-3 text-sm text-center text-gray-900">{item.quantity}</td>
                  <td className="py-3 text-sm text-right text-gray-900">{formatCurrency.format(item.unitPrice || 0)}</td>
                  <td className="py-3 text-sm text-right font-medium text-gray-900">{formatCurrency.format(itemTotal)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Totals */}
        <div className="flex justify-end mb-8">
          <div className="w-64 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Subtotal</span>
              <span className="text-gray-900">{formatCurrency.format(subtotal)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Discount</span>
                <span className="text-gray-900">-{formatCurrency.format(discount)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Tax</span>
              <span className="text-gray-900">{formatCurrency.format(tax)}</span>
            </div>
            <div className="flex justify-between border-t border-gray-300 pt-2">
              <span className="font-bold text-gray-900">Total</span>
              <span className="font-bold text-gray-900 text-lg">{formatCurrency.format(total)}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t pt-4 text-center text-xs text-gray-400">
          <p>OmniBlox ERP — Thank you for your business!</p>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          body { margin: 0; padding: 20px; background: white; }
          .no-print { display: none !important; }
          @page { margin: 20mm; size: A4; }
        }
      `}</style>
    </>
  );
}
