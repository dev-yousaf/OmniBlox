"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useWorkspace } from "@/hooks/use-workspace";
import { ArrowLeft } from "lucide-react";
import { PageLoadingSkeleton } from "@/components/ui/page-loading-skeleton";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  useExpenseCategoriesApi,
  type ExpenseCategory,
} from "@/hooks/use-expense-categories-api";
import { useToast } from "@/hooks/use-toast";

export default function ExpenseCategoryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const ws = useWorkspace();
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<ExpenseCategory | null>(null);

  const api = useExpenseCategoriesApi();
  const { toast } = useToast();

  useEffect(() => {
    fetchCategory();
  }, [params.id]);

  const fetchCategory = async () => {
    try {
      setLoading(true);
      const data = await api.getExpenseCategory(params.id as string);
      setCategory(data);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to fetch category details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <PageLoadingSkeleton />;
  }

  if (!category) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <p className="text-muted-foreground">Category not found</p>
            <Button
              variant="outline"
              onClick={() => router.push(`/${ws}/expenses/categories`)}
              className="mt-4"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Categories
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{category.name}</h1>
            <p className="text-muted-foreground">Category Details</p>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={() => router.push(`/${ws}/expenses/categories`)}
        >
          Back to Categories
        </Button>
      </div>

      {/* Category Information */}
      <Card>
        <CardHeader>
          <CardTitle>Category Information</CardTitle>
          <CardDescription>Details about this expense category</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground">Category Name</p>
            <p className="font-medium text-lg">{category.name}</p>
          </div>
          {category.description && (
            <div>
              <p className="text-sm text-muted-foreground">Description</p>
              <p className="font-medium">{category.description}</p>
            </div>
          )}
          <div>
            <p className="text-sm text-muted-foreground">Category ID</p>
            <p className="font-mono text-sm">{category.id}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}



