"use client";

import { useParams } from "next/navigation";

export function useWorkspace(): string {
  const params = useParams();
  return params.workspace as string;
}

export function workspacePath(ws: string, path: string): string {
  return `/${ws}${path}`;
}
