"use client";

import {
  Search,
  Command,
  ChevronDown,
  Globe,
  Maximize2,
  Bell,
  Settings,
  LogOut,
  Moon,
  Sun,
  Plus,
  Package,
  ShoppingCart,
  ShoppingBag,
  Users,
  Building,
  Calculator,
  Check,
  Loader2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { useCommandMenu } from "./command-menu-provider";
import { useState, useEffect, useCallback } from "react";
import { useTheme } from "next-themes";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import { useAuthenticatedApi } from "@/hooks/use-authenticated-api";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

type AppHeaderProps = Record<string, never>;

function ThemeToggleIcon() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  if (!mounted) {
    return (
      <div className="flex h-[34px] w-[34px] items-center justify-center rounded-[10px] bg-header-icon-bg text-header-icon-color">
        <Sun className="h-4 w-4" />
      </div>
    );
  }

  return (
    <div
      className="flex h-[34px] w-[34px] items-center justify-center rounded-[10px] bg-header-icon-bg text-header-icon-color cursor-pointer"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
    >
      {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </div>
  );
}

function CalculatorPopover() {
  const [display, setDisplay] = useState("0");
  const [prev, setPrev] = useState<number | null>(null);
  const [op, setOp] = useState<string | null>(null);
  const [reset, setReset] = useState(false);

  const press = (val: string) => {
    if (reset) { setDisplay(val); setReset(false); return; }
    setDisplay((d) => (d === "0" ? val : d + val));
  };

  const operation = (nextOp: string) => {
    setPrev(parseFloat(display));
    setOp(nextOp);
    setReset(true);
  };

  const calculate = () => {
    if (prev === null || !op) return;
    const curr = parseFloat(display);
    let result = 0;
    switch (op) {
      case "+": result = prev + curr; break;
      case "-": result = prev - curr; break;
      case "*": result = prev * curr; break;
      case "/": result = curr !== 0 ? prev / curr : 0; break;
    }
    setDisplay(String(result));
    setPrev(null);
    setOp(null);
    setReset(true);
  };

  const clear = () => { setDisplay("0"); setPrev(null); setOp(null); setReset(false); };

  const btnClass = "h-8 w-8 text-xs font-medium rounded-md border border-border bg-card hover:bg-muted cursor-pointer flex items-center justify-center";

  return (
    <Popover>
      <PopoverTrigger asChild>
        <div className="flex h-[34px] w-[34px] items-center justify-center rounded-[10px] bg-header-icon-bg text-header-icon-color cursor-pointer">
          <Calculator className="h-4 w-4" />
        </div>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[180px] p-2">
        <div className="bg-muted rounded-md px-2 py-1 text-right text-sm font-mono mb-2 min-h-[28px]">{display}</div>
        <div className="grid grid-cols-4 gap-1">
          {["7","8","9","/","4","5","6","*","1","2","3","-","0",".","=","+"].map((k) => (
            k === "=" ? (
              <div key={k} className={`${btnClass} bg-primary text-primary-foreground`} onClick={calculate}>{k}</div>
            ) : (
              <div key={k} className={btnClass} onClick={() => ["/","*","-","+"].includes(k) ? operation(k) : press(k)}>{k}</div>
            )
          ))}
          <div className={`${btnClass} col-span-4 text-[10px] text-muted-foreground`} onClick={clear}>C</div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  link?: string;
  createdAt: string;
}

function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [unread, setUnread] = useState(0);
  const { get, put } = useAuthenticatedApi();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await get("/notifications?limit=50") as { notifications: NotificationItem[]; unreadCount: number };
      setItems(data.notifications || []);
      setUnread(data.unreadCount || 0);
    } catch { /* ignore */ }
    setLoading(false);
  }, [get]);

  useEffect(() => { if (open) load(); }, [open, load]);

  const markRead = async (id: string) => {
    try {
      await put(`/notifications/${id}/read`, {});
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
      setUnread((u) => Math.max(0, u - 1));
    } catch { /* ignore */ }
  };

  const markAllRead = async () => {
    try {
      await put("/notifications/mark-all-read", {});
      setItems((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnread(0);
    } catch { /* ignore */ }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <div className="relative flex h-[34px] w-[34px] items-center justify-center rounded-[10px] bg-header-icon-bg text-header-icon-color cursor-pointer">
            <Bell className="h-4 w-4" />
            {unread > 0 && (
              <div className="absolute -top-1 -right-1 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-header-notification-dot">
                <span className="text-[9px] font-semibold text-header-primary-text leading-[13px]">{unread > 9 ? "9+" : unread}</span>
              </div>
            )}
          </div>
        </SheetTrigger>
        <SheetContent side="right" className="w-[380px] sm:w-[440px] p-0">
          <SheetHeader className="px-5 py-4 border-b">
            <div className="flex items-center justify-between">
              <SheetTitle className="text-base">Notifications</SheetTitle>
              <div className="flex items-center gap-2">
                {unread > 0 && (
                  <button onClick={markAllRead} className="text-xs text-primary hover:underline">
                    Mark all read
                  </button>
                )}
                <Link href="/notifications" className="text-xs text-primary hover:underline" onClick={() => setOpen(false)}>
                  View all
                </Link>
              </div>
            </div>
          </SheetHeader>
          <ScrollArea className="h-[calc(100vh-65px)]">
            {loading ? (
              <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : items.length === 0 ? (
              <div className="text-center py-12 text-sm text-muted-foreground">No notifications</div>
            ) : (
              items.map((n) => (
                <div
                  key={n.id}
                  className={`px-5 py-4 border-b last:border-0 cursor-pointer hover:bg-muted/50 transition-colors ${!n.read ? "bg-muted/20" : ""}`}
                  onClick={() => markRead(n.id)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {!n.read && <div className="h-2 w-2 rounded-full bg-primary shrink-0" />}
                        <p className={`text-sm ${n.read ? "font-normal" : "font-semibold"} truncate`}>{n.title}</p>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-3">{n.message}</p>
                      <p className="text-[11px] text-muted-foreground/60 mt-1">
                        {new Date(n.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </>
  );
}

export function AppHeader(_props: AppHeaderProps) {
  const { setOpen } = useCommandMenu();
  const { logout, user } = useAuth();

  const companyName = user?.company?.name || "OmniBlox";
  const initials = companyName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "OB";

  return (
    <header className="flex h-[65px] items-center gap-3 border-b border-header-border bg-header-bg px-6">

      {/* Search Bar */}
      <div className="flex items-center gap-2 border border-header-search-border bg-header-search-bg rounded-lg px-3 py-2 w-[229px]">
        <Search className="h-3.5 w-3.5 text-header-search-placeholder shrink-0" />
        <Input
          placeholder="Search"
          className="h-auto border-none bg-transparent p-0 text-[13px] text-header-dropdown-text placeholder:text-header-search-placeholder shadow-none focus-visible:ring-0"
          onClick={() => setOpen(true)}
          readOnly
        />
        <div className="flex items-center gap-1 bg-header-search-kbd-bg rounded-[5px] px-1.5 py-1 shrink-0">
          <Command className="h-2.5 w-2.5 text-header-search-kbd-text" />
          <span className="text-[10px] font-medium text-header-search-kbd-text leading-[15px]">
            K
          </span>
        </div>
      </div>

      {/* Right side */}
      <div className="flex flex-1 items-center justify-end gap-3">
        {/* Store/Company Selector */}
        <div className="flex items-center gap-2 border border-header-dropdown-border bg-header-dropdown-bg rounded-lg px-3 py-1.5 h-[34px]">
          <div className="flex h-4 w-4 items-center justify-center rounded-[4px] bg-header-primary text-header-primary-text text-[9px] font-bold">
            {initials[0]}
          </div>
          <span className="text-sm text-header-dropdown-text">
            {companyName}
          </span>
          <ChevronDown className="h-3 w-3 text-header-icon-color" />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div className="flex items-center gap-1.5 bg-header-primary rounded-[5px] px-3 py-1.5 cursor-pointer">
                <Plus className="h-3.5 w-3.5 text-header-primary-text" />
                <span className="text-[13px] font-medium text-header-primary-text leading-[19.5px]">
                  Add New
                </span>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuLabel>Create New</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/products/new" className="cursor-pointer"><Package className="h-4 w-4 mr-2" />Product</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/sales/new" className="cursor-pointer"><ShoppingCart className="h-4 w-4 mr-2" />Sale</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/purchases/new" className="cursor-pointer"><ShoppingBag className="h-4 w-4 mr-2" />Purchase</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/people/customers/new" className="cursor-pointer"><Users className="h-4 w-4 mr-2" />Customer</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/people/suppliers/new" className="cursor-pointer"><Building className="h-4 w-4 mr-2" />Supplier</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Vertical Divider */}
        <div className="h-[34px] w-px bg-header-border" />

        {/* Icon Group */}
        <div className="flex items-center gap-2">
          {/* Language */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div className="flex h-[34px] w-[34px] items-center justify-center rounded-[10px] bg-header-icon-bg text-header-icon-color cursor-pointer">
                <Globe className="h-4 w-4" />
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Language</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem><Check className="h-4 w-4 mr-2" />English</DropdownMenuItem>
              <DropdownMenuItem><Globe className="h-4 w-4 mr-2" />Spanish</DropdownMenuItem>
              <DropdownMenuItem><Globe className="h-4 w-4 mr-2" />French</DropdownMenuItem>
              <DropdownMenuItem><Globe className="h-4 w-4 mr-2" />German</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Fullscreen */}
          <div
            className="flex h-[34px] w-[34px] items-center justify-center rounded-[10px] bg-header-icon-bg text-header-icon-color cursor-pointer"
            onClick={() => {
              if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen();
              } else {
                document.exitFullscreen();
              }
            }}
          >
            <Maximize2 className="h-4 w-4" />
          </div>

          {/* Calculator */}
          <CalculatorPopover />

          {/* Notifications */}
          <NotificationBell />

          {/* Theme Toggle */}
          <ThemeToggleIcon />

          {/* Settings Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div className="flex h-[34px] w-[34px] items-center justify-center rounded-[8px] bg-header-icon-bg text-header-icon-color cursor-pointer">
                <Settings className="h-4 w-4" />
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Settings</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/settings" className="cursor-pointer"><Settings className="h-4 w-4 mr-2" />Settings</Link>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Globe className="h-4 w-4 mr-2" />
                Language
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* User Avatar */}
        <div className="flex h-[34px] w-[34px] items-center justify-center rounded-[10px] bg-header-secondary text-header-secondary-text text-xs font-semibold">
          {user?.name
            ?.split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2) || "AD"}
        </div>
      </div>
    </header>
  );
}
