"use client";

import { Suspense } from "react";
import { useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

function MagicLoginContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { refreshUser } = useAuth();
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading"
  );
  const [message, setMessage] = useState("Logging you in...");
  const hasRun = useRef(false);

  useEffect(() => {
    // Prevent double execution in React Strict Mode (dev)
    if (hasRun.current) return;
    hasRun.current = true;

    const token = searchParams.get("token");

    if (!token) {
      setStatus("error");
      setMessage("No login token provided");
      return;
    }

    const verifyMagicLink = async () => {
      try {
        const response = await api.post<{
          user: any;
          message: string;
        }>("/auth/magic-login/verify", { token });

        setStatus("success");
        setMessage("Successfully logged in! Redirecting to dashboard...");

        await new Promise((r) => setTimeout(r, 200));

        const ws = (response as any)?.user?.company?.workspaceUrl;

        try {
          await refreshUser({ silent: true });
        } catch (e) {
          console.warn("Refresh after magic link failed", e);
        }

        setTimeout(() => {
          router.push(ws ? `/${ws}/dashboard` : "/login");
        }, 1500);
      } catch (error: any) {
        setStatus("error");
        setMessage(
          error.message ||
            "Failed to log in. The link may be invalid or expired."
        );
      }
    };

    verifyMagicLink();
  }, [searchParams, router, refreshUser]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Magic Link Login</CardTitle>
          <CardDescription>
            {status === "loading" && "Verifying your magic link..."}
            {status === "success" && "Login successful!"}
            {status === "error" && "Login failed"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col items-center justify-center space-y-4">
            {status === "loading" && (
              <Loader2 className="h-16 w-16 animate-spin text-blue-500" />
            )}
            {status === "success" && (
              <CheckCircle2 className="h-16 w-16 text-green-500" />
            )}
            {status === "error" && (
              <XCircle className="h-16 w-16 text-red-500" />
            )}

            <p className="text-center text-sm text-gray-600">{message}</p>

            {status === "error" && (
              <Button onClick={() => router.push("/login")} className="w-full">
                Go to Login
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function MagicLoginPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    }>
      <MagicLoginContent />
    </Suspense>
  );
}
