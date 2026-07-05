"use client"

import { useState, useEffect, useMemo } from "react"
import type { Supplier, SupplierStats, SupplierFilters } from "../_types"
import { SupplierService } from "../_services/supplier-service"

export function useSuppliers() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadSuppliers = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await SupplierService.getSuppliers()
      setSuppliers(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load suppliers")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSuppliers()
  }, [])

  const createSupplier = async (supplierData: Omit<Supplier, "id" | "totalPurchases" | "lastPurchase">) => {
    try {
      const newSupplier = await SupplierService.createSupplier(supplierData)
      setSuppliers(prev => [...prev, newSupplier])
      return newSupplier
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create supplier")
      throw err
    }
  }

  const updateSupplier = async (id: string, updates: Partial<Supplier>) => {
    try {
      const updatedSupplier = await SupplierService.updateSupplier(id, updates)
      if (updatedSupplier) {
        setSuppliers(prev => prev.map(s => s.id === id ? updatedSupplier : s))
        return updatedSupplier
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update supplier")
      throw err
    }
  }

  const deleteSupplier = async (id: string) => {
    try {
      await SupplierService.deleteSupplier(id)
      setSuppliers(prev => prev.filter(s => s.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete supplier")
      throw err
    }
  }

  return {
    suppliers,
    loading,
    error,
    loadSuppliers,
    createSupplier,
    updateSupplier,
    deleteSupplier,
  }
}

export function useSupplierFilters(suppliers: Supplier[]) {
  const [filters, setFilters] = useState<SupplierFilters>({
    searchQuery: "",
    statusFilter: "all",
  })

  const filteredSuppliers = useMemo(() => {
    return suppliers.filter((supplier) => {
      const matchesSearch = supplier.name.toLowerCase().includes(filters.searchQuery.toLowerCase()) ||
                           supplier.company.toLowerCase().includes(filters.searchQuery.toLowerCase()) ||
                           supplier.email.toLowerCase().includes(filters.searchQuery.toLowerCase())
      
      const matchesStatus = filters.statusFilter === "all" || supplier.status === filters.statusFilter
      
      return matchesSearch && matchesStatus
    })
  }, [suppliers, filters])

  return {
    filters,
    setFilters,
    filteredSuppliers,
  }
}

export function useSupplierStats() {
  const [stats, setStats] = useState<SupplierStats>({
    totalSuppliers: 0,
    activeSuppliers: 0,
    totalBalance: 0,
    totalPurchases: 0,
  })
  const [loading, setLoading] = useState(true)

  const loadStats = async () => {
    try {
      setLoading(true)
      const data = await SupplierService.getSupplierStats()
      setStats(data)
    } catch (err) {
      console.error("Failed to load supplier stats:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadStats()
  }, [])

  return { stats, loading, refreshStats: loadStats }
}
