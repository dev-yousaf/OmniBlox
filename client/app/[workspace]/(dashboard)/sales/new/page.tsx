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
  Package,
  UserPlus,
} from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
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
import type { SalePaymentMethod, SalePaymentStatus, SaleStatus } from "../_types";

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
  const ws = useWorkspace();
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
    paymentMethod: null as SalePaymentMethod | null,
  });

  const [items, setItems] = useState<SaleItemRow[]>([]);
  const [taxRate, setTaxRate] = useState(10);
  const [discount, setDiscount] = useState(0);
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const loadData = async () => {
      try {
        setProductsLoading(true);
        setProductsError(null);
        const { products: productsList } = await getProducts({
          page: 1,
          limit: 200,
        });

        setWarehousesLoading(true);
        setWarehousesError(null);
        const warehousesList = await getWarehouses();

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

      setCustomers((prev) => [newCustomer, ...prev]);

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

    if (discount > subtotal + taxAmount) {
      setSubmitError("Discount cannot exceed the invoice total.");
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
        paymentMethod: formData.paymentMethod ?? undefined,
        taxRate,
        discount,
        shippingAddress: formData.shippingAddress?.trim() || undefined,
        items: items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
      };

      const created = await createSale(payload);
      router.push(`/${ws}/sales/${created.id}`);
    } catch (error) {
      setSubmitError(normalizeError(error));
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
        <Link href="/sales" className="hover:text-foreground transition-colors">Sales</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground">New Sale</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[18px] font-bold text-foreground">New Sale</h1>
          <p className="text-sm text-muted-foreground">Create a new sales invoice</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/sales">
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
            form="new-sale-form"
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
                <span>Save Sale</span>
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

      <form id="new-sale-form" onSubmit={handleSubmit} className="grid gap-5 lg:grid-cols-[1fr_320px]">
        {/* Left Column */}
        <div className="space-y-5">
          <Card className="border rounded-[5px] bg-card shadow-sm">
            <CardHeader className="px-5 py-[15px] border-b">
              <CardTitle className="text-sm font-semibold">Customer Information</CardTitle>
              <CardDescription className="text-xs">Select or create a customer and set invoice details</CardDescription>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              {/* Customer Select */}
              <div className="space-y-2">
                <Label className="text-xs font-medium">Customer *</Label>
                <Popover
                  open={customerComboOpen}
                  onOpenChange={setCustomerComboOpen}
                >
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={customerComboOpen}
                      className="w-full justify-between h-[34px] rounded-[5px] text-sm font-normal"
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
                <div className="space-y-4 border rounded-[5px] p-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold">New Customer</h4>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-[30px] text-xs rounded-[5px]"
                      onClick={() => setShowNewCustomerFields(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="newCustomerName" className="text-xs font-medium">Name *</Label>
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
                        className="h-[34px] rounded-[5px] text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="newCustomerEmail" className="text-xs font-medium">Email *</Label>
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
                        className="h-[34px] rounded-[5px] text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="newCustomerPhone" className="text-xs font-medium">Phone</Label>
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
                        className="h-[34px] rounded-[5px] text-sm"
                      />
                    </div>
                  </div>
                  <Button
                    type="button"
                    onClick={handleCreateNewCustomer}
                    className="h-[34px] rounded-[5px] text-[13px]"
                  >
                    <UserPlus className="mr-1.5 h-3.5 w-3.5" />
                    Create Customer
                  </Button>
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-2">
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
                <Label htmlFor="shippingAddress" className="text-xs font-medium">Shipping Address</Label>
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
                  className="rounded-[5px] text-sm"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="paymentStatus" className="text-xs font-medium">Payment Status</Label>
                  <Select
                    value={formData.paymentStatus}
                    onValueChange={(value) =>
                      setFormData((prev) => ({
                        ...prev,
                        paymentStatus: value as SalePaymentStatus,
                      }))
                    }
                  >
                    <SelectTrigger id="paymentStatus" className="h-[34px] rounded-[5px] text-sm">
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
                  <Label htmlFor="paymentMethod" className="text-xs font-medium">Payment Method</Label>
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
                    <SelectTrigger id="paymentMethod" className="h-[34px] rounded-[5px] text-sm">
                      <SelectValue placeholder="Select method" />
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
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="date" className="text-xs font-medium">Invoice Date *</Label>
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
                    className="h-[34px] rounded-[5px] text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dueDate" className="text-xs font-medium">Due Date *</Label>
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
                    className="h-[34px] rounded-[5px] text-sm"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border rounded-[5px] bg-card shadow-sm">
            <CardHeader className="px-5 py-[15px] border-b">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-semibold">Invoice Items</CardTitle>
                  <CardDescription className="text-xs">Add products to this sale</CardDescription>
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
                          <Select
                            value={item.productId}
                            onValueChange={(value) =>
                              updateItem(item.id, "productId", value)
                            }
                          >
                            <SelectTrigger className="h-[34px] rounded-[5px] text-sm">
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
                          <Label className="text-xs font-medium">Price</Label>
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
            <h3 className="text-sm font-semibold text-foreground mb-4">Invoice Summary</h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium tabular-nums">
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
                    className="h-7 w-16 text-xs rounded-[5px]"
                  />
                  <span className="text-xs text-muted-foreground">%</span>
                  <span className="font-medium tabular-nums min-w-[60px] text-right">
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
                    className="h-7 w-20 text-xs rounded-[5px]"
                  />
                  <span className="font-medium tabular-nums min-w-[60px] text-right">
                    {currencyFormatter.format(discount)}
                  </span>
                </div>
              </div>
              <div className="flex justify-between border-t border-border pt-3">
                <span className="font-semibold text-foreground">Total</span>
                <span className="text-xl font-bold tabular-nums">
                  {currencyFormatter.format(total)}
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
