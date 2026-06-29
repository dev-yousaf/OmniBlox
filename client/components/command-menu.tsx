"use client";

import { useRouter } from "next/navigation";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Package,
  FileText,
  Warehouse,
  Settings,
} from "lucide-react";

interface CommandMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandMenu({ open, onOpenChange }: CommandMenuProps) {
  const router = useRouter();

  const runCommand = (command: () => void) => {
    onOpenChange(false);
    command();
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Navigation">
          <CommandItem
            onSelect={() => runCommand(() => router.push("/products"))}
          >
            <Package className="mr-2 h-4 w-4" />
            <span>Products</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push("/sales"))}>
            <FileText className="mr-2 h-4 w-4" />
            <span>Sales & Invoices</span>
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => router.push("/inventory"))}
          >
            <Warehouse className="mr-2 h-4 w-4" />
            <span>Inventory</span>
          </CommandItem>

          <CommandItem
            onSelect={() => runCommand(() => router.push("/settings"))}
          >
            <Settings className="mr-2 h-4 w-4" />
            <span>Settings</span>
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Quick Actions">
          <CommandItem
            onSelect={() => runCommand(() => router.push("/products/new"))}
          >
            <Package className="mr-2 h-4 w-4" />
            <span>New Product</span>
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => router.push("/sales/new"))}
          >
            <FileText className="mr-2 h-4 w-4" />
            <span>New Invoice</span>
          </CommandItem>
          <CommandItem
            onSelect={() =>
              runCommand(() => router.push("/inventory/transfer"))
            }
          >
            <Warehouse className="mr-2 h-4 w-4" />
            <span>Stock Transfer</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
