"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuthenticatedApi } from "@/hooks/use-authenticated-api";
import {
  Bell, ChevronRight, Loader2, RefreshCw, CheckCircle2,
  AlertCircle, Info, Clock, CheckCheck,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  link?: string;
  createdAt: string;
}

const typeIcons: Record<string, typeof Bell> = {
  alert: AlertCircle,
  low_stock: AlertCircle,
  payment: CheckCircle2,
  order: Info,
  system: Bell,
};

const typeStyles: Record<string, string> = {
  alert: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400",
  low_stock: "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
  payment: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400",
  order: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
  system: "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400",
};

export default function NotificationsPage() {
  const { get, put } = useAuthenticatedApi();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [total, setTotal] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [markingId, setMarkingId] = useState<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const data = await get("/notifications?limit=100") as { notifications: NotificationItem[]; total: number; unreadCount: number };
      setNotifications(data.notifications || []);
      setTotal(data.total || 0);
      setUnreadCount(data.unreadCount || 0);
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, [get]);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  const markAsRead = async (id: string) => {
    setMarkingId(id);
    try {
      await put(`/notifications/${id}/read`, {});
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
      setUnreadCount((u) => Math.max(0, u - 1));
    } catch {
      toast({ title: "Failed to mark as read", variant: "destructive" as any });
    } finally {
      setMarkingId(null);
    }
  };

  const markAllAsRead = async () => {
    try {
      await put("/notifications/mark-all-read", {});
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
      toast({ title: "All notifications marked as read" });
    } catch {
      toast({ title: "Failed to mark all as read", variant: "destructive" as any });
    }
  };

  const alertCount = notifications.filter((n) => n.type === "alert" || n.type === "low_stock").length;

  return (
    <div className="space-y-5">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1 text-sm text-muted-foreground mb-0.5">
        <Link href="/dashboard" className="hover:text-foreground transition-colors">Dashboard</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground">Notifications</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[18px] font-bold text-foreground">Notifications</h1>
          <p className="text-sm text-muted-foreground">{unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-[34px] rounded-[5px] text-[13px]" onClick={fetchNotifications} disabled={loading}>
            <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" className="h-[34px] rounded-[5px] text-[13px]" onClick={markAllAsRead}>
              <CheckCheck className="mr-1.5 h-3.5 w-3.5" /> Mark All Read
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="border rounded-[5px] bg-card shadow-sm p-5">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Bell className="h-4 w-4" /> Total
          </div>
          <p className="text-2xl font-bold">{total}</p>
        </div>
        <div className="border rounded-[5px] bg-card shadow-sm p-5">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Bell className="h-4 w-4" /> Unread
          </div>
          <p className="text-2xl font-bold text-amber-600">{unreadCount}</p>
        </div>
        <div className="border rounded-[5px] bg-card shadow-sm p-5">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <AlertCircle className="h-4 w-4" /> Alerts
          </div>
          <p className="text-2xl font-bold text-red-600">{alertCount}</p>
        </div>
      </div>

      {/* Notifications List */}
      <div className="border rounded-[5px] bg-card shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : notifications.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground">
            <Bell className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
            <p className="font-medium">No notifications</p>
            <p className="text-sm mt-1">Notifications will appear here as events occur.</p>
          </div>
        ) : (
          <div className="divide-y">
            {notifications.map((n) => {
              const Icon = typeIcons[n.type] || Bell;
              const iconStyle = typeStyles[n.type] || typeStyles.system;
              return (
                <div
                  key={n.id}
                  className={`flex items-start gap-4 px-5 py-4 transition-colors ${!n.read ? "bg-muted/20" : "hover:bg-muted/30"}`}
                >
                  <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${iconStyle}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`text-sm ${!n.read ? "font-semibold" : "font-normal"}`}>{n.title}</span>
                      {!n.read && <Badge variant="outline" className="h-5 text-[10px] px-1.5 bg-primary/10 text-primary border-primary/20">New</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">{n.message}</p>
                    <div className="flex items-center gap-3 mt-1.5">
                      <div className="flex items-center gap-1 text-[11px] text-muted-foreground/60">
                        <Clock className="h-3 w-3" />
                        {new Date(n.createdAt).toLocaleDateString("en-US", {
                          month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                        })}
                      </div>
                      {!n.read && (
                        <button
                          onClick={() => markAsRead(n.id)}
                          disabled={markingId === n.id}
                          className="text-[11px] text-primary hover:underline flex items-center gap-0.5"
                        >
                          {markingId === n.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCheck className="h-3 w-3" />}
                          Mark read
                        </button>
                      )}
                    </div>
                  </div>
                  {n.link && (
                    <Link href={n.link} className="shrink-0 mt-1 text-xs text-primary hover:underline">
                      View
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
