"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { WorkspaceLink as Link } from "@/components/workspace-link";
import { PageLoadingSkeleton } from "@/components/ui/page-loading-skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, ChevronRight, Mail, Calendar, Shield, Crown, Briefcase, Users,
  Activity, Trash2, Pencil,
} from "lucide-react";
import { useTeamApi, type TeamUser } from "@/hooks/use-team-api";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { useWorkspace } from "@/hooks/use-workspace";
import { PageError, checkRoleAccess } from "@/components/ui/page-error";
import { format } from "date-fns";
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

const roleConfig: Record<string, { label: string; className: string; icon: any }> = {
  OWNER: { label: "Owner", className: "bg-yellow-100 text-yellow-700 border-yellow-200", icon: Crown },
  ADMIN: { label: "Admin", className: "bg-purple-100 text-purple-700 border-purple-200", icon: Shield },
  MANAGER: { label: "Manager", className: "bg-blue-100 text-blue-700 border-blue-200", icon: Briefcase },
  OBSERVER: { label: "Observer", className: "bg-gray-100 text-gray-700 border-gray-200", icon: Users },
};

const statusConfig: Record<string, { label: string; className: string }> = {
  active: { label: "Active", className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  inactive: { label: "Inactive", className: "bg-gray-100 text-gray-700 border-gray-200" },
};

export default function UserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const ws = useWorkspace();
  const { user: authUser } = useAuth();
  const currentRole = (authUser?.role || "").toUpperCase();
  const canView = checkRoleAccess(currentRole, ["OWNER", "ADMIN", "MANAGER"]);
  const canManage = currentRole === "OWNER" || currentRole === "ADMIN";
  const [user, setUser] = useState<TeamUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const { getUser, deleteUser } = useTeamApi();
  const { toast } = useToast();

  useEffect(() => {
    const loadUser = async () => {
      if (!params.id) return;
      try {
        setLoading(true);
        const userData = await getUser(params.id as string);
        setUser(userData);
      } catch (error) {
        toast({ title: "Error", description: "Failed to load user details.", variant: "destructive" });
        router.push(`/${ws}/people/users`);
      } finally {
        setLoading(false);
      }
    };
    loadUser();
  }, [params.id, getUser, toast, router]);

  if (!canView) return <PageError type="forbidden" />;

  const handleDelete = async () => {
    if (!user) return;
    try {
      setDeleting(true);
      await deleteUser(user.id);
      toast({ title: "Success", description: "User deleted successfully." });
      router.push(`/${ws}/people/users`);
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to delete user.", variant: "destructive" });
    } finally {
      setDeleting(false);
      setDeleteOpen(false);
    }
  };

  const formatDate = (dateString: string) => format(new Date(dateString), "MMM dd, yyyy");
  const formatDateTime = (dateString: string | undefined) =>
    dateString ? format(new Date(dateString), "MMM dd, yyyy h:mm a") : "Never";

  if (loading || !user) return <PageLoadingSkeleton />;

  const roleInfo = roleConfig[user.role] || roleConfig.OBSERVER;
  const RoleIcon = roleInfo.icon;
  const statusInfo = statusConfig[user.status] || statusConfig.inactive;

  return (
    <div className="space-y-5">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1 text-sm text-muted-foreground mb-0.5">
        <Link href="/dashboard" className="hover:text-foreground transition-colors">Dashboard</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link href="/people/users" className="hover:text-foreground transition-colors">Users</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground">{user.name}</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/people/users" className="flex items-center justify-center h-8 w-8 rounded-[5px] border hover:bg-accent transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-[18px] font-bold text-foreground">{user.name}</h1>
              <Badge variant="outline" className={`font-medium text-xs ${roleInfo.className}`}>
                <RoleIcon className="h-3 w-3 mr-1" />
                {roleInfo.label}
              </Badge>
              <Badge variant="outline" className={`font-medium text-xs ${statusInfo.className}`}>
                {statusInfo.label}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">{user.email} &middot; Joined {formatDate(user.createdAt)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {canManage && (
            <>
              <Button variant="outline" size="sm" className="h-[34px] rounded-[5px] text-[13px] text-destructive" onClick={() => setDeleteOpen(true)}>
                <Trash2 className="mr-1.5 h-3.5 w-3.5" />Delete
              </Button>
              <Link href={`/people/users/${user.id}/edit`}>
                <Button variant="outline" size="sm" className="h-[34px] rounded-[5px] text-[13px]">
                  <Pencil className="mr-1.5 h-3.5 w-3.5" />Edit
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="border rounded-[5px] bg-card shadow-sm p-5">
          <div className="flex items-center gap-2 mb-1">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Join Date</p>
          </div>
          <p className="text-2xl font-bold">{formatDate(user.createdAt)}</p>
        </div>
        <div className="border rounded-[5px] bg-card shadow-sm p-5">
          <div className="flex items-center gap-2 mb-1">
            <Activity className="h-4 w-4 text-muted-foreground" />
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Last Login</p>
          </div>
          <p className="text-2xl font-bold">{formatDateTime(user.lastLogin)}</p>
        </div>
        <div className="border rounded-[5px] bg-card shadow-sm p-5">
          <div className="flex items-center gap-2 mb-1">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Email</p>
          </div>
          <p className="text-2xl font-bold truncate">{user.email}</p>
        </div>
      </div>

      {/* User Info details */}
      <div className="border rounded-[5px] bg-card shadow-sm">
        <div className="px-5 py-[15px] border-b">
          <h2 className="text-sm font-semibold text-foreground">User Information</h2>
        </div>
        <div className="p-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground">Full Name</p>
                <p className="text-sm font-semibold mt-0.5">{user.name}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="text-sm mt-0.5">{user.email}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Join Date</p>
                <p className="text-sm mt-0.5">{formatDate(user.createdAt)}</p>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground">Role</p>
                <div className="mt-0.5">
                  <Badge variant="outline" className={`font-medium text-xs ${roleInfo.className}`}>
                    <RoleIcon className="h-3 w-3 mr-1" />
                    {roleInfo.label}
                  </Badge>
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Last Login</p>
                <p className="text-sm mt-0.5">{formatDateTime(user.lastLogin)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Status</p>
                <div className="mt-0.5">
                  <Badge variant="outline" className={`font-medium text-xs ${statusInfo.className}`}>
                    {statusInfo.label}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Dialog */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this user?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The user {user.name} will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-white hover:bg-destructive/90" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Deleting..." : "Delete User"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
