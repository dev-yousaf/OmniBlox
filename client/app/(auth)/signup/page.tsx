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

interface SignupErrors {
  name?: string;
  email?: string;
  password?: string;
  cpassword?: string;
  companyName?: string;
  workspaceUrl?: string;
  industry?: string;
  country?: string;
}

export default function SignupPage() {
  const router = useRouter();
  const { signup } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [industry, setIndustry] = useState("");
  const [otherIndustry, setOtherIndustry] = useState("");
  const [error, setError] = useState("");
  const [errors, setErrors] = useState<SignupErrors>({});

  const clearError = (field: keyof SignupErrors) => {
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const validate = (): boolean => {
    const form = document.getElementById('signup-form') as HTMLFormElement
    if (!form) return true
    const fd = new FormData(form)
    const vals = {
      name: (fd.get('name') as string || '').trim(),
      email: (fd.get('email') as string || '').trim(),
      password: fd.get('password') as string || '',
      cpassword: fd.get('cpassword') as string || '',
      companyName: (fd.get('companyName') as string || '').trim(),
      workspaceUrl: (fd.get('workspaceUrl') as string || '').trim(),
      country: fd.get('country') as string || '',
    }

    const next: SignupErrors = {}
    if (!vals.name) next.name = 'Full name is required'
    if (!vals.email) next.email = 'Work email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(vals.email)) next.email = 'Invalid email format'
    if (!vals.password) next.password = 'Password is required'
    else if (vals.password.length < 6) next.password = 'Password must be at least 6 characters'
    if (vals.password !== vals.cpassword) next.cpassword = 'Passwords do not match'
    if (!vals.companyName) next.companyName = 'Company name is required'
    if (!vals.workspaceUrl) next.workspaceUrl = 'Workspace URL is required'
    if (!industry) next.industry = 'Industry is required'
    if (industry === 'other' && !otherIndustry.trim()) next.industry = 'Please specify your industry'
    if (!vals.country) next.country = 'Country is required'

    setErrors(next)
    if (Object.keys(next).length > 0) {
      const first = Object.keys(next)[0]
      setTimeout(() => document.querySelector(`[data-field="signup-${first}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100)
    }
    return Object.keys(next).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!validate()) return;
    setSubmitting(true);

    const formData = new FormData(e.target as HTMLFormElement);
    const password = formData.get("password") as string;

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
      await signup(payload);
      router.push('/login');
    } catch (err: any) {
      const msg = err.message || "An error occurred during signup";
      const lower = msg.toLowerCase();
      if (lower.includes("workspace url")) {
        setErrors((prev) => ({ ...prev, workspaceUrl: msg }));
        setTimeout(() => document.querySelector('[data-field="signup-workspaceUrl"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
      } else if (lower.includes("email")) {
        setErrors((prev) => ({ ...prev, email: msg }));
        setTimeout(() => document.querySelector('[data-field="signup-email"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
      } else {
        setError(msg);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted to-background p-4 overflow-y-auto">
      <div className="w-full max-w-4xl rounded-2xl border bg-card text-card-foreground shadow-xl p-6 sm:p-10 my-8 max-h-[95vh] overflow-y-auto">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
            Create Your OmniBlox Workspace
          </h1>
          <p className="mt-2 text-muted-foreground text-base">
            One step away from automating your business.
          </p>
        </div>

        {/* Form */}
        <form id="signup-form" onSubmit={handleSubmit} className="mt-10 space-y-12">
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
              <div data-field="signup-name">
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
                    onChange={() => clearError('name')}
                    required
                  />
                </div>
                {errors.name && <p className="text-[12px] text-red-500 mt-1">{errors.name}</p>}
              </div>

              <div data-field="signup-email">
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
                    onChange={() => clearError('email')}
                    required
                  />
                </div>
                {errors.email && <p className="text-[12px] text-red-500 mt-1">{errors.email}</p>}
              </div>

              <div data-field="signup-password">
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
                    onChange={() => clearError('password')}
                    required
                  />
                </div>
                {errors.password && <p className="text-[12px] text-red-500 mt-1">{errors.password}</p>}
              </div>

              <div data-field="signup-cpassword">
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
                    onChange={() => clearError('cpassword')}
                    required
                  />
                </div>
                {errors.cpassword && <p className="text-[12px] text-red-500 mt-1">{errors.cpassword}</p>}
              </div>
            </div>
          </section>

          {/* 2. Business Details */}
          <section>
            <h2 className="text-lg sm:text-xl font-semibold border-b pb-2 mb-6">
              2. Business Details
            </h2>
            <div className="grid gap-6 md:grid-cols-2">
              <div data-field="signup-companyName">
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
                    onChange={(e) => {
                      clearError('companyName');
                      const slug = e.target.value
                        .toLowerCase()
                        .replace(/[^a-z0-9]+/g, '-')
                        .replace(/^-+|-+$/g, '');
                      const wsInput = document.getElementById('workspaceUrl') as HTMLInputElement;
                      if (wsInput) {
                        wsInput.value = slug;
                        wsInput.dispatchEvent(new Event('input', { bubbles: true }));
                        clearError('workspaceUrl');
                      }
                    }}
                    required
                  />
                </div>
                {errors.companyName && <p className="text-[12px] text-red-500 mt-1">{errors.companyName}</p>}
              </div>

              <div data-field="signup-workspaceUrl">
                <Label
                  htmlFor="workspaceUrl"
                  className="mb-2 block text-sm font-medium"
                >
                  Workspace URL
                </Label>
                <div className="relative mt-1">
                  <Globe className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="workspaceUrl"
                    name="workspaceUrl"
                    placeholder="your-company"
                    className="pl-10 font-medium"
                    onChange={() => clearError('workspaceUrl')}
                    required
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Auto-generated from company name. Used to identify your workspace.
                </p>
                {errors.workspaceUrl && <p className="text-[12px] text-red-500 mt-1">{errors.workspaceUrl}</p>}
              </div>

              <div data-field="signup-industry">
                <Label
                  htmlFor="industry"
                  className="mb-2 block text-sm font-medium"
                >
                  Industry / Business Type
                </Label>
                <Select
                  name="industry"
                  value={industry}
                  onValueChange={(v) => { setIndustry(v); clearError('industry'); }}
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
                {errors.industry && <p className="text-[12px] text-red-500 mt-1">{errors.industry}</p>}

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
                        onChange={(e) => { setOtherIndustry(e.target.value); clearError('industry'); }}
                        className="pl-10 font-medium"
                        required
                      />
                    </div>
                  </div>
                )}
              </div>

              <div data-field="signup-country">
                <Label
                  htmlFor="country"
                  className="mb-2 block text-sm font-medium"
                >
                  Country
                </Label>
                <Select name="country" onValueChange={() => clearError('country')} required>
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
                {errors.country && <p className="text-[12px] text-red-500 mt-1">{errors.country}</p>}
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
                I agree to the OmniBlox{" "}
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
              disabled={submitting}
            >
              {submitting ? (
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
