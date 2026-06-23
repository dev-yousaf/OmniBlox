"use client";

import { Suspense } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { ProductForm } from "@/components/products/product-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function NewProductForm() {
  const router = useRouter();

  const handleSuccess = () => {
    router.push("/products");
  };

  return <ProductForm onSuccess={handleSuccess} />;
}

export default function NewProductPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/products">
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Products
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            Create New Product
          </h1>
          <p className="text-sm text-muted-foreground">
            Add a new product to your inventory
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Product Information</CardTitle>
          <CardDescription>
            Enter the details for your new product. All required fields must be
            completed.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<div className="text-sm text-muted-foreground">Loading form...</div>}>
            <NewProductForm />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}
