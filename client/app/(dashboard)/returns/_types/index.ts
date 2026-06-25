import type { UnifiedReturn as Return } from "@/hooks/use-returns-api"
export type { Return }

export type ReturnStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "CANCELLED"

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
