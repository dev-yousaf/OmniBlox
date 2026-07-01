import { redirect } from "next/navigation";

// Types for API responses
export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  companyId: string;
  company?: {
    id: string;
    name: string;
    workspaceUrl: string;
    industry?: string;
    country?: string;
  };
}

export interface AuthResponse {
  userId?: string;
  user: User;
  company: {
    id: string;
    name: string;
    workspaceUrl: string;
    industry?: string;
    country?: string;
  };
}

export interface ApiError {
  message: string;
  statusCode: number;
  details?: any;
}

// API Client with cookie-based authentication
class ApiClient {
  private baseUrl: string;

  constructor() {
    if (typeof window !== "undefined") {
      // Browser: use API URL if set (local dev), otherwise same-origin proxy (Vercel)
      this.baseUrl = process.env.NEXT_PUBLIC_API_URL || `${window.location.origin}/api`;
    } else if (process.env.API_URL) {
      // Server-side (SSR): use direct backend URL
      this.baseUrl = process.env.API_URL;
    } else {
      this.baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5005";
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    // Add default headers
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        credentials: "include", // Critical: sends cookies with every request
      });

      if (!response.ok) {
        // Try to read text first, then parse JSON for better diagnostics
        const rawText = await response.text().catch(() => "");
        let errorData: any = {};
        try {
          errorData = rawText ? JSON.parse(rawText) : {};
        } catch (_) {
          errorData = { raw: rawText };
        }

        const error = {
          message:
            errorData?.message ||
            `HTTP ${response.status}: ${response.statusText}`,
          statusCode: response.status,
          details: errorData,
        } as ApiError;

        // Log a compact string; warn for client errors, error for server errors
        const logFn = response.status >= 500 ? console.error : console.warn;
        logFn(
          `API Error: ${error.message} (${options.method || "GET"} ${url}) [${
            response.status
          }]`
        );
        console.debug("API Error details:", {
          url,
          method: options.method || "GET",
          status: response.status,
          statusText: response.statusText,
          errorData,
          headers: response.headers
            ? Object.fromEntries(response.headers.entries())
            : {},
          requestBody: options.body
            ? (() => {
                try {
                  return JSON.parse(options.body as string);
                } catch {
                  return options.body;
                }
              })()
            : undefined,
        });

        throw error;
      }

      // Handle empty responses
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        return response.json();
      }

      return response.text() as any;
    } catch (error) {
      if (error instanceof TypeError && error.message.includes("fetch")) {
        throw {
          message: "Network error. Please check your connection.",
          statusCode: 0,
        } as ApiError;
      }
      throw error;
    }
  }

  // Auth endpoints
  async signup(data: {
    email: string;
    password: string;
    name: string;
    companyName: string;
    workspaceUrl: string;
    industry: string;
    otherIndustry?: string;
    country: string;
  }): Promise<AuthResponse> {
    return this.request<AuthResponse>("/auth/signup", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    return this.request<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  }

  async logout(): Promise<void> {
    try {
      await this.request("/auth/logout", { method: "POST" });
    } catch {
      // Ignore errors on logout
    }
  }

  async getProfile(): Promise<User> {
    return this.request<User>("/auth/me");
  }

  async updateProfile(data: {
    name?: string;
    companyName?: string;
    industry?: string;
    otherIndustry?: string;
    country?: string;
  }): Promise<User> {
    return this.request<User>("/auth/profile", {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async changePassword(
    currentPassword: string,
    newPassword: string
  ): Promise<{ message: string }> {
    return this.request("/auth/change-password", {
      method: "PUT",
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  }

  async validateToken(): Promise<{ valid: boolean; user: User }> {
    return this.request("/auth/validate");
  }

  // Generic API methods for other endpoints
  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: "GET" });
  }

  async post<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: "POST",
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: "PUT",
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async patch<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: "PATCH",
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: "DELETE" });
  }
}

// Token manager for cookie-based auth
export class TokenManager {
  private static readonly USER_KEY = "omniblox_user";

  static isAuthenticated(): boolean {
    // Better Auth uses HttpOnly cookies; check for user data
    return !!this.getUser() || document.cookie.includes("session=");
  }

  static getUser(): User | null {
    try {
      const stored = localStorage.getItem(this.USER_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }

  static setUser(user: User): void {
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
  }

  static getAccessToken(): string | null {
    // HttpOnly cookie - no JS access. Return null; real auth relies on cookie.
    return null;
  }

  static clearTokens(): void {
    localStorage.removeItem(this.USER_KEY);
  }
}

// Export singleton instance
export const api = new ApiClient();


