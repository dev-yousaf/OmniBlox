"use client";

import { useRouter } from "next/navigation";
import { useWorkspace } from "@/hooks/use-workspace";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, TrendingUp, BarChart3, PieChart } from "lucide-react";

export default function ExpenseReportsPage() {
  const router = useRouter();
  const ws = useWorkspace();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Expense Reports</h1>
          <p className="text-muted-foreground">
            Generate detailed expense reports and analytics
          </p>
        </div>
      </div>

      {/* Feature Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card
          className="cursor-pointer hover:border-primary transition-colors"
          onClick={() => router.push(`/${ws}/expenses/reports/new`)}
        >
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Generate Report</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <CardDescription>
              Create detailed expense reports with custom date ranges and
              filters
            </CardDescription>
            <Button className="mt-4 w-full" variant="outline">
              Get Started
            </Button>
          </CardContent>
        </Card>

        <Card className="opacity-60">
          <CardHeader>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-lg">Trend Analysis</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <CardDescription>
              Compare expenses across different time periods (Coming Soon)
            </CardDescription>
            <Button className="mt-4 w-full" variant="outline" disabled>
              Coming Soon
            </Button>
          </CardContent>
        </Card>

        <Card className="opacity-60">
          <CardHeader>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-lg">Budget Tracking</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <CardDescription>
              Monitor expenses against budgets and spending limits (Coming Soon)
            </CardDescription>
            <Button className="mt-4 w-full" variant="outline" disabled>
              Coming Soon
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Quick Start Guide */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Start Guide</CardTitle>
          <CardDescription>
            Get started with expense reporting in 3 easy steps
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
              1
            </div>
            <div>
              <h3 className="font-semibold">Select Date Range</h3>
              <p className="text-sm text-muted-foreground">
                Choose the start and end dates for your report. Defaults to the
                current month.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
              2
            </div>
            <div>
              <h3 className="font-semibold">Apply Filters (Optional)</h3>
              <p className="text-sm text-muted-foreground">
                Filter by specific categories or vendors to focus your analysis.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
              3
            </div>
            <div>
              <h3 className="font-semibold">Generate & Export</h3>
              <p className="text-sm text-muted-foreground">
                View your report with summary cards, category breakdowns, and
                detailed tables. Export to CSV when needed.
              </p>
            </div>
          </div>

          <div className="pt-4">
            <Button
              onClick={() => router.push(`/${ws}/expenses/reports/new`)}
              className="w-full md:w-auto"
            >
              <FileText className="mr-2 h-4 w-4" />
              Generate Your First Report
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Features Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Report Features</CardTitle>
          <CardDescription>
            What you can do with expense reports
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex gap-3">
              <PieChart className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-sm">Category Breakdown</h4>
                <p className="text-sm text-muted-foreground">
                  See how expenses are distributed across categories with visual
                  progress bars
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <TrendingUp className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-sm">Summary Statistics</h4>
                <p className="text-sm text-muted-foreground">
                  View total amounts, expense counts, and active filters at a
                  glance
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <FileText className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-sm">Detailed Tables</h4>
                <p className="text-sm text-muted-foreground">
                  Browse all expenses with dates, descriptions, categories, and
                  payment methods
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <BarChart3 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-sm">CSV Export</h4>
                <p className="text-sm text-muted-foreground">
                  Export reports to CSV for further analysis in spreadsheet
                  applications
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
