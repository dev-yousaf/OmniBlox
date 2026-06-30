"use client";

import { useState, useMemo } from "react";
import { Search, Loader2, ChevronLeft, ChevronRight, DollarSign, TrendingUp, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { SalesTabProps } from "./types";

const PAGE_SIZE = 10;

export function SalesTab({ sales, salesLoading, salesError }: SalesTabProps) {
	const [search, setSearch] = useState("");
	const [page, setPage] = useState(1);

	const filtered = useMemo(() => {
		if (!search) return sales;
		const q = search.toLowerCase();
		return sales.filter(
			(s) =>
				s.invoiceNumber?.toLowerCase().includes(q) ||
				s.customerName?.toLowerCase().includes(q)
		);
	}, [sales, search]);

	const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
	const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

	const totalRevenue = sales.reduce((sum, s) => sum + s.totalPrice, 0);
	const totalQty = sales.reduce((sum, s) => sum + s.quantity, 0);

	useMemo(() => { if (page > totalPages) setPage(1); }, [page, totalPages]);

	return (
		<div role="tabpanel" id="panel-sales" className="space-y-5">
			{/* Stats */}
			<div className="grid gap-4 md:grid-cols-3">
				<div className="border rounded-[5px] bg-card shadow-sm p-5">
					<p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Total Revenue</p>
					<p className="text-2xl font-bold">${totalRevenue.toFixed(2)}</p>
				</div>
				<div className="border rounded-[5px] bg-card shadow-sm p-5">
					<p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Total Sold</p>
					<p className="text-2xl font-bold">{totalQty}</p>
				</div>
				<div className="border rounded-[5px] bg-card shadow-sm p-5">
					<p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Transactions</p>
					<p className="text-2xl font-bold">{sales.length}</p>
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
							placeholder="Search by invoice or customer..."
							value={search}
							onChange={(e) => { setSearch(e.target.value); setPage(1); }}
						/>
					</div>
				</div>

				{/* Body */}
				{salesLoading ? (
					<div className="flex justify-center py-12">
						<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
					</div>
				) : salesError ? (
					<div className="text-center py-12">
						<p className="text-sm text-destructive">{salesError}</p>
					</div>
				) : filtered.length === 0 ? (
					<div className="flex flex-col items-center py-12 text-muted-foreground">
						<Package className="h-12 w-12 mb-3 text-muted-foreground/50" />
						<p className="font-medium">No sales found</p>
					</div>
				) : (
					<>
						<div className="overflow-x-auto">
							<table className="w-full text-sm">
								<thead>
									<tr className="bg-muted h-[33px]">
										<th className="px-5 py-2 text-left font-semibold text-foreground">Date</th>
										<th className="px-5 py-2 text-left font-semibold text-foreground">Invoice</th>
										<th className="px-5 py-2 text-left font-semibold text-foreground">Customer</th>
										<th className="px-5 py-2 text-right font-semibold text-foreground">Qty</th>
										<th className="px-5 py-2 text-right font-semibold text-foreground">Unit Price</th>
										<th className="px-5 py-2 text-right font-semibold text-foreground">Total</th>
									</tr>
								</thead>
								<tbody>
									{paged.map((s) => (
										<tr key={s.id} className="h-[52px] border-b hover:bg-muted/30 transition-colors">
											<td className="px-5">{new Date(s.saleDate).toLocaleDateString()}</td>
											<td className="px-5 font-mono text-xs">{s.invoiceNumber}</td>
											<td className="px-5">{s.customerName}</td>
											<td className="px-5 text-right">{s.quantity}</td>
											<td className="px-5 text-right">${Number(s.unitPrice).toFixed(2)}</td>
											<td className="px-5 text-right font-medium">${Number(s.totalPrice).toFixed(2)}</td>
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
