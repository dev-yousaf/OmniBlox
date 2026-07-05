"use client";

import React from "react";
import { useParams, useRouter } from "next/navigation";
import { useWorkspace } from "@/hooks/use-workspace";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

export default function ExpenseReportDetailPage() {
  const params = useParams();
  const router = useRouter();
  const ws = useWorkspace();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Expense Report</h1>
            <p className="text-muted-foreground">Report ID: {params.id}</p>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={() => router.push(`/${ws}/expenses/reports`)}
        >
          Back to Reports
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Report Details</CardTitle>
          <CardDescription>
            This feature is coming soon. Expense reports will allow you to
            generate and view detailed expense summaries.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            The expense reports feature is currently under development. You will
            be able to:
          </p>
          <ul className="list-disc list-inside mt-4 space-y-2 text-muted-foreground">
            <li>Generate custom expense reports by date range</li>
            <li>Filter expenses by category, status, and amount</li>
            <li>Export reports to PDF and Excel</li>
            <li>View expense trends and analytics</li>
            <li>Compare expenses across different periods</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
