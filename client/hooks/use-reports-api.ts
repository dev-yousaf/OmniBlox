import { useAuthenticatedApi } from "./use-authenticated-api";
import { useCallback, useMemo } from "react";

export interface ExpenseReportFilters {
  startDate: string;
  endDate: string;
  categoryId?: string;
  vendor?: string;
}

export interface ExpenseReportSummary {
  totalAmount: number | string; // Prisma Decimal serializes as string
  totalExpenses: number;
  startDate: string;
  endDate: string;
  categoryFilter: string | null;
  vendorFilter: string | null;
}

export interface CategoryBreakdown {
  categoryId: string;
  categoryName: string;
  totalAmount: number | string; // Prisma Decimal serializes as string
  count: number;
}

export interface ExpenseInReport {
  id: string;
  description: string;
  amount: number | string; // Prisma Decimal serializes as string
  expenseDate: string;
  vendor: string;
  receiptNumber: string | null;
  paymentMethod: string;
  notes: string | null;
  categoryId: string;
  category: {
    id: string;
    name: string;
  };
}

export interface ExpenseReportResponse {
  summary: ExpenseReportSummary;
  expenses: ExpenseInReport[];
  categoryBreakdown: CategoryBreakdown[];
}

export function useReportsApi() {
  const { post } = useAuthenticatedApi();

  const generateExpenseReport = useCallback(
    async (filters: ExpenseReportFilters): Promise<ExpenseReportResponse> => {
      return post(
        "/reports/expenses",
        filters
      ) as Promise<ExpenseReportResponse>;
    },
    [post]
  );

  return useMemo(() => ({ generateExpenseReport }), [generateExpenseReport]);
}
