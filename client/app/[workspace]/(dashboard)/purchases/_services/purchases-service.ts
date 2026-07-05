import { Purchase, PurchaseFormData } from "../_types"
const mockPurchases: Purchase[] = [];

export class PurchaseService {
  // Get all purchases
  static async getPurchases(): Promise<Purchase[]> {
    // TODO: Replace with actual API call
    // return await fetch('/api/purchases').then(res => res.json())
    return Promise.resolve(mockPurchases || [])
  }

  // Get purchase by ID
  static async getPurchaseById(id: string): Promise<Purchase | null> {
    // TODO: Replace with actual API call
    const items = await this.getPurchases()
    const item = items.find(i => i.id === id)
    return Promise.resolve(item || null)
  }

  // Create new purchase
  static async createPurchase(data: PurchaseFormData): Promise<Purchase> {
    // TODO: Replace with actual API call
    const newItem: Purchase = {
      ...data,
      id: `PURCHASES-${String(Date.now()).slice(-6)}`
    } as Purchase
    return Promise.resolve(newItem)
  }

  // Update purchase
  static async updatePurchase(id: string, updates: Partial<Purchase>): Promise<Purchase | null> {
    // TODO: Replace with actual API call
    const items = await this.getPurchases()
    const item = items.find(i => i.id === id)
    if (!item) return null
    
    const updatedItem = { ...item, ...updates }
    return Promise.resolve(updatedItem)
  }

  // Delete purchase
  static async deletePurchase(id: string): Promise<boolean> {
    // TODO: Replace with actual API call
    return Promise.resolve(true)
  }

  // Get statistics
  static async getPurchaseStats(): Promise<{
    totalPurchases: number
    activePurchases: number
  }> {
    const items = await this.getPurchases()
    const totalPurchases = items.length
    const activePurchases = items.filter(i => i.status === "PENDING" || i.status === "RECEIVED").length
    
    return { totalPurchases, activePurchases }
  }
}
