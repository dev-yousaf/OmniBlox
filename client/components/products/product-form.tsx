"use client";

import type React from "react";

import { useState, useEffect, useMemo, useCallback } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { useProductApi } from "@/hooks/use-product-api";
import { useProductCategoriesApi } from "@/hooks/use-product-categories-api";
import { useToast } from "@/hooks/use-toast";
import Image from "next/image";

interface VariantAttribute {
  name: string;
  values: string;
}

interface GeneratedVariant {
  id: string;
  combo: string;
  skuSuffix: string;
  salePrice: string;
  costPrice: string;
  stock: string;
}

interface ComboItemEntry {
  productId: string;
  productName: string;
  productSku: string;
  quantity: number;
}

interface ProductFormData {
  name: string;
  sku: string;
  description: string;
  category: string;
  customCategory: string;
  brand: string;
  unit: string;
  imageUrl: string;
  type: "STANDARD" | "DIGITAL" | "SERVICE" | "COMBO";
  hasVariants: boolean;
  attributes: string;
  parentId: string;
  salePrice: string;
  costPrice: string;
  stock: string;
  reorderLevel: string;
  status: "ACTIVE" | "INACTIVE" | "DISCONTINUED";
  comboItems: ComboItemEntry[];
  barcodeSymbology: "CODE128" | "EAN13" | "UPCA" | "QR";
  taxRate: string;
  alertQuantity: string;
}

interface ProductFormProps {
  initialData?: Partial<ProductFormData>;
  isEdit?: boolean;
  productId?: string;
  onSuccess?: () => void;
}

const UNIT_OPTIONS = [
  { value: "pcs", label: "Pieces" },
  { value: "kg", label: "Kilograms" },
  { value: "g", label: "Grams" },
  { value: "liters", label: "Liters" },
  { value: "ml", label: "Milliliters" },
  { value: "m", label: "Meters" },
  { value: "cm", label: "Centimeters" },
  { value: "hours", label: "Hours" },
  { value: "sqm", label: "Square Meters" },
];

const BARCODE_OPTIONS = [
  { value: "CODE128", label: "Code 128" },
  { value: "EAN13", label: "EAN-13" },
  { value: "UPCA", label: "UPC-A" },
  { value: "QR", label: "QR Code" },
];

export function ProductForm({
  initialData,
  isEdit = false,
  productId,
  onSuccess,
}: ProductFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { createProduct, updateProduct, getBrands, getProducts } =
    useProductApi();
  const { getCategories } = useProductCategoriesApi();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categories, setCategories] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [brands, setBrands] = useState<string[]>([]);
  const [showCustomCategory, setShowCustomCategory] = useState(false);

  const [attributesList, setAttributesList] = useState<VariantAttribute[]>([]);
  const [generatedVariants, setGeneratedVariants] = useState<
    GeneratedVariant[]
  >([]);

  const [comboSearchQuery, setComboSearchQuery] = useState("");
  const [comboSearchResults, setComboSearchResults] = useState<
    Array<{ id: string; name: string; sku: string }>
  >([]);
  const [comboSearching, setComboSearching] = useState(false);
  const [comboItems, setComboItems] = useState<ComboItemEntry[]>([]);

  const categoryOptions = useMemo(() => {
    const categoryNames = categories.map((cat) => cat.name);
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
    unit: initialData?.unit || "pcs",
    imageUrl: initialData?.imageUrl || "",
    type: initialData?.type || "STANDARD",
    hasVariants: false,
    attributes: "",
    parentId: "",
    salePrice: initialData?.salePrice?.toString() || "",
    costPrice: initialData?.costPrice?.toString() || "",
    stock: initialData?.stock?.toString() || "",
    reorderLevel: initialData?.reorderLevel?.toString() || "",
    status: initialData?.status || "ACTIVE",
    comboItems: [],
    barcodeSymbology: initialData?.barcodeSymbology || "CODE128",
    taxRate: initialData?.taxRate?.toString() || "",
    alertQuantity: initialData?.alertQuantity?.toString() || "",
  });

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

  useEffect(() => {
    if (formData.comboItems.length > 0) {
      setComboItems(formData.comboItems);
    }
  }, []);

  const handleInputChange = (field: keyof ProductFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    if (field === "category") {
      setShowCustomCategory(value === "Other");
      if (value !== "Other") {
        setFormData((prev) => ({ ...prev, customCategory: "" }));
      }
    }
  };

  const handleVariantToggle = (checked: boolean) => {
    setFormData((prev) => ({ ...prev, hasVariants: checked }));
    if (!checked) {
      setAttributesList([]);
      setGeneratedVariants([]);
    }
  };

  const addAttribute = () => {
    setAttributesList((prev) => [...prev, { name: "", values: "" }]);
  };

  const updateAttribute = (
    index: number,
    field: keyof VariantAttribute,
    value: string
  ) => {
    setAttributesList((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
    setGeneratedVariants([]);
  };

  const removeAttribute = (index: number) => {
    setAttributesList((prev) => prev.filter((_, i) => i !== index));
    setGeneratedVariants([]);
  };

  const cartesianProduct = useCallback(
    (arrays: string[][]): string[][] => {
      if (arrays.length === 0) return [[]];
      return arrays.reduce<string[][]>(
        (acc, curr) => acc.flatMap((a) => curr.map((c) => [...a, c])),
        [[]]
      );
    },
    []
  );

  const generateVariants = () => {
    const valid = attributesList.filter((a) => a.name.trim() && a.values.trim());
    if (valid.length === 0) {
      toast({
        title: "Error",
        description: "Add at least one attribute with values",
        variant: "destructive",
      });
      return;
    }

    const attrNames = valid.map((a) => a.name.trim());
    const attrValues = valid.map((a) =>
      a.values.split(",").map((v) => v.trim()).filter(Boolean)
    );

    if (attrValues.some((v) => v.length === 0)) {
      toast({
        title: "Error",
        description: "Each attribute must have at least one value",
        variant: "destructive",
      });
      return;
    }

    const combos = cartesianProduct(attrValues);

    const variants: GeneratedVariant[] = combos.map((combo) => {
      const comboLabel = combo.join(" - ");
      const skuSuffix = combo.map((v) => v.toUpperCase().replace(/\s+/g, "-")).join("-");
      return {
        id: crypto.randomUUID(),
        combo: comboLabel,
        skuSuffix,
        salePrice: formData.salePrice,
        costPrice: formData.costPrice,
        stock: "0",
      };
    });

    setGeneratedVariants(variants);

    const attrsRecord: Record<string, string> = {};
    valid.forEach((a) => {
      attrsRecord[a.name.trim()] =
        a.values
          .split(",")
          .map((v) => v.trim())
          .filter(Boolean)
          .join(",");
    });

    setFormData((prev) => ({
      ...prev,
      attributes: JSON.stringify(attrsRecord),
    }));
  };

  const updateVariantField = (
    index: number,
    field: keyof GeneratedVariant,
    value: string
  ) => {
    setGeneratedVariants((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const removeVariant = (index: number) => {
    setGeneratedVariants((prev) => prev.filter((_, i) => i !== index));
  };

  const handleComboSearch = async () => {
    if (!comboSearchQuery.trim()) return;
    setComboSearching(true);
    try {
      const result = await getProducts({ search: comboSearchQuery.trim(), limit: 10 });
      const items = (result.products || []).map((p) => ({
        id: p.id,
        name: p.name,
        sku: p.sku,
      }));
      setComboSearchResults(items);
    } catch (error) {
      console.error("Failed to search products:", error);
      toast({
        title: "Error",
        description: "Failed to search products",
        variant: "destructive",
      });
    } finally {
      setComboSearching(false);
    }
  };

  const addComboItem = (product: { id: string; name: string; sku: string }) => {
    if (comboItems.some((item) => item.productId === product.id)) {
      toast({
        title: "Info",
        description: "Product already added to bundle",
      });
      return;
    }
    const newItem: ComboItemEntry = {
      productId: product.id,
      productName: product.name,
      productSku: product.sku,
      quantity: 1,
    };
    setComboItems((prev) => [...prev, newItem]);
    setComboSearchQuery("");
    setComboSearchResults([]);
  };

  const updateComboItemQuantity = (productId: string, quantity: number) => {
    setComboItems((prev) =>
      prev.map((item) =>
        item.productId === productId ? { ...item, quantity } : item
      )
    );
  };

  const removeComboItem = (productId: string) => {
    setComboItems((prev) => prev.filter((item) => item.productId !== productId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    try {
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

      const isDigitalOrService =
        formData.type === "DIGITAL" || formData.type === "SERVICE";
      const isCombo = formData.type === "COMBO";

      let attributesRecord: Record<string, string> | undefined;
      if (formData.hasVariants) {
        try {
          attributesRecord = formData.attributes
            ? JSON.parse(formData.attributes)
            : undefined;
        } catch {
          attributesRecord = undefined;
        }
      }

      const productData: Record<string, unknown> = {
        name: formData.name,
        sku: formData.sku,
        description: formData.description || undefined,
        category: finalCategory,
        brand: formData.brand || undefined,
        unit: formData.unit,
        imageUrl: formData.imageUrl || undefined,
        type: formData.type,
        salePrice: parseFloat(formData.salePrice),
        costPrice: parseFloat(formData.costPrice),
        stock: isDigitalOrService || isCombo
          ? undefined
          : parseInt(formData.stock),
        reorderLevel: isDigitalOrService || isCombo
          ? undefined
          : parseInt(formData.reorderLevel),
        alertQuantity: formData.alertQuantity
          ? parseInt(formData.alertQuantity)
          : undefined,
        barcodeSymbology: formData.barcodeSymbology,
        taxRate: formData.taxRate
          ? parseFloat(formData.taxRate)
          : undefined,
        status: formData.status,
        hasVariants: formData.hasVariants || undefined,
        attributes: attributesRecord,
      };

      if (isCombo && comboItems.length > 0) {
        productData.comboItems = comboItems.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
        }));
      }

      if (isEdit && productId) {
        await updateProduct(productId, productData);
        toast({
          title: "Success",
          description: "Product updated successfully",
        });
      } else {
        await createProduct(productData as any);
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

  const showInventoryFields =
    formData.type === "STANDARD" || formData.type === "COMBO";

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-8 space-y-6">
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
        </div>

        <div className="lg:col-span-4 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Status & Classification</CardTitle>
              <CardDescription>Product status and type</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(
                    value: "ACTIVE" | "INACTIVE" | "DISCONTINUED"
                  ) => handleInputChange("status", value)}
                >
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="INACTIVE">Inactive</SelectItem>
                    <SelectItem value="DISCONTINUED">Discontinued</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">Product Type</Label>
                <Select
                  value={formData.type}
                  onValueChange={(
                    value: "STANDARD" | "DIGITAL" | "SERVICE" | "COMBO"
                  ) =>
                    setFormData((prev) => ({ ...prev, type: value }))
                  }
                  disabled={isEdit}
                >
                  <SelectTrigger id="type">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="STANDARD">
                      Standard - Physical product with stock
                    </SelectItem>
                    <SelectItem value="DIGITAL">
                      Digital - Downloadable product, no stock
                    </SelectItem>
                    <SelectItem value="SERVICE">
                      Service - Labor/service, no stock
                    </SelectItem>
                    <SelectItem value="COMBO">
                      Combo - Bundle of products
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="unit">Unit</Label>
                <Select
                  value={formData.unit}
                  onValueChange={(value) => handleInputChange("unit", value)}
                >
                  <SelectTrigger id="unit">
                    <SelectValue placeholder="Select unit" />
                  </SelectTrigger>
                  <SelectContent>
                    {UNIT_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {!isEdit && (
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="hasVariants"
                    checked={formData.hasVariants}
                    onCheckedChange={(checked) =>
                      handleVariantToggle(checked === true)
                    }
                  />
                  <Label htmlFor="hasVariants" className="text-sm font-normal">
                    This product has variants
                  </Label>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pricing</CardTitle>
              <CardDescription>Set product pricing and costs</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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
            </CardContent>
          </Card>

          {showInventoryFields && (
            <Card>
              <CardHeader>
                <CardTitle>Inventory</CardTitle>
                <CardDescription>Stock levels and alerts</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="stock">Initial Stock *</Label>
                  <Input
                    id="stock"
                    type="number"
                    placeholder="0"
                    value={formData.stock}
                    onChange={(e) =>
                      handleInputChange("stock", e.target.value)
                    }
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
                <div className="space-y-2">
                  <Label htmlFor="alertQuantity">Alert Quantity</Label>
                  <Input
                    id="alertQuantity"
                    type="number"
                    placeholder="0"
                    value={formData.alertQuantity}
                    onChange={(e) =>
                      handleInputChange("alertQuantity", e.target.value)
                    }
                  />
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Media</CardTitle>
              <CardDescription>Product image</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="imageUrl">Image URL (Optional)</Label>
                <Input
                  id="imageUrl"
                  placeholder="https://..."
                  value={formData.imageUrl}
                  onChange={(e) =>
                    handleInputChange("imageUrl", e.target.value)
                  }
                />
                {formData.imageUrl && (
                  <div className="relative mt-2 h-16 w-16 overflow-hidden rounded border">
                    <Image
                      src={formData.imageUrl}
                      alt="Product preview"
                      fill
                      className="object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Metadata</CardTitle>
              <CardDescription>Additional product settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="barcodeSymbology">Barcode Symbology</Label>
                <Select
                  value={formData.barcodeSymbology}
                  onValueChange={(value) =>
                    handleInputChange(
                      "barcodeSymbology",
                      value as "CODE128" | "EAN13" | "UPCA" | "QR"
                    )
                  }
                >
                  <SelectTrigger id="barcodeSymbology">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BARCODE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="taxRate">Tax Rate (%)</Label>
                <Input
                  id="taxRate"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.taxRate}
                  onChange={(e) =>
                    handleInputChange("taxRate", e.target.value)
                  }
                />
              </div>

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
            </CardContent>
          </Card>

          {formData.type === "COMBO" && (
            <Card>
              <CardHeader>
                <CardTitle>Combo Items</CardTitle>
                <CardDescription>Products included in this bundle</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Search products by name or SKU..."
                    value={comboSearchQuery}
                    onChange={(e) => setComboSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleComboSearch();
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleComboSearch}
                    disabled={comboSearching}
                  >
                    {comboSearching ? "Searching..." : "Search"}
                  </Button>
                </div>

                {comboSearchResults.length > 0 && (
                  <div className="max-h-40 overflow-y-auto rounded border">
                    {comboSearchResults.map((product) => {
                      const alreadyAdded = comboItems.some(
                        (item) => item.productId === product.id
                      );
                      return (
                        <div
                          key={product.id}
                          className="flex items-center justify-between px-3 py-2 hover:bg-muted cursor-pointer"
                          onClick={() => addComboItem(product)}
                        >
                          <div>
                            <span className="text-sm font-medium">
                              {product.name}
                            </span>
                            <span className="text-xs text-muted-foreground ml-2">
                              {product.sku}
                            </span>
                          </div>
                          {alreadyAdded && (
                            <span className="text-xs text-muted-foreground">
                              Already added
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {comboItems.length > 0 && (
                  <div className="space-y-2">
                    {comboItems.map((item) => (
                      <div
                        key={item.productId}
                        className="flex items-center gap-2 rounded border p-2"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {item.productName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {item.productSku}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Label className="sr-only">Quantity</Label>
                          <Input
                            type="number"
                            className="w-20 h-8"
                            min={1}
                            value={item.quantity}
                            onChange={(e) =>
                              updateComboItemQuantity(
                                item.productId,
                                parseInt(e.target.value) || 1
                              )
                            }
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeComboItem(item.productId)}
                          >
                            X
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {!isEdit && formData.hasVariants && (
            <Card>
              <CardHeader>
                <CardTitle>Variants</CardTitle>
                <CardDescription>
                  Create product variants (e.g. different sizes, colors)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Attributes</span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addAttribute}
                    >
                      Add Attribute
                    </Button>
                  </div>

                  {attributesList.map((attr, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-2 rounded border p-3"
                    >
                      <div className="flex-1 space-y-1">
                        <Label className="text-xs">Attribute Name</Label>
                        <Input
                          placeholder='e.g. "Color"'
                          value={attr.name}
                          onChange={(e) =>
                            updateAttribute(index, "name", e.target.value)
                          }
                        />
                      </div>
                      <div className="flex-[2] space-y-1">
                        <Label className="text-xs">
                          Values (comma-separated)
                        </Label>
                        <Input
                          placeholder='e.g. "Red, Blue, Green"'
                          value={attr.values}
                          onChange={(e) =>
                            updateAttribute(index, "values", e.target.value)
                          }
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="mt-5"
                        onClick={() => removeAttribute(index)}
                      >
                        X
                      </Button>
                    </div>
                  ))}
                </div>

                {attributesList.length > 0 && (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={generateVariants}
                  >
                    Generate Variants
                  </Button>
                )}

                {generatedVariants.length > 0 && (
                  <div className="overflow-x-auto rounded border">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="px-3 py-2 text-left font-medium">
                            Variant
                          </th>
                          <th className="px-3 py-2 text-left font-medium">
                            SKU Suffix
                          </th>
                          <th className="px-3 py-2 text-left font-medium">
                            Sale Price
                          </th>
                          <th className="px-3 py-2 text-left font-medium">
                            Cost Price
                          </th>
                          <th className="px-3 py-2 text-left font-medium">
                            Stock
                          </th>
                          <th className="px-3 py-2" />
                        </tr>
                      </thead>
                      <tbody>
                        {generatedVariants.map((variant, index) => (
                          <tr key={variant.id} className="border-b">
                            <td className="px-3 py-2 text-xs">
                              {variant.combo}
                            </td>
                            <td className="px-3 py-2">
                              <Input
                                className="h-8 text-xs"
                                value={variant.skuSuffix}
                                onChange={(e) =>
                                  updateVariantField(
                                    index,
                                    "skuSuffix",
                                    e.target.value
                                  )
                                }
                              />
                            </td>
                            <td className="px-3 py-2">
                              <Input
                                type="number"
                                step="0.01"
                                className="h-8 text-xs w-24"
                                value={variant.salePrice}
                                onChange={(e) =>
                                  updateVariantField(
                                    index,
                                    "salePrice",
                                    e.target.value
                                  )
                                }
                              />
                            </td>
                            <td className="px-3 py-2">
                              <Input
                                type="number"
                                step="0.01"
                                className="h-8 text-xs w-24"
                                value={variant.costPrice}
                                onChange={(e) =>
                                  updateVariantField(
                                    index,
                                    "costPrice",
                                    e.target.value
                                  )
                                }
                              />
                            </td>
                            <td className="px-3 py-2">
                              <Input
                                type="number"
                                className="h-8 text-xs w-20"
                                value={variant.stock}
                                onChange={(e) =>
                                  updateVariantField(
                                    index,
                                    "stock",
                                    e.target.value
                                  )
                                }
                              />
                            </td>
                            <td className="px-3 py-2">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8"
                                onClick={() => removeVariant(index)}
                              >
                                X
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

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
