"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Loader2, ArrowLeft, Save, CheckCircle, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const statusColors = {
  [ExpenseStatus.PENDING]:
    "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  [ExpenseStatus.APPROVED]: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  [ExpenseStatus.PAID]: "bg-green-500/10 text-green-500 border-green-500/20",
  [ExpenseStatus.REJECTED]: "bg-red-500/10 text-red-500 border-red-500/20",
};

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

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expenseId]);

  const fetchData = async () => {
    if (!expenseId) return;

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
      router.push("/expenses");
    } finally {
      if (mounted) setLoading(false);
    }
    return () => {
      mounted = false;
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!expense) return;

    if (formData.reference && !formData.reference.trim()) {
      toast({
        title: "Validation Error",
        description: "Reference is required",
        variant: "destructive",
      });
      return;
    }

    if (formData.amount !== undefined && formData.amount <= 0) {
      toast({
        title: "Validation Error",
        description: "Amount must be greater than 0",
        variant: "destructive",
      });
      return;
    }

    try {
      setSubmitting(true);
      await expensesApi.updateExpense(expense.id, formData);
      toast({
        title: "Success",
        description: "Expense updated successfully",
      });
      router.push("/expenses");
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

  const handleStatusChange = async (newStatus: ExpenseStatus) => {
    if (!expense) return;

    try {
      setSubmitting(true);
      await expensesApi.updateExpenseStatus(expense.id, { status: newStatus });
      toast({
        title: "Success",
        description: `Expense ${newStatus.toLowerCase()} successfully`,
      });
      fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update status",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !expense) {
    return (
      // Use a centered max-width wrapper without Tailwind `container` padding
      <div className="w-full max-w-7xl mx-auto">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  return (
    // Center content and use global layout padding; avoid `container` which adds its own padding
    <div className="w-full max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Edit Expense</h1>
            <p className="text-muted-foreground">
              Update expense details and manage status
            </p>
          </div>
        </div>
        <Badge variant="outline" className={statusColors[expense.status]}>
          {expense.status}
        </Badge>
      </div>

      {/* Expense Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>Expense Information</CardTitle>
          <CardDescription>
            Created by {expense.createdBy?.firstName}{" "}
            {expense.createdBy?.lastName} on{" "}
            {format(new Date(expense.createdAt), "MMM dd, yyyy 'at' h:mm a")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <p className="text-sm text-muted-foreground">Reference</p>
              <p className="font-medium">{expense.reference}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Amount</p>
              <p className="font-semibold text-lg">
                {formatCurrency(expense.amount)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Date</p>
              <p className="font-medium">
                {format(new Date(expense.expenseDate), "MMM dd, yyyy")}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status Management */}
      <Card>
        <CardHeader>
          <CardTitle>Status Management</CardTitle>
          <CardDescription>Approve, reject, or mark as paid</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {expense.status === ExpenseStatus.PENDING && (
              <>
                <Button
                  onClick={() => handleStatusChange(ExpenseStatus.APPROVED)}
                  disabled={submitting}
                  variant="default"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve
                </Button>
                <Button
                  onClick={() => handleStatusChange(ExpenseStatus.REJECTED)}
                  disabled={submitting}
                  variant="destructive"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject
                </Button>
              </>
            )}
            {expense.status === ExpenseStatus.APPROVED && (
              <Button
                onClick={() => handleStatusChange(ExpenseStatus.PAID)}
                disabled={submitting}
                variant="default"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Mark as Paid
              </Button>
            )}
            {expense.status === ExpenseStatus.REJECTED && (
              <p className="text-sm text-muted-foreground">
                This expense has been rejected
              </p>
            )}
            {expense.status === ExpenseStatus.PAID && (
              <p className="text-sm text-muted-foreground">
                This expense has been paid
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Edit Form */}
      <Card>
        <CardHeader>
          <CardTitle>Edit Details</CardTitle>
          <CardDescription>Update expense information</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="reference">
                  Reference <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="reference"
                  value={formData.reference}
                  onChange={(e) =>
                    setFormData({ ...formData, reference: e.target.value })
                  }
                  placeholder="e.g., EXP-1001"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">
                  Amount <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.amount}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      amount: parseFloat(e.target.value),
                    })
                  }
                  placeholder="0.00"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="expenseDate">
                  Date <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="expenseDate"
                  type="date"
                  value={formData.expenseDate}
                  onChange={(e) =>
                    setFormData({ ...formData, expenseDate: e.target.value })
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="vendor">Vendor</Label>
                <Input
                  id="vendor"
                  value={formData.vendor}
                  onChange={(e) =>
                    setFormData({ ...formData, vendor: e.target.value })
                  }
                  placeholder="e.g., Office Depot"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={formData.categoryId}
                  onValueChange={(value) =>
                    setFormData({ ...formData, categoryId: value })
                  }
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
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      paymentMethod: value as PaymentMethod,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={PaymentMethod.CASH}>Cash</SelectItem>
                    <SelectItem value={PaymentMethod.CREDIT_CARD}>
                      Credit Card
                    </SelectItem>
                    <SelectItem value={PaymentMethod.BANK_TRANSFER}>
                      Bank Transfer
                    </SelectItem>
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
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Brief description of the expense"
                rows={4}
              />
            </div>

            <div className="flex justify-end gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
