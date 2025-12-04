"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  ChevronsUpDown,
  Loader2,
  Plus,
  Printer,
  Save,
  Trash2,
  UserPlus,
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
  CommandSeparator,
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
import { useProductApi } from "@/hooks/use-product-api";
import { useInventoryApi } from "@/hooks/use-inventory-api";
import { useCustomersApi, type Customer } from "@/hooks/use-customers-api";
import type { Product } from "@/lib/types";
import type { Warehouse } from "@/hooks/use-inventory-api";
import { cn } from "@/lib/utils";

import { useSalesService } from "../_services/sales-service";
import type { SalePaymentStatus, SaleStatus } from "../_types";

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

export default function NewSalePage() {
  const router = useRouter();
  const { getProducts } = useProductApi();
  const { getWarehouses } = useInventoryApi();
  const { getCustomers, createCustomer } = useCustomersApi();
  const { createSale } = useSalesService();

  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState<string | null>(null);

  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [warehousesLoading, setWarehousesLoading] = useState(true);
  const [warehousesError, setWarehousesError] = useState<string | null>(null);

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customersLoading, setCustomersLoading] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerComboOpen, setCustomerComboOpen] = useState(false);
  const [showNewCustomerFields, setShowNewCustomerFields] = useState(false);

  const today = useMemo(() => new Date().toISOString().split("T")[0], []);

  const [formData, setFormData] = useState({
    customerId: "",
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    shippingAddress: "",
    warehouseId: "",
    date: today,
    dueDate: "",
    status: "DRAFT" as SaleStatus,
    paymentStatus: "PENDING" as SalePaymentStatus,
  });

  const [items, setItems] = useState<SaleItemRow[]>([]);
  const [taxRate, setTaxRate] = useState(10);
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const loadData = async () => {
      try {
        // Load products
        setProductsLoading(true);
        setProductsError(null);
        const { products: productsList } = await getProducts({
          page: 1,
          limit: 200,
        });

        // Load warehouses
        setWarehousesLoading(true);
        setWarehousesError(null);
        const warehousesList = await getWarehouses();

        // Load customers
        setCustomersLoading(true);
        const customersResult = await getCustomers({ limit: 100 });
        const customersList = Array.isArray(customersResult)
          ? customersResult
          : customersResult?.customers ?? [];

        if (active) {
          setProducts(productsList ?? []);
          setWarehouses(warehousesList ?? []);
          setCustomers(customersList);
        }
      } catch (error) {
        if (active) {
          setProductsError(normalizeError(error));
          setWarehousesError(normalizeError(error));
        }
      } finally {
        if (active) {
          setProductsLoading(false);
          setWarehousesLoading(false);
          setCustomersLoading(false);
        }
      }
    };

    loadData();

    return () => {
      active = false;
    };
  }, [getProducts, getWarehouses, getCustomers]);

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
  const total = useMemo(() => subtotal + taxAmount, [subtotal, taxAmount]);

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

        if (field === "productName" && typeof value === "string") {
          next.productName = value;
        }

        next.total = Number(next.quantity) * Number(next.unitPrice);
        return next;
      })
    );
  };

  const handleSelectCustomer = (customer: Customer) => {
    setFormData((prev) => ({
      ...prev,
      customerId: customer.id,
      customerName: customer.name,
      customerEmail: customer.email || "",
      customerPhone: customer.phone || "",
      shippingAddress: customer.address || prev.shippingAddress,
    }));
    setShowNewCustomerFields(false);
    setCustomerComboOpen(false);
  };

  const handleCreateNewCustomer = async () => {
    if (!formData.customerName.trim() || !formData.customerEmail.trim()) {
      setSubmitError(
        "Customer name and email are required to create a new customer."
      );
      return;
    }

    try {
      const newCustomer = await createCustomer({
        name: formData.customerName.trim(),
        email: formData.customerEmail.trim(),
        phone: formData.customerPhone.trim() || undefined,
        address: formData.shippingAddress.trim() || undefined,
      });

      // Update customers list
      setCustomers((prev) => [newCustomer, ...prev]);

      // Update form with new customer ID
      setFormData((prev) => ({
        ...prev,
        customerId: newCustomer.id,
      }));

      setShowNewCustomerFields(false);
      setSubmitError(null);
    } catch (error) {
      setSubmitError(normalizeError(error));
    }
  };

  const filteredCustomers = customers.filter(
    (customer) =>
      customer.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
      customer.email?.toLowerCase().includes(customerSearch.toLowerCase())
  );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!formData.customerName.trim()) {
      setSubmitError("Customer name is required.");
      return;
    }

    if (!formData.customerEmail.trim()) {
      setSubmitError("Customer email is required.");
      return;
    }

    if (!formData.warehouseId) {
      setSubmitError("Warehouse selection is required.");
      return;
    }

    if (!formData.dueDate) {
      setSubmitError("Due date is required.");
      return;
    }

    if (items.length === 0) {
      setSubmitError("Add at least one product to create a sale.");
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
        customer: {
          name: formData.customerName.trim(),
          email: formData.customerEmail.trim(),
        },
        warehouseId: formData.warehouseId,
        saleDate: new Date(formData.date).toISOString(),
        dueDate: new Date(formData.dueDate).toISOString(),
        status: formData.status,
        paymentStatus: formData.paymentStatus,
        taxRate,
        shippingAddress: formData.shippingAddress?.trim() || undefined,
        items: items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
      };

      const created = await createSale(payload);
      router.push(`/sales/${created.id}`);
    } catch (error) {
      setSubmitError(normalizeError(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/sales">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">New Sale</h1>
          <p className="text-sm text-muted-foreground">
            Create a new sales invoice
          </p>
        </div>
      </div>

      {submitError && (
        <Alert variant="destructive">
          <AlertDescription>{submitError}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="grid gap-6 md:grid-cols-3">
        <div className="space-y-6 md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Customer Information</CardTitle>
              <CardDescription>
                Enter customer and invoice details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Customer *</Label>
                <Popover
                  open={customerComboOpen}
                  onOpenChange={setCustomerComboOpen}
                >
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={customerComboOpen}
                      className="w-full justify-between"
                    >
                      {formData.customerId
                        ? customers.find((c) => c.id === formData.customerId)
                            ?.name || formData.customerName
                        : "Select or create customer..."}
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
                                  formData.customerId === customer.id
                                    ? "opacity-100"
                                    : "opacity-0"
                                )}
                              />
                              <div className="flex flex-col">
                                <span className="font-medium">
                                  {customer.name}
                                </span>
                                {customer.email && (
                                  <span className="text-xs text-muted-foreground">
                                    {customer.email}
                                  </span>
                                )}
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                        <CommandSeparator />
                        <CommandGroup>
                          <CommandItem
                            onSelect={() => {
                              setShowNewCustomerFields(true);
                              setCustomerComboOpen(false);
                            }}
                          >
                            <UserPlus className="mr-2 h-4 w-4" />
                            Create new customer
                          </CommandItem>
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              {showNewCustomerFields && (
                <div className="space-y-4 rounded-lg border p-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold">New Customer</h4>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowNewCustomerFields(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="newCustomerName">Name *</Label>
                      <Input
                        id="newCustomerName"
                        placeholder="Enter customer name"
                        value={formData.customerName}
                        onChange={(event) =>
                          setFormData((prev) => ({
                            ...prev,
                            customerName: event.target.value,
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="newCustomerEmail">Email *</Label>
                      <Input
                        id="newCustomerEmail"
                        type="email"
                        placeholder="Enter email"
                        value={formData.customerEmail}
                        onChange={(event) =>
                          setFormData((prev) => ({
                            ...prev,
                            customerEmail: event.target.value,
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="newCustomerPhone">Phone</Label>
                      <Input
                        id="newCustomerPhone"
                        placeholder="Enter phone"
                        value={formData.customerPhone}
                        onChange={(event) =>
                          setFormData((prev) => ({
                            ...prev,
                            customerPhone: event.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>
                  <Button
                    type="button"
                    onClick={handleCreateNewCustomer}
                    className="w-full"
                  >
                    <UserPlus className="mr-2 h-4 w-4" />
                    Create Customer
                  </Button>
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="warehouse">Warehouse *</Label>
                  <Select
                    value={formData.warehouseId}
                    onValueChange={(value) =>
                      setFormData((prev) => ({
                        ...prev,
                        warehouseId: value,
                      }))
                    }
                  >
                    <SelectTrigger id="warehouse">
                      <SelectValue placeholder="Select warehouse" />
                    </SelectTrigger>
                    <SelectContent>
                      {warehousesLoading && (
                        <SelectItem value="LOADING" disabled>
                          Loading warehouses...
                        </SelectItem>
                      )}
                      {!warehousesLoading && warehousesError && (
                        <SelectItem value="ERROR" disabled>
                          {warehousesError}
                        </SelectItem>
                      )}
                      {!warehousesLoading &&
                        !warehousesError &&
                        warehouses.length === 0 && (
                          <SelectItem value="NO_WAREHOUSES" disabled>
                            No warehouses available
                          </SelectItem>
                        )}
                      {!warehousesLoading &&
                        !warehousesError &&
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
                <Label htmlFor="shippingAddress">Shipping Address</Label>
                <Textarea
                  id="shippingAddress"
                  placeholder="Enter shipping address (auto-filled from customer if available)"
                  value={formData.shippingAddress}
                  onChange={(event) =>
                    setFormData((prev) => ({
                      ...prev,
                      shippingAddress: event.target.value,
                    }))
                  }
                  rows={3}
                />
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
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Invoice Items</CardTitle>
                  <CardDescription>Add products to this sale</CardDescription>
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
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Sale
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled
              className="gap-2 bg-transparent"
            >
              <Printer className="h-4 w-4" />
              Save & Print
            </Button>
            <Link href="/sales">
              <Button
                type="button"
                variant="outline"
                className="w-full bg-transparent"
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
