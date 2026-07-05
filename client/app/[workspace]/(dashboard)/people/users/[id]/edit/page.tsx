"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { WorkspaceLink as Link } from "@/components/workspace-link";
import { PageLoadingSkeleton } from "@/components/ui/page-loading-skeleton";
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
import { useTeamApi, type TeamUser, type UpdateUserData } from "@/hooks/use-team-api";
import { useAuth } from "@/contexts/auth-context";
import { useWorkspace } from "@/hooks/use-workspace";
import { PageError, checkRoleAccess } from "@/components/ui/page-error";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, ChevronRight, Loader2, Save } from "lucide-react";

export default function EditUserPage() {
  const params = useParams();
  const router = useRouter();
  const ws = useWorkspace();
  const { toast } = useToast();
  const { user: authUser } = useAuth();
  const currentRole = (authUser?.role || "").toUpperCase();
  const canEdit = checkRoleAccess(currentRole, ["OWNER", "ADMIN"]);
  const { getUser, updateUser } = useTeamApi();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<TeamUser | null>(null);
  const [formData, setFormData] = useState<UpdateUserData>({});

  useEffect(() => {
    const load = async () => {
      if (!params.id) return;
      try {
        setLoading(true);
        const data = await getUser(params.id as string);
        setUser(data);
        setFormData({
          name: data.name,
          email: data.email,
          role: data.role === "OWNER" ? undefined : data.role,
        });
      } catch (error) {
        toast({ title: "Error", description: "Failed to load user.", variant: "destructive" });
        router.push(`/${ws}/${ws}/people/users`);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [params.id, getUser, toast, router]);

  if (!canEdit) return <PageError type="forbidden" />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      setSaving(true);
      const updated = await updateUser(user.id, {
        name: formData.name?.trim(),
        email: formData.email?.toString().trim() || undefined,
        role: formData.role as UpdateUserData["role"] | undefined,
      });
      toast({ title: "Saved", description: "User updated successfully." });
      router.push(`/${ws}/people/users/${updated.id}`);
    } catch (error: any) {
      toast({ title: "Error", description: error?.message || "Failed to update user.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading || !user) return <PageLoadingSkeleton />;

  return (
    <div className="space-y-5">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1 text-sm text-muted-foreground mb-0.5">
        <Link href="/dashboard" className="hover:text-foreground transition-colors">Dashboard</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link href="/people/users" className="hover:text-foreground transition-colors">Users</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link href={`/people/users/${user.id}`} className="hover:text-foreground transition-colors">{user.name}</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground">Edit</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href={`/people/users/${user.id}`} className="flex items-center justify-center h-8 w-8 rounded-[5px] border hover:bg-accent transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-[18px] font-bold text-foreground">Edit User</h1>
            <p className="text-sm text-muted-foreground">{user.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/people/users/${user.id}`}>
            <Button type="button" variant="outline" size="sm" className="h-[34px] rounded-[5px] text-[13px]">Cancel</Button>
          </Link>
          <Button type="submit" form="edit-user-form" disabled={saving} size="sm" className="h-[34px] rounded-[5px] bg-[#ff9025] hover:bg-[#ff9025]/90 text-white text-[13px] font-medium px-3 gap-1.5">
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>

      {/* Form */}
      <form id="edit-user-form" onSubmit={handleSubmit}>
        <div className="border rounded-[5px] bg-card shadow-sm">
          <div className="px-5 py-[15px] border-b">
            <h2 className="text-sm font-semibold text-foreground">User Details</h2>
          </div>
          <div className="p-5 space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-xs font-medium">Full Name *</Label>
                <Input id="name" value={formData.name ?? ""} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Jane Cooper" required className="h-[34px] rounded-[5px] text-sm" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs font-medium">Email</Label>
                <Input id="email" type="email" value={(formData.email as string) ?? ""} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="jane@example.com" className="h-[34px] rounded-[5px] text-sm" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="role" className="text-xs font-medium">Role</Label>
              <Select value={formData.role} onValueChange={(value: string) => setFormData({ ...formData, role: (value as UpdateUserData["role"]) || undefined })}>
                <SelectTrigger className="h-[34px] rounded-[5px] text-sm">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                  <SelectItem value="MANAGER">Manager</SelectItem>
                  <SelectItem value="OBSERVER">Observer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
