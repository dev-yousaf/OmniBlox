"use client";

import type React from "react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { MarketingNavbar } from "@/components/marketing-navbar";
import { MarketingFooter } from "@/components/marketing-footer";
import { Loader2 } from "lucide-react";
import { motion } from "framer-motion";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, company } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace(company?.workspaceUrl ? `/${company.workspaceUrl}/dashboard` : "/login");
    }
  }, [isAuthenticated, isLoading, company, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="mt-2 text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    return null;
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      <MarketingNavbar />
      <main className="flex-1 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          {children}
        </motion.div>
        <MarketingFooter />
      </main>
    </div>
  );
}
