// Re-export types from lib for consistency
import type { Return } from "@/lib/types"
export type { Return }

export type ReturnStatus = 

export type ReturnStats = {
  totalReturns: number
  activeReturns: number
  // Add more stats as needed
}

export type ReturnFilters = {
  searchQuery: string
  statusFilter: string
}

export type ReturnTableProps = {
  returns: Return[]
  onReturnClick: (id: string) => void
}

export type ReturnStatsCardsProps = {
  stats: ReturnStats
}

export type ReturnFiltersProps = {
  filters: ReturnFilters
  onFiltersChange: (filters: ReturnFilters) => void
}

export type ReturnFormData = Omit<Return, "id">
