"use client"

import type { Supplier, SupplierStats } from "../_types"

// Mock data for suppliers
const mockSuppliers: Supplier[] = [
  {
    id: "SUP-001",
    name: "John Electronics Ltd",
    company: "John Electronics Ltd",
    email: "contact@johnelectronics.com",
    phone: "+1 234 567 8900",
    address: "123 Industrial Ave",
    city: "New York",
    country: "USA",
    taxId: "TAX123456789",
    status: "active",
    balance: -15420.50,
    totalPurchases: 485230.75,
    lastPurchase: "2024-01-15",
    paymentTerms: "Net 30",
    rating: 5,
  },
  {
    id: "SUP-002",
    name: "Tech Supply Co",
    company: "Tech Supply Co",
    email: "orders@techsupply.com",
    phone: "+1 234 567 8901",
    address: "456 Commerce St",
    city: "Los Angeles",
    country: "USA",
    taxId: "TAX987654321",
    status: "active",
    balance: -8750.25,
    totalPurchases: 298450.00,
    lastPurchase: "2024-01-12",
    paymentTerms: "Net 15",
    rating: 4,
  },
  {
    id: "SUP-003",
    name: "Global Hardware Inc",
    company: "Global Hardware Inc",
    email: "sales@globalhardware.com",
    phone: "+1 234 567 8902",
    address: "789 Business Blvd",
    city: "Chicago",
    country: "USA",
    taxId: "TAX456789123",
    status: "active",
    balance: 0,
    totalPurchases: 156780.50,
    lastPurchase: "2024-01-10",
    paymentTerms: "Net 45",
    rating: 4,
  },
  {
    id: "SUP-004",
    name: "Parts Warehouse",
    company: "Parts Warehouse LLC",
    email: "info@partswarehouse.com",
    phone: "+1 234 567 8903",
    address: "321 Supply Chain Dr",
    city: "Houston",
    country: "USA",
    taxId: "TAX789123456",
    status: "inactive",
    balance: -2340.00,
    totalPurchases: 89450.25,
    lastPurchase: "2023-12-20",
    paymentTerms: "COD",
    rating: 3,
  },
]

export class SupplierService {
  static async getSuppliers(): Promise<Supplier[]> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500))
    return Promise.resolve([...mockSuppliers])
  }

  static async getSupplierById(id: string): Promise<Supplier | null> {
    await new Promise(resolve => setTimeout(resolve, 300))
    const supplier = mockSuppliers.find(s => s.id === id)
    return Promise.resolve(supplier || null)
  }

  static async createSupplier(supplier: Omit<Supplier, "id" | "totalPurchases" | "lastPurchase">): Promise<Supplier> {
    await new Promise(resolve => setTimeout(resolve, 500))
    const newSupplier: Supplier = {
      ...supplier,
      id: `SUP-${String(mockSuppliers.length + 1).padStart(3, '0')}`,
      totalPurchases: 0,
      lastPurchase: new Date().toISOString().split('T')[0],
    }
    mockSuppliers.push(newSupplier)
    return Promise.resolve(newSupplier)
  }

  static async updateSupplier(id: string, updates: Partial<Supplier>): Promise<Supplier | null> {
    await new Promise(resolve => setTimeout(resolve, 500))
    const index = mockSuppliers.findIndex(s => s.id === id)
    if (index !== -1) {
      mockSuppliers[index] = { ...mockSuppliers[index], ...updates }
      return Promise.resolve(mockSuppliers[index])
    }
    return Promise.resolve(null)
  }

  static async deleteSupplier(id: string): Promise<boolean> {
    await new Promise(resolve => setTimeout(resolve, 500))
    const index = mockSuppliers.findIndex(s => s.id === id)
    if (index !== -1) {
      mockSuppliers.splice(index, 1)
      return Promise.resolve(true)
    }
    return Promise.resolve(false)
  }

  static async getSupplierStats(): Promise<SupplierStats> {
    await new Promise(resolve => setTimeout(resolve, 300))
    const stats: SupplierStats = {
      totalSuppliers: mockSuppliers.length,
      activeSuppliers: mockSuppliers.filter(s => s.status === "active").length,
      totalBalance: mockSuppliers.reduce((sum, s) => sum + Math.abs(s.balance), 0),
      totalPurchases: mockSuppliers.reduce((sum, s) => sum + s.totalPurchases, 0),
    }
    return Promise.resolve(stats)
  }
}
