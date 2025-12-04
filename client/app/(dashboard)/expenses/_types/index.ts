// Re-export types from lib for consistency
import type { Expense } from "@/lib/types"
export type { Expense }

export type ExpenseStatus = 

export type ExpenseStats = {
  totalExpenses: number
  activeExpenses: number
  // Add more stats as needed
}

export type ExpenseFilters = {
  searchQuery: string
  statusFilter: string
}

export type ExpenseTableProps = {
  expenses: Expense[]
  onExpenseClick: (id: string) => void
}

export type ExpenseStatsCardsProps = {
  stats: ExpenseStats
}

export type ExpenseFiltersProps = {
  filters: ExpenseFilters
  onFiltersChange: (filters: ExpenseFilters) => void
}

export type ExpenseFormData = Omit<Expense, "id">
