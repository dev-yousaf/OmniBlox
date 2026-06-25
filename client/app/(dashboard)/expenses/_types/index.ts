// Re-export types from lib for consistency
import type { Expense } from "@/hooks/use-expenses-api"
export type { Expense }

export type ExpenseStatus = "PENDING" | "APPROVED" | "PAID" | "REJECTED"

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
