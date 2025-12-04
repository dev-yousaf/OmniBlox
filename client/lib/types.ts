export interface Product {
  id: string
  sku: string
  name: string
  description?: string
  category: string
  brand?: string
  salePrice: number
  costPrice: number
  stock: number
  reorderLevel: number
  status: "ACTIVE" | "INACTIVE" | "DISCONTINUED"
  createdAt: string
  updatedAt: string
}

export interface StockLedgerEntry {
  id: string
  productId: string
  date: string
  type: "purchase" | "sale" | "adjustment" | "transfer"
  quantity: number
  balance: number
  reference: string
  notes?: string
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
  role: "admin" | "manager" | "staff"
  status: "active" | "inactive"
  avatar?: string
  createdAt: string
  lastLogin?: string
}

export interface Permission {
  id: string
  module: string
  action: string
  description: string
}

export interface Role {
  id: string
  name: string
  description: string
  permissions: string[]
  userCount: number
}
