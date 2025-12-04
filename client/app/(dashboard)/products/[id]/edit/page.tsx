"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { ProductForm } from "@/components/products/product-form";
import { useProductApi } from "@/hooks/use-product-api";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { use } from "react";

export default function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: productId } = use(params);
  const { getProduct } = useProductApi();
  const { toast } = useToast();
  const router = useRouter();
  const [productData, setProductData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProduct = async () => {
      try {
        const product = await getProduct(productId);
        setProductData(product);
      } catch (error: any) {
        toast({
          title: "Error",
          description: error.message || "Failed to load product",
          variant: "destructive",
        });
        router.push("/products");
      } finally {
        setLoading(false);
      }
    };

    if (productId) {
      loadProduct();
    }
  }, [productId, getProduct, toast, router]);

  const handleSuccess = () => {
    router.push("/products");
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="text-center py-8">Loading product...</div>
      </div>
    );
  }

  if (!productData) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/products">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Products
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">
              Product Not Found
            </h1>
            <p className="text-sm text-muted-foreground">
              The requested product could not be found.
            </p>
          </div>
        </div>
      </div>
    );
  }

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
            Edit Product
          </h1>
          <p className="text-sm text-muted-foreground">
            Update product information
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Product Information</CardTitle>
          <CardDescription>
            Update the details for this product. All required fields must be
            completed.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProductForm
            initialData={productData}
            isEdit={true}
            productId={productId}
            onSuccess={handleSuccess}
          />
        </CardContent>
      </Card>
    </div>
  );
}
