"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { useRouter, usePathname } from "next/navigation";
import { api, TokenManager, User as ApiUser, ApiError } from "./api";

type User = ApiUser & {
  permissions?: string[];
};

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (data: SignupData) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: UpdateProfileData) => Promise<void>;
  changePassword: (
    currentPassword: string,
    newPassword: string
  ) => Promise<void>;
  refreshUser: () => Promise<void>;
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

interface UpdateProfileData {
  name?: string;
  companyName?: string;
  industry?: string;
  otherIndustry?: string;
  country?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const isAuthenticated = !!user && TokenManager.isAuthenticated();
  const pathname = usePathname();

  // Initialize auth state
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const storedUser = TokenManager.getUser();
        const accessToken = TokenManager.getAccessToken();

        if (storedUser && accessToken) {
          // Validate token with backend
          try {
            const { user: validatedUser } = await api.validateToken();
            setUser({ ...validatedUser, permissions: ["all"] });
          } catch (error) {
            // Token is invalid, clear storage
            TokenManager.clearTokens();
            setUser(null);
          }
        }
      } catch (error) {
        console.error("Auth initialization error:", error);
        TokenManager.clearTokens();
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  // If user is authenticated, redirect away from guest routes to dashboard
  useEffect(() => {
    if (isLoading) return;

    try {
      const guestPaths = new Set([
        "/",
        "/login",
        "/signup",
        "/forgot-password",
      ]);

      if (isAuthenticated && pathname) {
        // If current path is exactly a guest path, or is the index, redirect
        if (
          guestPaths.has(pathname) ||
          Array.from(guestPaths).some((p) => pathname.startsWith(p + "/"))
        ) {
          router.replace("/dashboard");
        }
      }
    } catch (err) {
      // swallow routing errors silently
    }
  }, [isAuthenticated, isLoading, pathname, router]);

  const login = async (email: string, password: string): Promise<void> => {
    try {
      setIsLoading(true);
      const response = await api.login(email, password);
      setUser({ ...response.user, permissions: ["all"] });
      router.push("/dashboard");
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (data: SignupData): Promise<void> => {
    try {
      setIsLoading(true);
      const response = await api.signup(data);
      setUser({ ...response.user, permissions: ["all"] });
      router.push("/dashboard");
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      setIsLoading(true);
      await api.logout();
      setUser(null);
      router.push("/login");
    } catch (error) {
      // Even if logout fails on backend, clear local state
      TokenManager.clearTokens();
      setUser(null);
      router.push("/login");
    } finally {
      setIsLoading(false);
    }
  };

  const updateProfile = async (data: UpdateProfileData): Promise<void> => {
    try {
      const updatedUser = await api.updateProfile(data);
      setUser({ ...updatedUser, permissions: user?.permissions || ["all"] });
    } catch (error) {
      throw error;
    }
  };

  const changePassword = async (
    currentPassword: string,
    newPassword: string
  ): Promise<void> => {
    try {
      await api.changePassword(currentPassword, newPassword);
    } catch (error) {
      throw error;
    }
  };

  const refreshUser = async (): Promise<void> => {
    try {
      const refreshedUser = await api.getProfile();
      setUser({ ...refreshedUser, permissions: user?.permissions || ["all"] });
    } catch (error) {
      console.error("Failed to refresh user:", error);
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated,
    login,
    signup,
    logout,
    updateProfile,
    changePassword,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
