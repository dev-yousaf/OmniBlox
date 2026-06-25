import { Quotation, QuotationFormData } from "../_types"
const mockQuotations: Quotation[] = [];

export class QuotationService {
  // Get all quotations
  static async getQuotations(): Promise<Quotation[]> {
    // TODO: Replace with actual API call
    // return await fetch('/api/quotations').then(res => res.json())
    return Promise.resolve(mockQuotations || [])
  }

  // Get quotation by ID
  static async getQuotationById(id: string): Promise<Quotation | null> {
    // TODO: Replace with actual API call
    const items = await this.getQuotations()
    const item = items.find(i => i.id === id)
    return Promise.resolve(item || null)
  }

  // Create new quotation
  static async createQuotation(data: QuotationFormData): Promise<Quotation> {
    // TODO: Replace with actual API call
    const newItem: Quotation = {
      ...data,
      id: `QUOTATIONS-${String(Date.now()).slice(-6)}`
    } as Quotation
    return Promise.resolve(newItem)
  }

  // Update quotation
  static async updateQuotation(id: string, updates: Partial<Quotation>): Promise<Quotation | null> {
    // TODO: Replace with actual API call
    const items = await this.getQuotations()
    const item = items.find(i => i.id === id)
    if (!item) return null
    
    const updatedItem = { ...item, ...updates }
    return Promise.resolve(updatedItem)
  }

  // Delete quotation
  static async deleteQuotation(id: string): Promise<boolean> {
    // TODO: Replace with actual API call
    return Promise.resolve(true)
  }

  // Get statistics
  static async getQuotationStats(): Promise<{
    totalQuotations: number
    activeQuotations: number
  }> {
    const items = await this.getQuotations()
    const totalQuotations = items.length
    const activeQuotations = items.filter(i => i.status === "PENDING" || i.status === "DRAFT").length
    
    return { totalQuotations, activeQuotations }
  }
}
