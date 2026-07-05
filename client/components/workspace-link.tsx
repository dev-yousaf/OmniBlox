"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { type ComponentProps, type ReactNode } from "react";

export function WorkspaceLink({ href, ...props }: ComponentProps<typeof Link>) {
  const params = useParams();
  const ws = params?.workspace as string | undefined;
  const isExternal = typeof href === "string" && (href.startsWith("http") || href.startsWith("mailto:"));
  const prefixed = isExternal || !ws ? href : `/${ws}${href}`;
  return <Link href={prefixed} {...props} />;
}
