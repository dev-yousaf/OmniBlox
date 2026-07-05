"use client";

import {
  Search,
  Command,
  Maximize2,
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
  Loader2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { useCommandMenu } from "./command-menu-provider";
import { useState, useEffect } from "react";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useAuth } from "@/contexts/auth-context";
import { useWorkspace } from "@/hooks/use-workspace";
import Link from "next/link";

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
  const [prevValue, setPrevValue] = useState<number | null>(null);
  const [pendingOp, setPendingOp] = useState<string | null>(null);
  const [waiting, setWaiting] = useState(false);

  const compute = (a: number, b: number, op: string): number => {
    switch (op) {
      case "+": return a + b;
      case "-": return a - b;
      case "*": return a * b;
      case "/": return b !== 0 ? a / b : 0;
      case "%": return a % b;
      default: return b;
    }
  };

  const inputDigit = (d: string) => {
    if (waiting) {
      setDisplay(d);
      setWaiting(false);
    } else {
      setDisplay((prev) => (prev === "0" ? d : prev + d));
    }
  };

  const inputDecimal = () => {
    if (waiting) {
      setDisplay("0.");
      setWaiting(false);
    } else {
      setDisplay((prev) => (prev.includes(".") ? prev : prev + "."));
    }
  };

  const handleOperator = (op: string) => {
    const curr = parseFloat(display);
    if (prevValue !== null && pendingOp && !waiting) {
      const result = compute(prevValue, curr, pendingOp);
      setDisplay(String(result));
      setPrevValue(result);
    } else {
      setPrevValue(curr);
    }
    setPendingOp(op);
    setWaiting(true);
  };

  const handleEquals = () => {
    if (prevValue === null || !pendingOp) return;
    const curr = parseFloat(display);
    const result = compute(prevValue, curr, pendingOp);
    setDisplay(String(result));
    setPrevValue(null);
    setPendingOp(null);
    setWaiting(true);
  };

  const clear = () => {
    setDisplay("0");
    setPrevValue(null);
    setPendingOp(null);
    setWaiting(false);
  };

  const btnClass = "h-8 w-8 text-xs font-medium rounded-md border border-border bg-card hover:bg-muted cursor-pointer flex items-center justify-center select-none";

  return (
    <Popover>
      <PopoverTrigger asChild>
        <div className="flex h-[34px] w-[34px] items-center justify-center rounded-[10px] bg-header-icon-bg text-header-icon-color cursor-pointer">
          <Calculator className="h-4 w-4" />
        </div>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[220px] p-2">
        <div className="bg-muted rounded-md px-3 py-2 text-right text-base font-mono mb-2 min-h-[36px] overflow-x-auto whitespace-nowrap">{display}</div>
        <div className="grid grid-cols-4 gap-1">
          {["7","8","9","/","4","5","6","*","1","2","3","-","0",".","C","=","+","%"].map((k) =>
            k === "=" ? (
              <div key={k} className={`${btnClass} bg-primary text-primary-foreground row-span-2 h-[68px]`} onClick={handleEquals}>{k}</div>
            ) : k === "C" ? (
              <div key={k} className={`${btnClass} text-destructive`} onClick={clear}>{k}</div>
            ) : ["/","*","-","+","%"].includes(k) ? (
              <div key={k} className={btnClass} onClick={() => handleOperator(k)}>{k}</div>
            ) : k === "." ? (
              <div key={k} className={btnClass} onClick={inputDecimal}>{k}</div>
            ) : (
              <div key={k} className={btnClass} onClick={() => inputDigit(k)}>{k}</div>
            )
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function AppHeader(_props: AppHeaderProps) {
  const { setOpen } = useCommandMenu();
  const { logout, user } = useAuth();
  const ws = useWorkspace();

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
                <Link href={`/${ws}/products/new`} className="cursor-pointer"><Package className="h-4 w-4 mr-2" />Product</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/${ws}/sales/new`} className="cursor-pointer"><ShoppingCart className="h-4 w-4 mr-2" />Sale</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/${ws}/purchases/new`} className="cursor-pointer"><ShoppingBag className="h-4 w-4 mr-2" />Purchase</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/${ws}/people/customers/new`} className="cursor-pointer"><Users className="h-4 w-4 mr-2" />Customer</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/${ws}/people/suppliers/new`} className="cursor-pointer"><Building className="h-4 w-4 mr-2" />Supplier</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Vertical Divider */}
        <div className="h-[34px] w-px bg-header-border" />

        {/* Icon Group */}
        <div className="flex items-center gap-2">
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
                <Link href={`/${ws}/settings`} className="cursor-pointer"><Settings className="h-4 w-4 mr-2" />Settings</Link>
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
