"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  DollarSign,
  ShoppingCart,
  FileQuestion,
  RotateCcw,
  Building,
  Users,
  Warehouse,
  BarChart3,
  Settings,
  Bell,
  FileText,
  AlertTriangle,
  FolderTree,
  Barcode,
  ArrowUpDown,
  ArrowLeftRight,
  ShoppingBag,
  ChevronRight,
  ChevronLeft,
  UserCog,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";

interface SidebarItem {
  name: string;
  href: string;
  icon?: typeof LayoutDashboard;
  mutationOnly?: boolean;
}

interface SidebarSection {
  label: string;
  items: SidebarItem[];
}

const sections: SidebarSection[] = [
  {
    label: "Main",
    items: [
      { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { name: "Super Admin", href: "/superadmin", icon: UserCog },
    ],
  },
  {
    label: "Inventory",
    items: [
      { name: "Products", href: "/products", icon: Package },
      { name: "Create Product", href: "/products/new", icon: Package, mutationOnly: true },
      { name: "Low Stocks", href: "/products", icon: AlertTriangle },
      { name: "Category", href: "/settings/categories", icon: FolderTree },
      { name: "Print Barcode", href: "/products/barcodes", icon: Barcode },
    ],
  },
  {
    label: "Stock",
    items: [
      { name: "Manage Stock", href: "/inventory", icon: Warehouse },
      { name: "Stock Adjustment", href: "/products/adjustment", icon: ArrowUpDown, mutationOnly: true },
      { name: "Stock Transfer", href: "/inventory/transfer", icon: ArrowLeftRight, mutationOnly: true },
    ],
  },
  {
    label: "Sales",
    items: [
      { name: "Sales", href: "/sales", icon: ShoppingCart },
      { name: "Invoices", href: "/sales", icon: FileText },
      { name: "Sales Return", href: "/returns", icon: RotateCcw },
      { name: "Quotation", href: "/quotations", icon: FileQuestion },
    ],
  },
  {
    label: "Purchases",
    items: [
      { name: "Purchases", href: "/purchases", icon: ShoppingBag },
    ],
  },
  {
    label: "Finance & Accounts",
    items: [
      { name: "Expenses", href: "/expenses", icon: DollarSign },
    ],
  },
  {
    label: "Peoples",
    items: [
      { name: "Users", href: "/people/users", icon: Users },
      { name: "Customers", href: "/people/customers", icon: Users },
      { name: "Suppliers", href: "/people/suppliers", icon: Building },
    ],
  },
  {
    label: "Reports",
    items: [
      { name: "Reports", href: "/reports", icon: BarChart3 },
    ],
  },
  {
    label: "Settings",
    items: [
      { name: "Settings", href: "/settings", icon: Settings },
      { name: "Notifications", href: "/notifications", icon: Bell },
    ],
  },
];

const roleAccess: Record<string, string[]> = {
  Users: ["OWNER", "ADMIN", "MANAGER"],
  Reports: ["OWNER", "ADMIN", "MANAGER"],
};

type AppSidebarProps = {
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
};

function filterItems(items: SidebarItem[], role: string): SidebarItem[] {
  const isAllowed = role === "OWNER" || role === "ADMIN" || role === "MANAGER";
  return items.filter((item) => {
    const allowedRoles = roleAccess[item.name];
    if (allowedRoles && !allowedRoles.includes(role)) return false;
    if (item.mutationOnly && !isAllowed) return false;
    return true;
  });
}

export function AppSidebar({ collapsed, onCollapsedChange }: AppSidebarProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  const userRole = (user?.role || "").toUpperCase();

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard" || pathname === "/";
    return pathname === href || pathname.startsWith(href + "/");
  };

  return (
    <div
      className={cn(
        "flex h-full flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-300",
        collapsed ? "w-16" : "w-[252px]"
      )}
    >
      {/* Logo */}
      <div className="flex h-[65px] items-center justify-between border-b border-sidebar-border px-4 py-[15px] shrink-0">
        {!collapsed && (
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-sidebar-accent-foreground text-sidebar-accent font-bold text-sm">
              O
            </div>
            <span className="text-sm font-semibold text-sidebar-section-label">
              {user?.company?.name || "OmniBlox"}
            </span>
          </Link>
        )}

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 ml-auto shrink-0 text-sidebar-muted hover:text-sidebar-foreground"
          onClick={() => onCollapsedChange(!collapsed)}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-6 space-y-4">
        {sections.map((section) => {
          const visibleItems = filterItems(section.items, userRole);
          if (visibleItems.length === 0) return null;

          return (
            <div key={section.label}>
              {!collapsed && (
                <div className="mb-2">
                  <span className="text-[12px] font-bold text-sidebar-section-label leading-[18px]">
                    {section.label}
                  </span>
                </div>
              )}

              <div className="space-y-1">
                {visibleItems.map((item) => {
                  const active = isActive(item.href);
                  const Icon = item.icon;

                  if (collapsed) {
                    return (
                      <Link key={item.name} href={item.href} title={item.name}>
                        <Button
                          variant="ghost"
                          className={cn(
                            "w-full justify-center px-2 h-9",
                            active
                              ? "bg-sidebar-accent text-sidebar-accent-foreground"
                              : "text-sidebar-foreground hover:bg-sidebar-hover"
                          )}
                        >
                          {Icon && <Icon className="h-4 w-4 shrink-0" />}
                        </Button>
                      </Link>
                    );
                  }

                  return (
                    <Link key={item.name} href={item.href}>
                      <div
                        className={cn(
                          "flex items-center gap-2 px-3 py-2 rounded-lg transition-colors",
                          active
                            ? "bg-sidebar-accent text-sidebar-accent-foreground"
                            : "text-sidebar-foreground hover:bg-sidebar-hover"
                        )}
                      >
                        {Icon && <Icon className="h-4 w-4 shrink-0" />}
                        <span className="text-sm font-medium leading-[21px]">
                          {item.name}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Bottom User Info */}
      <div className="border-t border-sidebar-border p-4 shrink-0">
        {!collapsed ? (
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sidebar-hover text-xs font-medium text-sidebar-foreground">
              {user?.name
                ?.split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase() || "AD"}
            </div>
            <div className="flex-1 text-sm">
              <div className="font-medium text-sidebar-foreground">{user?.name || "Admin User"}</div>
              <div className="text-xs text-sidebar-muted">{user?.email || "admin@omniblox.com"}</div>
            </div>
          </div>
        ) : (
          <div className="flex justify-center">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sidebar-hover text-xs font-medium text-sidebar-foreground">
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
