"use client";

import { useCurrencyFormatter } from "@/hooks/use-currency-formatter";

export interface InvoiceItem {
  name: string;
  sku?: string;
  quantity: number;
  price: number;
  total: number;
}

export interface InvoiceParty {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
}

export interface InvoiceCompany {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
}

export interface InvoiceDocumentProps {
  title: string;
  documentNumber: string;
  date: string;
  dateLabel?: string;
  dueDate?: string;
  dueLabel?: string;
  statusLabel?: string;
  statusTone?: "paid" | "pending" | "partial";
  company: InvoiceCompany;
  partyLabel: string;
  party: InvoiceParty;
  items: InvoiceItem[];
  subtotal: number;
  discount?: number;
  tax?: number;
  total: number;
  amountPaid?: number;
  balanceDue?: number;
  notes?: string;
  footer?: string;
}

export function InvoiceDocument({
  title,
  documentNumber,
  date,
  dateLabel = "Date",
  dueDate,
  dueLabel = "Due Date",
  statusLabel,
  statusTone = "pending",
  company,
  partyLabel,
  party,
  items,
  subtotal,
  discount = 0,
  tax = 0,
  total,
  amountPaid,
  balanceDue,
  notes,
  footer,
}: InvoiceDocumentProps) {
  const formatCurrency = useCurrencyFormatter();

  const statusColor =
    statusTone === "paid"
      ? "text-emerald-700 bg-emerald-50 border-emerald-200"
      : statusTone === "partial"
        ? "text-blue-700 bg-blue-50 border-blue-200"
        : "text-amber-700 bg-amber-50 border-amber-200";

  return (
    <div
      className="my-6 mx-auto max-w-[210mm] w-full bg-white shadow-sm border rounded-[5px] p-4 sm:p-8 print:shadow-none print:border-0 print:rounded-none print:p-0"
      style={{ fontFamily: "Arial, Helvetica, sans-serif" }}
    >
      {/* Header */}
      <div className="flex justify-between items-start border-b pb-6 mb-6">
        <div>
          <h1
            className="text-2xl font-bold text-gray-900 uppercase tracking-wide"
            style={{ fontSize: "26px" }}
          >
            {title}
          </h1>
          <p className="text-sm text-gray-500 mt-1">#{documentNumber}</p>
        </div>
        <div className="text-right">
          <p className="font-bold text-gray-900" style={{ fontSize: "18px" }}>
            {company.name || "OmniBlox"}
          </p>
          {company.address && (
            <p className="text-sm text-gray-500 whitespace-pre-line">{company.address}</p>
          )}
          {company.phone && <p className="text-sm text-gray-500">{company.phone}</p>}
          {company.email && <p className="text-sm text-gray-500">{company.email}</p>}
        </div>
      </div>

      {/* Meta + Party */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-8 mb-8">
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
            {partyLabel}
          </p>
          <p className="font-medium text-gray-900">{party.name || "N/A"}</p>
          {party.email && <p className="text-sm text-gray-500">{party.email}</p>}
          {party.phone && <p className="text-sm text-gray-500">{party.phone}</p>}
          {party.address && (
            <p className="text-sm text-gray-500 whitespace-pre-line">{party.address}</p>
          )}
        </div>
        <div className="sm:col-span-2 sm:text-right">
          <div className="space-y-1 sm:ml-auto sm:max-w-[240px]">
            <div className="flex justify-between gap-6 text-sm">
              <span className="text-gray-500">{dateLabel}:</span>
              <span className="font-medium text-gray-900">{date}</span>
            </div>
            {dueDate && (
              <div className="flex justify-between gap-6 text-sm">
                <span className="text-gray-500">{dueLabel}:</span>
                <span className="font-medium text-gray-900">{dueDate}</span>
              </div>
            )}
            {statusLabel && (
              <div className="flex justify-end">
                <span
                  className={`inline-block px-2.5 py-0.5 rounded border text-xs font-semibold ${statusColor}`}
                >
                  {statusLabel}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Items Table */}
      <div className="overflow-x-auto">
        <table className="w-full mb-6" style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr className="border-b border-gray-300 bg-gray-50">
              <th className="text-left py-2 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">#</th>
              <th className="text-left py-2 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Item</th>
              <th className="text-left py-2 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">SKU</th>
              <th className="text-center py-2 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Qty</th>
              <th className="text-right py-2 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Price</th>
              <th className="text-right py-2 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Total</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-6 text-center text-sm text-gray-400">
                  No items
                </td>
              </tr>
            ) : (
              items.map((item, idx) => (
                <tr key={idx} className="border-b border-gray-200">
                  <td className="py-3 px-2 text-sm text-gray-500">{idx + 1}</td>
                  <td className="py-3 px-2 text-sm font-medium text-gray-900">{item.name}</td>
                  <td className="py-3 px-2 text-sm text-gray-500">{item.sku || "—"}</td>
                  <td className="py-3 px-2 text-sm text-center text-gray-900">{item.quantity}</td>
                  <td className="py-3 px-2 text-sm text-right text-gray-900">{formatCurrency.format(item.price)}</td>
                  <td className="py-3 px-2 text-sm text-right font-medium text-gray-900">{formatCurrency.format(item.total)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Totals */}
      <div className="flex justify-end mb-8">
        <div className="w-72 space-y-2">
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
          {tax > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Tax</span>
              <span className="text-gray-900">{formatCurrency.format(tax)}</span>
            </div>
          )}
          <div className="flex justify-between border-t border-gray-300 pt-2">
            <span className="font-bold text-gray-900">Total</span>
            <span className="font-bold text-gray-900 text-lg">{formatCurrency.format(total)}</span>
          </div>
          {amountPaid != null && amountPaid > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Amount Paid</span>
              <span className="text-emerald-700 font-medium">-{formatCurrency.format(amountPaid)}</span>
            </div>
          )}
          {balanceDue != null && balanceDue > 0 && (
            <div className="flex justify-between border-t border-gray-200 pt-2">
              <span className="font-semibold text-gray-900">Balance Due</span>
              <span className="font-semibold text-red-600">{formatCurrency.format(balanceDue)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Notes + Footer */}
      {notes && (
        <div className="mb-6">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Notes</p>
          <p className="text-sm text-gray-600 whitespace-pre-line">{notes}</p>
        </div>
      )}
      {footer && (
        <div className="border-t pt-4 text-center text-xs text-gray-400">
          <p>{footer}</p>
        </div>
      )}
    </div>
  );
}
