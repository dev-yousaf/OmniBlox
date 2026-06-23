"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { CalendarDays } from "lucide-react";
import type { UserProfile } from "./types";

interface WelcomeHeaderProps {
  user: UserProfile | null;
  loading: boolean;
}

export function WelcomeHeader({ user, loading }: WelcomeHeaderProps) {
  return (
    <div className="pt-6 pb-0 flex items-center justify-between">
      <div>
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-7 w-64" />
            <Skeleton className="h-4 w-72" />
          </div>
        ) : (
          <>
            <h1 className="text-[28px] font-bold text-[#212b36] dark:text-[#f1f3f4] leading-[42px]">
              Welcome, {user?.name?.split(" ")[0] ?? "Admin"}
            </h1>
            <p className="text-sm text-[#646b72] dark:text-[#a6b0c0]">
              You have <span className="font-bold text-[#fe9f43]">200+</span> Orders, Today
            </p>
          </>
        )}
      </div>
      <div className="flex items-center gap-[7px] px-[10px] py-[10px] border border-border rounded-lg bg-card text-sm text-[#092c4c] dark:text-[#d1d5db]">
        <CalendarDays className="h-4 w-4 text-[#092c4c] dark:text-[#d1d5db]" />
        <span className="text-[15px]">01 Jan 2024 - 07 Jan 2024</span>
      </div>
    </div>
  );
}
