"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useWorkspace } from "@/hooks/use-workspace";
import { WorkspaceLink as Link } from "@/components/workspace-link";
import { PageLoadingSkeleton } from "@/components/ui/page-loading-skeleton";
import {
  useExpensesApi,
  type Expense,
  type UpdateExpenseDto,
  ExpenseStatus,
  PaymentMethod,
} from "@/hooks/use-expenses-api";
import {
  useExpenseCategoriesApi,
  type ExpenseCategory,
} from "@/hooks/use-expense-categories-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, ArrowLeft, ChevronRight, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function EditExpensePage() {
  const params = useParams();
  const expenseId = params?.id as string;

  const [expense, setExpense] = useState<Expense | null>(null);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<UpdateExpenseDto>({});

  const expensesApi = useExpensesApi();
  const categoriesApi = useExpenseCategoriesApi();
  const { toast } = useToast();
  const router = useRouter();
  const ws = useWorkspace();

  useEffect(() => {
    if (!expenseId) return;
    fetchData();
  }, [expenseId]);

  const fetchData = async () => {
    let mounted = true;
    try {
      setLoading(true);
      const [expenseData, categoriesData] = await Promise.all([
        expensesApi.getExpense(expenseId),
        categoriesApi.getExpenseCategories(),
      ]);
      if (!mounted) return;
      setExpense(expenseData);
      setCategories(categoriesData);
      setFormData({
        reference: expenseData.reference,
        amount: expenseData.amount,
        expenseDate: expenseData.expenseDate.split("T")[0],
        description: expenseData.description || "",
        vendor: expenseData.vendor || "",
        status: expenseData.status,
        paymentMethod: expenseData.paymentMethod,
        categoryId: expenseData.categoryId || "",
      });
    } catch (error: any) {
      if (!mounted) return;
      toast({
        title: "Error",
        description: error.message || "Failed to fetch expense",
        variant: "destructive",
      });
      router.push(`/${ws}/${ws}/expenses`);
    } finally {
      if (mounted) setLoading(false);
    }
    return () => { mounted = false; };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expense) return;

    if (formData.reference && !formData.reference.trim()) {
      toast({ title: "Validation Error", description: "Reference is required", variant: "destructive" });
      return;
    }

    if (formData.amount !== undefined && formData.amount <= 0) {
      toast({ title: "Validation Error", description: "Amount must be greater than 0", variant: "destructive" });
      return;
    }

    try {
      setSubmitting(true);
      await expensesApi.updateExpense(expense.id, formData);
      toast({ title: "Success", description: "Expense updated successfully" });
      router.push(`/${ws}/expenses/${expense.id}`);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update expense",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !expense) {
    return <PageLoadingSkeleton />;
  }

  return (
    <div className="space-y-5">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1 text-sm text-muted-foreground mb-0.5">
        <Link href="/dashboard" className="hover:text-foreground transition-colors">Dashboard</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link href="/expenses" className="hover:text-foreground transition-colors">Expenses</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link href={`/expenses/${expense.id}`} className="hover:text-foreground transition-colors">{expense.reference}</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground">Edit</span>
      </div>

      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-[18px] font-bold text-foreground">Edit Expense</h1>
          <p className="text-sm text-muted-foreground">Update expense details for {expense.reference}</p>
        </div>
      </div>

      {/* Form */}
      <div className="border rounded-[5px] bg-card shadow-sm">
        <div className="px-5 py-[15px] border-b">
          <h2 className="text-sm font-semibold text-foreground">Expense Details</h2>
        </div>
        <div className="p-5">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="reference">Reference <span className="text-destructive">*</span></Label>
                <Input
                  id="reference"
                  value={formData.reference}
                  onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                  placeholder="e.g., EXP-1001"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">Amount <span className="text-destructive">*</span></Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) })}
                  placeholder="0.00"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="expenseDate">Date <span className="text-destructive">*</span></Label>
                <Input
                  id="expenseDate"
                  type="date"
                  value={formData.expenseDate}
                  onChange={(e) => setFormData({ ...formData, expenseDate: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="vendor">Vendor <span className="text-destructive">*</span></Label>
                <Input
                  id="vendor"
                  value={formData.vendor}
                  onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
                  placeholder="e.g., Office Depot"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category <span className="text-destructive">*</span></Label>
                <Select
                  value={formData.categoryId}
                  onValueChange={(value) => setFormData({ ...formData, categoryId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="paymentMethod">Payment Method</Label>
                <Select
                  value={formData.paymentMethod}
                  onValueChange={(value) => setFormData({ ...formData, paymentMethod: value as PaymentMethod })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={PaymentMethod.CASH}>Cash</SelectItem>
                    <SelectItem value={PaymentMethod.CREDIT_CARD}>Credit Card</SelectItem>
                    <SelectItem value={PaymentMethod.BANK_TRANSFER}>Bank Transfer</SelectItem>
                    <SelectItem value={PaymentMethod.CHECK}>Check</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of the expense"
                rows={4}
              />
            </div>

            <div className="flex justify-end gap-4">
              <Button type="button" variant="outline" onClick={() => router.back()} disabled={submitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting} className="bg-[#ff9025] hover:bg-[#ff9025]/90">
                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
