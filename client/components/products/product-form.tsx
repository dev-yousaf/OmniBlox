"use client";

import type React from "react";

import { useState, useEffect, useMemo, useCallback, forwardRef } from "react";
import { useRouter } from "next/navigation";
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
import {
  Info,
  LifeBuoy,
  ImageIcon,
  List,
  CircleChevronDown,
  CirclePlus,
  Calendar,
} from "lucide-react";

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
  subCategory: string;
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
  itemCode: string;
  manufacturer: string;
  warranty: string;
  manufacturedDate: string;
  expiryDate: string;
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

const WARRANTY_OPTIONS = [
  { value: "no_warranty", label: "No Warranty" },
  { value: "30_days", label: "30 Days" },
  { value: "3_months", label: "3 Months" },
  { value: "6_months", label: "6 Months" },
  { value: "1_year", label: "1 Year" },
  { value: "2_years", label: "2 Years" },
  { value: "lifetime", label: "Lifetime" },
];

function CardSection({
  icon,
  title,
  children,
  defaultOpen = true,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border border-border rounded-[5px]">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full px-5 py-[15px] border-b border-border bg-card rounded-t-[5px]"
      >
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground shrink-0">{icon}</span>
          <span className="text-[16px] font-bold text-[#212b36] dark:text-card-foreground">{title}</span>
        </div>
        <CircleChevronDown
          className={`h-5 w-5 text-muted-foreground transition-transform ${open ? "" : "-rotate-90"}`}
        />
      </button>
      {open && <div className="p-5 bg-card rounded-b-[5px]">{children}</div>}
    </div>
  );
}

function FormField({
  label,
  required = false,
  children,
  className = "",
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-col gap-[4px] ${className}`}>
      <Label className="text-[14px] font-medium text-[#212b36] dark:text-card-foreground leading-[21px]">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </Label>
      {children}
    </div>
  );
}

const ProductForm = forwardRef<HTMLFormElement, ProductFormProps>(
  function ProductForm({ initialData, isEdit = false, productId, onSuccess }, ref) {
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

    const [customFieldsEnabled, setCustomFieldsEnabled] = useState({
      warranties: !!initialData?.warranty,
      manufacturer: !!initialData?.manufacturer,
      expiry: !!initialData?.expiryDate || !!initialData?.manufacturedDate,
    });

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

    const [imagePreview, setImagePreview] = useState<string | null>(
      initialData?.imageUrl || null
    );

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
      subCategory: initialData?.subCategory || "",
      brand: initialData?.brand || "",
      unit: initialData?.unit || "pcs",
      imageUrl: initialData?.imageUrl || "",
      type: initialData?.type || "STANDARD",
      hasVariants: initialData?.hasVariants || false,
      attributes: initialData?.attributes || "",
      parentId: initialData?.parentId || "",
      salePrice: initialData?.salePrice?.toString() || "",
      costPrice: initialData?.costPrice?.toString() || "",
      stock: initialData?.stock?.toString() || "",
      reorderLevel: initialData?.reorderLevel?.toString() || "",
      status: initialData?.status || "ACTIVE",
      comboItems: initialData?.comboItems || [],
      barcodeSymbology: (initialData?.barcodeSymbology as "CODE128" | "EAN13" | "UPCA" | "QR") || "CODE128",
      taxRate: initialData?.taxRate?.toString() || "",
      alertQuantity: initialData?.alertQuantity?.toString() || "",
      itemCode: initialData?.itemCode || "",
      manufacturer: initialData?.manufacturer || "",
      warranty: initialData?.warranty || "",
      manufacturedDate: initialData?.manufacturedDate || "",
      expiryDate: initialData?.expiryDate || "",
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
        toast({ title: "Error", description: "Add at least one attribute with values", variant: "destructive" });
        return;
      }

      const attrValues = valid.map((a) =>
        a.values.split(",").map((v) => v.trim()).filter(Boolean)
      );

      if (attrValues.some((v) => v.length === 0)) {
        toast({ title: "Error", description: "Each attribute must have at least one value", variant: "destructive" });
        return;
      }

      const combos = cartesianProduct(attrValues);

      const variants: GeneratedVariant[] = combos.map((combo) => ({
        id: crypto.randomUUID(),
        combo: combo.join(" - "),
        skuSuffix: combo.map((v) => v.toUpperCase().replace(/\s+/g, "-")).join("-"),
        salePrice: formData.salePrice,
        costPrice: formData.costPrice,
        stock: "0",
      }));

      setGeneratedVariants(variants);

      const attrsRecord: Record<string, string> = {};
      valid.forEach((a) => {
        attrsRecord[a.name.trim()] =
          a.values.split(",").map((v) => v.trim()).filter(Boolean).join(",");
      });

      setFormData((prev) => ({ ...prev, attributes: JSON.stringify(attrsRecord) }));
    };

    const updateVariantField = (index: number, field: keyof GeneratedVariant, value: string) => {
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
        setComboSearchResults((result.products || []).map((p) => ({ id: p.id, name: p.name, sku: p.sku })));
      } catch (error) {
        console.error("Failed to search products:", error);
        toast({ title: "Error", description: "Failed to search products", variant: "destructive" });
      } finally {
        setComboSearching(false);
      }
    };

    const addComboItem = (product: { id: string; name: string; sku: string }) => {
      if (comboItems.some((item) => item.productId === product.id)) {
        toast({ title: "Info", description: "Product already added to bundle" });
        return;
      }
      setComboItems((prev) => [...prev, { productId: product.id, productName: product.name, productSku: product.sku, quantity: 1 }]);
      setComboSearchQuery("");
      setComboSearchResults([]);
    };

    const updateComboItemQuantity = (productId: string, quantity: number) => {
      setComboItems((prev) => prev.map((item) => item.productId === productId ? { ...item, quantity } : item));
    };

    const removeComboItem = (productId: string) => {
      setComboItems((prev) => prev.filter((item) => item.productId !== productId));
    };

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (evt) => {
        const dataUrl = evt.target?.result as string;
        setImagePreview(dataUrl);
        handleInputChange("imageUrl", dataUrl);
      };
      reader.readAsDataURL(file);
    };

    const generateSku = () => {
      const prefix = "PRD";
      const num = Date.now().toString(36).toUpperCase().slice(-5);
      handleInputChange("sku", `${prefix}-${num}`);
    };

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (isSubmitting) return;
      setIsSubmitting(true);

      try {
        const finalCategory = showCustomCategory ? formData.customCategory : formData.category;
        if (!finalCategory.trim()) {
          toast({ title: "Error", description: "Please provide a category", variant: "destructive" });
          setIsSubmitting(false);
          return;
        }

        const isDigitalOrService = formData.type === "DIGITAL" || formData.type === "SERVICE";
        const isCombo = formData.type === "COMBO";

        let attributesRecord: Record<string, string> | undefined;
        if (formData.hasVariants) {
          try { attributesRecord = formData.attributes ? JSON.parse(formData.attributes) : undefined; } catch { attributesRecord = undefined; }
        }

        const productData: Record<string, unknown> = {
          name: formData.name,
          sku: formData.sku,
          description: formData.description || undefined,
          category: finalCategory,
          subCategory: customFieldsEnabled.warranties ? formData.subCategory || undefined : undefined,
          brand: formData.brand || undefined,
          unit: formData.unit,
          imageUrl: formData.imageUrl || undefined,
          type: formData.type,
          itemCode: formData.itemCode || undefined,
          manufacturer: customFieldsEnabled.manufacturer ? formData.manufacturer || undefined : undefined,
          warranty: customFieldsEnabled.warranties ? formData.warranty || undefined : undefined,
          manufacturedDate: customFieldsEnabled.expiry ? formData.manufacturedDate || undefined : undefined,
          expiryDate: customFieldsEnabled.expiry ? formData.expiryDate || undefined : undefined,
          salePrice: parseFloat(formData.salePrice),
          costPrice: parseFloat(formData.costPrice),
          stock: isDigitalOrService || isCombo ? undefined : parseInt(formData.stock),
          reorderLevel: isDigitalOrService || isCombo ? undefined : parseInt(formData.reorderLevel),
          alertQuantity: formData.alertQuantity ? parseInt(formData.alertQuantity) : undefined,
          barcodeSymbology: formData.barcodeSymbology,
          taxRate: formData.taxRate ? parseFloat(formData.taxRate) : undefined,
          status: formData.status,
          hasVariants: formData.hasVariants || undefined,
          attributes: attributesRecord,
        };

        if (isCombo && comboItems.length > 0) {
          productData.comboItems = comboItems.map((item) => ({ productId: item.productId, quantity: item.quantity }));
        }

        if (isEdit && productId) {
          await updateProduct(productId, productData);
          toast({ title: "Success", description: "Product updated successfully" });
        } else {
          await createProduct(productData as any);
          toast({ title: "Success", description: "Product created successfully" });
        }

        if (onSuccess) onSuccess();
        else router.push("/products");
      } catch (error: any) {
        toast({ title: "Error", description: error.message || "Failed to save product", variant: "destructive" });
      } finally {
        setIsSubmitting(false);
      }
    };

    return (
      <form ref={ref} onSubmit={handleSubmit} className="space-y-5">
        {/* Product Information */}
        <CardSection icon={<Info className="h-4 w-4" />} title="Product Information">
          <div className="space-y-4">
            <div className="flex gap-4">
              <FormField label="Product Name" required className="flex-1">
                <Input placeholder="Enter product name" value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)} required
                  className="h-[38px] rounded-[5px] px-3 py-[7px] text-[14px]" />
              </FormField>
              <FormField label="Slug" className="flex-1">
                <Input placeholder="product-name" value={formData.sku}
                  onChange={(e) => handleInputChange("description", e.target.value)}
                  className="h-[38px] rounded-[5px] px-3 py-[7px] text-[14px]" />
              </FormField>
            </div>

            <div className="flex gap-4">
              <FormField label="SKU" required className="flex-1">
                <div className="flex gap-2">
                  <Input placeholder="PRD-001" value={formData.sku}
                    onChange={(e) => handleInputChange("sku", e.target.value)} required
                    className="h-[38px] rounded-[5px] px-3 py-[7px] text-[14px] flex-1" />
                  <button type="button" onClick={generateSku}
                    className="h-[38px] px-3 rounded-[5px] text-[11px] font-medium text-white bg-[#fe9f43] hover:bg-[#fe9f43]/90 shrink-0">
                    Generate
                  </button>
                </div>
              </FormField>
              <FormField label="Selling Type" required className="flex-1">
                <Select value={formData.type}
                  onValueChange={(value: "STANDARD" | "DIGITAL" | "SERVICE" | "COMBO") =>
                    setFormData((prev) => ({ ...prev, type: value }))
                  }
                  disabled={isEdit}>
                  <SelectTrigger className="h-[38px] rounded-[5px] px-3 py-[7px] text-[14px]">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="STANDARD">Standard</SelectItem>
                    <SelectItem value="DIGITAL">Digital</SelectItem>
                    <SelectItem value="SERVICE">Service</SelectItem>
                    <SelectItem value="COMBO">Combo</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>
            </div>

            <div className="flex gap-4">
              <FormField label="Category" required className="flex-1">
                <div>
                  <Select value={formData.category} onValueChange={(value) => handleInputChange("category", value)}>
                    <SelectTrigger className="h-[38px] rounded-[5px] px-3 py-[7px] text-[14px]">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {categoryOptions.map((cat) => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <button type="button" className="flex items-center gap-1 mt-1 text-[13px] text-[#fe9f43] font-medium hover:underline">
                    <CirclePlus className="h-3.5 w-3.5" />
                    Add New
                  </button>
                </div>
              </FormField>
              <FormField label="Sub Category" className="flex-1">
                <Input placeholder="e.g. Electronics > Phones" value={formData.subCategory}
                  onChange={(e) => handleInputChange("subCategory", e.target.value)}
                  className="h-[38px] rounded-[5px] px-3 py-[7px] text-[14px]" />
              </FormField>
            </div>

            <div className="flex gap-4">
              <FormField label="Brand" required className="flex-1">
                <Select value={formData.brand} onValueChange={(value) => handleInputChange("brand", value)}>
                  <SelectTrigger className="h-[38px] rounded-[5px] px-3 py-[7px] text-[14px]">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {brands.length > 0 ? brands.map((b) => (
                      <SelectItem key={b} value={b}>{b}</SelectItem>
                    )) : (
                      <SelectItem value="__no_brands" disabled>No brands available</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </FormField>
              <FormField label="Unit" required className="flex-1">
                <Select value={formData.unit} onValueChange={(value) => handleInputChange("unit", value)}>
                  <SelectTrigger className="h-[38px] rounded-[5px] px-3 py-[7px] text-[14px]">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {UNIT_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
            </div>

            <div className="flex gap-4">
              <FormField label="Item Code" className="flex-1">
                <Input placeholder="Alternative product code" value={formData.itemCode}
                  onChange={(e) => handleInputChange("itemCode", e.target.value)}
                  className="h-[38px] rounded-[5px] px-3 py-[7px] text-[14px]" />
              </FormField>
              <FormField label="Barcode Symbology" required className="flex-1">
                <Select value={formData.barcodeSymbology}
                  onValueChange={(value) => handleInputChange("barcodeSymbology", value as "CODE128" | "EAN13" | "UPCA" | "QR")}>
                  <SelectTrigger className="h-[38px] rounded-[5px] px-3 py-[7px] text-[14px]">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {BARCODE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
            </div>

            <FormField label="Description">
              <Textarea placeholder="Enter product description" value={formData.description}
                onChange={(e) => handleInputChange("description", e.target.value)}
                rows={6}
                className="rounded-[5px] text-[14px] resize-none min-h-[140px]" />
              <p className="text-[13px] text-muted-foreground">Maximum 60 Words</p>
            </FormField>
          </div>
        </CardSection>

        {/* Pricing & Stocks */}
        <CardSection icon={<LifeBuoy className="h-4 w-4" />} title="Pricing & Stocks">
          <div className="space-y-4">
            <div>
              <Label className="text-[14px] font-medium text-[#212b36] dark:text-card-foreground leading-[21px] mb-2 block">
                Product Type
              </Label>
              <div className="flex items-center gap-6 mt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="productType"
                    checked={!formData.hasVariants}
                    onChange={() => handleVariantToggle(false)}
                    className="appearance-none w-4 h-4 rounded-full border-2 border-[#e6eaed] checked:border-[#fe9f43] checked:bg-[#fe9f43] relative checked:after:content-[''] checked:after:block checked:after:w-1.5 checked:after:h-1.5 checked:after:bg-white checked:after:rounded-full checked:after:absolute checked:after:top-1/2 checked:after:left-1/2 checked:after:-translate-x-1/2 checked:after:-translate-y-1/2"
                  />
                  <span className="text-[14px] text-[#212b36] dark:text-card-foreground">Single Product</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="productType"
                    checked={formData.hasVariants}
                    onChange={() => handleVariantToggle(true)}
                    className="appearance-none w-4 h-4 rounded-full border-2 border-[#e6eaed] checked:border-[#fe9f43] checked:bg-[#fe9f43] relative checked:after:content-[''] checked:after:block checked:after:w-1.5 checked:after:h-1.5 checked:after:bg-white checked:after:rounded-full checked:after:absolute checked:after:top-1/2 checked:after:left-1/2 checked:after:-translate-x-1/2 checked:after:-translate-y-1/2"
                  />
                  <span className="text-[14px] text-[#212b36] dark:text-card-foreground">Variable Product</span>
                </label>
              </div>
            </div>

            <div className="flex gap-4">
              <FormField label="Quantity" required className="flex-1">
                <Input type="number" placeholder="0" value={formData.stock}
                  onChange={(e) => handleInputChange("stock", e.target.value)}
                  className="h-[38px] rounded-[5px] px-3 py-[7px] text-[14px]" />
              </FormField>
              <FormField label="Price" required className="flex-1">
                <Input type="number" step="0.01" placeholder="0.00" value={formData.salePrice}
                  onChange={(e) => handleInputChange("salePrice", e.target.value)} required
                  className="h-[38px] rounded-[5px] px-3 py-[7px] text-[14px]" />
              </FormField>
              <FormField label="Tax Type" required className="flex-1">
                <Select value={formData.taxRate || "0"} onValueChange={(value) => handleInputChange("taxRate", value)}>
                  <SelectTrigger className="h-[38px] rounded-[5px] px-3 py-[7px] text-[14px]">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">No Tax</SelectItem>
                    <SelectItem value="5">5%</SelectItem>
                    <SelectItem value="10">10%</SelectItem>
                    <SelectItem value="12">12%</SelectItem>
                    <SelectItem value="18">18%</SelectItem>
                    <SelectItem value="20">20%</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>
            </div>

            <div className="flex gap-4">
              <FormField label="Reorder Level" className="flex-1">
                <Input type="number" placeholder="0" value={formData.reorderLevel}
                  onChange={(e) => handleInputChange("reorderLevel", e.target.value)}
                  className="h-[38px] rounded-[5px] px-3 py-[7px] text-[14px]" />
              </FormField>
              <FormField label="Cost Price" className="flex-1">
                <Input type="number" step="0.01" placeholder="0.00" value={formData.costPrice}
                  onChange={(e) => handleInputChange("costPrice", e.target.value)}
                  className="h-[38px] rounded-[5px] px-3 py-[7px] text-[14px]" />
              </FormField>
              <FormField label="Quantity Alert" className="flex-1">
                <Input type="number" placeholder="0" value={formData.alertQuantity}
                  onChange={(e) => handleInputChange("alertQuantity", e.target.value)}
                  className="h-[38px] rounded-[5px] px-3 py-[7px] text-[14px]" />
              </FormField>
            </div>

            <div className="flex gap-4 pt-2">
              <FormField label="Status" className="flex-1">
                <Select value={formData.status}
                  onValueChange={(value: "ACTIVE" | "INACTIVE" | "DISCONTINUED") => handleInputChange("status", value)}>
                  <SelectTrigger className="h-[38px] rounded-[5px] px-3 py-[7px] text-[14px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="INACTIVE">Inactive</SelectItem>
                    <SelectItem value="DISCONTINUED">Discontinued</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>
              <div className="flex-1" />
              <div className="flex-1" />
            </div>
          </div>
        </CardSection>

        {/* Images */}
        <CardSection icon={<ImageIcon className="h-4 w-4" />} title="Images">
          <div className="flex gap-4 flex-wrap">
            <label className="flex flex-col items-center justify-center w-[120px] h-[120px] border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-[#fe9f43] transition-colors bg-muted/30">
              <CirclePlus className="h-4 w-4 text-muted-foreground mb-1" />
              <span className="text-[12px] text-muted-foreground">Add Image</span>
              <input type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
            </label>
            {imagePreview && (
              <div className="relative w-[120px] h-[120px] rounded-lg overflow-hidden border border-border">
                <Image src={imagePreview} alt="Preview" fill className="object-cover" />
                <button type="button" onClick={() => { setImagePreview(null); handleInputChange("imageUrl", ""); }}
                  className="absolute top-1 right-1 bg-black/50 text-white rounded-full w-5 h-5 flex items-center justify-center text-[11px]">X</button>
              </div>
            )}
          </div>
        </CardSection>

        {/* Custom Fields */}
        <CardSection icon={<List className="h-4 w-4" />} title="Custom Fields">
          <div className="space-y-4">
            <div className="flex items-center gap-6 flex-wrap">
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox checked={customFieldsEnabled.warranties}
                  onCheckedChange={(checked) => setCustomFieldsEnabled((prev) => ({ ...prev, warranties: checked === true }))} />
                <span className="text-[14px] text-[#212b36] dark:text-card-foreground">Warranties</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox checked={customFieldsEnabled.manufacturer}
                  onCheckedChange={(checked) => setCustomFieldsEnabled((prev) => ({ ...prev, manufacturer: checked === true }))} />
                <span className="text-[14px] text-[#212b36] dark:text-card-foreground">Manufacturer</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox checked={customFieldsEnabled.expiry}
                  onCheckedChange={(checked) => setCustomFieldsEnabled((prev) => ({ ...prev, expiry: checked === true }))} />
                <span className="text-[14px] text-[#212b36] dark:text-card-foreground">Expiry</span>
              </label>
            </div>

            {customFieldsEnabled.warranties && (
              <div className="flex gap-4">
                <FormField label="Warranty" required className="flex-1">
                  <Select value={formData.warranty} onValueChange={(value) => handleInputChange("warranty", value)}>
                    <SelectTrigger className="h-[38px] rounded-[5px] px-3 py-[7px] text-[14px]">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {WARRANTY_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>
                <FormField label="Manufacturer" required className="flex-1">
                  <Input placeholder="Enter manufacturer name" value={formData.manufacturer}
                    onChange={(e) => handleInputChange("manufacturer", e.target.value)}
                    className="h-[38px] rounded-[5px] px-3 py-[7px] text-[14px]" />
                </FormField>
              </div>
            )}

            {customFieldsEnabled.expiry && (
              <div className="flex gap-4">
                <FormField label="Manufactured Date" required className="flex-1">
                  <div className="relative">
                    <Input type="date" value={formData.manufacturedDate}
                      onChange={(e) => handleInputChange("manufacturedDate", e.target.value)}
                      className="h-[38px] rounded-[5px] px-3 py-[7px] text-[14px] [color-scheme:light]" />
                    <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  </div>
                </FormField>
                <FormField label="Expiry On" required className="flex-1">
                  <div className="relative">
                    <Input type="date" value={formData.expiryDate}
                      onChange={(e) => handleInputChange("expiryDate", e.target.value)}
                      className="h-[38px] rounded-[5px] px-3 py-[7px] text-[14px] [color-scheme:light]" />
                    <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  </div>
                </FormField>
              </div>
            )}

            {!customFieldsEnabled.warranties && !customFieldsEnabled.manufacturer && !customFieldsEnabled.expiry && (
              <p className="text-[13px] text-muted-foreground italic">Toggle options above to add custom fields</p>
            )}
          </div>
        </CardSection>

        {/* Combo Items */}
        {formData.type === "COMBO" && (
          <CardSection icon={<List className="h-4 w-4" />} title="Combo Items">
            <div className="space-y-4">
              <div className="flex gap-2">
                <Input placeholder="Search products by name or SKU..." value={comboSearchQuery}
                  onChange={(e) => setComboSearchQuery(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleComboSearch(); } }}
                  className="h-[38px] rounded-[5px] px-3 py-[7px] text-[14px]" />
                <Button type="button" variant="outline" className="h-[38px] text-[13px]"
                  onClick={handleComboSearch} disabled={comboSearching}>
                  {comboSearching ? "..." : "Search"}
                </Button>
              </div>
              {comboSearchResults.length > 0 && (
                <div className="max-h-40 overflow-y-auto rounded border">
                  {comboSearchResults.map((product) => (
                    <div key={product.id} className="flex items-center justify-between px-3 py-2 hover:bg-muted cursor-pointer"
                      onClick={() => addComboItem(product)}>
                      <div>
                        <span className="text-sm font-medium">{product.name}</span>
                        <span className="text-xs text-muted-foreground ml-2">{product.sku}</span>
                      </div>
                      {comboItems.some((item) => item.productId === product.id) && (
                        <span className="text-xs text-muted-foreground">Added</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {comboItems.length > 0 && (
                <div className="space-y-2">
                  {comboItems.map((item) => (
                    <div key={item.productId} className="flex items-center gap-2 rounded border p-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.productName}</p>
                        <p className="text-xs text-muted-foreground">{item.productSku}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input type="number" className="w-20 h-8 text-[13px]" min={1}
                          value={item.quantity}
                          onChange={(e) => updateComboItemQuantity(item.productId, parseInt(e.target.value) || 1)} />
                        <Button type="button" variant="ghost" size="sm"
                          onClick={() => removeComboItem(item.productId)}>X</Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardSection>
        )}

        {/* Variants */}
        {!isEdit && formData.hasVariants && (
          <CardSection icon={<List className="h-4 w-4" />} title="Variants">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[14px] font-medium text-[#212b36] dark:text-card-foreground">Attributes</span>
                <Button type="button" variant="outline" size="sm" onClick={addAttribute}
                  className="text-[12px] h-[34px]">Add Attribute</Button>
              </div>
              {attributesList.map((attr, index) => (
                <div key={index} className="flex items-start gap-2 rounded border p-3">
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs text-muted-foreground">Attribute Name</Label>
                    <Input placeholder='e.g. "Color"' value={attr.name}
                      onChange={(e) => updateAttribute(index, "name", e.target.value)}
                      className="h-[34px] text-[13px]" />
                  </div>
                  <div className="flex-[2] space-y-1">
                    <Label className="text-xs text-muted-foreground">Values (comma-separated)</Label>
                    <Input placeholder='e.g. "Red, Blue, Green"' value={attr.values}
                      onChange={(e) => updateAttribute(index, "values", e.target.value)}
                      className="h-[34px] text-[13px]" />
                  </div>
                  <Button type="button" variant="ghost" size="sm" className="mt-5"
                    onClick={() => removeAttribute(index)}>X</Button>
                </div>
              ))}
              {attributesList.length > 0 && (
                <Button type="button" variant="secondary" onClick={generateVariants}
                  className="text-[13px]">Generate Variants</Button>
              )}
              {generatedVariants.length > 0 && (
                <div className="overflow-x-auto rounded border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="px-3 py-2 text-left font-medium text-[12px] text-muted-foreground">Variant</th>
                        <th className="px-3 py-2 text-left font-medium text-[12px] text-muted-foreground">SKU Suffix</th>
                        <th className="px-3 py-2 text-left font-medium text-[12px] text-muted-foreground">Sale Price</th>
                        <th className="px-3 py-2 text-left font-medium text-[12px] text-muted-foreground">Cost Price</th>
                        <th className="px-3 py-2 text-left font-medium text-[12px] text-muted-foreground">Stock</th>
                        <th className="px-3 py-2" />
                      </tr>
                    </thead>
                    <tbody>
                      {generatedVariants.map((variant, index) => (
                        <tr key={variant.id} className="border-b">
                          <td className="px-3 py-2 text-xs">{variant.combo}</td>
                          <td className="px-3 py-2"><Input className="h-8 text-xs" value={variant.skuSuffix}
                            onChange={(e) => updateVariantField(index, "skuSuffix", e.target.value)} /></td>
                          <td className="px-3 py-2"><Input type="number" step="0.01" className="h-8 text-xs w-24"
                            value={variant.salePrice}
                            onChange={(e) => updateVariantField(index, "salePrice", e.target.value)} /></td>
                          <td className="px-3 py-2"><Input type="number" step="0.01" className="h-8 text-xs w-24"
                            value={variant.costPrice}
                            onChange={(e) => updateVariantField(index, "costPrice", e.target.value)} /></td>
                          <td className="px-3 py-2"><Input type="number" className="h-8 text-xs w-20"
                            value={variant.stock}
                            onChange={(e) => updateVariantField(index, "stock", e.target.value)} /></td>
                          <td className="px-3 py-2"><Button type="button" variant="ghost" size="sm" className="h-8 w-8"
                            onClick={() => removeVariant(index)}>X</Button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </CardSection>
        )}
      </form>
    );
  }
);

export { ProductForm };
