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

const mutationRoutePattern = /\/(new|edit|adjustment|transfer)(\/|$)/;

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background px-6 py-6">
        <PageLoadingSkeleton />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const userRole = (user?.role || "").toUpperCase();
  const isMutating = mutationRoutePattern.test(pathname);

  if (isMutating && userRole === "OBSERVER") {
    return (
      <CommandMenuProvider>
        <div className="flex h-screen overflow-hidden bg-background">
          <AppSidebar
            collapsed={sidebarCollapsed}
            onCollapsedChange={setSidebarCollapsed}
          />
          <div className="flex flex-1 flex-col overflow-hidden">
            <AppHeader />
          </div>
          <main className="flex-1 overflow-y-auto">
            <div className="min-h-full w-full px-6 py-6">
              <PageError type="forbidden" />
            </div>
          </main>
        </div>
      </CommandMenuProvider>
    );
  }

  return (
    <CommandMenuProvider>
      <div className="flex h-screen overflow-hidden bg-background">
        <AppSidebar
          collapsed={sidebarCollapsed}
          onCollapsedChange={setSidebarCollapsed}
        />
        <div className="flex flex-1 flex-col overflow-hidden">
          <AppHeader />
          <main className="flex-1 overflow-y-auto">
            {/* Global page container to ensure consistent padding from header/sidebar */}
            <div className="w-full px-6 py-6">{children}</div>
          </main>
        </div>
      </div>
    </CommandMenuProvider>
  );
}
