"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { TableLoadingSkeleton } from "@/components/ui/page-loading-skeleton";
import {
  Plus,
  Search,
  Shield,
  Mail,
  UserCheck,
  Users,
  Crown,
  Briefcase,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  useTeamApi,
  type TeamUser,
  type TeamStats,
} from "@/hooks/use-team-api";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";

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
  STAFF: {
    label: "Staff",
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

export default function UsersPage() {
  const [users, setUsers] = useState<TeamUser[]>([]);
  const [stats, setStats] = useState<TeamStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const { getUsers, getTeamStats } = useTeamApi();
  const { toast } = useToast();
  const { user } = useAuth();
  const currentRole = (user?.role || "").toUpperCase();
  const canCreateUser = currentRole === "OWNER" || currentRole === "ADMIN";

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [usersResponse, statsResponse] = await Promise.all([
          getUsers(),
          getTeamStats(),
        ]);
        // Backend returns array directly when no pagination params
        const usersList = Array.isArray(usersResponse)
          ? usersResponse
          : usersResponse.users;
        setUsers(usersList);
        setStats(statsResponse);
      } catch (error) {
        console.error("Error loading users:", error);
        toast({
          title: "Error",
          description: "Failed to load users. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [getUsers, getTeamStats, toast]);

  const filteredUsers =
    users?.filter(
      (user) =>
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
    ) || [];

  const formatLastLogin = (lastLogin: string | undefined) => {
    if (!lastLogin) return "Never";
    return new Date(lastLogin).toLocaleString();
  };
  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h1 className="text-3xl font-semibold tracking-tight">Users</h1>
        <p className="text-sm text-muted-foreground">
          Manage system users and permissions
        </p>
      </div>

      <div className="flex items-center justify-between">
        <div></div>
        {canCreateUser && (
          <Link href="/people/users/new">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add User
            </Button>
          </Link>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Users</CardDescription>
            <CardTitle className="text-3xl">{stats?.totalUsers || 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Active Users</CardDescription>
            <CardTitle className="text-3xl text-emerald-600">
              {stats?.activeUsers || 0}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Admins</CardDescription>
            <CardTitle className="text-3xl">{stats?.adminCount || 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Staff</CardDescription>
            <CardTitle className="text-3xl">{stats?.staffCount || 0}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>All Users</CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                className="pl-9 w-[300px]"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <TableLoadingSkeleton rows={6} />
          ) : filteredUsers.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">
                {searchTerm
                  ? "No users found matching your search"
                  : "No users found"}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredUsers.map((user) => {
                const roleInfo = roleConfig[user.role];
                const RoleIcon = roleInfo.icon;
                return (
                  <Link key={user.id} href={`/people/users/${user.id}`}>
                    <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-12 w-12">
                          <AvatarFallback className="bg-primary/10 text-primary font-medium">
                            {user.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{user.name}</div>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                            <Mail className="h-3 w-3" />
                            {user.email}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-sm text-muted-foreground">
                            Last Login
                          </div>
                          <div className="text-sm font-medium">
                            {formatLastLogin(user.lastLogin)}
                          </div>
                        </div>
                        <Badge variant="outline" className={roleInfo.className}>
                          <RoleIcon className="h-3 w-3 mr-1" />
                          {roleInfo.label}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={statusConfig[user.status].className}
                        >
                          <UserCheck className="h-3 w-3 mr-1" />
                          {statusConfig[user.status].label}
                        </Badge>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
