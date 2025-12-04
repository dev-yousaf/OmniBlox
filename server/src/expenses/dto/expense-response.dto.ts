export class ExpenseResponseDto {
  id: string;
  description: string;
  amount: number;
  expenseDate: string;
  category?: string;
  notes?: string;
  userId: string;
  companyId: string;
  createdAt: string;
  updatedAt: string;
}

export class ExpensesListResponseDto {
  expenses: ExpenseResponseDto[];
  total: number;
  pages: number;
}

export class ExpenseStatsDto {
  totalExpenses: number;
  totalAmount: number;
  currentMonthAmount: number;
  previousMonthAmount: number;
  monthlyChange: number;
}
