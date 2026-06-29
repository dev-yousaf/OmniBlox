import { useAuthenticatedApi } from "./use-authenticated-api";
import { useCallback, useMemo } from "react";

export enum ExpenseStatus {
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  PAID = "PAID",
  REJECTED = "REJECTED",
}

export enum PaymentMethod {
  CASH = "CASH",
  CREDIT_CARD = "CREDIT_CARD",
  BANK_TRANSFER = "BANK_TRANSFER",
  CHECK = "CHECK",
}

export interface Expense {
  id: string;
  reference: string;
  amount: number;
  expenseDate: string;
  description?: string;
  vendor: string;
  status: ExpenseStatus;
  paymentMethod?: PaymentMethod;
  categoryId: string;
  category?: {
    id: string;
    name: string;
    description?: string;
  };
  userId: string;
  user?: {
    id: string;
    name: string;
    email: string;
  };
  // Some API responses include a `createdBy` relation with user details
  createdBy?: {
    id: string;
    firstName?: string;
    lastName?: string;
    email?: string;
  };
  purchaseOrderId?: string;
  saleId?: string;
  attachments?: ExpenseAttachment[];
  companyId: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExpenseAttachment {
  id: string;
  url: string;
  fileName: string;
  fileType: string;
  createdAt: string;
  expenseId: string;
}

export interface CreateExpenseDto {
  reference: string;
  amount: number;
  expenseDate: string;
  description?: string;
  vendor: string;
  categoryId: string;
  paymentMethod?: PaymentMethod;
  saleId?: string;
  purchaseOrderId?: string;
}

export interface UpdateExpenseDto {
  reference?: string;
  amount?: number;
  expenseDate?: string;
  description?: string;
  vendor?: string;
  status?: ExpenseStatus;
  paymentMethod?: PaymentMethod;
  categoryId?: string;
}

export interface UpdateExpenseStatusDto {
  status: ExpenseStatus;
}

export interface ExpenseStats {
  totalExpenses: number;
  pendingExpenses: number;
  approvedExpenses: number;
  paidExpenses: number;
  rejectedExpenses: number;
  totalAmount: number;
  pendingAmount: number;
  approvedAmount: number;
  paidAmount: number;
}

export function useExpensesApi() {
  const { get, post, put, patch, delete: del } = useAuthenticatedApi();

  const getExpenses = useCallback(async (): Promise<Expense[]> => {
    return get("/expenses") as Promise<Expense[]>;
  }, [get]);

  const getExpense = useCallback(
    async (id: string): Promise<Expense> => {
      return get(`/expenses/${id}`) as Promise<Expense>;
    },
    [get]
  );

  const getExpenseStats = useCallback(async (): Promise<ExpenseStats> => {
    return get("/expenses/stats") as Promise<ExpenseStats>;
  }, [get]);

  const createExpense = useCallback(
    async (data: CreateExpenseDto): Promise<Expense> => {
      return post("/expenses", data) as Promise<Expense>;
    },
    [post]
  );

  const updateExpense = useCallback(
    async (id: string, data: UpdateExpenseDto): Promise<Expense> => {
      return put(`/expenses/${id}`, data) as Promise<Expense>;
    },
    [put]
  );

  const updateExpenseStatus = useCallback(
    async (id: string, data: UpdateExpenseStatusDto): Promise<Expense> => {
      return patch(`/expenses/${id}/status`, data) as Promise<Expense>;
    },
    [patch]
  );

  const deleteExpense = useCallback(
    async (id: string): Promise<void> => {
      await del(`/expenses/${id}`);
    },
    [del]
  );

  const uploadAttachment = useCallback(
    async (id: string, file: File): Promise<ExpenseAttachment> => {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/expenses/${id}/attachments`,
        {
          method: "POST",
          body: formData,
          credentials: "include",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to upload attachment");
      }

      return response.json();
    },
    []
  );

  const deleteAttachment = useCallback(
    async (expenseId: string, attachmentId: string): Promise<void> => {
      await del(`/expenses/${expenseId}/attachments/${attachmentId}`);
    },
    [del]
  );

  return useMemo(
    () => ({
      getExpenses,
      getExpense,
      getExpenseStats,
      createExpense,
      updateExpense,
      updateExpenseStatus,
      deleteExpense,
      uploadAttachment,
      deleteAttachment,
    }),
    [
      getExpenses, getExpense, getExpenseStats,
      createExpense, updateExpense, updateExpenseStatus,
      deleteExpense, uploadAttachment, deleteAttachment,
    ],
  );
}
