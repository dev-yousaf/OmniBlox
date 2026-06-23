"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { PageLoadingSkeleton } from "@/components/ui/page-loading-skeleton";
import {
  ArrowLeft,
  Edit,
  Trash2,
  Mail,
  Calendar,
  Shield,
  User as UserIcon,
  Activity,
  Crown,
  Briefcase,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useTeamApi, type TeamUser } from "@/hooks/use-team-api";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { PageError, checkRoleAccess } from "@/components/ui/page-error";
import Link from "next/link";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const roleConfig = {
  OWNER: {
    label: "Owner",
    className: "bg-yellow-100 text-yellow-700 border-yellow-200",
    icon: Crown,
  },
  ADMIN: {
    label: "Admin",
    className: "bg-purple-100 text-purple-700 border-purple-200",
    icon: Shield,
  },
  MANAGER: {
    label: "Manager",
    className: "bg-blue-100 text-blue-700 border-blue-200",
    icon: Briefcase,
  },
  OBSERVER: {
    label: "Observer",
    className: "bg-gray-100 text-gray-700 border-gray-200",
    icon: Users,
  },
};

const statusConfig = {
  active: {
    label: "Active",
    className: "bg-emerald-100 text-emerald-700 border-emerald-200",
  },
  inactive: {
    label: "Inactive",
    className: "bg-gray-100 text-gray-700 border-gray-200",
  },
};

export default function UserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user: authUser } = useAuth();
  const currentRole = (authUser?.role || "").toUpperCase();
  const canView = checkRoleAccess(currentRole, ["OWNER", "ADMIN", "MANAGER"]);
  const [user, setUser] = useState<TeamUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const { getUser, deleteUser } = useTeamApi();
  const { toast } = useToast();

  if (!canView) {
    return <PageError type="forbidden" />;
  }

  useEffect(() => {
    const loadUser = async () => {
      if (!params.id) return;

      try {
        setLoading(true);
        const userData = await getUser(params.id as string);
        setUser(userData);
      } catch (error) {
        console.error("Error loading user:", error);
        toast({
          title: "Error",
          description: "Failed to load user details.",
          variant: "destructive",
        });
        router.push("/people/users");
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, [params.id, getUser, toast, router]);

  const handleDelete = async () => {
    if (!user) return;
    try {
      setDeleting(true);
      await deleteUser(user.id);
      toast({ title: "Success", description: "User deleted successfully." });
      router.push("/people/users");
    } catch (error: any) {
      console.error("Error deleting user:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete user.",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
      setDeleteOpen(false);
    }
  };

  const renderStatusBadge = (status: string) => {
    const statusInfo = statusConfig[status as keyof typeof statusConfig];
    return (
      <Badge
        variant="outline"
        className={statusInfo?.className || "bg-gray-100 text-gray-700"}
      >
        {statusInfo?.label || status}
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatDateTime = (dateString: string | undefined) => {
    if (!dateString) return "Never";
    return new Date(dateString).toLocaleString();
  };
  if (loading) {
    return <PageLoadingSkeleton />;
  }

  if (!user) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <p className="text-muted-foreground">User not found</p>
          </div>
        </div>
      </div>
    );
  }

  const roleInfo = roleConfig[user.role];
  const RoleIcon = roleInfo.icon;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/people/users">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <Avatar className="h-16 w-16">
            <AvatarFallback className="text-lg">
              {user.name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase()
                .substring(0, 2)}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-3xl font-bold">{user.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className={roleInfo.className}>
                <RoleIcon className="h-3 w-3 mr-1" />
                {roleInfo.label}
              </Badge>
              {renderStatusBadge(user.status)}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/people/users/${user.id}/edit`}>
            <Button variant="outline">
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Button>
          </Link>
          <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="mr-2 h-4 w-4" /> Delete
          </Button>
        </div>
      </div>

      <Separator />

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Join Date
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-500" />
              <span className="text-lg font-semibold">
                {formatDate(user.createdAt)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Last Login
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-green-500" />
              <span className="text-sm font-semibold">
                {formatDateTime(user.lastLogin)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Email
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-purple-500" />
              <span className="text-sm font-semibold">{user.email}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* User Information Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserIcon className="h-5 w-5" />
            User Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <UserIcon className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Full Name</p>
                  <p className="font-medium">{user.name}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{user.email}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Join Date</p>
                  <p className="font-medium">{formatDate(user.createdAt)}</p>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <RoleIcon className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Role</p>
                  <p className="font-medium">{roleInfo.label}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Activity className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Last Login</p>
                  <p className="font-medium">
                    {formatDateTime(user.lastLogin)}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Shield className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <div className="pt-1">{renderStatusBadge(user.status)}</div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this user?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The user {user.name} will be
              permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => handleDelete()}
              disabled={deleting}
            >
              {deleting ? "Deleting..." : "Delete User"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}



