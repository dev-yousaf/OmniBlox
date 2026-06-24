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
import type { TransferTabProps } from "./types";

export function TransferTab({ transfers }: TransferTabProps) {
	return (
		<div role="tabpanel" id="panel-transfer" aria-labelledby="tab-transfer" className="space-y-6">
			<Card>
				<CardHeader>
					<CardTitle>Stock Transfers</CardTitle>
					<CardDescription>Stock transfer history for this product</CardDescription>
				</CardHeader>
				<CardContent>
					{transfers.length === 0 ? (
						<p className="text-sm text-muted-foreground text-center py-8">No stock transfers found for this product</p>
					) : (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Date</TableHead>
									<TableHead>Reference</TableHead>
									<TableHead>From</TableHead>
									<TableHead>To</TableHead>
									<TableHead>Quantity</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{transfers.map((t, index) => (
									<TableRow key={index}>
										<TableCell>{new Date(t.date).toLocaleDateString()}</TableCell>
										<TableCell className="font-mono text-xs">{t.reference}</TableCell>
										<TableCell>{t.from}</TableCell>
										<TableCell>{t.to}</TableCell>
										<TableCell className={t.quantity > 0 ? "text-green-600" : "text-red-600"}>
											{t.quantity > 0 ? `+${t.quantity}` : t.quantity}
										</TableCell>
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
