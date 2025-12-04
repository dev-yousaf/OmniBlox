"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Plus, Save, Trash2 } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

import { useProductApi } from "@/hooks/use-product-api";
import { useToast } from "@/hooks/use-toast";
import type { Product } from "@/lib/types";

import { useSaleDetail } from "../../_hooks/use-sales";
import type {
  SalePaymentMethod,
  SalePaymentStatus,
  SaleStatus,
} from "../../_types";

interface SaleItemRow {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

const STATUS_OPTIONS: Array<{ value: SaleStatus; label: string }> = [
  { value: "DRAFT", label: "Draft" },
  { value: "PENDING", label: "Pending" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
];

const PAYMENT_STATUS_OPTIONS: Array<{
  value: SalePaymentStatus;
  label: string;
}> = [
  { value: "PENDING", label: "Pending" },
  { value: "PARTIAL", label: "Partial" },
  { value: "PAID", label: "Paid" },
];

const PAYMENT_METHOD_OPTIONS: Array<{
  value: SalePaymentMethod;
  label: string;
}> = [
  { value: "CASH", label: "Cash" },
  { value: "CREDIT_CARD", label: "Credit Card" },
  { value: "BANK_TRANSFER", label: "Bank Transfer" },
  { value: "CHECK", label: "Check" },
];

const WAREHOUSE_NAME = "Main Warehouse";

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

  return "Something went wrong while saving the sale.";
};

const createItemId = () =>
  typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : Date.now().toString();

export default function EditSalePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const saleId = params?.id ?? "";

  const { getProducts } = useProductApi();
  const { sale, loading, error, updateSale } = useSaleDetail(saleId);

  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState<string | null>(null);

  const today = useMemo(() => new Date().toISOString().split("T")[0], []);

  const [formData, setFormData] = useState({
    customerName: "",
    customerEmail: "",
    date: today,
    dueDate: "",
    status: "DRAFT" as SaleStatus,
    paymentStatus: "PENDING" as SalePaymentStatus,
    paymentMethod: null as SalePaymentMethod | null,
    notes: "",
  });

  const [items, setItems] = useState<SaleItemRow[]>([]);
  const [taxRate, setTaxRate] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const loadProducts = async () => {
      try {
        setProductsLoading(true);
        setProductsError(null);
        const { products: list } = await getProducts({ page: 1, limit: 200 });
        if (active) {
          setProducts(list ?? []);
        }
      } catch (loadError) {
        if (active) {
          setProductsError(normalizeError(loadError));
        }
      } finally {
        if (active) {
          setProductsLoading(false);
        }
      }
    };

    loadProducts();

    return () => {
      active = false;
    };
  }, [getProducts]);

  useEffect(() => {
    if (!sale) return;

    setFormData({
      customerName: sale.customerName,
      customerEmail: sale.customerEmail ?? "",
      date: sale.saleDate.split("T")[0],
      dueDate: sale.dueDate.split("T")[0],
      status: sale.status,
      paymentStatus: sale.paymentStatus,
      paymentMethod: sale.paymentMethod,
      notes: sale.notes ?? "",
    });

    setItems(
      sale.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        total: item.total,
      }))
    );

    const computedTaxRate =
      sale.subtotal > 0 ? (sale.tax / sale.subtotal) * 100 : 0;
    setTaxRate(Number(computedTaxRate.toFixed(2)));
    setDiscount(sale.discount ?? 0);
  }, [sale]);

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
  const taxAmount = useMemo(
    () => (subtotal * taxRate) / 100,
    [subtotal, taxRate]
  );
  const total = useMemo(
    () => subtotal + taxAmount - discount,
    [subtotal, taxAmount, discount]
  );

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      {
        id: createItemId(),
        productId: "",
        productName: "",
        quantity: 1,
        unitPrice: 0,
        total: 0,
      },
    ]);
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const updateItem = (id: string, field: keyof SaleItemRow, value: unknown) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) {
          return item;
        }

        const next = { ...item };

        if (field === "productId" && typeof value === "string") {
          next.productId = value;
          const product = products.find((p) => p.id === value);
          if (product) {
            next.productName = product.name;
            next.unitPrice = Number(product.salePrice) || 0;
          }
        }

        if (field === "quantity" && typeof value === "number") {
          next.quantity = Math.max(1, Math.floor(value));
        }

        if (field === "unitPrice" && typeof value === "number") {
          next.unitPrice = Math.max(0, value);
        }

        next.total = Number(next.quantity) * Number(next.unitPrice);
        return next;
      })
    );
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!sale) {
      setSubmitError("Sale not found.");
      return;
    }

    if (!formData.customerName.trim()) {
      setSubmitError("Customer name is required.");
      return;
    }

    if (!formData.customerEmail.trim()) {
      setSubmitError("Customer email is required.");
      return;
    }

    if (!formData.dueDate) {
      setSubmitError("Due date is required.");
      return;
    }

    if (items.length === 0) {
      setSubmitError("Add at least one product to update the sale.");
      return;
    }

    if (items.some((item) => !item.productId)) {
      setSubmitError("Select a product for each line item.");
      return;
    }

    if (discount > subtotal + taxAmount) {
      setSubmitError("Discount cannot exceed the invoice total.");
      return;
    }

    setSubmitError(null);
    setSaving(true);

    try {
      const payload = {
        customer: {
          id: sale.customerId,
          name: formData.customerName.trim(),
          email: formData.customerEmail.trim(),
        },
        saleDate: new Date(formData.date).toISOString(),
        dueDate: new Date(formData.dueDate).toISOString(),
        status: formData.status,
        paymentStatus: formData.paymentStatus,
        paymentMethod: formData.paymentMethod ?? null,
        taxRate,
        discount,
        notes: formData.notes.trim() ? formData.notes.trim() : undefined,
        items: items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
      };

      const updated = await updateSale(payload);
      if (!updated) {
        throw new Error("Failed to update sale. Please try again.");
      }

      toast({
        title: "Sale updated",
        description: "The sale details were saved successfully.",
      });

      router.push(`/sales/${sale.id}`);
    } catch (submitErr) {
      setSubmitError(normalizeError(submitErr));
    } finally {
      setSaving(false);
    }
  };

  if (!saleId) {
    return <div className="p-6">Sale identifier is missing.</div>;
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Loading sale...</span>
        </div>
      </div>
    );
  }

  if (!sale) {
    return <div className="p-6">Sale not found.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/sales/${sale.id}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Edit Sale</h1>
          <p className="text-sm text-muted-foreground">
            Update sale information and invoice items
          </p>
        </div>
      </div>

      {submitError && (
        <Alert variant="destructive">
          <AlertDescription>{submitError}</AlertDescription>
        </Alert>
      )}
      {error && !submitError && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="grid gap-6 md:grid-cols-3">
        <div className="space-y-6 md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Customer & Invoice</CardTitle>
              <CardDescription>
                Update customer and invoice details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="customerName">Customer Name *</Label>
                  <Input
                    id="customerName"
                    placeholder="Enter customer name"
                    value={formData.customerName}
                    onChange={(event) =>
                      setFormData((prev) => ({
                        ...prev,
                        customerName: event.target.value,
                      }))
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customerEmail">Customer Email *</Label>
                  <Input
                    id="customerEmail"
                    type="email"
                    placeholder="Enter customer email"
                    value={formData.customerEmail}
                    onChange={(event) =>
                      setFormData((prev) => ({
                        ...prev,
                        customerEmail: event.target.value,
                      }))
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Invoice Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) =>
                      setFormData((prev) => ({
                        ...prev,
                        status: value as SaleStatus,
                      }))
                    }
                  >
                    <SelectTrigger id="status">
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
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="paymentStatus">Payment Status</Label>
                  <Select
                    value={formData.paymentStatus}
                    onValueChange={(value) =>
                      setFormData((prev) => ({
                        ...prev,
                        paymentStatus: value as SalePaymentStatus,
                      }))
                    }
                  >
                    <SelectTrigger id="paymentStatus">
                      <SelectValue placeholder="Select payment status" />
                    </SelectTrigger>
                    <SelectContent>
                      {PAYMENT_STATUS_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="paymentMethod">Payment Method</Label>
                  <Select
                    value={formData.paymentMethod ?? "NONE"}
                    onValueChange={(value) =>
                      setFormData((prev) => ({
                        ...prev,
                        paymentMethod:
                          value === "NONE" || !value
                            ? null
                            : (value as SalePaymentMethod),
                      }))
                    }
                  >
                    <SelectTrigger id="paymentMethod">
                      <SelectValue placeholder="Select payment method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NONE">None</SelectItem>
                      {PAYMENT_METHOD_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Warehouse</Label>
                  <Input value={WAREHOUSE_NAME} readOnly />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="date">Invoice Date *</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(event) =>
                      setFormData((prev) => ({
                        ...prev,
                        date: event.target.value,
                      }))
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dueDate">Due Date *</Label>
                  <Input
                    id="dueDate"
                    type="date"
                    value={formData.dueDate}
                    onChange={(event) =>
                      setFormData((prev) => ({
                        ...prev,
                        dueDate: event.target.value,
                      }))
                    }
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Add any additional notes for this sale"
                  value={formData.notes}
                  onChange={(event) =>
                    setFormData((prev) => ({
                      ...prev,
                      notes: event.target.value,
                    }))
                  }
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Invoice Items</CardTitle>
                  <CardDescription>
                    Manage the products included in this sale
                  </CardDescription>
                </div>
                <Button
                  type="button"
                  size="sm"
                  className="gap-2"
                  onClick={addItem}
                >
                  <Plus className="h-4 w-4" />
                  Add Item
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {items.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    No items added yet. Click "Add Item" to start.
                  </p>
                ) : (
                  items.map((item) => (
                    <div
                      key={item.id}
                      className="space-y-4 rounded-lg border border-border p-4"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 grid gap-4 md:grid-cols-4">
                          <div className="space-y-2">
                            <Label>Product</Label>
                            <Select
                              value={item.productId}
                              onValueChange={(value) =>
                                updateItem(item.id, "productId", value)
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select product" />
                              </SelectTrigger>
                              <SelectContent>
                                {productsLoading && (
                                  <SelectItem value="LOADING" disabled>
                                    Loading products...
                                  </SelectItem>
                                )}
                                {!productsLoading && productsError && (
                                  <SelectItem value="ERROR" disabled>
                                    {productsError}
                                  </SelectItem>
                                )}
                                {!productsLoading &&
                                  !productsError &&
                                  products.length === 0 && (
                                    <SelectItem value="NO_PRODUCTS" disabled>
                                      No products available
                                    </SelectItem>
                                  )}
                                {!productsLoading &&
                                  !productsError &&
                                  products.map((product) => (
                                    <SelectItem
                                      key={product.id}
                                      value={product.id}
                                    >
                                      {product.name}
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Quantity</Label>
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
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Price</Label>
                            <Input
                              type="number"
                              step="0.01"
                              min={0}
                              value={item.unitPrice}
                              onChange={(event) =>
                                updateItem(
                                  item.id,
                                  "unitPrice",
                                  Number(event.target.value) || 0
                                )
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Total</Label>
                            <Input
                              value={currencyFormatter.format(item.total)}
                              readOnly
                            />
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeItem(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Invoice Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium">
                  {currencyFormatter.format(subtotal)}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Tax</span>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={0}
                    value={taxRate}
                    onChange={(event) =>
                      setTaxRate(Math.max(0, Number(event.target.value) || 0))
                    }
                    className="h-7 w-16 text-xs"
                  />
                  <span className="text-xs">%</span>
                  <span className="font-medium">
                    {currencyFormatter.format(taxAmount)}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Discount</span>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={discount}
                    onChange={(event) =>
                      setDiscount(Math.max(0, Number(event.target.value) || 0))
                    }
                    className="h-7 w-20 text-xs"
                  />
                  <span className="font-medium">
                    {currencyFormatter.format(discount)}
                  </span>
                </div>
              </div>
              <div className="flex justify-between border-t border-border pt-4">
                <span className="font-semibold">Total</span>
                <span className="text-2xl font-semibold">
                  {currencyFormatter.format(total)}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium">Total Items</p>
                <p className="text-2xl font-semibold">{items.length}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Total Units</p>
                <p className="text-2xl font-semibold">
                  {items.reduce((sum, item) => sum + item.quantity, 0)}
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-col gap-2">
            <Button
              type="submit"
              disabled={items.length === 0 || saving}
              className="gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  <span>Save Changes</span>
                </>
              )}
            </Button>
            <Link href={`/sales/${sale.id}`}>
              <Button
                type="button"
                variant="outline"
                className="w-full bg-transparent"
                disabled={saving}
              >
                Cancel
              </Button>
            </Link>
          </div>
        </div>
      </form>
    </div>
  );
}
