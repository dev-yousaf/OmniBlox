"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useWorkspace } from "@/hooks/use-workspace";

export default function PeoplePage() {
  const router = useRouter();
  const ws = useWorkspace();

  useEffect(() => {
    // Redirect to users page by default
    router.push(`/${ws}/people/users`);
  }, [router]);

  return null;
}
