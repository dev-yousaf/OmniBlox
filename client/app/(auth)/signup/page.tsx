"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  User,
  Mail,
  Lock,
  Building2,
  Globe,
  Briefcase,
  MapPin,
  Loader2,
  PencilLine,
  AlertCircle,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/contexts/auth-context";

export default function SignupPage() {
  const router = useRouter();
  const { signup } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [industry, setIndustry] = useState("");
  const [otherIndustry, setOtherIndustry] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    const formData = new FormData(e.target as HTMLFormElement);
    const password = formData.get("password") as string;
    const cpassword = formData.get("cpassword") as string;

    // Validate passwords match
    if (password !== cpassword) {
      setError("Passwords do not match");
      setIsLoading(false);
      return;
    }

    const payload = {
      email: formData.get("email") as string,
      password: password,
      name: formData.get("name") as string,
      companyName: formData.get("companyName") as string,
      workspaceUrl: formData.get("workspaceUrl") as string,
      industry: industry,
      otherIndustry: industry === "other" ? otherIndustry : undefined,
      country: formData.get("country") as string,
    };

    try {
      const result = await signup(payload);
      // Redirect to OTP verification page with userId and email
      router.push(
        `/verify-otp?email=${encodeURIComponent(payload.email)}&userId=${
          result.userId
        }`
      );
    } catch (err: any) {
      setError(err.message || "An error occurred during signup");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted to-background p-4">
      <div className="w-full max-w-4xl rounded-2xl border bg-card text-card-foreground shadow-xl p-6 sm:p-10">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
            Create Your NexHub Workspace
          </h1>
          <p className="mt-2 text-muted-foreground text-base">
            One step away from automating your business.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-10 space-y-12">
          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* 1. Administrator Account */}
          <section>
            <h2 className="text-lg sm:text-xl font-semibold border-b pb-2 mb-6">
              1. Administrator Account
            </h2>
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <Label
                  htmlFor="name"
                  className="mb-2 block text-sm font-medium"
                >
                  Full Name
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="name"
                    name="name"
                    placeholder="e.g., John Doe"
                    className="pl-10 font-medium"
                    required
                  />
                </div>
              </div>

              <div>
                <Label
                  htmlFor="email"
                  className="mb-2 block text-sm font-medium"
                >
                  Work Email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="you@company.com"
                    className="pl-10 font-medium"
                    required
                  />
                </div>
              </div>

              <div>
                <Label
                  htmlFor="password"
                  className="mb-2 block text-sm font-medium"
                >
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <PasswordInput
                    id="password"
                    name="password"
                    placeholder="Enter a secure password"
                    className="pl-10 font-medium"
                    autoComplete="new-password"
                    required
                  />
                </div>
              </div>

              <div>
                <Label
                  htmlFor="cpassword"
                  className="mb-2 block text-sm font-medium"
                >
                  Confirm Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <PasswordInput
                    id="cpassword"
                    name="cpassword"
                    placeholder="Retype your password"
                    className="pl-10 font-medium"
                    autoComplete="new-password"
                    required
                  />
                </div>
              </div>
            </div>
          </section>

          {/* 2. Business Details */}
          <section>
            <h2 className="text-lg sm:text-xl font-semibold border-b pb-2 mb-6">
              2. Business Details
            </h2>
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <Label
                  htmlFor="companyName"
                  className="mb-2 block text-sm font-medium"
                >
                  Company Name
                </Label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="companyName"
                    name="companyName"
                    placeholder="e.g., JD Retail & Hardware"
                    className="pl-10 font-medium"
                    required
                  />
                </div>
              </div>

              <div>
                <Label
                  htmlFor="workspaceUrl"
                  className="mb-2 block text-sm font-medium"
                >
                  Workspace URL
                </Label>
                <div className="flex mt-1">
                  <div className="relative flex-1">
                    <Globe className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="workspaceUrl"
                      name="workspaceUrl"
                      placeholder="your-company"
                      className="pl-10 rounded-r-none font-medium"
                      required
                    />
                  </div>
                  <span className="inline-flex items-center rounded-r-md border border-l-0 bg-muted px-3 text-sm text-muted-foreground">
                    .NexHub.app
                  </span>
                </div>
              </div>

              <div>
                <Label
                  htmlFor="industry"
                  className="mb-2 block text-sm font-medium"
                >
                  Industry / Business Type
                </Label>
                <Select
                  name="industry"
                  value={industry}
                  onValueChange={setIndustry}
                  required
                >
                  <SelectTrigger id="industry">
                    <SelectValue placeholder="Select your industry" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="retail">
                      <Briefcase className="mr-2 inline h-4 w-4" />
                      Retail
                    </SelectItem>
                    <SelectItem value="hardware">
                      <Briefcase className="mr-2 inline h-4 w-4" />
                      Hardware
                    </SelectItem>
                    <SelectItem value="technology">
                      <Briefcase className="mr-2 inline h-4 w-4" />
                      Technology
                    </SelectItem>
                    <SelectItem value="other">
                      <PencilLine className="mr-2 inline h-4 w-4" />
                      Other
                    </SelectItem>
                  </SelectContent>
                </Select>

                {/* Conditionally show Other Industry Input */}
                {industry === "other" && (
                  <div className="mt-3">
                    <Label
                      htmlFor="otherIndustry"
                      className="mb-2 block text-sm font-medium"
                    >
                      Specify Industry
                    </Label>
                    <div className="relative">
                      <PencilLine className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="otherIndustry"
                        name="otherIndustry"
                        placeholder="Type your industry"
                        value={otherIndustry}
                        onChange={(e) => setOtherIndustry(e.target.value)}
                        className="pl-10 font-medium"
                        required
                      />
                    </div>
                  </div>
                )}
              </div>

              <div>
                <Label
                  htmlFor="country"
                  className="mb-2 block text-sm font-medium"
                >
                  Country
                </Label>
                <Select name="country" required>
                  <SelectTrigger id="country">
                    <SelectValue placeholder="Select your country" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="us">
                      <MapPin className="mr-2 inline h-4 w-4" />
                      United States
                    </SelectItem>
                    <SelectItem value="ca">
                      <MapPin className="mr-2 inline h-4 w-4" />
                      Canada
                    </SelectItem>
                    <SelectItem value="gb">
                      <MapPin className="mr-2 inline h-4 w-4" />
                      United Kingdom
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </section>

          {/* Finalization */}
          <section>
            <div className="flex items-start space-x-2">
              <Checkbox id="terms" required />
              <Label
                htmlFor="terms"
                className="cursor-pointer text-sm text-muted-foreground leading-snug"
              >
                I agree to the NexHub{" "}
                <Link
                  href="/terms"
                  className="underline font-medium hover:text-primary"
                >
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link
                  href="/privacy"
                  className="underline font-medium hover:text-primary"
                >
                  Privacy Policy
                </Link>
                .
              </Label>
            </div>

            <Button
              size="lg"
              className="mt-6 w-full font-semibold tracking-wide"
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Workspace...
                </>
              ) : (
                "Continue"
              )}
            </Button>
          </section>
        </form>

        <p className="mt-10 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-primary hover:underline"
          >
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
