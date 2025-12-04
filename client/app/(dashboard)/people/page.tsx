"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function PeoplePage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to users page by default
    router.push("/people/users");
  }, [router]);

  return null;
}
