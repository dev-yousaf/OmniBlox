"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";

export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const router = useRouter();
  const workspace = params.workspace as string;
  const { user, isLoading } = useAuth();
  const [validating, setValidating] = useState(true);

  useEffect(() => {
    if (isLoading) return;

    if (!user) {
      router.replace(`/login?redirect=/${workspace}`);
      return;
    }

    const userWorkspace = (user as any).workspaceUrl || (user as any).company?.workspaceUrl;
    if (userWorkspace && userWorkspace !== workspace) {
      router.replace(`/${userWorkspace}/dashboard`);
      return;
    }

    setValidating(false);
  }, [workspace, user, isLoading, router]);

  if (isLoading || validating) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return <>{children}</>;
}
