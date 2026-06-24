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
import type { QuotationsTabProps } from "./types";

export function QuotationsTab({ quotations, quotationsLoading, quotationsError }: QuotationsTabProps) {
	return (
		<div role="tabpanel" id="panel-quotations" aria-labelledby="tab-quotations" className="space-y-6">
			<Card>
				<CardHeader>
					<CardTitle>Quotations</CardTitle>
					<CardDescription>Quotations containing this product</CardDescription>
				</CardHeader>
				<CardContent>
					{quotationsLoading ? (
						<div className="flex items-center justify-center py-8">
							<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
						</div>
					) : quotationsError ? (
						<p className="text-sm text-destructive text-center py-8">{quotationsError}</p>
					) : quotations.length === 0 ? (
						<p className="text-sm text-muted-foreground text-center py-8">No quotations found for this product</p>
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
									<TableHead>Status</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{quotations.map((q: any) => (
									<TableRow key={q.id}>
										<TableCell>{new Date(q.quoteDate ?? q.date).toLocaleDateString()}</TableCell>
										<TableCell className="font-mono text-xs">{q.referenceNumber ?? q.reference}</TableCell>
										<TableCell>{q.customerName ?? q.customer}</TableCell>
										<TableCell>{q.quantity}</TableCell>
										<TableCell>${(q.unitPrice ?? 0).toFixed(2)}</TableCell>
										<TableCell className="font-medium">${(q.totalPrice ?? q.total ?? 0).toFixed(2)}</TableCell>
										<TableCell><Badge variant="outline">{q.status ?? "-"}</Badge></TableCell>
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
