import type { Quotation } from "@/hooks/use-quotations-api"
export type { Quotation }

export type QuotationStatus = "DRAFT" | "PENDING" | "COMPLETED" | "CANCELLED"

export type QuotationStats = {
  totalQuotations: number
  activeQuotations: number
  // Add more stats as needed
}

export type QuotationFilters = {
  searchQuery: string
  statusFilter: string
}

export type QuotationTableProps = {
  quotations: Quotation[]
  onQuotationClick: (id: string) => void
}

export type QuotationStatsCardsProps = {
  stats: QuotationStats
}

export type QuotationFiltersProps = {
  filters: QuotationFilters
  onFiltersChange: (filters: QuotationFilters) => void
}

export type QuotationFormData = Omit<Quotation, "id">
