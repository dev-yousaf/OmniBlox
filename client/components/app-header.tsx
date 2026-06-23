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
  Monitor,
  PanelLeftClose,
  Mail,
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
import { useAuth } from "@/contexts/auth-context";

type AppHeaderProps = {
  sidebarCollapsed: boolean;
  onToggleSidebar?: () => void;
};

function ThemeToggleIcon() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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

export function AppHeader({ sidebarCollapsed, onToggleSidebar }: AppHeaderProps) {
  const { setOpen } = useCommandMenu();
  const { logout } = useAuth();

  return (
    <header className="flex h-[65px] items-center gap-3 border-b border-header-border bg-header-bg px-6 relative">
      {/* Sidebar Toggle */}
      <div className="absolute left-[-10px] top-1/2 -translate-y-1/2 z-10">
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5 rounded-full bg-header-primary text-header-primary-text hover:bg-header-primary/90 p-0.5"
          onClick={onToggleSidebar}
        >
          <PanelLeftClose className="h-3 w-3" />
        </Button>
      </div>

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
        {/* Store Selector */}
        <div className="flex items-center gap-2 border border-header-dropdown-border bg-header-dropdown-bg rounded-lg px-3 py-1.5 h-[34px]">
          <div className="flex h-4 w-4 items-center justify-center rounded-[4px] bg-header-primary text-header-primary-text text-[9px] font-bold">
            O
          </div>
          <span className="text-sm text-header-dropdown-text">
            OmniBlox
          </span>
          <ChevronDown className="h-3 w-3 text-header-icon-color" />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-header-primary rounded-[5px] px-3 py-1.5 cursor-pointer">
            <Plus className="h-3.5 w-3.5 text-header-primary-text" />
            <span className="text-[13px] font-medium text-header-primary-text leading-[19.5px]">
              Add New
            </span>
          </div>
          <div className="flex items-center gap-1.5 bg-header-secondary rounded-[5px] px-3 py-1.5 cursor-pointer">
            <Monitor className="h-3.5 w-3.5 text-header-secondary-text" />
            <span className="text-[13px] font-medium text-header-secondary-text leading-[19.5px]">
              POS
            </span>
          </div>
        </div>

        {/* Vertical Divider */}
        <div className="h-[34px] w-px bg-header-border" />

        {/* Icon Group */}
        <div className="flex items-center gap-2">
          {/* Language */}
          <div className="flex h-[34px] w-[34px] items-center justify-center rounded-[10px] bg-header-icon-bg text-header-icon-color">
            <Globe className="h-4 w-4" />
          </div>

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

          {/* Mail with badge */}
          <div className="relative flex h-[34px] w-[34px] items-center justify-center rounded-[8px] bg-header-icon-bg text-header-icon-color">
            <Mail className="h-4 w-4" />
            <div className="absolute -top-1 -right-1 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-header-notification-dot">
              <span className="text-[9px] font-semibold text-header-primary-text leading-[13px]">
                01
              </span>
            </div>
          </div>

          {/* Notification */}
          <div className="relative flex h-[34px] w-[34px] items-center justify-center rounded-[10px] bg-header-icon-bg text-header-icon-color">
            <Bell className="h-4 w-4" />
          </div>

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
              <DropdownMenuItem>
                <Settings className="h-4 w-4 mr-2" />
                Settings
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
          AD
        </div>
      </div>
    </header>
  );
}
