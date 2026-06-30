"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Upload, Search, ChevronLeft, ChevronRight, Package, Plus, Minus } from "lucide-react";
import type { AdjustmentTabProps } from "./types";

const PAGE_SIZE = 10;

export function AdjustmentTab({
	canManage,
	adjDate,
	setAdjDate,
	adjReference,
	setAdjReference,
	adjWarehouseId,
	setAdjWarehouseId,
	adjType,
	setAdjType,
	adjQuantity,
	setAdjQuantity,
	adjNote,
	setAdjNote,
	adjDocument,
	setAdjDocument,
	savingAdj,
	fileInputRef,
	warehouses,
	warehousesLoading,
	user,
	handleSaveAdjustment,
	productId,
	adjustments,
	adjustmentsLoading,
	adjustmentsError,
}: AdjustmentTabProps) {
	const [search, setSearch] = useState("");
	const [page, setPage] = useState(1);

	const filtered = useMemo(() => {
		if (!search || !adjustments) return adjustments || [];
		const q = search.toLowerCase();
		return adjustments.filter(
			(a) =>
				a.reference?.toLowerCase().includes(q) ||
				a.warehouse?.toLowerCase().includes(q) ||
				a.notes?.toLowerCase().includes(q)
		);
	}, [adjustments, search]);

	const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
	const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

	const totalAdditions = (adjustments || [])
		.filter((a) => a.type === "ADDITION")
		.reduce((sum, a) => sum + Math.abs(a.quantity), 0);
	const totalRemovals = (adjustments || [])
		.filter((a) => a.type === "REMOVAL")
		.reduce((sum, a) => sum + Math.abs(a.quantity), 0);

	useMemo(() => { if (page > totalPages) setPage(1); }, [page, totalPages]);

	return (
		<div role="tabpanel" id="panel-adjustment" className="space-y-5">
			{/* Stats */}
			<div className="grid gap-4 md:grid-cols-3">
				<div className="border rounded-[5px] bg-card shadow-sm p-5">
					<p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Total Additions</p>
					<p className="text-2xl font-bold text-green-600">{totalAdditions}</p>
				</div>
				<div className="border rounded-[5px] bg-card shadow-sm p-5">
					<p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Total Removals</p>
					<p className="text-2xl font-bold text-red-600">{totalRemovals}</p>
				</div>
				<div className="border rounded-[5px] bg-card shadow-sm p-5">
					<p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Adjustments</p>
					<p className="text-2xl font-bold">{(adjustments || []).length}</p>
				</div>
			</div>

			{/* New Adjustment Form */}
			{canManage && (
				<div className="border rounded-[5px] bg-card shadow-sm p-5">
					<h3 className="text-base font-semibold mb-1">New Stock Adjustment</h3>
					<p className="text-sm text-muted-foreground mb-4">Add or remove stock for this product</p>
					<div className="grid gap-4 md:grid-cols-2">
						<div className="space-y-3">
							<div className="space-y-1.5">
								<Label htmlFor="adj-date" className="text-xs">Date</Label>
								<Input id="adj-date" type="date" value={adjDate} onChange={(e) => setAdjDate(e.target.value)} className="h-[34px] text-sm" />
							</div>
							<div className="space-y-1.5">
								<Label htmlFor="adj-reference" className="text-xs">Reference No</Label>
								<Input id="adj-reference" placeholder={`ADJ-${Date.now()}`} value={adjReference} onChange={(e) => setAdjReference(e.target.value)} className="h-[34px] text-sm" />
							</div>
							<div className="space-y-1.5">
								<Label htmlFor="adj-warehouse" className="text-xs">Warehouse</Label>
								<Select value={adjWarehouseId} onValueChange={setAdjWarehouseId} disabled={warehousesLoading}>
									<SelectTrigger id="adj-warehouse" className="h-[34px] text-sm">
										<SelectValue placeholder="Select warehouse" />
									</SelectTrigger>
									<SelectContent>
										{warehouses.map((w) => (
											<SelectItem key={w.id} value={w.id}>
												{w.name}
												{w.location ? ` - ${w.location}` : ""}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
							<div className="space-y-1.5">
								<Label className="text-xs">Type</Label>
								<div className="flex gap-4">
									<label className="flex items-center gap-2 cursor-pointer">
										<input type="radio" name="adjType" value="ADDITION" checked={adjType === "ADDITION"} onChange={() => setAdjType("ADDITION")} className="text-primary" />
										<span className="text-sm font-medium text-green-600">Addition</span>
									</label>
									<label className="flex items-center gap-2 cursor-pointer">
										<input type="radio" name="adjType" value="REMOVAL" checked={adjType === "REMOVAL"} onChange={() => setAdjType("REMOVAL")} className="text-destructive" />
										<span className="text-sm font-medium text-red-600">Removal</span>
									</label>
								</div>
							</div>
						</div>
						<div className="space-y-3">
							<div className="space-y-1.5">
								<Label htmlFor="adj-quantity" className="text-xs">Quantity</Label>
								<Input id="adj-quantity" type="number" min="1" placeholder="Enter quantity" value={adjQuantity} onChange={(e) => setAdjQuantity(e.target.value)} className="h-[34px] text-sm" />
							</div>
							<div className="space-y-1.5">
								<Label htmlFor="adj-note" className="text-xs">Note</Label>
								<Textarea id="adj-note" placeholder="Reason for adjustment" value={adjNote} onChange={(e) => setAdjNote(e.target.value)} rows={3} className="text-sm" />
							</div>
							<div className="space-y-1.5">
								<Label className="text-xs">Attach Document</Label>
								<div className="flex items-center gap-2">
									<Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="gap-2 h-[34px] text-xs">
										<Upload className="h-3.5 w-3.5" />
										Choose File
									</Button>
									<input ref={fileInputRef} type="file" className="hidden" onChange={(e) => setAdjDocument(e.target.files?.[0] || null)} />
									{adjDocument && <span className="text-sm text-muted-foreground truncate max-w-[200px]">{adjDocument.name}</span>}
								</div>
							</div>
							<div className="space-y-1.5">
								<Label htmlFor="adj-created-by" className="text-xs">Created By</Label>
								<Input id="adj-created-by" value={user?.name || "Unknown"} disabled className="h-[34px] text-sm" />
							</div>
						</div>
					</div>
					<div className="mt-4">
						<Button onClick={handleSaveAdjustment} disabled={savingAdj || !adjWarehouseId || !adjQuantity} className="gap-2 h-[34px] text-xs">
							{savingAdj ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
							{savingAdj ? "Saving..." : "Save Adjustment"}
						</Button>
					</div>
				</div>
			)}

			{/* Adjustment History Table */}
			<div className="border rounded-[5px] bg-card shadow-sm overflow-hidden">
				{/* Toolbar */}
				<div className="flex items-center gap-4 px-5 py-[15px] border-b">
					<div className="flex items-center gap-2 border rounded-[5px] px-2.5 py-1.5 w-[250px]">
						<Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
						<input
							className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground min-w-0"
							placeholder="Search by reference or warehouse..."
							value={search}
							onChange={(e) => { setSearch(e.target.value); setPage(1); }}
						/>
					</div>
				</div>

				{/* Body */}
				{adjustmentsLoading ? (
					<div className="flex justify-center py-12">
						<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
					</div>
				) : adjustmentsError ? (
					<div className="text-center py-12">
						<p className="text-sm text-destructive">{adjustmentsError}</p>
					</div>
				) : filtered.length === 0 ? (
					<div className="flex flex-col items-center py-12 text-muted-foreground">
						<Package className="h-12 w-12 mb-3 text-muted-foreground/50" />
						<p className="font-medium">No adjustments found</p>
					</div>
				) : (
					<>
						<div className="overflow-x-auto">
							<table className="w-full text-sm">
								<thead>
									<tr className="bg-muted h-[33px]">
										<th className="px-5 py-2 text-left font-semibold text-foreground">Date</th>
										<th className="px-5 py-2 text-left font-semibold text-foreground">Reference</th>
										<th className="px-5 py-2 text-left font-semibold text-foreground">Warehouse</th>
										<th className="px-5 py-2 text-left font-semibold text-foreground">Type</th>
										<th className="px-5 py-2 text-right font-semibold text-foreground">Prev Qty</th>
										<th className="px-5 py-2 text-right font-semibold text-foreground">New Qty</th>
										<th className="px-5 py-2 text-left font-semibold text-foreground">Notes</th>
										<th className="px-5 py-2 text-left font-semibold text-foreground">By</th>
									</tr>
								</thead>
								<tbody>
									{paged.map((a) => (
										<tr key={a.id} className="h-[52px] border-b hover:bg-muted/30 transition-colors">
											<td className="px-5">{new Date(a.date).toLocaleDateString()}</td>
											<td className="px-5 font-mono text-xs">{a.reference}</td>
											<td className="px-5">{a.warehouse}</td>
											<td className="px-5">
												<Badge variant={a.type === "ADDITION" ? "default" : "destructive"} className="text-xs">
													{a.type === "ADDITION" ? (
														<><Plus className="h-3 w-3 mr-1" />Addition</>
													) : (
														<><Minus className="h-3 w-3 mr-1" />Removal</>
													)}
												</Badge>
											</td>
											<td className="px-5 text-right">{a.previousQuantity}</td>
											<td className="px-5 text-right font-medium">{a.newQuantity}</td>
											<td className="px-5 text-xs text-muted-foreground max-w-[200px] truncate">{a.notes || "-"}</td>
											<td className="px-5 text-xs text-muted-foreground">{a.createdBy || "-"}</td>
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
