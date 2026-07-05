"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { WorkspaceLink as Link } from "@/components/workspace-link";
import { useRouter } from "next/navigation";
import { useWorkspace } from "@/hooks/use-workspace";
import {
  Check,
  ChevronsUpDown,
  ChevronRight,
  Loader2,
  Plus,
  Save,
  Trash2,
  ArrowLeft,
} from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useSuppliersApi, type Supplier } from "@/hooks/use-suppliers-api";
import { usePurchasesApi } from "@/hooks/use-purchases-api";
import { useAllProducts } from "@/hooks/use-products";
import { useWarehouses } from "@/hooks/use-warehouses";
import { useToast } from "@/hooks/use-toast";
import type { Product } from "@/lib/types";
import { QuickCreateProductDialog } from "@/components/products/quick-create-product-dialog";
import { cn } from "@/lib/utils";

interface PurchaseItemRow {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitCost: number;
  total: number;
}

const normalizeError = (error: unknown): string => {
  if (typeof error === "string" && error.trim().length > 0) {
    return error;
  }

  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: string }).message;
    if (message && typeof message === "string" && message.trim().length > 0) {
      return message;
    }
  }

  return "Something went wrong while creating the purchase order.";
};

const createItemId = () =>
  typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : Date.now().toString();

export default function NewPurchasePage() {
  const router = useRouter();
  const ws = useWorkspace();
  const { toast } = useToast();
  const { getSuppliers } = useSuppliersApi();
  const { create } = usePurchasesApi();
  const { products, loading: productsLoading } = useAllProducts();
  const { warehouses, loading: warehousesLoading } = useWarehouses();

  const [allProducts, setAllProducts] = useState<Product[]>([]);

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [suppliersLoading, setSuppliersLoading] = useState(true);
  const [supplierSearch, setSupplierSearch] = useState("");
  const [supplierComboOpen, setSupplierComboOpen] = useState(false);

  const today = useMemo(() => new Date().toISOString().split("T")[0], []);

  const [formData, setFormData] = useState({
    supplierId: "",
    supplierName: "",
    orderDate: today,
    warehouseId: "",
    notes: "",
  });

  const [items, setItems] = useState<PurchaseItemRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (products.length > 0) {
      setAllProducts(products);
    }
  }, [products]);

  useEffect(() => {
    let active = true;

    const loadData = async () => {
      try {
        setSuppliersLoading(true);
        const res = await getSuppliers({ limit: 1000 });
        const list = Array.isArray(res)
          ? res
          : Array.isArray(res?.suppliers)
            ? res.suppliers
            : [];
        if (active) {
          setSuppliers(list as Supplier[]);
        }
      } catch {
        // suppliers error non-critical
      } finally {
        if (active) {
          setSuppliersLoading(false);
        }
      }
    };

    loadData();

    return () => {
      active = false;
    };
  }, [getSuppliers]);

  const currencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
      }),
    []
  );

  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + item.total, 0),
    [items]
  );

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      {
        id: createItemId(),
        productId: "",
        productName: "",
        quantity: 1,
        unitCost: 0,
        total: 0,
      },
    ]);
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const updateItem = (
    id: string,
    field: keyof PurchaseItemRow,
    value: unknown
  ) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) {
          return item;
        }

        const next = { ...item };

        if (field === "productId" && typeof value === "string") {
          next.productId = value;
          const product = allProducts.find((p) => p.id === value);
          if (product) {
            next.productName = product.name;
            next.unitCost = Number(product.costPrice) || 0;
          }
        }

        if (field === "quantity" && typeof value === "number") {
          next.quantity = Math.max(1, Math.floor(value));
        }

        if (field === "unitCost" && typeof value === "number") {
          next.unitCost = Math.max(0, value);
        }

        if (field === "productName" && typeof value === "string") {
          next.productName = value;
        }

        next.total = Number(next.quantity) * Number(next.unitCost);
        return next;
      })
    );
  };

  const handleSelectSupplier = (supplier: Supplier) => {
    setFormData((prev) => ({
      ...prev,
      supplierId: supplier.id,
      supplierName: supplier.name,
    }));
    setSupplierComboOpen(false);
  };

  const filteredSuppliers = suppliers.filter(
    (supplier) =>
      supplier.name.toLowerCase().includes(supplierSearch.toLowerCase()) ||
      supplier.email?.toLowerCase().includes(supplierSearch.toLowerCase())
  );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!formData.supplierId) {
      setSubmitError("Supplier selection is required.");
      return;
    }

    if (!formData.warehouseId) {
      setSubmitError("Warehouse selection is required.");
      return;
    }

    if (items.length === 0) {
      setSubmitError("Add at least one product to create a purchase order.");
      return;
    }

    if (items.some((item) => !item.productId)) {
      setSubmitError("Select a product for each line item.");
      return;
    }

    setSubmitError(null);
    setSaving(true);

    try {
      const payload = {
        supplierId: formData.supplierId,
        orderDate: new Date(formData.orderDate).toISOString(),
        warehouseId: formData.warehouseId,
        notes: formData.notes?.trim() || undefined,
        items: items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitCost: item.unitCost,
        })),
      };

      await create(payload);
      toast({ title: "Purchase order created successfully" });
      router.push(`/${ws}/purchases`);
    } catch (error) {
      const message = normalizeError(error);
      toast({ title: "Failed to create purchase order", description: message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1 text-sm text-muted-foreground mb-0.5">
        <Link href="/dashboard" className="hover:text-foreground transition-colors">Dashboard</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link href="/purchases" className="hover:text-foreground transition-colors">Purchases</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground">New Purchase</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/purchases">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-[18px] font-bold text-foreground">New Purchase</h1>
            <p className="text-sm text-muted-foreground">Create a new purchase order</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/purchases">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-[34px] rounded-[5px] text-[13px]"
            >
              Cancel
            </Button>
          </Link>
          <Button
            type="submit"
            form="new-purchase-form"
            disabled={items.length === 0 || saving}
            size="sm"
            className="h-[34px] rounded-[5px] text-[13px] gap-1.5"
          >
            {saving ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="h-3.5 w-3.5" />
                <span>Create Purchase</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {submitError && (
        <Alert variant="destructive">
          <AlertDescription>{submitError}</AlertDescription>
        </Alert>
      )}

      <form id="new-purchase-form" onSubmit={handleSubmit} className="grid gap-5 lg:grid-cols-[1fr_320px]">
        {/* Left Column */}
        <div className="space-y-5">
          <Card className="border rounded-[5px] bg-card shadow-sm">
            <CardHeader className="px-5 py-[15px] border-b">
              <CardTitle className="text-sm font-semibold">Purchase Information</CardTitle>
              <CardDescription className="text-xs">Select a supplier and set purchase order details</CardDescription>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              {/* Supplier */}
              <div className="space-y-2">
                <Label className="text-xs font-medium">Supplier *</Label>
                <Popover
                  open={supplierComboOpen}
                  onOpenChange={setSupplierComboOpen}
                >
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={supplierComboOpen}
                      className="w-full justify-between h-[34px] rounded-[5px] text-sm font-normal"
                    >
                      {formData.supplierId
                        ? suppliers.find((s) => s.id === formData.supplierId)
                            ?.name || formData.supplierName
                        : suppliersLoading
                          ? "Loading suppliers..."
                          : "Select supplier..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[400px] p-0">
                    <Command>
                      <CommandInput
                        placeholder="Search suppliers..."
                        value={supplierSearch}
                        onValueChange={setSupplierSearch}
                      />
                      <CommandList>
                        <CommandEmpty>No supplier found.</CommandEmpty>
                        <CommandGroup heading="Suppliers">
                          {filteredSuppliers.map((supplier) => (
                            <CommandItem
                              key={supplier.id}
                              value={supplier.id}
                              onSelect={() => handleSelectSupplier(supplier)}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  formData.supplierId === supplier.id
                                    ? "opacity-100"
                                    : "opacity-0"
                                )}
                              />
                              <div className="flex flex-col">
                                <span className="font-medium">
                                  {supplier.name}
                                </span>
                                {supplier.email && (
                                  <span className="text-xs text-muted-foreground">
                                    {supplier.email}
                                  </span>
                                )}
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="orderDate" className="text-xs font-medium">Order Date *</Label>
                  <Input
                    id="orderDate"
                    type="date"
                    value={formData.orderDate}
                    onChange={(event) =>
                      setFormData((prev) => ({
                        ...prev,
                        orderDate: event.target.value,
                      }))
                    }
                    required
                    className="h-[34px] rounded-[5px] text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="warehouse" className="text-xs font-medium">Warehouse *</Label>
                  <Select
                    value={formData.warehouseId}
                    onValueChange={(value) =>
                      setFormData((prev) => ({
                        ...prev,
                        warehouseId: value,
                      }))
                    }
                  >
                    <SelectTrigger id="warehouse" className="h-[34px] rounded-[5px] text-sm">
                      <SelectValue placeholder="Select warehouse" />
                    </SelectTrigger>
                    <SelectContent>
                      {warehousesLoading && (
                        <SelectItem value="LOADING" disabled>
                          Loading warehouses...
                        </SelectItem>
                      )}
                      {!warehousesLoading &&
                        warehouses.length === 0 && (
                          <SelectItem value="NO_WAREHOUSES" disabled>
                            No warehouses available
                          </SelectItem>
                        )}
                      {!warehousesLoading &&
                        warehouses.map((warehouse) => (
                          <SelectItem key={warehouse.id} value={warehouse.id}>
                            {warehouse.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes" className="text-xs font-medium">Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Enter any notes for this purchase order"
                  value={formData.notes}
                  onChange={(event) =>
                    setFormData((prev) => ({
                      ...prev,
                      notes: event.target.value,
                    }))
                  }
                  rows={3}
                  className="rounded-[5px] text-sm"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border rounded-[5px] bg-card shadow-sm">
            <CardHeader className="px-5 py-[15px] border-b">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-semibold">Purchase Items</CardTitle>
                  <CardDescription className="text-xs">Add products to this purchase order</CardDescription>
                </div>
                <Button
                  type="button"
                  size="sm"
                  className="h-[34px] rounded-[5px] text-[13px] gap-1.5"
                  onClick={addItem}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Item
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-5">
              {items.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No items added yet. Click &quot;Add Item&quot; to start.
                </p>
              ) : (
                <div className="space-y-3">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-start justify-between gap-4 border rounded-[5px] p-4"
                    >
                        <div className="flex-1 grid gap-4 md:grid-cols-4">
                          <div className="space-y-2">
                            <Label className="text-xs font-medium">Product</Label>
                            <div className="flex items-center gap-2">
                              <Select
                                value={item.productId}
                                onValueChange={(value) =>
                                  updateItem(item.id, "productId", value)
                                }
                              >
                                <SelectTrigger className="h-[34px] rounded-[5px] text-sm flex-1">
                                  <SelectValue placeholder="Select product" />
                                </SelectTrigger>
                                <SelectContent>
                                  {productsLoading && (
                                    <SelectItem value="LOADING" disabled>
                                      Loading products...
                                    </SelectItem>
                                  )}
                                  {!productsLoading &&
                                    allProducts.length === 0 && (
                                      <SelectItem value="NO_PRODUCTS" disabled>
                                        No products available
                                      </SelectItem>
                                    )}
                                  {!productsLoading &&
                                    allProducts.map((product) => (
                                      <SelectItem
                                        key={product.id}
                                        value={product.id}
                                      >
                                        {product.name}
                                      </SelectItem>
                                    ))}
                                </SelectContent>
                              </Select>
                              <QuickCreateProductDialog
                                onProductCreated={(product) => {
                                  setAllProducts((prev) => {
                                    if (prev.some((p) => p.id === product.id)) return prev;
                                    return [...prev, product];
                                  });
                                  updateItem(item.id, "productId", product.id);
                                }}
                              />
                            </div>
                          </div>
                        <div className="space-y-2">
                          <Label className="text-xs font-medium">Quantity</Label>
                          <Input
                            type="number"
                            min={1}
                            value={item.quantity}
                            onChange={(event) =>
                              updateItem(
                                item.id,
                                "quantity",
                                Number(event.target.value) || 0
                              )
                            }
                            className="h-[34px] rounded-[5px] text-sm"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs font-medium">Unit Cost</Label>
                          <Input
                            type="number"
                            step="0.01"
                            min={0}
                            value={item.unitCost}
                            onChange={(event) =>
                              updateItem(
                                item.id,
                                "unitCost",
                                Number(event.target.value) || 0
                              )
                            }
                            className="h-[34px] rounded-[5px] text-sm"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs font-medium">Total</Label>
                          <Input
                            value={currencyFormatter.format(item.total)}
                            readOnly
                            className="h-[34px] rounded-[5px] text-sm"
                          />
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeItem(item.id)}
                        className="mt-6 h-[34px] w-[34px] rounded-[5px] text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-4">
          <Card className="border rounded-[5px] bg-card shadow-sm p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4">Purchase Summary</h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Items</span>
                <span className="font-medium">{items.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium tabular-nums">
                  {currencyFormatter.format(subtotal)}
                </span>
              </div>
              <div className="flex justify-between border-t border-border pt-3">
                <span className="font-semibold text-foreground">Total</span>
                <span className="text-xl font-bold tabular-nums">
                  {currencyFormatter.format(subtotal)}
                </span>
              </div>
            </div>
          </Card>

          <Card className="border rounded-[5px] bg-card shadow-sm p-5 space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Quick Stats</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Items</span>
                <span className="font-semibold">{items.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Units</span>
                <span className="font-semibold">
                  {items.reduce((sum, item) => sum + item.quantity, 0)}
                </span>
              </div>
            </div>
          </Card>
        </div>
      </form>
    </div>
  );
}
