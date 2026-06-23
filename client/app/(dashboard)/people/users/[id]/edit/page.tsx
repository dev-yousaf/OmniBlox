"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { PageLoadingSkeleton } from "@/components/ui/page-loading-skeleton";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  useTeamApi,
  type TeamUser,
  type UpdateUserData,
} from "@/hooks/use-team-api";
import { useAuth } from "@/contexts/auth-context";
import { PageError, checkRoleAccess } from "@/components/ui/page-error";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Save, User as UserIcon } from "lucide-react";

export default function EditUserPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { user: authUser } = useAuth();
  const currentRole = (authUser?.role || "").toUpperCase();
  const canEdit = checkRoleAccess(currentRole, ["OWNER", "ADMIN"]);
  const { getUser, updateUser } = useTeamApi();

  if (!canEdit) {
    return <PageError type="forbidden" />;
  }

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
        console.error("Error loading user:", error);
        toast({
          title: "Error",
          description: "Failed to load user for editing.",
          variant: "destructive",
        });
        router.push("/people/users");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [params.id, getUser, toast, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      setSaving(true);
      const payload: UpdateUserData = {
        name: formData.name?.trim(),
        email: formData.email?.toString().trim() || undefined,
        role: formData.role as UpdateUserData["role"] | undefined,
      };

      const updated = await updateUser(user.id, payload);
      toast({ title: "Saved", description: "User updated successfully." });
      router.push(`/people/users/${updated.id}`);
    } catch (error: any) {
      console.error("Error updating user:", error);
      toast({
        title: "Error",
        description: error?.message || "Failed to update user.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading || !user) {
    return <PageLoadingSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <Link href={`/people/users/${user.id}`}>
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to User
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Edit User</h1>
          <p className="text-sm text-muted-foreground">Update user details</p>
        </div>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserIcon className="h-5 w-5" /> User Details
          </CardTitle>
          <CardDescription>Modify the details for this user.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  value={formData.name ?? ""}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Jane Cooper"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={(formData.email as string) ?? ""}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  placeholder="jane@example.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select
                value={formData.role}
                onValueChange={(value: string) =>
                  setFormData({
                    ...formData,
                    role: (value as UpdateUserData["role"]) || undefined,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                  <SelectItem value="MANAGER">Manager</SelectItem>
                  <SelectItem value="OBSERVER">Observer</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-4 pt-4">
              <Link href={`/people/users/${user.id}`}>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
              <Button type="submit" disabled={saving}>
                <Save className="h-4 w-4 mr-2" />{" "}
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}



