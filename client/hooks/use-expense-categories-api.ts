import { useAuthenticatedApi } from "./use-authenticated-api";
import { useCallback } from "react";

export interface ExpenseCategory {
  id: string;
  name: string;
  description?: string;
  companyId: string;
}

export interface CreateExpenseCategoryDto {
  name: string;
  description?: string;
}

export interface UpdateExpenseCategoryDto {
  name?: string;
  description?: string;
}

export interface BulkDeleteResponse {
  deleted: string[];
  count: number;
}

export function useExpenseCategoriesApi() {
  const { get, post, put, delete: del } = useAuthenticatedApi();

  const getExpenseCategories = useCallback(async (): Promise<
    ExpenseCategory[]
  > => {
    return get("/expense-categories") as Promise<ExpenseCategory[]>;
  }, [get]);

  const getExpenseCategory = useCallback(
    async (id: string): Promise<ExpenseCategory> => {
      return get(`/expense-categories/${id}`) as Promise<ExpenseCategory>;
    },
    [get]
  );

  const createExpenseCategory = useCallback(
    async (data: CreateExpenseCategoryDto): Promise<ExpenseCategory> => {
      return post("/expense-categories", data) as Promise<ExpenseCategory>;
    },
    [post]
  );

  const updateExpenseCategory = useCallback(
    async (
      id: string,
      data: UpdateExpenseCategoryDto
    ): Promise<ExpenseCategory> => {
      return put(`/expense-categories/${id}`, data) as Promise<ExpenseCategory>;
    },
    [put]
  );

  const deleteExpenseCategory = useCallback(
    async (id: string): Promise<void> => {
      await del(`/expense-categories/${id}`);
    },
    [del]
  );

  const bulkDeleteExpenseCategories = useCallback(
    async (ids: string[]): Promise<BulkDeleteResponse> => {
      return post("/expense-categories/bulk-delete", { ids }) as Promise<BulkDeleteResponse>;
    },
    [post]
  );

  return {
    getExpenseCategories,
    getExpenseCategory,
    createExpenseCategory,
    updateExpenseCategory,
    deleteExpenseCategory,
    bulkDeleteExpenseCategories,
  };
}
