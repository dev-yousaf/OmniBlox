"use client";

import { useAuth } from "@/contexts/auth-context";
import { api } from "@/lib/api";
import { useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";

/**
 * Hook for making authenticated API calls with automatic error handling
 * This ensures all API calls have proper authentication and seamless UX
 */
export function useAuthenticatedApi() {
  const { isAuthenticated, logout } = useAuth();
  const router = useRouter();

  // Create authenticated API wrapper
  const makeRequest = useCallback(
    async (
      method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH",
      endpoint: string,
      data?: any
    ) => {
      try {
        switch (method) {
          case "GET":
            return await api.get(endpoint);
          case "POST":
            return await api.post(endpoint, data);
          case "PUT":
            return await api.put(endpoint, data);
          case "PATCH":
            return await api.patch(endpoint, data);
          case "DELETE":
            return await api.delete(endpoint);
          default:
            throw new Error(`Unsupported method: ${method}`);
        }
      } catch (error: any) {
        // Handle authentication errors more carefully
        // Only redirect on actual auth token issues, not on authorization/permission errors
        const statusCode = error.statusCode || error.status;
        const isAuthTokenError =
          error.message === "Authentication failed" ||
          error.message === "Token expired" ||
          error.message === "Invalid token" ||
          (statusCode === 401 &&
            error.message?.toLowerCase().includes("unauthorized"));

        // 403 is authorization (permission) error, not authentication error
        // Don't log out users for permission issues
        if (isAuthTokenError) {
          // Only logout on actual authentication token failures
          await logout();
          router.replace("/login");
          throw new Error("Session expired. Please login again.");
        }
        throw error;
      }
    },
    [logout, router]
  );

  // Wrapper methods for common HTTP verbs
  const get = useCallback(
    (endpoint: string) => {
      return makeRequest("GET", endpoint);
    },
    [makeRequest]
  );

  const post = useCallback(
    (endpoint: string, data?: any) => {
      return makeRequest("POST", endpoint, data);
    },
    [makeRequest]
  );

  const put = useCallback(
    (endpoint: string, data?: any) => {
      return makeRequest("PUT", endpoint, data);
    },
    [makeRequest]
  );

  const patch = useCallback(
    (endpoint: string, data?: any) => {
      return makeRequest("PATCH", endpoint, data);
    },
    [makeRequest]
  );

  const del = useCallback(
    (endpoint: string) => {
      return makeRequest("DELETE", endpoint);
    },
    [makeRequest]
  );

  return useMemo(
    () => ({
      get,
      post,
      put,
      patch,
      delete: del,
      makeRequest,
      isAuthenticated,
    }),
    [get, post, put, patch, del, makeRequest, isAuthenticated],
  );
}

/**
 * Higher-order component for protecting actions with authentication
 * This ensures any action requiring auth is protected seamlessly
 */
export function withAuthAction<T extends (...args: any[]) => any>(
  action: T,
  options: {
    requireAuth?: boolean;
    fallback?: () => void;
    onUnauthorized?: () => void;
  } = {}
): T {
  const { requireAuth = true, fallback, onUnauthorized } = options;

  return ((...args: Parameters<T>) => {
    const { isAuthenticated } = useAuth();

    if (requireAuth && !isAuthenticated) {
      if (onUnauthorized) {
        onUnauthorized();
      } else if (fallback) {
        fallback();
      } else {
        console.warn("Action blocked: User not authenticated");
      }
      return;
    }

    return action(...args);
  }) as T;
}
