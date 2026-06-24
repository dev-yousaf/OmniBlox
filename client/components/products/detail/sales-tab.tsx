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
import { Loader2 } from "lucide-react";
import type { SalesTabProps } from "./types";

export function SalesTab({ sales, salesLoading, salesError }: SalesTabProps) {
	return (
		<div role="tabpanel" id="panel-sales" aria-labelledby="tab-sales" className="space-y-6">
			<Card>
				<CardHeader>
					<CardTitle>Sales History</CardTitle>
					<CardDescription>Sales transactions for this product</CardDescription>
				</CardHeader>
				<CardContent>
					{salesLoading ? (
						<div className="flex items-center justify-center py-8">
							<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
						</div>
					) : salesError ? (
						<p className="text-sm text-destructive text-center py-8">{salesError}</p>
					) : sales.length === 0 ? (
						<p className="text-sm text-muted-foreground text-center py-8">No sales data available for this product</p>
					) : (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Date</TableHead>
									<TableHead>Reference</TableHead>
									<TableHead>Customer</TableHead>
									<TableHead>Quantity</TableHead>
									<TableHead>Unit Price</TableHead>
									<TableHead>Total</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{sales.map((sale: any) => (
									<TableRow key={sale.id}>
										<TableCell>{new Date(sale.saleDate ?? sale.date).toLocaleDateString()}</TableCell>
										<TableCell className="font-mono text-xs">{sale.invoiceNumber ?? sale.reference}</TableCell>
										<TableCell>{sale.customerName ?? sale.customer}</TableCell>
										<TableCell>{sale.quantity}</TableCell>
										<TableCell>${(sale.unitPrice ?? 0).toFixed(2)}</TableCell>
										<TableCell className="font-medium">${(sale.totalPrice ?? sale.total ?? 0).toFixed(2)}</TableCell>
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
