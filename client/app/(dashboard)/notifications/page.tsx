import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle, Info, Clock } from "lucide-react";

const notifications = [
  {
    id: "1",
    type: "alert",
    title: "Low Stock Alert",
    message: 'Laptop Pro 15" is running low on stock (5 units remaining)',
    time: "5 minutes ago",
    read: false,
  },
  {
    id: "2",
    type: "success",
    title: "Payment Received",
    message: "Payment of $15,000 received from Acme Corp",
    time: "1 hour ago",
    read: false,
  },
  {
    id: "3",
    type: "info",
    title: "New Order",
    message: "New order #ORD-1234 has been placed",
    time: "2 hours ago",
    read: true,
  },
  {
    id: "4",
    type: "alert",
    title: "Product Expiry",
    message: "3 products are expiring within 30 days",
    time: "3 hours ago",
    read: true,
  },
  {
    id: "5",
    type: "info",
    title: "Quotation Accepted",
    message: "Quotation QT-002 has been accepted by TechStart Inc",
    time: "5 hours ago",
    read: true,
  },
];

const typeConfig = {
  alert: {
    icon: AlertCircle,
    className: "bg-amber-100 text-amber-700 border-amber-200",
  },
  success: {
    icon: CheckCircle,
    className: "bg-emerald-100 text-emerald-700 border-emerald-200",
  },
  info: { icon: Info, className: "bg-blue-100 text-blue-700 border-blue-200" },
};

export default function NotificationsPage() {
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h1 className="text-3xl font-semibold tracking-tight">Notifications</h1>
        <p className="text-sm text-muted-foreground">
          Stay updated with system events and alerts
        </p>
      </div>

      <div className="flex items-center justify-between">
        <div></div>
        <Button variant="outline">Mark All as Read</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Notifications</CardDescription>
            <CardTitle className="text-3xl">{notifications.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Unread</CardDescription>
            <CardTitle className="text-3xl text-amber-600">
              {unreadCount}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Alerts</CardDescription>
            <CardTitle className="text-3xl text-red-600">
              {notifications.filter((n) => n.type === "alert").length}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Notifications</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {notifications.map((notification) => {
              const TypeIcon =
                typeConfig[notification.type as keyof typeof typeConfig].icon;
              return (
                <div
                  key={notification.id}
                  className={`flex items-start gap-4 p-4 border rounded-lg ${
                    !notification.read ? "bg-accent/30" : ""
                  }`}
                >
                  <div
                    className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                      typeConfig[notification.type as keyof typeof typeConfig]
                        .className
                    }`}
                  >
                    <TypeIcon className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <div className="font-medium">{notification.title}</div>
                      {!notification.read && (
                        <Badge
                          variant="outline"
                          className="bg-primary/10 text-primary border-primary/20"
                        >
                          New
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {notification.message}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
                      <Clock className="h-3 w-3" />
                      {notification.time}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
