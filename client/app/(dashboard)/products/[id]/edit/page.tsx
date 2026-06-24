"use client";

import { use, useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { RefreshCw, Minus } from "lucide-react";
import Link from "next/link";
import { PageLoadingSkeleton } from "@/components/ui/page-loading-skeleton";
import { ProductForm } from "@/components/products/product-form";
import { useProductApi } from "@/hooks/use-product-api";
import { useToast } from "@/hooks/use-toast";

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
  const formRef = useRef<HTMLFormElement>(null);

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
    return <PageLoadingSkeleton />;
  }

  if (!productData) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-4">
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
    <div className="max-w-[1440px] mx-auto">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-3xl font-semibold tracking-tight">Edit Product</h1>
          <div className="flex items-center gap-3">
            <button className="flex items-center justify-center w-4 h-4 text-muted-foreground hover:text-foreground" title="Refresh">
              <RefreshCw className="w-full h-full" />
            </button>
            <button className="flex items-center justify-center w-4 h-4 text-muted-foreground hover:text-foreground" title="Collapse">
              <Minus className="w-full h-full" />
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/dashboard" className="hover:text-foreground transition-colors">Dashboard</Link>
          <span>/</span>
          <Link href="/products" className="hover:text-foreground transition-colors">Products</Link>
          <span>/</span>
          <Link href={`/products/${productId}`} className="hover:text-foreground transition-colors">{productData.name}</Link>
          <span>/</span>
          <span className="text-foreground font-medium">Edit</span>
        </div>
      </div>

      <ProductForm
        ref={formRef}
        initialData={productData}
        isEdit={true}
        productId={productId}
        onSuccess={handleSuccess}
      />
      <div className="flex items-center justify-end gap-2 mt-6">
        <Link href={`/products/${productId}`}>
          <Button variant="outline" className="h-[34px] px-4 text-[13px]">Cancel</Button>
        </Link>
        <Button
          className="h-[34px] px-4 text-[13px] bg-[#092c4c] text-white hover:bg-[#092c4c]/90"
          onClick={() => formRef.current?.requestSubmit()}
        >
          Save Product
        </Button>
      </div>
    </div>
  );
}
