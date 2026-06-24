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
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import type { PurchaseTabProps } from "./types";

export function PurchaseTab({ purchases, purchasesLoading, purchasesError }: PurchaseTabProps) {
	return (
		<div role="tabpanel" id="panel-purchase" aria-labelledby="tab-purchase" className="space-y-6">
			<Card>
				<CardHeader>
					<CardTitle>Purchase Orders</CardTitle>
					<CardDescription>Purchase orders for this product</CardDescription>
				</CardHeader>
				<CardContent>
					{purchasesLoading ? (
						<div className="flex items-center justify-center py-8">
							<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
						</div>
					) : purchasesError ? (
						<p className="text-sm text-destructive text-center py-8">{purchasesError}</p>
					) : purchases.length === 0 ? (
						<p className="text-sm text-muted-foreground text-center py-8">No purchase orders found for this product</p>
					) : (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Date</TableHead>
									<TableHead>Reference</TableHead>
									<TableHead>Supplier</TableHead>
									<TableHead>Quantity</TableHead>
									<TableHead>Unit Cost</TableHead>
									<TableHead>Total</TableHead>
									<TableHead>Status</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{purchases.map((p: any) => (
									<TableRow key={p.id}>
										<TableCell>{new Date(p.orderDate ?? p.date).toLocaleDateString()}</TableCell>
										<TableCell className="font-mono text-xs">{p.referenceNumber ?? p.reference}</TableCell>
										<TableCell>{p.supplierName ?? p.supplier}</TableCell>
										<TableCell>{p.quantity}</TableCell>
										<TableCell>${(p.unitCost ?? p.unitPrice ?? 0).toFixed(2)}</TableCell>
										<TableCell className="font-medium">${(p.totalCost ?? p.total ?? 0).toFixed(2)}</TableCell>
										<TableCell><Badge variant="outline">{p.status ?? "-"}</Badge></TableCell>
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
