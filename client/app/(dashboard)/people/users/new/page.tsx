"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTeamApi, type CreateUserData } from "@/hooks/use-team-api";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, UserPlus, Mail } from "lucide-react";
import Link from "next/link";

export default function CreateUserPage() {
  const [formData, setFormData] = useState<CreateUserData>({
    email: "",
    name: "",
    role: "STAFF",
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
      setFormData((prev) => ({ ...prev, role: "STAFF" }));
    }
  }, [canCreateAdmin, formData.role]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setLoading(true);
      await createUser(formData);

      toast({
        title: "Invitation Sent",
        description: `An invitation email has been sent to ${formData.email}.`,
      });

      router.push("/people/users");
    } catch (error: any) {
      let errorMessage =
        error?.message || "Failed to create user. Please try again.";

      if (error?.statusCode === 403) {
        errorMessage =
          "You don't have permission to create users. Please contact your administrator.";
      } else if (error?.statusCode === 409) {
        errorMessage = "A user with this email already exists.";
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/people/users">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Users
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            Add New User
          </h1>
          <p className="text-sm text-muted-foreground">
            Invite a new team member
          </p>
        </div>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            User Details
          </CardTitle>
          <CardDescription>
            Enter the details for the new team member. They will receive an
            email invitation to set up their own password.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!canCreateUser && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>
                You don't have permission to create users. Please contact your
                administrator.
              </AlertDescription>
            </Alert>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <fieldset disabled={!canCreateUser} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="John Smith"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    placeholder="john@company.com"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Role *</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value: "ADMIN" | "MANAGER" | "STAFF") =>
                    setFormData({ ...formData, role: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ADMIN" disabled={!canCreateAdmin}>
                      Admin - Full system access
                    </SelectItem>
                    <SelectItem value="MANAGER">
                      Manager - Limited admin access
                    </SelectItem>
                    <SelectItem value="STAFF">Staff - Basic access</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Alert className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
                <Mail className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <AlertDescription className="text-sm text-blue-700 dark:text-blue-300">
                  An invitation email will be sent to{" "}
                  <strong>{formData.email || "the provided email"}</strong>{" "}
                  with instructions to set up their account.
                </AlertDescription>
              </Alert>

              <div className="flex justify-end gap-4 pt-4">
                <Link href="/people/users">
                  <Button type="button" variant="outline">
                    Cancel
                  </Button>
                </Link>
                <Button type="submit" disabled={loading}>
                  {loading ? "Sending Invitation..." : "Send Invitation"}
                </Button>
              </div>
            </fieldset>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
