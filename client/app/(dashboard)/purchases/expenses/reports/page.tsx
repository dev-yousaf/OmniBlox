"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ExpenseReportsPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/expenses/reports");
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p className="mt-2 text-muted-foreground">Redirecting...</p>
      </div>
    </div>
  );
}
