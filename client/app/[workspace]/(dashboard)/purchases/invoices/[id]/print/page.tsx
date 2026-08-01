"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { WorkspaceLink as Link } from "@/components/workspace-link";
import { ArrowLeft, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePurchasesApi, type PurchaseOrder } from "@/hooks/use-purchases-api";
import { useAuth } from "@/contexts/auth-context";
import { PageLoadingSkeleton } from "@/components/ui/page-loading-skeleton";
import { InvoiceDocument } from "@/components/invoices/invoice-template";

export default function PurchaseInvoicePrintPage() {
  const params = useParams<{ id: string }>();
  const { user } = useAuth();
  const { getById } = usePurchasesApi();

  const [purchase, setPurchase] = useState<PurchaseOrder | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!params?.id) return;
    getById(params.id)
      .then(setPurchase)
      .catch(() => setPurchase(null))
      .finally(() => setLoading(false));
  }, [params?.id, getById]);

  if (loading) return <PageLoadingSkeleton />;
  if (!purchase) return <div className="p-6 text-center text-muted-foreground">Invoice not found</div>;

  const handlePrint = () => window.print();

  const statusTone =
    purchase.paymentStatus === "PAID" ? "paid" : purchase.paymentStatus === "PARTIAL" ? "partial" : "pending";

  return (
    <>
      {/* Toolbar - hidden when printing */}
      <div className="no-print space-y-5">
        <div className="flex items-center gap-1 text-sm text-muted-foreground mb-0.5">
          <Link href="/dashboard" className="hover:text-foreground transition-colors">Dashboard</Link>
          <span className="mx-1">/</span>
          <Link href="/purchases" className="hover:text-foreground transition-colors">Purchases</Link>
          <span className="mx-1">/</span>
          <Link href={`/purchases/${purchase.id}`} className="hover:text-foreground transition-colors">{purchase.referenceNumber}</Link>
          <span className="mx-1">/</span>
          <span className="text-foreground">Invoice</span>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Link href={`/purchases/${purchase.id}`} className="flex items-center justify-center h-8 w-8 rounded-[5px] border hover:bg-accent transition-colors">
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <h1 className="text-[18px] font-bold text-foreground">Invoice Preview</h1>
              <p className="text-sm text-muted-foreground">{purchase.referenceNumber}</p>
            </div>
          </div>
          <Button size="sm" className="h-[34px] rounded-[5px] text-[13px]" onClick={handlePrint}>
            <Printer className="mr-1.5 h-3.5 w-3.5" /> Print
          </Button>
        </div>
      </div>

      <InvoiceDocument
        title="Purchase Invoice"
        documentNumber={purchase.referenceNumber}
        date={new Date(purchase.orderDate).toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" })}
        dueDate={purchase.dueDate ? new Date(purchase.dueDate).toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" }) : undefined}
        statusLabel={purchase.paymentStatus === "PAID" ? "Paid" : purchase.paymentStatus === "PARTIAL" ? "Partial" : "Pending"}
        statusTone={statusTone}
        company={{
          name: "OmniBlox",
          email: user?.email || undefined,
        }}
        partyLabel="Supplier"
        party={{
          name: purchase.supplier?.name || "N/A",
          email: purchase.supplier?.email,
        }}
        items={(purchase.items ?? []).map((item) => ({
          name: item.product?.name || item.productName || "Product",
          sku: item.product?.sku || item.productSku,
          quantity: item.quantity,
          price: item.unitCost || 0,
          total: item.total ?? (item.unitCost || 0) * item.quantity,
        }))}
        subtotal={purchase.subtotal ?? (purchase.items ?? []).reduce((s, i) => s + (i.unitCost || 0) * i.quantity, 0)}
        discount={0}
        tax={0}
        total={purchase.totalAmount || 0}
        amountPaid={purchase.totalAmount && purchase.paymentStatus === "PAID" ? purchase.totalAmount : undefined}
        footer="OmniBlox ERP — Thank you for your business!"
      />

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
