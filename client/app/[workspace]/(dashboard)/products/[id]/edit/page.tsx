"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useWorkspace } from "@/hooks/use-workspace";
import { RefreshCw, Minus } from "lucide-react";
import { WorkspaceLink as Link } from "@/components/workspace-link";
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
  const ws = useWorkspace();
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
        router.push(`/${ws}/products`);
      } finally {
        setLoading(false);
      }
    };

    if (productId) {
      loadProduct();
    }
  }, [productId, getProduct, toast, router]);

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
        initialData={productData}
        isEdit={true}
        productId={productId}
        onSuccess={() => router.push(`/${ws}/products`)}
      />
    </div>
  );
}
