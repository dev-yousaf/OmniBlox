"use client";

import { useMemo } from "react";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Bar,
	BarChart,
	CartesianGrid,
	XAxis,
	YAxis,
	ResponsiveContainer,
	Tooltip,
	Legend,
} from "recharts";
import type { ChartsTabProps } from "./types";

export function ChartsTab({
	product,
	ledger,
	totalSalesAmount,
	totalPurchasesAmount,
}: ChartsTabProps) {
	const last30Days = Array.from({ length: 30 }, (_, i) => {
		const d = new Date();
		d.setDate(d.getDate() - (29 - i));
		d.setHours(0, 0, 0, 0);
		return d;
	});

	const stockMovementData = useMemo(() => last30Days.map((day) => {
		const dateStr = day.toISOString().split("T")[0];
		const dayEntries = ledger.filter(
			(e) => new Date(e.createdAt).toISOString().split("T")[0] === dateStr
		);
		return {
			date: dateStr.slice(5),
			additions: dayEntries
				.filter((e) => e.quantity > 0)
				.reduce((sum, e) => sum + e.quantity, 0),
			removals: dayEntries
				.filter((e) => e.quantity < 0)
				.reduce((sum, e) => sum + Math.abs(e.quantity), 0),
		};
	}), [ledger]);

	const salesVsPurchasesData = [
		{ name: "Sales", total: totalSalesAmount, fill: "#22c55e" },
		{ name: "Purchases", total: totalPurchasesAmount, fill: "#3b82f6" },
	];

	return (
		<div role="tabpanel" id="panel-charts" aria-labelledby="tab-charts" className="space-y-6">
			<div className="grid gap-4 md:grid-cols-3">
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-sm font-medium text-muted-foreground">Current Stock</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="text-2xl font-bold">{product.stock}</p>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-sm font-medium text-muted-foreground">Total Sales</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="text-2xl font-bold text-green-600">${totalSalesAmount.toFixed(2)}</p>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-sm font-medium text-muted-foreground">Total Purchases</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="text-2xl font-bold text-blue-600">${totalPurchasesAmount.toFixed(2)}</p>
					</CardContent>
				</Card>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Stock Movements (Last 30 Days)</CardTitle>
					<CardDescription>Daily stock additions and removals</CardDescription>
				</CardHeader>
				<CardContent>
					{stockMovementData.length === 0 ? (
						<p className="text-sm text-muted-foreground text-center py-8">No stock movement data available</p>
					) : (
						<div className="h-[300px]">
							<ResponsiveContainer width="100%" height="100%">
								<BarChart data={stockMovementData}>
									<CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
									<XAxis dataKey="date" className="text-xs" tick={{ fontSize: 10 }} />
									<YAxis className="text-xs" />
									<Tooltip />
									<Legend />
									<Bar dataKey="additions" name="Additions" fill="#22c55e" radius={[4, 4, 0, 0]} />
									<Bar dataKey="removals" name="Removals" fill="#ef4444" radius={[4, 4, 0, 0]} />
								</BarChart>
							</ResponsiveContainer>
						</div>
					)}
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Sales vs Purchases</CardTitle>
					<CardDescription>Comparison of total sales and purchase amounts</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="h-[300px]">
						<ResponsiveContainer width="100%" height="100%">
							<BarChart data={salesVsPurchasesData}>
								<CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
								<XAxis dataKey="name" className="text-xs" />
								<YAxis className="text-xs" />
								<Tooltip />
								<Legend />
								<Bar dataKey="total" name="Amount ($)" fill="#3b82f6" radius={[4, 4, 0, 0]} />
							</BarChart>
						</ResponsiveContainer>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
