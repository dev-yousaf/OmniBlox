"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ArrowLeft,
  Search,
  Truck,
  Package,
  CheckCircle,
  MoreHorizontal,
  Loader2,
} from "lucide-react";
import { WorkspaceLink as Link } from "@/components/workspace-link";
import { useAuth } from "@/contexts/auth-context";
import { useDeliveriesApi, type Delivery } from "@/hooks/use-deliveries-api";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";

function statusBadgeVariant(
  status: string
): React.ComponentProps<typeof Badge>["variant"] {
  switch (status) {
    case "PENDING":
      return "outline";
    case "IN_TRANSIT":
      return "secondary";
    case "DELIVERED":
      return "default";
    case "CANCELLED":
      return "destructive";
    default:
      return "outline";
  }
}

export default function DeliveriesPage() {
  const { user } = useAuth();
  const { list, dispatch, complete } = useDeliveriesApi();
  const [searchQuery, setSearchQuery] = useState("");
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const canManage = useMemo(() => {
    const role = user?.role;
    return role === "OWNER" || role === "ADMIN" || role === "MANAGER";
  }, [user?.role]);

  async function loadDeliveries() {
    try {
      setLoading(true);
      setError(null);
      const data = await list();
      setDeliveries(data);
    } catch (e: any) {
      setError(e?.message || "Failed to load deliveries");
      toast({
        title: "Error",
        description: e?.message || "Failed to load deliveries",
        variant: "destructive" as any,
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDeliveries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredDeliveries = useMemo(() => {
    if (!searchQuery) return deliveries;
    const q = searchQuery.toLowerCase();
    return deliveries.filter(
      (d) =>
        d.sale.invoiceNumber.toLowerCase().includes(q) ||
        d.sale.customer.name.toLowerCase().includes(q) ||
        d.deliveryAddress.toLowerCase().includes(q)
    );
  }, [deliveries, searchQuery]);

  const pendingCount = deliveries.filter((d) => d.status === "PENDING").length;
  const inTransitCount = deliveries.filter(
    (d) => d.status === "IN_TRANSIT"
  ).length;
  const deliveredCount = deliveries.filter(
    (d) => d.status === "DELIVERED"
  ).length;

  const handleDispatch = async (delivery: Delivery) => {
    try {
      await dispatch(delivery.id);
      toast({
        title: "Delivery dispatched",
        description: `${delivery.sale.invoiceNumber} marked as in transit`,
      });
      await loadDeliveries();
    } catch (e: any) {
      toast({
        title: "Failed to dispatch",
        description: e?.message || "Try again",
        variant: "destructive" as any,
      });
    }
  };

  const handleComplete = async (delivery: Delivery) => {
    try {
      await complete(delivery.id);
      toast({
        title: "Delivery completed",
        description: `${delivery.sale.invoiceNumber} marked as delivered`,
      });
      await loadDeliveries();
    } catch (e: any) {
      toast({
        title: "Failed to complete",
        description: e?.message || "Try again",
        variant: "destructive" as any,
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/sales">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Deliveries</h1>
          <p className="text-sm text-muted-foreground">
            Track and manage order deliveries
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{pendingCount}</div>
            <p className="text-xs text-muted-foreground">Awaiting dispatch</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Transit</CardTitle>
            <Truck className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-warning">
              {inTransitCount}
            </div>
            <p className="text-xs text-muted-foreground">On the way</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Delivered</CardTitle>
            <CheckCircle className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-success">
              {deliveredCount}
            </div>
            <p className="text-xs text-muted-foreground">
              Successfully delivered
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Deliveries</CardTitle>
              <CardDescription>View and track delivery status</CardDescription>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search deliveries..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="text-center py-8 text-sm text-destructive">
              {error}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Delivery Address</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Status</TableHead>
                  {canManage && (
                    <TableHead className="text-right">Actions</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDeliveries.length > 0 ? (
                  filteredDeliveries.map((delivery) => {
                    const itemsCount = delivery.sale.items.reduce(
                      (sum, item) => sum + item.quantity,
                      0
                    );

                    return (
                      <TableRow key={delivery.id}>
                        <TableCell className="font-mono text-xs">
                          <Link
                            href={`/sales/deliveries/${delivery.id}`}
                            className="hover:underline"
                          >
                            {delivery.sale.invoiceNumber}
                          </Link>
                        </TableCell>
                        <TableCell className="font-medium">
                          {delivery.sale.customer.name}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                          {delivery.deliveryAddress}
                        </TableCell>
                        <TableCell>
                          {format(
                            new Date(delivery.sale.saleDate),
                            "MMM dd, yyyy"
                          )}
                        </TableCell>
                        <TableCell>{itemsCount}</TableCell>
                        <TableCell>
                          <Badge variant={statusBadgeVariant(delivery.status)}>
                            {delivery.status.replace("_", " ")}
                          </Badge>
                        </TableCell>
                        {canManage && (
                          <TableCell className="text-right">
                            {delivery.status === "PENDING" ||
                            delivery.status === "IN_TRANSIT" ? (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                  <DropdownMenuSeparator />
                                  {delivery.status === "PENDING" && (
                                    <DropdownMenuItem
                                      onClick={() => handleDispatch(delivery)}
                                    >
                                      Mark as Dispatched
                                    </DropdownMenuItem>
                                  )}
                                  {delivery.status === "IN_TRANSIT" && (
                                    <DropdownMenuItem
                                      onClick={() => handleComplete(delivery)}
                                    >
                                      Mark as Delivered
                                    </DropdownMenuItem>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            ) : null}
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={canManage ? 7 : 6}
                      className="text-center py-8 text-muted-foreground"
                    >
                      No deliveries found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
