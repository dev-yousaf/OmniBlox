"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { WorkspaceLink as Link } from "@/components/workspace-link";
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
import { useWorkspace } from "@/hooks/use-workspace";
import { PageError, checkRoleAccess } from "@/components/ui/page-error";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  ArrowLeft,
  ChevronRight,
  Loader2,
  UserPlus,
  Link2,
  CheckCircle2,
  Copy,
  Share2,
} from "lucide-react";

export default function CreateUserPage() {
  const [formData, setFormData] = useState<CreateUserData>({
    email: "",
    name: "",
    role: "OBSERVER",
  });
  const [loading, setLoading] = useState(false);
  const [createdUser, setCreatedUser] = useState<{
    name: string;
    email: string;
    role: string;
    inviteToken: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const { createUser } = useTeamApi();
  const { toast } = useToast();
  const router = useRouter();
  const ws = useWorkspace();
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

  const getInviteLink = () => {
    if (typeof window === "undefined" || !createdUser?.inviteToken) return "";
    const base = window.location.origin;
    return `${base}/accept-invitation?token=${createdUser.inviteToken}`;
  };

  const handleCopy = async () => {
    const link = getInviteLink();
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      toast({ title: "Copied!", description: "Invitation link copied to clipboard" });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "Copy failed", description: "Please select and copy the link manually", variant: "destructive" });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const result = await createUser(formData);
      if (result.inviteToken) {
        setCreatedUser({
          name: result.name,
          email: result.email,
          role: result.role,
          inviteToken: result.inviteToken,
        });
      } else {
        toast({ title: "User Created", description: `${result.name} has been created.` });
        router.push(`/${ws}/people/users`);
      }
    } catch (error: any) {
      let msg = error?.message || "Failed to create user.";
      if (error?.statusCode === 403) msg = "You don't have permission to create users.";
      else if (error?.statusCode === 409) msg = "A user with this email already exists.";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (createdUser) {
    const inviteLink = getInviteLink();
    return (
      <div className="space-y-5">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1 text-sm text-muted-foreground mb-0.5">
          <Link href="/dashboard" className="hover:text-foreground transition-colors">Dashboard</Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <Link href="/people/users" className="hover:text-foreground transition-colors">Users</Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-foreground">Invitation Link</span>
        </div>

        {/* Success card */}
        <div className="border rounded-[5px] bg-card shadow-sm">
          <div className="px-5 py-[15px] border-b flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <h2 className="text-sm font-semibold text-foreground">Invitation Link Generated</h2>
          </div>
          <div className="p-5 space-y-5">
            <Alert className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
              <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
              <AlertDescription className="text-sm text-green-700 dark:text-green-300">
                <strong>{createdUser.name}</strong> ({createdUser.email}) has been added as <strong>{createdUser.role}</strong>.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label className="text-xs font-medium">Share this invitation link</Label>
              <p className="text-xs text-muted-foreground">
                Send this link via WhatsApp, email, or any messaging platform. The link expires in 48 hours.
              </p>
              <div className="flex items-center gap-2">
                <div className="flex-1 relative">
                  <Link2 className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    readOnly
                    value={inviteLink}
                    className="h-[34px] rounded-[5px] text-xs pl-9 pr-3 bg-muted/50 font-mono select-all"
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-[34px] rounded-[5px] px-3 gap-1.5 shrink-0"
                  onClick={handleCopy}
                >
                  {copied ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                  {copied ? "Copied" : "Copy"}
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <Link href="/people/users">
                <Button type="button" variant="outline" size="sm" className="h-[34px] rounded-[5px] text-[13px]">
                  Back to Users
                </Button>
              </Link>
              <Button
                type="button"
                size="sm"
                className="h-[34px] rounded-[5px] bg-[#ff9025] hover:bg-[#ff9025]/90 text-white text-[13px] font-medium px-3"
                onClick={() => {
                  setCreatedUser(null);
                  setFormData({ email: "", name: "", role: "OBSERVER" });
                }}
              >
                <Share2 className="h-3.5 w-3.5 mr-1.5" />
                Invite Another
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
            {loading ? "Creating..." : "Create User"}
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
              <Link2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <AlertDescription className="text-sm text-blue-700 dark:text-blue-300">
                An invitation link will be generated for <strong>{formData.email || "the provided email"}</strong>. You can share it via WhatsApp or any messaging platform.
              </AlertDescription>
            </Alert>
          </div>
        </div>
      </form>
    </div>
  );
}
