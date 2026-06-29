"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTeamApi, type CreateUserData } from "@/hooks/use-team-api";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { PageError, checkRoleAccess } from "@/components/ui/page-error";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, ChevronRight, Loader2, UserPlus, Mail } from "lucide-react";

export default function CreateUserPage() {
  const [formData, setFormData] = useState<CreateUserData>({
    email: "",
    name: "",
    role: "OBSERVER",
  });
  const [loading, setLoading] = useState(false);

  const { createUser } = useTeamApi();
  const { toast } = useToast();
  const router = useRouter();
  const { user } = useAuth();

  const currentRole = (user?.role || "").toUpperCase();
  const canCreateUser = currentRole === "OWNER" || currentRole === "ADMIN";
  const canCreateAdmin = currentRole === "OWNER";

  useEffect(() => {
    if (!canCreateAdmin && formData.role === "ADMIN") {
      setFormData((prev) => ({ ...prev, role: "OBSERVER" }));
    }
  }, [canCreateAdmin, formData.role]);

  if (!canCreateUser) {
    return <PageError type="forbidden" />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      await createUser(formData);
      toast({ title: "Invitation Sent", description: `An invitation email has been sent to ${formData.email}.` });
      router.push("/people/users");
    } catch (error: any) {
      let msg = error?.message || "Failed to create user.";
      if (error?.statusCode === 403) msg = "You don't have permission to create users.";
      else if (error?.statusCode === 409) msg = "A user with this email already exists.";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1 text-sm text-muted-foreground mb-0.5">
        <Link href="/dashboard" className="hover:text-foreground transition-colors">Dashboard</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link href="/people/users" className="hover:text-foreground transition-colors">Users</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground">New User</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/people/users" className="flex items-center justify-center h-8 w-8 rounded-[5px] border hover:bg-accent transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-[18px] font-bold text-foreground">New User</h1>
            <p className="text-sm text-muted-foreground">Invite a new team member</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/people/users">
            <Button type="button" variant="outline" size="sm" className="h-[34px] rounded-[5px] text-[13px]">Cancel</Button>
          </Link>
          <Button type="submit" form="create-user-form" disabled={loading} size="sm" className="h-[34px] rounded-[5px] bg-[#ff9025] hover:bg-[#ff9025]/90 text-white text-[13px] font-medium px-3 gap-1.5">
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserPlus className="h-3.5 w-3.5" />}
            {loading ? "Sending..." : "Send Invitation"}
          </Button>
        </div>
      </div>

      {/* Form */}
      <form id="create-user-form" onSubmit={handleSubmit}>
        <div className="border rounded-[5px] bg-card shadow-sm">
          <div className="px-5 py-[15px] border-b">
            <h2 className="text-sm font-semibold text-foreground">User Details</h2>
          </div>
          <div className="p-5 space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-xs font-medium">Full Name *</Label>
                <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="John Smith" required className="h-[34px] rounded-[5px] text-sm" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs font-medium">Email Address *</Label>
                <Input id="email" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="john@company.com" required className="h-[34px] rounded-[5px] text-sm" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="role" className="text-xs font-medium">Role *</Label>
              <Select value={formData.role} onValueChange={(value: "ADMIN" | "MANAGER" | "OBSERVER") => setFormData({ ...formData, role: value })}>
                <SelectTrigger className="h-[34px] rounded-[5px] text-sm">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADMIN" disabled={!canCreateAdmin}>Admin</SelectItem>
                  <SelectItem value="MANAGER">Manager</SelectItem>
                  <SelectItem value="OBSERVER">Observer</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Alert className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
              <Mail className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <AlertDescription className="text-sm text-blue-700 dark:text-blue-300">
                An invitation email will be sent to <strong>{formData.email || "the provided email"}</strong>.
              </AlertDescription>
            </Alert>
          </div>
        </div>
      </form>
    </div>
  );
}
