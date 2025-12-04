"use client";

import {
  Search,
  Command,
  Calculator,
  Calendar,
  Globe,
  Moon,
  Sun,
  WifiOff,
  DollarSign,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/contexts/auth-context";

type AppHeaderProps = {
  sidebarCollapsed: boolean;
};

export function AppHeader({ sidebarCollapsed }: AppHeaderProps) {
  const { setOpen } = useCommandMenu();
  const { logout } = useAuth();
  const [isOnline, setIsOnline] = useState(true);
  const [showCalculator, setShowCalculator] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [calculatorValue, setCalculatorValue] = useState("");
  const [todaysProfit, setTodaysProfit] = useState(2847.5);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const handleCalculatorClick = (value: string) => {
    if (value === "=") {
      try {
        setCalculatorValue(eval(calculatorValue).toString());
      } catch {
        setCalculatorValue("Error");
      }
    } else if (value === "C") {
      setCalculatorValue("");
    } else {
      setCalculatorValue(calculatorValue + value);
    }
  };

  return (
    <>
      <header className="flex h-14 items-center justify-between border-b border-border bg-card px-6">
        <div className="flex flex-1 items-center gap-4">
          <div className="relative w-96">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search or press Cmd+K..."
              className="pl-9 pr-12"
              onClick={() => setOpen(true)}
              readOnly
            />
            <div className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-1">
              <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-xs font-medium text-muted-foreground">
                <Command className="h-3 w-3" />K
              </kbd>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Today's Profit Display */}
          <div className="flex items-center gap-2 rounded-md bg-success/10 px-3 py-1.5 text-sm font-medium text-success">
            <DollarSign className="h-4 w-4" />
            <span>Today: ${todaysProfit.toFixed(2)}</span>
          </div>

          {/* Offline Indicator */}
          {!isOnline && (
            <div className="flex items-center gap-2 rounded-md bg-warning/10 px-3 py-1.5 text-sm font-medium text-warning">
              <WifiOff className="h-4 w-4" />
              <span>Offline</span>
            </div>
          )}

          {/* Calculator */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowCalculator(true)}
            title="Calculator"
          >
            <Calculator className="h-4 w-4" />
          </Button>

          {/* Calendar */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowCalendar(true)}
            title="Calendar"
          >
            <Calendar className="h-4 w-4" />
          </Button>

          {/* Language Selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" title="Language">
                <Globe className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Select Language</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>English</DropdownMenuItem>
              <DropdownMenuItem>Spanish</DropdownMenuItem>
              <DropdownMenuItem>French</DropdownMenuItem>
              <DropdownMenuItem>German</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Theme Switcher */}
          <ThemeToggle />

          {/* Logout */}
          <Button variant="ghost" size="icon" onClick={logout} title="Logout">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <Dialog open={showCalculator} onOpenChange={setShowCalculator}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Calculator</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              value={calculatorValue}
              readOnly
              className="text-right text-2xl font-mono"
            />
            <div className="grid grid-cols-4 gap-2">
              {[
                "7",
                "8",
                "9",
                "/",
                "4",
                "5",
                "6",
                "*",
                "1",
                "2",
                "3",
                "-",
                "0",
                ".",
                "=",
                "+",
              ].map((btn) => (
                <Button
                  key={btn}
                  variant="outline"
                  onClick={() => handleCalculatorClick(btn)}
                >
                  {btn}
                </Button>
              ))}
              <Button
                variant="destructive"
                className="col-span-4"
                onClick={() => handleCalculatorClick("C")}
              >
                Clear
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showCalendar} onOpenChange={setShowCalendar}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Calendar</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Calendar integration coming soon...
            </p>
            <div className="rounded-md border border-border p-4">
              <p className="text-center text-sm font-medium">
                {new Date().toLocaleDateString()}
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon">
        <Sun className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      title="Toggle theme"
    >
      {theme === "dark" ? (
        <Sun className="h-4 w-4" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
    </Button>
  );
}
