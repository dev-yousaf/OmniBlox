import { Expense, ExpenseFormData } from "../_types"
const mockExpenses: Expense[] = [];

export class ExpenseService {
  // Get all expenses
  static async getExpenses(): Promise<Expense[]> {
    // TODO: Replace with actual API call
    // return await fetch('/api/expenses').then(res => res.json())
    return Promise.resolve(mockExpenses || [])
  }

  // Get expense by ID
  static async getExpenseById(id: string): Promise<Expense | null> {
    // TODO: Replace with actual API call
    const items = await this.getExpenses()
    const item = items.find(i => i.id === id)
    return Promise.resolve(item || null)
  }

  // Create new expense
  static async createExpense(data: ExpenseFormData): Promise<Expense> {
    // TODO: Replace with actual API call
    const newItem: Expense = {
      ...data,
      id: `EXPENSES-${String(Date.now()).slice(-6)}`
    } as Expense
    return Promise.resolve(newItem)
  }

  // Update expense
  static async updateExpense(id: string, updates: Partial<Expense>): Promise<Expense | null> {
    // TODO: Replace with actual API call
    const items = await this.getExpenses()
    const item = items.find(i => i.id === id)
    if (!item) return null
    
    const updatedItem = { ...item, ...updates }
    return Promise.resolve(updatedItem)
  }

  // Delete expense
  static async deleteExpense(id: string): Promise<boolean> {
    // TODO: Replace with actual API call
    return Promise.resolve(true)
  }

  // Get statistics
  static async getExpenseStats(): Promise<{
    totalExpenses: number
    activeExpenses: number
  }> {
    const items = await this.getExpenses()
    const totalExpenses = items.length
    const activeExpenses = items.filter(i => i.status === "PENDING" || i.status === "APPROVED").length
    
    return { totalExpenses, activeExpenses }
  }
}
