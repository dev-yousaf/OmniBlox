"use client";

import { useAuth } from "@/contexts/auth-context";
import { api } from "@/lib/api";
import { useCallback } from "react";
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
      method: "GET" | "POST" | "PUT" | "DELETE",
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
          case "DELETE":
            return await api.delete(endpoint);
          default:
            throw new Error(`Unsupported method: ${method}`);
        }
      } catch (error: any) {
        // Handle authentication errors seamlessly
        if (error.message === "Authentication failed" || error.status === 401) {
          // Silently logout and redirect if authentication fails
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

  const del = useCallback(
    (endpoint: string) => {
      return makeRequest("DELETE", endpoint);
    },
    [makeRequest]
  );

  return {
    get,
    post,
    put,
    delete: del,
    makeRequest,
    isAuthenticated,
  };
}
