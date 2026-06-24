"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { RefreshCw, Minus } from "lucide-react";
import Link from "next/link";
import { ProductForm } from "@/components/products/product-form";

function NewProductForm() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);

  const handleSuccess = () => {
    router.push("/products");
  };

  return (
    <>
      <ProductForm ref={formRef} onSuccess={handleSuccess} />
      <div className="flex items-center justify-end gap-2 mt-6">
        <Link href="/products">
          <Button variant="outline" className="h-[34px] px-4 text-[13px]">Cancel</Button>
        </Link>
        <Button
          className="h-[34px] px-4 text-[13px] bg-[#092c4c] text-white hover:bg-[#092c4c]/90"
          onClick={() => formRef.current?.requestSubmit()}
        >
          Save Product
        </Button>
      </div>
    </>
  );
}

export default function NewProductPage() {
  return (
    <div className="max-w-[1440px] mx-auto">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-3xl font-semibold tracking-tight">Add Product</h1>
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
          <Link href="/dashboard" className="hover:text-foreground">Inventory</Link>
          <span>/</span>
          <Link href="/products" className="hover:text-foreground">Products</Link>
          <span>/</span>
          <span className="text-foreground font-medium">Add Product</span>
        </div>
      </div>

      <NewProductForm />
    </div>
  );
}
