"use client";

import { useState, useMemo } from "react";
import { Search, Loader2, ChevronLeft, ChevronRight, Clock, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { QuotationsTabProps } from "./types";

const PAGE_SIZE = 10;

export function QuotationsTab({ quotations, quotationsLoading, quotationsError }: QuotationsTabProps) {
	const [search, setSearch] = useState("");
	const [page, setPage] = useState(1);

	const filtered = useMemo(() => {
		if (!search) return quotations;
		const q = search.toLowerCase();
		return quotations.filter(
			(s) =>
				s.referenceNumber?.toLowerCase().includes(q) ||
				s.customerName?.toLowerCase().includes(q)
		);
	}, [quotations, search]);

	const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
	const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

	const totalValue = quotations.reduce((sum, q) => sum + q.totalPrice, 0);
	const totalQty = quotations.reduce((sum, q) => sum + q.quantity, 0);

	useMemo(() => { if (page > totalPages) setPage(1); }, [page, totalPages]);

	return (
		<div role="tabpanel" id="panel-quotations" className="space-y-5">
			{/* Stats */}
			<div className="grid gap-4 md:grid-cols-3">
				<div className="border rounded-[5px] bg-card shadow-sm p-5">
					<p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Total Value</p>
					<p className="text-2xl font-bold">${totalValue.toFixed(2)}</p>
				</div>
				<div className="border rounded-[5px] bg-card shadow-sm p-5">
					<p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Total Quantity</p>
					<p className="text-2xl font-bold">{totalQty}</p>
				</div>
				<div className="border rounded-[5px] bg-card shadow-sm p-5">
					<p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Quotations</p>
					<p className="text-2xl font-bold">{quotations.length}</p>
				</div>
			</div>

			{/* Table Card */}
			<div className="border rounded-[5px] bg-card shadow-sm overflow-hidden">
				{/* Toolbar */}
				<div className="flex items-center gap-4 px-5 py-[15px] border-b">
					<div className="flex items-center gap-2 border rounded-[5px] px-2.5 py-1.5 w-[250px]">
						<Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
						<input
							className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground min-w-0"
							placeholder="Search by reference or customer..."
							value={search}
							onChange={(e) => { setSearch(e.target.value); setPage(1); }}
						/>
					</div>
				</div>

				{/* Body */}
				{quotationsLoading ? (
					<div className="flex justify-center py-12">
						<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
					</div>
				) : quotationsError ? (
					<div className="text-center py-12">
						<p className="text-sm text-destructive">{quotationsError}</p>
					</div>
				) : filtered.length === 0 ? (
					<div className="flex flex-col items-center py-12 text-muted-foreground">
						<Clock className="h-12 w-12 mb-3 text-muted-foreground/50" />
						<p className="font-medium">No quotations found</p>
					</div>
				) : (
					<>
						<div className="overflow-x-auto">
							<table className="w-full text-sm">
								<thead>
									<tr className="bg-muted h-[33px]">
										<th className="px-5 py-2 text-left font-semibold text-foreground">Date</th>
										<th className="px-5 py-2 text-left font-semibold text-foreground">Reference</th>
										<th className="px-5 py-2 text-left font-semibold text-foreground">Customer</th>
										<th className="px-5 py-2 text-right font-semibold text-foreground">Qty</th>
										<th className="px-5 py-2 text-right font-semibold text-foreground">Unit Price</th>
										<th className="px-5 py-2 text-right font-semibold text-foreground">Total</th>
									</tr>
								</thead>
								<tbody>
									{paged.map((q) => (
										<tr key={q.id} className="h-[52px] border-b hover:bg-muted/30 transition-colors">
											<td className="px-5">{new Date(q.quoteDate).toLocaleDateString()}</td>
											<td className="px-5 font-mono text-xs">{q.referenceNumber || "-"}</td>
											<td className="px-5">{q.customerName}</td>
											<td className="px-5 text-right">{q.quantity}</td>
											<td className="px-5 text-right">${Number(q.unitPrice).toFixed(2)}</td>
											<td className="px-5 text-right font-medium">${Number(q.totalPrice).toFixed(2)}</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>

						{/* Pagination */}
						<div className="flex items-center justify-between px-5 py-3 border-t">
							<p className="text-xs text-muted-foreground">
								Showing page {page} of {totalPages} ({filtered.length} total)
							</p>
							<div className="flex items-center gap-1">
								<Button variant="outline" size="icon" className="h-[30px] w-[30px] rounded-[5px]" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
									<ChevronLeft className="h-3.5 w-3.5" />
								</Button>
								{Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
									const start = Math.max(1, Math.min(page - 2, totalPages - 4));
									const n = start + i;
									if (n > totalPages) return null;
									return (
										<Button key={n} variant={page === n ? "default" : "outline"} size="icon" className="h-[30px] w-[30px] rounded-[5px] text-xs" onClick={() => setPage(n)}>
											{n}
										</Button>
									);
								})}
								<Button variant="outline" size="icon" className="h-[30px] w-[30px] rounded-[5px]" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
									<ChevronRight className="h-3.5 w-3.5" />
								</Button>
							</div>
						</div>
					</>
				)}
			</div>
		</div>
	);
}
