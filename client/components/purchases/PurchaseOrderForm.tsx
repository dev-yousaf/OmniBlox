"use client";

import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import {
  useForm,
  useFieldArray,
  Controller,
  FormProvider,
} from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import { toast } from "@/hooks/use-toast";
import { useSuppliersApi, Supplier } from "@/hooks/use-suppliers-api";
import { useWarehouses } from "@/hooks/use-warehouses";
import { useProductApi } from "@/hooks/use-product-api";
import {
  usePurchasesApi,
  CreatePurchaseOrderDto,
} from "@/hooks/use-purchases-api";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Calendar as CalendarIcon, Loader2 } from "lucide-react";

const itemSchema = z.object({
  productId: z.string().min(1, "Product is required"),
  quantity: z.number().min(1, "Min 1"),
  unitCost: z.number().min(0, "Invalid cost"),
});

const formSchema = z.object({
  supplierId: z.string().min(1, "Supplier is required"),
  referenceNumber: z.string().optional(),
  orderDate: z.date({ required_error: "Order date is required" }),
  taxRate: z.number().min(0).max(100).default(0),
  items: z.array(itemSchema).min(1, "At least one item"),
});

export type PurchaseOrderFormValues = z.infer<typeof formSchema>;

function formatCurrency(n: number) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
  }).format(n || 0);
}

// A small async combobox that fetches options as the user types
interface ComboOption {
  value: string;
  label: string;
  meta?: any;
}

function AsyncCombobox({
  value,
  onChange,
  placeholder,
  fetcher,
  disabled,
}: {
  value?: string;
  onChange: (v: string, meta?: any) => void;
  placeholder: string;
  fetcher: (query: string) => Promise<ComboOption[]>;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<ComboOption[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      try {
        const opts = await fetcher(query);
        if (!cancelled) setOptions(opts);
      } catch (e) {
        if (!cancelled) setOptions([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    const t = setTimeout(run, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query, fetcher]);

  const selectedLabel = useMemo(
    () => options.find((o) => o.value === value)?.label,
    [options, value]
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          className="justify-between w-full"
          disabled={disabled}
        >
          {selectedLabel || placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[var(--radix-popover-trigger-width)]">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={placeholder}
            value={query}
            onValueChange={setQuery}
          />
          {loading ? (
            <div className="py-6 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading...
            </div>
          ) : (
            <>
              <CommandEmpty>No results found.</CommandEmpty>
              <CommandGroup>
                {options.map((opt) => (
                  <CommandItem
                    key={opt.value}
                    onSelect={() => {
                      onChange(opt.value, opt.meta);
                      setOpen(false);
                    }}
                  >
                    {opt.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export default function PurchaseOrderForm() {
  const router = useRouter();
  const { getSuppliers } = useSuppliersApi();
  const { getProducts } = useProductApi();
  const { create } = usePurchasesApi();

  const form = useForm<PurchaseOrderFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      supplierId: "",
      referenceNumber: "",
      orderDate: new Date(),
      taxRate: 0,
      items: [],
    },
    mode: "onChange",
  });

  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const subtotal = form
    .watch("items")
    .reduce(
      (sum, item) =>
        sum + (Number(item.quantity) || 0) * (Number(item.unitCost) || 0),
      0
    );
  const taxRate = form.watch("taxRate") || 0;
  const tax = subtotal * (taxRate / 100);
  const total = subtotal + tax;

  // Suppliers fetcher
  const fetchSuppliers = React.useCallback(
    async (q: string): Promise<ComboOption[]> => {
      const res = await getSuppliers({ search: q, limit: 20, page: 1 });
      const list: Supplier[] = Array.isArray(res)
        ? res
        : (res as any)?.suppliers || [];
      return list.map((s) => ({ value: s.id, label: s.name, meta: s }));
    },
    [getSuppliers]
  );

  // Products fetcher
  const fetchProducts = React.useCallback(
    async (q: string): Promise<ComboOption[]> => {
      const res = await getProducts({ search: q, limit: 20, page: 1 });
      const list = res?.products || [];
      return list.map((p) => ({
        value: p.id,
        label: `${p.name}${p.sku ? ` (${p.sku})` : ""}`,
        meta: p,
      }));
    },
    [getProducts]
  );

  const onSubmit = async (values: PurchaseOrderFormValues) => {
    const payload: CreatePurchaseOrderDto = {
      supplierId: values.supplierId,
      orderDate: values.orderDate.toISOString(),
      referenceNumber: values.referenceNumber || undefined,
      items: values.items.map((i) => ({
        productId: i.productId,
        quantity: Number(i.quantity),
        unitCost: Number(i.unitCost),
      })),
    };
    try {
      await create(payload);
      toast({
        title: "Purchase saved",
        description: "The purchase order was created successfully.",
      });
      router.push("/purchases");
    } catch (e: any) {
      toast({
        title: "Failed to save",
        description: e?.message || "Something went wrong",
        variant: "destructive" as any,
      });
    }
  };

  return (
    <FormProvider {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="grid gap-6 md:grid-cols-3"
      >
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Purchase Details</CardTitle>
              <CardDescription>
                Select supplier and set reference/date.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Supplier</Label>
                <Controller
                  name="supplierId"
                  control={form.control}
                  render={({ field }) => (
                    <AsyncCombobox
                      value={field.value}
                      onChange={(v) => field.onChange(v)}
                      placeholder="Search suppliers..."
                      fetcher={fetchSuppliers}
                    />
                  )}
                />
                {form.formState.errors.supplierId && (
                  <p className="text-xs text-destructive">
                    {String(form.formState.errors.supplierId.message)}
                  </p>
                )}
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Reference Number</Label>
                  <Controller
                    name="referenceNumber"
                    control={form.control}
                    render={({ field }) => (
                      <Input
                        placeholder="Optional ref (auto if blank)"
                        {...field}
                      />
                    )}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Order Date</Label>
                  <Controller
                    name="orderDate"
                    control={form.control}
                    render={({ field }) => (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full justify-start"
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value
                              ? field.value.toLocaleDateString()
                              : "Pick a date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent align="start" className="p-2">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={(d) => d && field.onChange(d)}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    )}
                  />
                  {form.formState.errors.orderDate && (
                    <p className="text-xs text-destructive">
                      {String(form.formState.errors.orderDate.message)}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Line Items</CardTitle>
                  <CardDescription>
                    Add products, quantities, and unit costs.
                  </CardDescription>
                </div>
                <Button
                  type="button"
                  size="sm"
                  className="gap-2"
                  onClick={() =>
                    append({ productId: "", quantity: 1, unitCost: 0 })
                  }
                >
                  <Plus className="h-4 w-4" /> Add Item
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {fields.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No items yet. Click "Add Item".
                </p>
              ) : (
                fields.map((field, idx) => {
                  const q = form.watch(`items.${idx}.quantity`);
                  const c = form.watch(`items.${idx}.unitCost`);
                  const lineTotal = (Number(q) || 0) * (Number(c) || 0);
                  return (
                    <div
                      key={field.id}
                      className="border border-border rounded-lg p-4 space-y-4"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 grid gap-4 md:grid-cols-4">
                          <div className="space-y-2">
                            <Label>Product</Label>
                            <Controller
                              name={`items.${idx}.productId` as const}
                              control={form.control}
                              render={({ field }) => (
                                <AsyncCombobox
                                  value={field.value}
                                  onChange={(v, meta) => {
                                    field.onChange(v);
                                    if (meta?.costPrice != null) {
                                      form.setValue(
                                        `items.${idx}.unitCost`,
                                        Number(meta.costPrice)
                                      );
                                    }
                                  }}
                                  placeholder="Search products..."
                                  fetcher={fetchProducts}
                                />
                              )}
                            />
                            {form.formState.errors.items?.[idx]?.productId && (
                              <p className="text-xs text-destructive">
                                {String(
                                  form.formState.errors.items?.[idx]?.productId
                                    ?.message
                                )}
                              </p>
                            )}
                          </div>
                          <div className="space-y-2">
                            <Label>Quantity</Label>
                            <Controller
                              name={`items.${idx}.quantity` as const}
                              control={form.control}
                              render={({ field }) => (
                                <Input
                                  type="number"
                                  min={1}
                                  step={1}
                                  value={field.value}
                                  onChange={(e) =>
                                    field.onChange(Number(e.target.value))
                                  }
                                />
                              )}
                            />
                            {form.formState.errors.items?.[idx]?.quantity && (
                              <p className="text-xs text-destructive">
                                {String(
                                  form.formState.errors.items?.[idx]?.quantity
                                    ?.message
                                )}
                              </p>
                            )}
                          </div>
                          <div className="space-y-2">
                            <Label>Unit Cost</Label>
                            <Controller
                              name={`items.${idx}.unitCost` as const}
                              control={form.control}
                              render={({ field }) => (
                                <Input
                                  type="number"
                                  min={0}
                                  step={0.01}
                                  value={field.value}
                                  onChange={(e) =>
                                    field.onChange(Number(e.target.value))
                                  }
                                />
                              )}
                            />
                            {form.formState.errors.items?.[idx]?.unitCost && (
                              <p className="text-xs text-destructive">
                                {String(
                                  form.formState.errors.items?.[idx]?.unitCost
                                    ?.message
                                )}
                              </p>
                            )}
                          </div>
                          <div className="space-y-2">
                            <Label>Line Total</Label>
                            <Input
                              value={formatCurrency(lineTotal)}
                              readOnly
                              disabled
                            />
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => remove(idx)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm items-center gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Tax</span>
                  <Controller
                    name="taxRate"
                    control={form.control}
                    render={({ field }) => (
                      <div className="flex items-center gap-2">
                        <Input
                          className="w-16 h-7 text-xs"
                          type="number"
                          min={0}
                          max={100}
                          step={0.5}
                          value={field.value}
                          onChange={(e) =>
                            field.onChange(Number(e.target.value))
                          }
                        />
                        <span className="text-xs">%</span>
                      </div>
                    )}
                  />
                </div>
                <span className="font-medium">{formatCurrency(tax)}</span>
              </div>
              <div className="border-t border-border pt-4 flex justify-between">
                <span className="font-semibold">Total</span>
                <span className="text-2xl font-semibold">
                  {formatCurrency(total)}
                </span>
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-col gap-2">
            <Button
              type="submit"
              disabled={
                !form.formState.isValid ||
                form.formState.isSubmitting ||
                form.watch("items").length === 0
              }
            >
              {form.formState.isSubmitting ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Saving...
                </span>
              ) : (
                "Save Purchase"
              )}
            </Button>
          </div>
        </div>
      </form>
    </FormProvider>
  );
}
