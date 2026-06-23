"use client";

import type React from "react";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { useProductApi } from "@/hooks/use-product-api";
import { useProductCategoriesApi } from "@/hooks/use-product-categories-api";
import { useToast } from "@/hooks/use-toast";

interface ProductFormData {
  name: string;
  sku: string;
  description: string;
  category: string;
  customCategory: string;
  brand: string;
  type: "STANDARD" | "DIGITAL" | "SERVICE" | "COMBO";
  hasVariants: boolean;
  attributes: string;
  parentId: string;
  salePrice: string;
  costPrice: string;
  stock: string;
  reorderLevel: string;
  status: "ACTIVE" | "INACTIVE" | "DISCONTINUED";
}

interface ProductFormProps {
  initialData?: Partial<ProductFormData>;
  isEdit?: boolean;
  productId?: string;
  onSuccess?: () => void;
}

export function ProductForm({
  initialData,
  isEdit = false,
  productId,
  onSuccess,
}: ProductFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { createProduct, updateProduct, getBrands } = useProductApi();
  const { getCategories } = useProductCategoriesApi();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categories, setCategories] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [brands, setBrands] = useState<string[]>([]);
  const [showCustomCategory, setShowCustomCategory] = useState(false);

  const categoryOptions = useMemo(() => {
    const categoryNames = categories.map((cat) => cat.name);
    // Add "Other" option at the end if not already present
    if (!categoryNames.includes("Other")) {
      categoryNames.push("Other");
    }
    return categoryNames;
  }, [categories]);

  const [formData, setFormData] = useState<ProductFormData>({
    name: initialData?.name || "",
    sku: initialData?.sku || "",
    description: initialData?.description || "",
    category: initialData?.category || "",
    customCategory: "",
    brand: initialData?.brand || "",
    type: initialData?.type || "STANDARD",
    hasVariants: false,
    attributes: "",
    parentId: "",
    salePrice: initialData?.salePrice?.toString() || "",
    costPrice: initialData?.costPrice?.toString() || "",
    stock: initialData?.stock?.toString() || "",
    reorderLevel: initialData?.reorderLevel?.toString() || "",
    status: initialData?.status || "ACTIVE",
  });

  // Load categories and brands on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const [categoriesData, brandsData] = await Promise.all([
          getCategories(),
          getBrands(),
        ]);
        setCategories(categoriesData);
        setBrands(brandsData);
      } catch (error) {
        console.error("Failed to load categories and brands:", error);
        toast({
          title: "Error",
          description: "Failed to load categories and brands",
          variant: "destructive",
        });
      }
    };
    loadData();
  }, [getCategories, getBrands, toast]);

  const handleInputChange = (field: keyof ProductFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    // Show custom category input if "Other" is selected
    if (field === "category") {
      setShowCustomCategory(value === "Other");
      if (value !== "Other") {
        setFormData((prev) => ({ ...prev, customCategory: "" }));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Use custom category if "Other" was selected
      const finalCategory = showCustomCategory
        ? formData.customCategory
        : formData.category;

      if (!finalCategory.trim()) {
        toast({
          title: "Error",
          description: "Please provide a category",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      const isDigitalOrService = formData.type === "DIGITAL" || formData.type === "SERVICE";

      const productData = {
        name: formData.name,
        sku: formData.sku,
        description: formData.description || undefined,
        category: finalCategory,
        brand: formData.brand || undefined,
        type: formData.type,
        salePrice: parseFloat(formData.salePrice),
        costPrice: parseFloat(formData.costPrice),
        stock: isDigitalOrService ? undefined : parseInt(formData.stock),
        reorderLevel: isDigitalOrService ? undefined : parseInt(formData.reorderLevel),
        status: formData.status,
      };

      if (isEdit && productId) {
        await updateProduct(productId, productData);
        toast({
          title: "Success",
          description: "Product updated successfully",
        });
      } else {
        await createProduct(productData);
        toast({
          title: "Success",
          description: "Product created successfully",
        });
      }

      if (onSuccess) {
        onSuccess();
      } else {
        router.push("/products");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save product",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>Essential product details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="sku">SKU *</Label>
                  <Input
                    id="sku"
                    placeholder="PRD-001"
                    value={formData.sku}
                    onChange={(e) => handleInputChange("sku", e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">Product Name *</Label>
                  <Input
                    id="name"
                    placeholder="Enter product name"
                    value={formData.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) =>
                    handleInputChange("category", value)
                  }
                >
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categoryOptions.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {showCustomCategory && (
                <div className="space-y-2">
                  <Label htmlFor="customCategory">Custom Category *</Label>
                  <Input
                    id="customCategory"
                    placeholder="Enter custom category"
                    value={formData.customCategory}
                    onChange={(e) =>
                      handleInputChange("customCategory", e.target.value)
                    }
                    required
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="brand">Brand (Optional)</Label>
                <Input
                  id="brand"
                  placeholder="Enter brand name"
                  value={formData.brand}
                  onChange={(e) => handleInputChange("brand", e.target.value)}
                  list="brands"
                />
                <datalist id="brands">
                  {brands.map((brand) => (
                    <option key={brand} value={brand} />
                  ))}
                </datalist>
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">Product Type</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value: "STANDARD" | "DIGITAL" | "SERVICE" | "COMBO") =>
                    setFormData((prev) => ({ ...prev, type: value }))
                  }
                  disabled={isEdit}
                >
                  <SelectTrigger id="type">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="STANDARD">Standard - Physical product with stock</SelectItem>
                    <SelectItem value="DIGITAL">Digital - Downloadable product, no stock</SelectItem>
                    <SelectItem value="SERVICE">Service - Labor/service, no stock</SelectItem>
                    <SelectItem value="COMBO">Combo - Bundle of products</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Enter product description"
                  value={formData.description}
                  onChange={(e) =>
                    handleInputChange("description", e.target.value)
                  }
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pricing</CardTitle>
              <CardDescription>Set product pricing and costs</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="salePrice">Sale Price *</Label>
                  <Input
                    id="salePrice"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.salePrice}
                    onChange={(e) =>
                      handleInputChange("salePrice", e.target.value)
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="costPrice">Cost Price *</Label>
                  <Input
                    id="costPrice"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.costPrice}
                    onChange={(e) =>
                      handleInputChange("costPrice", e.target.value)
                    }
                    required
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Inventory</CardTitle>
              <CardDescription>
                Stock levels and reorder settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {formData.type !== "DIGITAL" && formData.type !== "SERVICE" && (
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="stock">Initial Stock *</Label>
                    <Input
                      id="stock"
                      type="number"
                      placeholder="0"
                      value={formData.stock}
                      onChange={(e) => handleInputChange("stock", e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reorderLevel">Reorder Level *</Label>
                    <Input
                      id="reorderLevel"
                      type="number"
                      placeholder="0"
                      value={formData.reorderLevel}
                      onChange={(e) =>
                        handleInputChange("reorderLevel", e.target.value)
                      }
                      required
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Status</CardTitle>
              <CardDescription>Product availability</CardDescription>
            </CardHeader>
            <CardContent>
              <Select
                value={formData.status}
                onValueChange={(
                  value: "ACTIVE" | "INACTIVE" | "DISCONTINUED"
                ) => handleInputChange("status", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="INACTIVE">Inactive</SelectItem>
                  <SelectItem value="DISCONTINUED">Discontinued</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <div className="flex flex-col gap-2">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? isEdit
                  ? "Updating..."
                  : "Creating..."
                : isEdit
                ? "Update Product"
                : "Create Product"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/products")}
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}
