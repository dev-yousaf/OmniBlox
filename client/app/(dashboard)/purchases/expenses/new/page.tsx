"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useExpensesApi } from "@/hooks/use-expenses-api";
import { useToast } from "@/hooks/use-toast";

export default function NewExpensePage() {
  const router = useRouter();
  const { toast } = useToast();
  const api = useExpensesApi();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    reference: `EXP-${Date.now().toString().slice(-6)}`,
    amount: 0,
    expenseDate: new Date().toISOString().slice(0, 10),
    vendor: "",
    description: "",
    categoryId: "",
  });

  const handleSubmit = async () => {
    if (!form.amount || form.amount <= 0) {
      toast({ title: "Error", description: "Amount is required", variant: "destructive" });
      return;
    }
    try {
      setSubmitting(true);
      await api.createExpense({
        reference: form.reference,
        amount: form.amount,
        expenseDate: form.expenseDate,
        vendor: form.vendor || "",
        description: form.description || undefined,
        categoryId: form.categoryId,
      });
      toast({ title: "Success", description: "Expense created" });
      router.push("/purchases/expenses");
    } catch (e: any) {
      toast({ title: "Error", description: e?.message || "Failed to create expense", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/purchases/expenses">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">New Expense</h1>
          <p className="text-sm text-muted-foreground">Record a new business expense</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Expense Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Reference</Label>
              <Input value={form.reference} disabled />
            </div>
            <div className="space-y-2">
              <Label>Date</Label>
              <Input type="date" value={form.expenseDate} onChange={(e) => setForm({ ...form, expenseDate: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Amount ($)</Label>
              <Input type="number" min={0} step="0.01" value={form.amount || ""} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) || 0 })} />
            </div>
            <div className="space-y-2">
              <Label>Vendor</Label>
              <Input value={form.vendor} onChange={(e) => setForm({ ...form, vendor: e.target.value })} placeholder="Optional vendor" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Optional description" rows={3} />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => router.push("/purchases/expenses")}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? "Creating..." : "Create Expense"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
