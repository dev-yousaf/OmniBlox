import type { Product } from "@/lib/types"
export type { Product }

export type ProductStatus = "ACTIVE" | "INACTIVE" | "DISCONTINUED"

export type ProductStats = {
  totalProducts: number
  activeProducts: number
}

export type ProductFilters = {
  searchQuery: string
  statusFilter: string
}

export type ProductTableProps = {
  products: Product[]
  onProductClick: (id: string) => void
}

export type ProductStatsCardsProps = {
  stats: ProductStats
}

export type ProductFiltersProps = {
  filters: ProductFilters
  onFiltersChange: (filters: ProductFilters) => void
}

export type ProductFormData = Omit<Product, "id">
