"use client";

import type React from "react";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useRouter, usePathname } from "next/navigation";
import { AppSidebar } from "./app-sidebar";
import { AppHeader } from "./app-header";
import { CommandMenuProvider } from "./command-menu-provider";
import { PageLoadingSkeleton } from "@/components/ui/page-loading-skeleton";
import { PageError } from "@/components/ui/page-error";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useIsMobile } from "@/components/ui/use-mobile";

const mutationRoutePattern = /\/(new|edit|adjustment|transfer)(\/|$)/;

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const isMobile = useIsMobile();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    if (
      !isLoading &&
      !user &&
      !pathname.startsWith("/login") &&
      !pathname.startsWith("/signup") &&
      !pathname.startsWith("/forgot-password")
    ) {
      router.push("/login");
    }
  }, [user, isLoading, router, pathname]);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background px-4 py-6 md:px-6">
        <PageLoadingSkeleton />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const userRole = (user?.role || "").toUpperCase();
  const isMutating = mutationRoutePattern.test(pathname);

  const sidebar = (
    <AppSidebar
      collapsed={sidebarCollapsed}
      onCollapsedChange={setSidebarCollapsed}
      onNavigate={() => setMobileNavOpen(false)}
    />
  );

  const pageContent = (
    <main className="flex-1 min-h-0 overflow-y-auto p-4 md:p-6">{children}</main>
  );

  if (isMutating && userRole === "OBSERVER") {
    return (
      <CommandMenuProvider>
        <div className="flex h-dvh overflow-hidden bg-background">
          <div className="hidden md:block h-full">{sidebar}</div>
          <div className="flex flex-1 flex-col overflow-hidden min-h-0">
            <AppHeader onMenuClick={() => setMobileNavOpen(true)} />
            <main className="flex-1 min-h-0 overflow-y-auto p-4 md:p-6">
              <PageError type="forbidden" />
            </main>
          </div>
        </div>
        <Sheet
          open={isMobile && mobileNavOpen}
          onOpenChange={setMobileNavOpen}
        >
          <SheetContent side="left" className="w-[280px] p-0 sm:max-w-[280px]">
            {sidebar}
          </SheetContent>
        </Sheet>
      </CommandMenuProvider>
    );
  }

  return (
    <CommandMenuProvider>
      <div className="flex h-dvh overflow-hidden bg-background">
        <div className="hidden md:block h-full">{sidebar}</div>
        <div className="flex flex-1 flex-col overflow-hidden min-h-0">
          <AppHeader onMenuClick={() => setMobileNavOpen(true)} />
          {pageContent}
        </div>
      </div>
      <Sheet open={isMobile && mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent side="left" className="w-[280px] p-0 sm:max-w-[280px]">
          {sidebar}
        </SheetContent>
      </Sheet>
    </CommandMenuProvider>
  );
}
