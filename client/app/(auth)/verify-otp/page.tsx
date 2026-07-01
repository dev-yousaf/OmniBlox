"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Mail,
  Loader2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ArrowLeft,
  PencilLine,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { api } from "@/lib/api";

export default function VerifyOtpPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [otp, setOtp] = useState("");
  const [email, setEmail] = useState("");
  const [userId, setUserId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [resendMessage, setResendMessage] = useState("");

  useEffect(() => {
    const emailParam = searchParams.get("email");
    const userIdParam = searchParams.get("userId");

    if (!emailParam || !userIdParam) {
      router.push("/signup");
      return;
    }

    setEmail(emailParam);
    setUserId(userIdParam);
    setNewEmail(emailParam);
  }, [searchParams, router]);

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    if (otp.length !== 6) {
      setError("Please enter a valid 6-digit OTP");
      setIsLoading(false);
      return;
    }

    try {
      const response = await api.post("/auth/verify-otp", {
        userId,
        otp,
      });

      setSuccess(true);
      setTimeout(() => {
        router.push("/login");
      }, 2000);
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          "Invalid or expired OTP. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setIsResending(true);
    setError("");
    setResendMessage("");

    try {
      await api.post("/auth/resend-otp", { userId });
      setResendMessage("New OTP sent successfully! Check your email.");
      setOtp(""); // Clear the input
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to resend OTP");
    } finally {
      setIsResending(false);
    }
  };

  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingEmail(true);
    setError("");

    if (!newEmail || !newEmail.includes("@")) {
      setError("Please enter a valid email address");
      setIsUpdatingEmail(false);
      return;
    }

    try {
      const response = await api.post("/auth/update-signup-email", {
        userId,
        newEmail,
      });

      setEmail(newEmail);
      setIsEditingEmail(false);
      setOtp(""); // Clear OTP input
      setResendMessage(
        "Email updated! New OTP sent to your new email address."
      );
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to update email");
    } finally {
      setIsUpdatingEmail(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted to-background p-4">
        <div className="w-full max-w-md rounded-2xl border bg-card text-card-foreground shadow-xl p-8 text-center">
          <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
            <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-400" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Email Verified!</h1>
          <p className="text-muted-foreground mb-6">
            Your email has been successfully verified. Redirecting to login...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted to-background p-4">
      <div className="w-full max-w-md rounded-2xl border bg-card text-card-foreground shadow-xl p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Mail className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">Verify Your Email</h1>
          <p className="mt-2 text-muted-foreground">
            We've sent a 6-digit code to
          </p>
          {!isEditingEmail ? (
            <div className="mt-2 flex items-center justify-center gap-2">
              <p className="font-medium text-primary">{email}</p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsEditingEmail(true)}
                className="h-8 px-2"
              >
                <PencilLine className="h-4 w-4" />
              </Button>
            </div>
          ) : null}
        </div>

        {/* Edit Email Form */}
        {isEditingEmail ? (
          <form onSubmit={handleUpdateEmail} className="space-y-4 mb-6">
            <div>
              <Label htmlFor="newEmail">New Email Address</Label>
              <Input
                id="newEmail"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="Enter new email"
                required
                disabled={isUpdatingEmail}
              />
            </div>
            <div className="flex gap-2">
              <Button
                type="submit"
                disabled={isUpdatingEmail}
                className="flex-1"
              >
                {isUpdatingEmail ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Update Email"
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsEditingEmail(false);
                  setNewEmail(email);
                }}
                disabled={isUpdatingEmail}
              >
                Cancel
              </Button>
            </div>
          </form>
        ) : (
          <>
            {/* Error Alert */}
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Success Message */}
            {resendMessage && (
              <Alert className="mb-4 border-green-500 bg-green-50 dark:bg-green-950">
                <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                <AlertDescription className="text-green-600 dark:text-green-400">
                  {resendMessage}
                </AlertDescription>
              </Alert>
            )}

            {/* OTP Form */}
            <form onSubmit={handleVerifyOtp} className="space-y-6">
              <div>
                <Label htmlFor="otp">Enter 6-Digit Code</Label>
                <Input
                  id="otp"
                  type="text"
                  value={otp}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, "");
                    if (value.length <= 6) {
                      setOtp(value);
                    }
                  }}
                  placeholder="000000"
                  maxLength={6}
                  className="text-center text-2xl tracking-widest font-mono"
                  required
                  disabled={isLoading}
                  autoFocus
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Code expires in 10 minutes
                </p>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading || otp.length !== 6}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Verify Email
                  </>
                )}
              </Button>
            </form>

            {/* Resend OTP */}
            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground mb-2">
                Didn't receive the code?
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleResendOtp}
                disabled={isResending}
              >
                {isResending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Resend Code
                  </>
                )}
              </Button>
            </div>
          </>
        )}

        {/* Back to Login */}
        <div className="mt-8 pt-6 border-t text-center">
          <Link href="/login">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Login
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}



