"use client";

import { useEffect, useState } from "react";
import { PageLoadingSkeleton } from "@/components/ui/page-loading-skeleton";
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
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuotationsApi } from "@/hooks/use-quotations-api";
import { useCustomersApi, type Customer } from "@/hooks/use-customers-api";
import { useProductApi } from "@/hooks/use-product-api";
import type { Product } from "@/lib/types";
import { toast } from "sonner";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface QuotationItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
}

export default function NewQuotationPage() {
  const router = useRouter();
  const { createQuotation } = useQuotationsApi();
  const { getCustomers } = useCustomersApi();
  const { getProducts } = useProductApi();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [customerId, setCustomerId] = useState("");
  const [customerOpen, setCustomerOpen] = useState(false);
  const [quoteDate, setQuoteDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [expiryDate, setExpiryDate] = useState("");
  const [notes, setNotes] = useState("");

  const [items, setItems] = useState<QuotationItem[]>([
    {
      id: crypto.randomUUID(),
      productId: "",
      productName: "",
      quantity: 1,
      unitPrice: 0,
    },
  ]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [customersData, productsData] = await Promise.all([
        getCustomers(),
        getProducts(),
      ]);
      // Handle different response types
      const customersList = Array.isArray(customersData)
        ? customersData
        : customersData.customers;
      const productsList = Array.isArray(productsData)
        ? productsData
        : productsData.products;

      setCustomers(customersList);
      setProducts(productsList);
    } catch (error: any) {
      toast.error("Failed to load data", {
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const addItem = () => {
    setItems([
      ...items,
      {
        id: crypto.randomUUID(),
        productId: "",
        productName: "",
        quantity: 1,
        unitPrice: 0,
      },
    ]);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter((item) => item.id !== id));
    }
  };

  const updateItem = (
    id: string,
    field: keyof QuotationItem,
    value: string | number
  ) => {
    setItems(
      items.map((item) => {
        if (item.id === id) {
          if (field === "productId") {
            const product = products.find((p) => p.id === value);
            return {
              ...item,
              productId: value as string,
              productName: product?.name || "",
              unitPrice: product ? Number(product.salePrice) : 0,
            };
          }
          return { ...item, [field]: value };
        }
        return item;
      })
    );
  };

  const subtotal = items.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0
  );
  const tax = 0; // Tax will be calculated on backend
  const discount = 0;
  const total = subtotal + tax - discount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!customerId) {
      toast.error("Please select a customer");
      return;
    }

    if (!quoteDate) {
      toast.error("Please select a quote date");
      return;
    }

    if (items.some((item) => !item.productId)) {
      toast.error("Please select a product for each item");
      return;
    }

    try {
      setSaving(true);

      const quotationData = {
        customerId,
        quoteDate: new Date(quoteDate).toISOString(),
        expiryDate: expiryDate ? new Date(expiryDate).toISOString() : undefined,
        items: items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
        notes: notes.trim() || undefined,
      };

      const created = await createQuotation(quotationData);

      toast.success("Quotation created successfully!", {
        description: `Quotation ${created.referenceNumber} has been created`,
      });

      router.push(`/quotations/${created.id}`);
    } catch (error: any) {
      toast.error("Failed to create quotation", {
        description: error.message || "Please try again",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <PageLoadingSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/quotations">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            New Quotation
          </h1>
          <p className="text-muted-foreground mt-1">
            Create a new quotation for a customer
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Customer Information</CardTitle>
              <CardDescription>Select customer and dates</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Customer *</Label>
                <Popover open={customerOpen} onOpenChange={setCustomerOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={customerOpen}
                      className="w-full justify-between"
                    >
                      {customerId
                        ? customers.find((c) => c.id === customerId)?.name
                        : "Select customer..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0">
                    <Command>
                      <CommandInput placeholder="Search customer..." />
                      <CommandEmpty>No customer found.</CommandEmpty>
                      <CommandList>
                        <CommandGroup>
                          {customers.map((customer) => (
                            <CommandItem
                              key={customer.id}
                              value={customer.name}
                              onSelect={() => {
                                setCustomerId(customer.id);
                                setCustomerOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  customerId === customer.id
                                    ? "opacity-100"
                                    : "opacity-0"
                                )}
                              />
                              <div>
                                <div className="font-medium">
                                  {customer.name}
                                </div>
                                {customer.email && (
                                  <div className="text-xs text-muted-foreground">
                                    {customer.email}
                                  </div>
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

              <div className="space-y-2">
                <Label htmlFor="quoteDate">Quote Date *</Label>
                <Input
                  id="quoteDate"
                  type="date"
                  value={quoteDate}
                  onChange={(e) => setQuoteDate(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="expiryDate">Expiry Date</Label>
                <Input
                  id="expiryDate"
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Additional Details</CardTitle>
              <CardDescription>Notes and comments</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Add any additional notes..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={8}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Quotation Items</CardTitle>
                <CardDescription>Add products and quantities</CardDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addItem}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {items.map((item, index) => (
                <div
                  key={item.id}
                  className="flex items-end gap-4 p-4 border rounded-lg"
                >
                  <div className="flex-1 space-y-2">
                    <Label>Product *</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          className="w-full justify-between"
                        >
                          {item.productId
                            ? products.find((p) => p.id === item.productId)
                                ?.name
                            : "Select product..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0">
                        <Command>
                          <CommandInput placeholder="Search product..." />
                          <CommandEmpty>No product found.</CommandEmpty>
                          <CommandList>
                            <CommandGroup>
                              {products.map((product) => (
                                <CommandItem
                                  key={product.id}
                                  value={product.name}
                                  onSelect={() => {
                                    updateItem(
                                      item.id,
                                      "productId",
                                      product.id
                                    );
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      item.productId === product.id
                                        ? "opacity-100"
                                        : "opacity-0"
                                    )}
                                  />
                                  <div>
                                    <div className="font-medium">
                                      {product.name}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      ${Number(product.salePrice).toFixed(2)}{" "}
                                      {product.sku
                                        ? `• SKU: ${product.sku}`
                                        : ""}
                                    </div>
                                  </div>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="w-32 space-y-2">
                    <Label>Quantity *</Label>
                    <Input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) =>
                        updateItem(
                          item.id,
                          "quantity",
                          parseInt(e.target.value) || 1
                        )
                      }
                      required
                    />
                  </div>

                  <div className="w-40 space-y-2">
                    <Label>Unit Price *</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.unitPrice}
                      onChange={(e) =>
                        updateItem(
                          item.id,
                          "unitPrice",
                          parseFloat(e.target.value) || 0
                        )
                      }
                      required
                    />
                  </div>

                  <div className="w-40 space-y-2">
                    <Label>Total</Label>
                    <Input
                      value={`$${(item.quantity * item.unitPrice).toFixed(2)}`}
                      disabled
                    />
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeItem(item.id)}
                    disabled={items.length === 1}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="mt-6 flex justify-end">
              <div className="w-80 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium">${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-lg font-semibold pt-3 border-t">
                  <span>Total</span>
                  <span>${total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Link href="/quotations">
            <Button type="button" variant="outline" disabled={saving}>
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Quotation"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}




