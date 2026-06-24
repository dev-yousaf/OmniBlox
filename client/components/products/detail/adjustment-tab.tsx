"use client";

import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
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
import { Loader2, Upload } from "lucide-react";
import type { AdjustmentTabProps } from "./types";

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
	recentAdjustments,
}: AdjustmentTabProps) {
	return (
		<div role="tabpanel" id="panel-adjustment" aria-labelledby="tab-adjustment" className="space-y-6">
			{canManage && (
				<Card>
					<CardHeader>
						<CardTitle>New Stock Adjustment</CardTitle>
						<CardDescription>Add or remove stock for this product</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="grid gap-6 md:grid-cols-2">
							<div className="space-y-4">
								<div className="space-y-2">
									<Label htmlFor="adj-date">Date</Label>
									<Input id="adj-date" type="date" value={adjDate} onChange={(e) => setAdjDate(e.target.value)} />
								</div>
								<div className="space-y-2">
									<Label htmlFor="adj-reference">Reference No</Label>
									<Input id="adj-reference" placeholder={`ADJ-${Date.now()}`} value={adjReference} onChange={(e) => setAdjReference(e.target.value)} />
								</div>
								<div className="space-y-2">
									<Label htmlFor="adj-warehouse">Warehouse</Label>
									<Select value={adjWarehouseId} onValueChange={setAdjWarehouseId} disabled={warehousesLoading}>
										<SelectTrigger id="adj-warehouse">
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
								<div className="space-y-2">
									<Label>Type</Label>
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
							<div className="space-y-4">
								<div className="space-y-2">
									<Label htmlFor="adj-quantity">Quantity</Label>
									<Input id="adj-quantity" type="number" min="1" placeholder="Enter quantity" value={adjQuantity} onChange={(e) => setAdjQuantity(e.target.value)} />
								</div>
								<div className="space-y-2">
									<Label htmlFor="adj-note">Note</Label>
									<Textarea id="adj-note" placeholder="Reason for adjustment" value={adjNote} onChange={(e) => setAdjNote(e.target.value)} rows={3} />
								</div>
								<div className="space-y-2">
									<Label>Attach Document</Label>
									<div className="flex items-center gap-2">
										<Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="gap-2">
											<Upload className="h-4 w-4" />
											Choose File
										</Button>
										<input ref={fileInputRef} type="file" className="hidden" onChange={(e) => setAdjDocument(e.target.files?.[0] || null)} />
										{adjDocument && <span className="text-sm text-muted-foreground truncate max-w-[200px]">{adjDocument.name}</span>}
									</div>
								</div>
								<div className="space-y-2">
									<Label htmlFor="adj-created-by">Created By</Label>
									<Input id="adj-created-by" value={user?.name || "Unknown"} disabled />
								</div>
							</div>
						</div>
						<div className="mt-6">
							<Button onClick={handleSaveAdjustment} disabled={savingAdj || !adjWarehouseId || !adjQuantity} className="gap-2">
								{savingAdj ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
								{savingAdj ? "Saving..." : "Save Adjustment"}
							</Button>
						</div>
					</CardContent>
				</Card>
			)}

			<Card>
				<CardHeader>
					<CardTitle>Recent Adjustments</CardTitle>
					<CardDescription>Last 10 stock adjustments for this product</CardDescription>
				</CardHeader>
				<CardContent>
					{recentAdjustments.length === 0 ? (
						<p className="text-sm text-muted-foreground text-center py-8">No adjustments recorded yet</p>
					) : (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Date</TableHead>
									<TableHead>Type</TableHead>
									<TableHead>Quantity</TableHead>
									<TableHead>Balance</TableHead>
									<TableHead>Reference</TableHead>
									<TableHead>Note</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{recentAdjustments.map((entry) => (
									<TableRow key={entry.id}>
										<TableCell>{new Date(entry.createdAt).toLocaleDateString()}</TableCell>
										<TableCell><Badge variant="outline">{entry.type}</Badge></TableCell>
										<TableCell className={entry.quantity > 0 ? "text-green-600" : "text-red-600"}>
											{entry.quantity > 0 ? `+${entry.quantity}` : entry.quantity}
										</TableCell>
										<TableCell>{entry.balance}</TableCell>
										<TableCell className="text-xs text-muted-foreground">{entry.reference || "-"}</TableCell>
										<TableCell className="text-xs text-muted-foreground">{entry.note || "-"}</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
