"use client";

import { useAuth } from "@/contexts/auth-context";
import { PageError } from "@/components/ui/page-error";
import { type ReactNode } from "react";

type RequireRoleProps = {
  roles: string[];
  children: ReactNode;
  fallback?: ReactNode;
};

export function RequireRole({ roles, children, fallback }: RequireRoleProps) {
  const { user } = useAuth();
  const currentRole = (user?.role || "").toUpperCase();

  if (!roles.includes(currentRole)) {
    return fallback ?? <PageError type="forbidden" />;
  }

  return <>{children}</>;
}

export function useCheckRole(allowedRoles: string[]): boolean {
  const { user } = useAuth();
  const currentRole = (user?.role || "").toUpperCase();
  return allowedRoles.includes(currentRole);
}
