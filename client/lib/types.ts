export interface ComboItem {
  productId: string
  productName: string
  productSku: string
  quantity: number
}

export interface Product {
  id: string
  sku: string
  name: string
  description?: string
  type?: "STANDARD" | "DIGITAL" | "SERVICE" | "COMBO"
  hasVariants?: boolean
  attributes?: Record<string, string> | null
  parentId?: string | null
  variants?: Product[]
  category: string
  brand?: string
  unit: string
  imageUrl?: string | null
  salePrice: number
  costPrice: number
  stock: number
  reorderLevel: number
  status: "ACTIVE" | "INACTIVE" | "DISCONTINUED"
  comboItems?: ComboItem[]
  createdBy?: { id: string; name: string; image?: string | null } | null
  warranty?: string | null
  manufacturer?: string | null
  manufacturedDate?: string | null
  expiryDate?: string | null
  itemCode?: string | null
  barcodeSymbology?: string | null
  subCategory?: string | null
  alertQuantity?: number | null
  taxRate?: number | null
  createdAt: string
  updatedAt: string
}

export interface StockLedgerEntry {
  id: string
  quantity: number
  balance: number
  type: string
  reference?: string | null
  note?: string | null
  createdAt: string
  productId: string
  warehouseId?: string | null
  warehouse?: { id: string; name: string } | null
  userId?: string | null
  user?: { id: string; name: string } | null
}

export interface Invoice {
  id: string
  invoiceNumber: string
  customerName: string
  date: string
  dueDate: string
  status: "draft" | "pending" | "paid" | "overdue"
  subtotal: number
  tax: number
  total: number
  items: InvoiceItem[]
}

export interface InvoiceItem {
  id: string
  productId: string
  productName: string
  quantity: number
  price: number
  total: number
}

export interface StockTransfer {
  id: string
  transferNumber: string
  fromLocation: string
  toLocation: string
  date: string
  status: "draft" | "pending" | "in-transit" | "completed"
  items: StockTransferItem[]
  notes?: string
}

export interface StockTransferItem {
  id: string
  productId: string
  productName: string
  quantity: number
}

export interface User {
  id: string
  name: string
  email: string
  role: "admin" | "manager" | "observer"
  status: "active" | "inactive"
  avatar?: string
  createdAt: string
  lastLogin?: string
}

export interface Role {
  id: string
  name: string
  description: string
  permissions: string[]
  userCount: number
}
