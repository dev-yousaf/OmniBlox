"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Package,
  FileText,
  Warehouse,
  BarChart3,
  Settings,
  ChevronDown,
  LayoutDashboard,
  ShoppingCart,
  Users,
  Bell,
  FileQuestion,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Building,
  DollarSign,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { motion, AnimatePresence } from "framer-motion";

const navigation = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    name: "Products",
    href: "/products",
    icon: Package,
    children: [
      { name: "All Products", href: "/products" },
      { name: "New Product", href: "/products/new" },
      { name: "Barcode Labels", href: "/products/barcodes" },
      { name: "Stock Adjustment", href: "/products/adjustment" },
    ],
  },
  {
    name: "Expenses",
    href: "/expenses",
    icon: DollarSign,
    children: [
      { name: "All Expenses", href: "/expenses" },
      { name: "New Expense", href: "/expenses/new" },
      { name: "Expense Categories", href: "/expenses/categories" },
      { name: "Expense Reports", href: "/expenses/reports" },
    ],
  },
  {
    name: "Sales",
    href: "/sales",
    icon: FileText,
    children: [
      { name: "All Sales", href: "/sales" },
      { name: "New Sale", href: "/sales/new" },
      { name: "Deliveries", href: "/sales/deliveries" },
    ],
  },
  {
    name: "Purchases",
    href: "/purchases",
    icon: ShoppingCart,
  },
  {
    name: "Quotations",
    href: "/quotations",
    icon: FileQuestion,
  },
  {
    name: "Returns",
    href: "/returns",
    icon: RotateCcw,
  },
  {
    name: "Suppliers",
    href: "/suppliers",
    icon: Building,
    children: [
      { name: "All Suppliers", href: "/suppliers" },
      { name: "Add Supplier", href: "/suppliers/new" },
      { name: "Purchase Orders", href: "/suppliers/orders" },
      { name: "Payments", href: "/suppliers/payments" },
    ],
  },
  {
    name: "People",
    href: "/people",
    icon: Users,
    children: [
      { name: "Users", href: "/people/users" },
      { name: "Billers", href: "/people/billers" },
      { name: "Customers", href: "/people/customers" },
      { name: "Suppliers", href: "/people/suppliers" },
    ],
  },
  {
    name: "Inventory",
    href: "/inventory",
    icon: Warehouse,
    children: [
      { name: "Stock Overview", href: "/inventory" },
      { name: "Stock Transfer", href: "/inventory/transfer" },
      { name: "Warehouses", href: "/inventory/warehouses" },
    ],
  },
  {
    name: "Notifications",
    href: "/notifications",
    icon: Bell,
  },
  {
    name: "Reports",
    href: "/reports",
    icon: BarChart3,
  },
  {
    name: "Settings",
    href: "/settings",
    icon: Settings,
    children: [
      { name: "General", href: "/settings" },
      { name: "Product Categories", href: "/settings/categories" },
    ],
  },
];

type AppSidebarProps = {
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
};

export function AppSidebar({ collapsed, onCollapsedChange }: AppSidebarProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  const [openSections, setOpenSections] = useState<string[]>([
    "Products",
    "Sales",
  ]);

  const toggleSection = (name: string) => {
    setOpenSections((prev) =>
      prev.includes(name) ? prev.filter((s) => s !== name) : [...prev, name]
    );
  };

  return (
    <div
      className={cn(
        "flex h-full flex-col border-r border-border bg-card transition-[width] duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Top Logo & Toggle */}
      <div className="flex h-14 items-center justify-between border-b border-border px-4">
        {!collapsed && (
          <Link
            href="/dashboard"
            className="flex items-center gap-2 font-semibold"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Package className="h-4 w-4" />
            </div>
            <span className="text-sm">OmniBlox</span>
          </Link>
        )}

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 ml-auto"
          onClick={() => onCollapsedChange(!collapsed)}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Sidebar Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto p-2">
        {navigation.map((item) => {
          const isActive =
            item.href === "/dashboard"
              ? pathname === "/dashboard" || pathname === "/"
              : pathname === item.href || pathname.startsWith(item.href + "/");

          const Icon = item.icon;
          const isOpen = openSections.includes(item.name);

          if (item.children && !collapsed) {
            return (
              <div key={item.name}>
                <Button
                  variant="ghost"
                  onClick={() => toggleSection(item.name)}
                  className={cn(
                    "w-full justify-between text-sm font-normal",
                    isActive && "bg-accent text-accent-foreground"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="h-4 w-4" />
                    <span>{item.name}</span>
                  </div>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 transition-transform",
                      isOpen && "rotate-180"
                    )}
                  />
                </Button>

                {/* Smooth Dropdown Animation */}
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <div className="space-y-1 pl-7 pt-1">
                        {item.children.map((child) => {
                          const isChildActive = pathname === child.href;
                          return (
                            <Link key={child.href} href={child.href}>
                              <Button
                                variant="ghost"
                                className={cn(
                                  "w-full justify-start text-sm font-normal",
                                  isChildActive &&
                                    "bg-accent text-accent-foreground"
                                )}
                              >
                                {child.name}
                              </Button>
                            </Link>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          }

          return (
            <Link
              key={item.name}
              href={item.href}
              title={collapsed ? item.name : undefined}
            >
              <Button
                variant="ghost"
                className={cn(
                  "w-full text-sm font-normal",
                  collapsed ? "justify-center px-2" : "justify-start gap-3",
                  isActive && "bg-accent text-accent-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {!collapsed && <span>{item.name}</span>}
              </Button>
            </Link>
          );
        })}
      </nav>

      {/* Bottom User Info */}
      <div className="border-t border-border p-4">
        {!collapsed ? (
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-xs font-medium">
              {user?.name
                ?.split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase() || "AD"}
            </div>
            <div className="flex-1 text-sm">
              <div className="font-medium">{user?.name || "Admin User"}</div>
              <div className="text-xs text-muted-foreground">
                {user?.email || "admin@omniblox.com"}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex justify-center">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-xs font-medium">
              {user?.name
                ?.split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase() || "AD"}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
