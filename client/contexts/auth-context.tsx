"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

interface User {
  id: string;
  email: string;
  name: string | null;
  companyId: string;
  role: string;
  isSuperadmin?: boolean;
  company?: {
    id: string;
    name: string;
    workspaceUrl: string;
  };
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  company: User['company'] | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (data: SignupData) => Promise<{ userId: string }>;
  logout: () => Promise<void>;
  refreshUser: (opts?: { silent?: boolean }) => Promise<void>;
}

interface SignupData {
  email: string;
  password: string;
  name: string;
  companyName: string;
  workspaceUrl: string;
  industry: string;
  otherIndustry?: string;
  country: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const validateSession = async () => {
      try {
        setIsLoading(true);
        const userData = await api.getProfile();
        setUser(userData as User);
      } catch (error) {
        console.log("No active session");
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    validateSession();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      await api.login(email, password);
      const userData = await api.getProfile();
      setUser(userData as User);
      router.push("/dashboard");
    } catch (error: any) {
      console.error("Login failed:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (data: SignupData) => {
    try {
      setIsLoading(true);
      const response = (await api.signup(data)) as any;
      // Return userId for OTP verification page
      return { userId: response.userId as string };
    } catch (error: any) {
      console.error("Signup failed:", error);
      setIsLoading(false);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      setIsLoading(true);
      await api.logout();
      setUser(null);
      router.push("/login");
    } catch (error) {
      console.error("Logout failed:", error);
      setUser(null);
      router.push("/login");
    } finally {
      setIsLoading(false);
    }
  };

  const refreshUser = async (opts?: { silent?: boolean }) => {
    try {
      const userData = await api.getProfile();
      setUser(userData as User);
    } catch (error) {
      if (!opts?.silent) {
        // Provide more useful diagnostics without crashing the app
        const err = error as any;
        const message = err?.message || "Unknown error";
        const status = err?.statusCode;
        console.error("Failed to refresh user:", {
          message,
          status,
          error: err,
        });
      }
      setUser(null);
    }
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    company: user?.company ?? null,
    login,
    signup,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export function useRequireAuth() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, isLoading, router]);

  return { isAuthenticated, isLoading, user };
}
