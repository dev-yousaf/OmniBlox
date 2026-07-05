"use client";

import {
  ShieldX,
  FileQuestion,
  ServerCrash,
  Lock,
} from "lucide-react";
import { WorkspaceLink as Link } from "@/components/workspace-link";
import { Button } from "@/components/ui/button";

type ErrorType =
  | "forbidden"
  | "not-found"
  | "server-error"
  | "maintenance";

interface PageErrorProps {
  type?: ErrorType;
  title?: string;
  message?: string;
  action?: {
    label: string;
    href: string;
  };
}

const defaults: Record<ErrorType, { icon: typeof ShieldX; title: string; message: string }> = {
  forbidden: {
    icon: ShieldX,
    title: "Access Denied",
    message: "You don't have permission to access this page. Contact an administrator if you think this is a mistake.",
  },
  "not-found": {
    icon: FileQuestion,
    title: "Page Not Found",
    message: "The page you're looking for doesn't exist or has been moved.",
  },
  "server-error": {
    icon: ServerCrash,
    title: "Something went wrong",
    message: "An unexpected error occurred. Please try again later.",
  },
  maintenance: {
    icon: Lock,
    title: "Under Maintenance",
    message: "This module is currently under maintenance. Please check back later.",
  },
};

export function PageError({
  type = "forbidden",
  title,
  message,
  action,
}: PageErrorProps) {
  const config = defaults[type];
  const Icon = config.icon;

  return (
    <div className="flex flex-col items-center justify-center py-24">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 mb-6">
        <Icon className="h-8 w-8 text-destructive" />
      </div>
      <h1 className="text-2xl font-semibold tracking-tight mb-2">
        {title || config.title}
      </h1>
      <p className="text-sm text-muted-foreground text-center max-w-md mb-6">
        {message || config.message}
      </p>
      {action ? (
        <Link href={action.href}>
          <Button variant="outline">{action.label}</Button>
        </Link>
      ) : (
        <Link href="/dashboard">
          <Button variant="outline">Back to Dashboard</Button>
        </Link>
      )}
    </div>
  );
}

export function checkRoleAccess(
  userRole: string | undefined,
  allowedRoles: string[]
): boolean {
  if (!userRole) return false;
  return allowedRoles.includes(userRole.toUpperCase());
}
