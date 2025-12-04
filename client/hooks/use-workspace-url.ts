import { useAuth } from "@/contexts/auth-context";

/**
 * Hook to generate workspace-aware URLs
 *
 * Usage:
 * const getWorkspaceUrl = useWorkspaceUrl();
 * router.push(getWorkspaceUrl('/products'));
 */
export function useWorkspaceUrl() {
  const { company } = useAuth();

  return (path: string): string => {
    if (!company?.workspaceUrl) return path;
    // Ensure path starts with /
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    return `/${company.workspaceUrl}${normalizedPath}`;
  };
}
