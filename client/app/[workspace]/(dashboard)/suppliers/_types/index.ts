export type SupplierStatus = "active" | "inactive" | "blocked"

export interface Supplier {
  id: string
  name: string
  company: string
  email: string
  phone: string
  address: string
  city: string
  country: string
  taxId: string
  status: SupplierStatus
  balance: number
  totalPurchases: number
  lastPurchase: string
  paymentTerms: string
  rating: number
}

export interface SupplierStats {
  totalSuppliers: number
  activeSuppliers: number
  totalBalance: number
  totalPurchases: number
}

export interface SupplierFilters {
  searchQuery: string
  statusFilter: string
}

export type SupplierFormData = Omit<Supplier, "id" | "totalPurchases" | "lastPurchase">

export interface SupplierTableProps {
  suppliers: Supplier[]
  onSupplierClick: (supplierId: string) => void
}

export interface SupplierStatsCardsProps {
  stats: {
    totalSuppliers: number
    activeSuppliers: number
    totalBalance: number
    totalPurchases: number
  }
}

export interface SupplierFiltersProps {
  filters: SupplierFilters
  onFiltersChange: (filters: SupplierFilters) => void
}
