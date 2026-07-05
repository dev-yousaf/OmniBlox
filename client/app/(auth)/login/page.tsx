"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Package,
  Mail,
  Lock,
  Loader2,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/contexts/auth-context";
import { api } from "@/lib/api";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [showMagicLink, setShowMagicLink] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const { login } = useAuth();

  const clearFieldError = (field: 'email' | 'password') => {
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const validate = (): boolean => {
    const next: { email?: string; password?: string } = {};
    if (!email.trim()) next.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) next.email = "Invalid email format";
    if (!password) next.password = "Password is required";
    setErrors(next);
    if (Object.keys(next).length > 0) {
      const first = Object.keys(next)[0];
      setTimeout(() => document.querySelector(`[data-field="login-${first}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
    }
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    setError("");

    try {
      await login(email, password);
    } catch (err: any) {
      const msg = err.message || "Invalid email or password";
      const lower = msg.toLowerCase();
      if (lower.includes("email") || lower.includes("user not found")) {
        setErrors((prev) => ({ ...prev, email: msg }));
        setTimeout(() => document.querySelector('[data-field="login-email"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
      } else if (lower.includes("password")) {
        setErrors((prev) => ({ ...prev, password: msg }));
        setTimeout(() => document.querySelector('[data-field="login-password"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
      } else {
        setError(msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleMagicLinkRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      await api.post("/auth/magic-login/request", { email });
      setMagicLinkSent(true);
    } catch (err: any) {
      setError(err.message || "Failed to send magic link");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-muted to-background p-4 overflow-y-auto">
      <Card className="w-full max-w-md shadow-xl border-border/40 my-8">
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-xl bg-primary shadow-md">
            <Package className="h-7 w-7 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">
            Welcome to OmniBlox
          </CardTitle>
          <CardDescription className="text-base text-muted-foreground">
            {showMagicLink
              ? "Get a magic link sent to your email"
              : "Sign in to access your workspace"}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {magicLinkSent ? (
            <div className="space-y-4">
              <Alert className="bg-green-50 border-green-200">
                <Mail className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  Check your email for your magic login link! It will expire in
                  15 minutes.
                </AlertDescription>
              </Alert>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setMagicLinkSent(false);
                  setShowMagicLink(false);
                  setEmail("");
                }}
              >
                Back to Login
              </Button>
            </div>
          ) : showMagicLink ? (
            <form onSubmit={handleMagicLinkRequest} className="space-y-5">
              {/* Error Alert */}
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Email Field */}
              <div className="space-y-2">
                <Label htmlFor="magic-email" className="text-sm font-medium">
                  Email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="magic-email"
                    type="email"
                    placeholder="name@company.com"
                    className="pl-10 text-sm font-medium"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full font-semibold tracking-wide"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" /> Send Magic Link
                  </>
                )}
              </Button>

              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => setShowMagicLink(false)}
              >
                Back to Password Login
              </Button>
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Error Alert */}
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Email Field */}
              <div className="space-y-2" data-field="login-email">
                <Label htmlFor="email" className="text-sm font-medium">
                  Email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@company.com"
                    className="pl-10 text-sm font-medium"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); clearFieldError('email'); }}
                    required
                  />
                </div>
                {errors.email && (
                  <p className="text-[12px] text-red-500 mt-[2px]">{errors.email}</p>
                )}
              </div>

              {/* Password Field */}
              <div className="space-y-2" data-field="login-password">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-sm font-medium">
                    Password
                  </Label>
                  <Link
                    href="/forgot-password"
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <PasswordInput
                    id="password"
                    placeholder="Your password"
                    className="pl-10 text-sm font-medium"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); clearFieldError('password'); }}
                    autoComplete="current-password"
                    required
                  />
                </div>
                {errors.password && (
                  <p className="text-[12px] text-red-500 mt-[2px]">{errors.password}</p>
                )}
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full font-semibold tracking-wide"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Signing
                    in...
                  </>
                ) : (
                  "Sign in"
                )}
              </Button>

              {/* Magic Link Option */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    Or
                  </span>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => setShowMagicLink(true)}
              >
                <Sparkles className="mr-2 h-4 w-4" /> Login with Magic Link
              </Button>
            </form>
          )}

          <div className="mt-5 text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link
              href="/signup"
              className="text-primary font-medium hover:underline"
            >
              Sign up
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
