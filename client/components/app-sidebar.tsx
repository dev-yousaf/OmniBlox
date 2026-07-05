"use client";

import { useMemo } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  PackageX,
  DollarSign,
  ShoppingCart,
  FileQuestion,
  RotateCcw,
  Building,
  Users,
  Warehouse,
  Settings,
  History,
  FileText,
  AlertTriangle,
  FolderTree,
  FolderOpen,
  Barcode,
  ArrowUpDown,
  ArrowLeftRight,
  ShoppingBag,
  ChevronRight,
  ChevronLeft,
  UserCog,
  Tag,
  Ruler,
  ListChecks,
  ShieldCheck,
  Receipt,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import { useWorkspace } from "@/hooks/use-workspace";

type Role = "OWNER" | "ADMIN" | "MANAGER" | "STAFF" | string;

const MANAGEMENT_ROLES: ReadonlySet<Role> = new Set(["OWNER", "ADMIN", "MANAGER"]);

/** How specifically an item's href matches the current location. Higher wins. */
const MatchScore = {
  NONE: 0,
  DASHBOARD_ROOT_ALIAS: 1,
  PREFIX: 2,
  PATH: 3,
  PATH_AND_QUERY: 4,
} as const;

interface SidebarItem {
  /** Stable unique key — independent of display text, used for React keys and active matching. */
  id: string;
  name: string;
  href: string;
  icon?: typeof LayoutDashboard;
  mutationOnly?: boolean;
  /** Roles allowed to see this item. Omit to allow everyone. */
  allowedRoles?: readonly Role[];
}

interface SidebarSection {
  label: string;
  items: SidebarItem[];
}

const sections: SidebarSection[] = [
  {
    label: "Main",
    items: [
      { id: "dashboard", name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { id: "superadmin", name: "Super Admin", href: "/superadmin", icon: UserCog },
    ],
  },
  {
    label: "Inventory",
    items: [
      { id: "products", name: "Products", href: "/products", icon: Package },
      { id: "products-new", name: "Create Product", href: "/products/new", icon: Package, mutationOnly: true },
      { id: "products-expired", name: "Expired Products", href: "/products/expired", icon: PackageX },
      { id: "products-low-stock", name: "Low Stocks", href: "/products/low-stock", icon: AlertTriangle },
      { id: "categories", name: "Category", href: "/settings/categories", icon: FolderTree },
      { id: "sub-categories", name: "Sub Category", href: "/settings/sub-categories", icon: FolderOpen },
      { id: "brands", name: "Brands", href: "/settings/brands", icon: Tag },
      { id: "units", name: "Units", href: "/settings/units", icon: Ruler },
      { id: "variant-attributes", name: "Variant Attributes", href: "/settings/variant-attributes", icon: ListChecks },
      { id: "warranties", name: "Warranties", href: "/settings/warranties", icon: ShieldCheck },
      { id: "print-barcode", name: "Print Barcode", href: "/products/barcodes", icon: Barcode },
    ],
  },
  {
    label: "Stock",
    items: [
      { id: "inventory", name: "Manage Stock", href: "/inventory", icon: Warehouse },
      { id: "warehouses", name: "Warehouses", href: "/inventory/warehouses", icon: Building },
      { id: "stock-adjustment", name: "Stock Adjustment", href: "/products/adjustment", icon: ArrowUpDown, mutationOnly: true },
      { id: "stock-transfer", name: "Stock Transfer", href: "/inventory/transfer", icon: ArrowLeftRight, mutationOnly: true },
    ],
  },
  {
    label: "Sales",
    items: [
      { id: "sales", name: "Sales", href: "/sales", icon: ShoppingCart },
      { id: "invoices", name: "Invoices", href: "/sales/invoices", icon: FileText },
      { id: "sales-return", name: "Sales Return", href: "/sales-returns", icon: RotateCcw },
      { id: "quotation", name: "Quotation", href: "/quotations", icon: FileQuestion },
    ],
  },
  {
    label: "Purchases",
    items: [
      { id: "purchases", name: "Purchases", href: "/purchases", icon: ShoppingBag },
      { id: "bills", name: "Bills", href: "/purchases/bills", icon: FileText },
      { id: "purchase-return", name: "Purchase Return", href: "/purchase-returns", icon: RotateCcw },
    ],
  },
  {
    label: "Finance & Accounts",
    items: [
      { id: "expenses", name: "Expenses", href: "/expenses", icon: DollarSign },
      { id: "expense-categories", name: "Expense Categories", href: "/settings/expense-categories", icon: FolderTree },
    ],
  },
  {
    label: "Peoples",
    items: [
      { id: "users", name: "Users", href: "/people/users", icon: Users, allowedRoles: ["OWNER", "ADMIN", "MANAGER"] },
      { id: "billers", name: "Billers", href: "/people/billers", icon: Receipt },
      { id: "customers", name: "Customers", href: "/people/customers", icon: Users },
      { id: "suppliers", name: "Suppliers", href: "/people/suppliers", icon: Building },
    ],
  },
  {
    label: "Reports",
    items: [

    ],
  },
  {
    label: "Settings",
    items: [
      { id: "settings", name: "Settings", href: "/settings", icon: Settings },
      { id: "audit-log", name: "Audit Log", href: "/audit-log", icon: History },
    ],
  },
];

// Computed once at module load — sections is static, no need to re-flatten per render.
const allSidebarItems: SidebarItem[] = sections.flatMap((s) => s.items);

type AppSidebarProps = {
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
};

function filterItems(items: SidebarItem[], role: Role, isSuperadmin?: boolean): SidebarItem[] {
  const isManagement = MANAGEMENT_ROLES.has(role);
  return items.filter((item) => {
    if (item.id === "superadmin" && !isSuperadmin) return false;
    if (item.allowedRoles && !item.allowedRoles.includes(role)) return false;
    if (item.mutationOnly && !isManagement) return false;
    return true;
  });
}

/** Parses "?a=1&b=2" into a comparable key/value record (avoids substring false-positives). */
function parseQuery(query: string): Record<string, string> {
  return Object.fromEntries(new URLSearchParams(query));
}

function queryIsSubsetMatch(target: Record<string, string>, current: URLSearchParams): boolean {
  return Object.entries(target).every(([key, value]) => current.get(key) === value);
}

function matchScore(item: SidebarItem, pathname: string, searchParams: URLSearchParams): number {
  const [hrefPath, hrefQuery] = item.href.split("?");

  if (hrefQuery) {
    if (pathname !== hrefPath) return MatchScore.NONE;
    return queryIsSubsetMatch(parseQuery(hrefQuery), searchParams) ? MatchScore.PATH_AND_QUERY : MatchScore.NONE;
  }

  if (pathname === hrefPath) return MatchScore.PATH;

  if (hrefPath.endsWith("/dashboard") && pathname === hrefPath.replace(/\/dashboard$/, '')) return MatchScore.DASHBOARD_ROOT_ALIAS;

  // parent prefix: /ws/products matches /ws/products/123, /ws/products/new, etc.
  if (pathname.startsWith(hrefPath + "/")) return MatchScore.PREFIX;

  return MatchScore.NONE;
}

function getInitials(name: string | null | undefined, fallback: string): string {
  if (!name) return fallback;
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export function AppSidebar({ collapsed, onCollapsedChange }: AppSidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const ws = useWorkspace();
  const userRole = (user?.role || "").toUpperCase() as Role;
  const isSuperadmin = user?.isSuperadmin === true;

  // Exactly one item is ever marked active: the single best match across
  // the whole nav (by id, not display name), so two items that resolve to
  // the same path can never both light up at once.
  // Strip workspace prefix from pathname for matching
  const strippedPathname = pathname.replace(new RegExp(`^/${ws}`), '') || '/';

  const activeItemId = useMemo(() => {
    let bestItem: SidebarItem | null = null;
    let bestScore: number = MatchScore.NONE;

    for (const item of allSidebarItems) {
      const score = matchScore(item, strippedPathname, searchParams);
      if (score > bestScore) {
        bestScore = score;
        bestItem = item;
      }
    }

    return bestItem?.id ?? null;
  }, [strippedPathname, searchParams]);

  const initials = getInitials(user?.name, "AD");

  return (
    <div
      className={cn(
        "flex h-full flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-300",
        collapsed ? "w-16" : "w-[252px]"
      )}
    >
      {/* Logo */}
      <div className={cn(
        "flex h-[65px] items-center border-b border-sidebar-border shrink-0",
        collapsed ? "justify-center px-0" : "justify-between px-4"
      )}>
        {!collapsed && (
          <Link href={`/${ws}/dashboard`} className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-sidebar-accent-foreground text-sidebar-accent font-bold text-sm">
              N
            </div>
            <span className="text-sm font-semibold text-sidebar-section-label">
              OmniBlox
            </span>
          </Link>
        )}

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 text-sidebar-muted hover:text-sidebar-foreground"
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
      <nav className={cn("sidebar-nav flex-1 overflow-y-auto space-y-4", collapsed ? "px-1 py-4" : "p-6")}>
        {sections.map((section) => {
          const visibleItems = filterItems(section.items, userRole, isSuperadmin);
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
                  const active = item.id === activeItemId;
                  const Icon = item.icon;

                  if (collapsed) {
                    return (
                      <Link key={item.id} href={`/${ws}${item.href}`} title={item.name}>
                        <Button
                          variant="ghost"
                          className={cn(
                            "w-full justify-center h-9",
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
                    <Link key={item.id} href={`/${ws}${item.href}`}>
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
      <div className={cn("border-t border-sidebar-border shrink-0", collapsed ? "p-2" : "p-4")}>
        {!collapsed ? (
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sidebar-hover text-xs font-medium text-sidebar-foreground">
              {initials}
            </div>
            <div className="flex-1 text-sm">
              <div className="font-medium text-sidebar-foreground">{user?.name || "Admin User"}</div>
              <div className="text-xs text-sidebar-muted">{user?.email || "admin@OmniBlox.com"}</div>
            </div>
          </div>
        ) : (
          <div className="flex justify-center">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sidebar-hover text-xs font-medium text-sidebar-foreground">
              {initials}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}