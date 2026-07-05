"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
import { WorkspaceLink as Link } from "@/components/workspace-link";
import { useParams, useRouter } from "next/navigation";
import { useWorkspace } from "@/hooks/use-workspace";
import { Check, ChevronsUpDown, ChevronRight, Loader2, Plus, Save, Trash2, Package } from "lucide-react";
import { PageLoadingSkeleton } from "@/components/ui/page-loading-skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useQuotationsApi, type QuotationWithDetails } from "@/hooks/use-quotations-api";
import { useCustomersApi, type Customer } from "@/hooks/use-customers-api";
import { useProductApi } from "@/hooks/use-product-api";
import type { Product } from "@/lib/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type QuotationStatus = "DRAFT" | "PENDING" | "COMPLETED" | "CANCELLED";

interface QuotationEditItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
}

const STATUS_OPTIONS: Array<{ value: QuotationStatus; label: string }> = [
  { value: "DRAFT", label: "Draft" },
  { value: "PENDING", label: "Pending" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
];

const createItemId = () =>
  typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : Date.now().toString();

const normalizeError = (error: unknown): string => {
  if (typeof error === "string" && error.trim().length > 0) return error;
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: string }).message;
    if (typeof message === "string" && message.trim().length > 0) return message;
  }
  return "Something went wrong while saving the quotation.";
};

export default function EditQuotationPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const ws = useWorkspace();
  const quotationId = params?.id ?? "";

  const { getQuotation, updateQuotation } = useQuotationsApi();
  const { getCustomers } = useCustomersApi();
  const { getProducts } = useProductApi();

  const [quotation, setQuotation] = useState<QuotationWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState<string | null>(null);

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerComboOpen, setCustomerComboOpen] = useState(false);

  const today = useMemo(() => new Date().toISOString().split("T")[0], []);

  const [customerId, setCustomerId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [formData, setFormData] = useState({
    quoteDate: today,
    expiryDate: "",
    status: "DRAFT" as QuotationStatus,
    notes: "",
  });

  const [items, setItems] = useState<QuotationEditItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!quotationId) return;
    let active = true;

    const load = async () => {
      try {
        setLoading(true);
        setFetchError(null);
        setProductsLoading(true);
        setProductsError(null);

        const [quotationData, { products: productsList }, customersResult] = await Promise.all([
          getQuotation(quotationId),
          getProducts({ page: 1, limit: 200 }),
          getCustomers({ limit: 100 }),
        ]);

        if (!active) return;

        setQuotation(quotationData);
        setProducts(productsList ?? []);

        const customersList = Array.isArray(customersResult)
          ? customersResult
          : customersResult?.customers ?? [];
        setCustomers(customersList);
      } catch (err) {
        if (active) {
          setFetchError(err instanceof Error ? err.message : "Failed to load quotation");
          setProductsError(err instanceof Error ? err.message : "Failed to load products");
        }
      } finally {
        if (active) {
          setLoading(false);
          setProductsLoading(false);
        }
      }
    };

    load();
    return () => { active = false; };
  }, [quotationId, getQuotation, getProducts, getCustomers]);

  useEffect(() => {
    if (!quotation) return;

    setCustomerId(quotation.customer?.id || quotation.customerId || "");
    setCustomerName(quotation.customer?.name || "");

    setFormData({
      quoteDate: quotation.quoteDate.split("T")[0],
      expiryDate: quotation.expiryDate ? quotation.expiryDate.split("T")[0] : "",
      status: quotation.status || "DRAFT",
      notes: quotation.notes ?? "",
    });

    setItems(
      quotation.items.map((item) => ({
        id: item.id || createItemId(),
        productId: item.productId || item.product?.id || "",
        productName: item.product?.name || "",
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
      }))
    );
  }, [quotation]);

  const currencyFormatter = useMemo(
    () => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }),
    []
  );

  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0),
    [items]
  );

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      { id: createItemId(), productId: "", productName: "", quantity: 1, unitPrice: 0 },
    ]);
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.length > 1 ? prev.filter((item) => item.id !== id) : prev);
  };

  const updateItem = (id: string, field: keyof QuotationEditItem, value: string | number) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        if (field === "productId" && typeof value === "string") {
          const product = products.find((p) => p.id === value);
          return {
            ...item,
            productId: value,
            productName: product?.name || "",
            unitPrice: product ? Number(product.salePrice) || 0 : 0,
          };
        }
        if (field === "quantity" && typeof value === "number") {
          return { ...item, quantity: Math.max(1, Math.floor(value)) };
        }
        if (field === "unitPrice" && typeof value === "number") {
          return { ...item, unitPrice: Math.max(0, value) };
        }
        return { ...item, [field]: value };
      })
    );
  };

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
      c.email?.toLowerCase().includes(customerSearch.toLowerCase())
  );

  const handleSelectCustomer = (customer: Customer) => {
    setCustomerId(customer.id);
    setCustomerName(customer.name);
    setCustomerComboOpen(false);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!quotation) {
      setSubmitError("Quotation not found.");
      return;
    }
    if (!customerId) {
      setSubmitError("Please select a customer.");
      return;
    }
    if (!formData.quoteDate) {
      setSubmitError("Quote date is required.");
      return;
    }
    if (items.length === 0) {
      setSubmitError("Add at least one item.");
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
        customerId,
        quoteDate: new Date(formData.quoteDate).toISOString(),
        expiryDate: formData.expiryDate ? new Date(formData.expiryDate).toISOString() : undefined,
        status: formData.status,
        notes: formData.notes.trim() || undefined,
        items: items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
      };

      const updated = await updateQuotation(quotation.id, payload);
      toast.success("Quotation updated", {
        description: "The quotation details were saved successfully.",
      });
      router.push(`/${ws}/quotations/${updated.id}`);
    } catch (err) {
      const msg = normalizeError(err);
      setSubmitError(msg);
      toast.error("Failed to update quotation", { description: msg });
    } finally {
      setSaving(false);
    }
  };

  if (!quotationId) return <div className="p-6">Quotation identifier is missing.</div>;
  if (loading) return <PageLoadingSkeleton />;

  if (!quotation) {
    return (
      <div className="space-y-5 p-6">
        <div className="flex items-center gap-1 text-sm text-muted-foreground mb-0.5">
          <Link href="/dashboard" className="hover:text-foreground transition-colors">Dashboard</Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <Link href="/quotations" className="hover:text-foreground transition-colors">Quotations</Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-foreground">Edit Quotation</span>
        </div>
        <div className="border rounded-[5px] bg-card shadow-sm py-12 text-center text-muted-foreground">
          <Package className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
          <p className="font-medium">Quotation not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1 text-sm text-muted-foreground mb-0.5">
        <Link href="/dashboard" className="hover:text-foreground transition-colors">Dashboard</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link href="/quotations" className="hover:text-foreground transition-colors">Quotations</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link href={`/quotations/${quotation.id}`} className="hover:text-foreground transition-colors">{quotation.referenceNumber}</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground">Edit</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/quotations/${quotation.id}`}>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <Package className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-[18px] font-bold text-foreground">Edit Quotation</h1>
              <Badge variant="outline" className="font-medium text-xs">
                {quotation.referenceNumber}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">{quotation.customer?.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/quotations/${quotation.id}`}>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-[34px] rounded-[5px] text-[13px]"
              disabled={saving}
            >
              Cancel
            </Button>
          </Link>
          <Button
            type="submit"
            form="edit-quotation-form"
            disabled={items.length === 0 || saving}
            size="sm"
            className="h-[34px] rounded-[5px] text-[13px] gap-1.5"
          >
            {saving ? (
              <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving...</>
            ) : (
              <><Save className="h-3.5 w-3.5" /> Save Changes</>
            )}
          </Button>
        </div>
      </div>

      {(submitError || fetchError) && (
        <Alert variant="destructive">
          <AlertDescription>{submitError || fetchError}</AlertDescription>
        </Alert>
      )}

      <form id="edit-quotation-form" onSubmit={handleSubmit} className="grid gap-5 lg:grid-cols-[1fr_320px]">
        {/* Left Column */}
        <div className="space-y-5">
          {/* Quotation Information Card */}
          <Card className="border rounded-[5px] bg-card shadow-sm">
            <CardHeader className="px-5 py-[15px] border-b">
              <CardTitle className="text-sm font-semibold">Quotation Information</CardTitle>
              <CardDescription className="text-xs">Update customer and quotation details</CardDescription>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-medium">Customer *</Label>
                <Popover open={customerComboOpen} onOpenChange={setCustomerComboOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={customerComboOpen}
                      className="w-full justify-between h-[34px] rounded-[5px] text-sm font-normal"
                    >
                      {customerId
                        ? customers.find((c) => c.id === customerId)?.name || customerName
                        : "Select customer..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[400px] p-0">
                    <Command>
                      <CommandInput
                        placeholder="Search customers..."
                        value={customerSearch}
                        onValueChange={setCustomerSearch}
                      />
                      <CommandList>
                        <CommandEmpty>No customer found.</CommandEmpty>
                        <CommandGroup heading="Existing Customers">
                          {filteredCustomers.map((customer) => (
                            <CommandItem
                              key={customer.id}
                              value={customer.id}
                              onSelect={() => handleSelectCustomer(customer)}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  customerId === customer.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                              <div className="flex flex-col">
                                <span className="font-medium">{customer.name}</span>
                                {customer.email && (
                                  <span className="text-xs text-muted-foreground">{customer.email}</span>
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
                  <Label htmlFor="quoteDate" className="text-xs font-medium">Quote Date *</Label>
                  <Input
                    id="quoteDate"
                    type="date"
                    value={formData.quoteDate}
                    onChange={(e) => setFormData((prev) => ({ ...prev, quoteDate: e.target.value }))}
                    required
                    className="h-[34px] rounded-[5px] text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expiryDate" className="text-xs font-medium">Expiry Date</Label>
                  <Input
                    id="expiryDate"
                    type="date"
                    value={formData.expiryDate}
                    onChange={(e) => setFormData((prev) => ({ ...prev, expiryDate: e.target.value }))}
                    className="h-[34px] rounded-[5px] text-sm"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status" className="text-xs font-medium">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, status: value as QuotationStatus }))
                  }
                >
                  <SelectTrigger id="status" className="h-[34px] rounded-[5px] text-sm">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes" className="text-xs font-medium">Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Add any additional notes..."
                  value={formData.notes}
                  onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                  className="rounded-[5px] text-sm"
                />
              </div>
            </CardContent>
          </Card>

          {/* Quotation Items Card */}
          <Card className="border rounded-[5px] bg-card shadow-sm">
            <CardHeader className="px-5 py-[15px] border-b">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-semibold">Quotation Items</CardTitle>
                  <CardDescription className="text-xs">Manage the products in this quotation</CardDescription>
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
                          <Label className="text-xs font-medium">Product *</Label>
                          <Select
                            value={item.productId}
                            onValueChange={(value) => updateItem(item.id, "productId", value)}
                          >
                            <SelectTrigger className="h-[34px] rounded-[5px] text-sm">
                              <SelectValue placeholder="Select product" />
                            </SelectTrigger>
                            <SelectContent>
                              {productsLoading && (
                                <SelectItem value="LOADING" disabled>Loading products...</SelectItem>
                              )}
                              {productsError && (
                                <SelectItem value="ERROR" disabled>{productsError}</SelectItem>
                              )}
                              {!productsLoading && !productsError && products.length === 0 && (
                                <SelectItem value="NO_PRODUCTS" disabled>No products available</SelectItem>
                              )}
                              {!productsLoading && !productsError && products.map((product) => (
                                <SelectItem key={product.id} value={product.id}>
                                  {product.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs font-medium">Quantity *</Label>
                          <Input
                            type="number"
                            min={1}
                            value={item.quantity}
                            onChange={(e) =>
                              updateItem(item.id, "quantity", Number(e.target.value) || 0)
                            }
                            className="h-[34px] rounded-[5px] text-sm"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs font-medium">Unit Price *</Label>
                          <Input
                            type="number"
                            step="0.01"
                            min={0}
                            value={item.unitPrice}
                            onChange={(e) =>
                              updateItem(item.id, "unitPrice", Number(e.target.value) || 0)
                            }
                            className="h-[34px] rounded-[5px] text-sm"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs font-medium">Total</Label>
                          <Input
                            value={currencyFormatter.format(item.quantity * item.unitPrice)}
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
                        disabled={items.length === 1}
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
            <h3 className="text-sm font-semibold text-foreground mb-4">Quotation Summary</h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium tabular-nums">{currencyFormatter.format(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Items</span>
                <span className="font-semibold">{items.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Units</span>
                <span className="font-semibold">
                  {items.reduce((sum, item) => sum + item.quantity, 0)}
                </span>
              </div>
              <div className="flex justify-between border-t border-border pt-3">
                <span className="font-semibold text-foreground">Total</span>
                <span className="text-xl font-bold tabular-nums">{currencyFormatter.format(subtotal)}</span>
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
