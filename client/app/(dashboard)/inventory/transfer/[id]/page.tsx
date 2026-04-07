"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { PageLoadingSkeleton } from "@/components/ui/page-loading-skeleton";
import {
  ArrowLeft,
  Edit,
  CheckCircle,
  XCircle,
  Clock,
  Package,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function TransferDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  // Mock data - replace with actual API call
  const transfer = {
    id: params.id as string,
    transferNumber: "TRF-2024-001",
    fromWarehouse: "Main Warehouse",
    toWarehouse: "Branch Warehouse A",
    status: "completed",
    transferDate: "2024-01-15",
    expectedArrival: "2024-01-17",
    actualArrival: "2024-01-17",
    initiatedBy: "John Doe",
    approvedBy: "Jane Smith",
    receivedBy: "Mike Johnson",
    notes: "Transfer of high-demand products to branch location",
    items: [
      {
        id: "1",
        sku: "PROD-001",
        name: "Product A",
        quantity: 50,
        unit: "pcs",
        status: "received",
      },
      {
        id: "2",
        sku: "PROD-002",
        name: "Product B",
        quantity: 30,
        unit: "pcs",
        status: "received",
      },
      {
        id: "3",
        sku: "PROD-003",
        name: "Product C",
        quantity: 20,
        unit: "pcs",
        status: "received",
      },
    ],
    timeline: [
      {
        date: "2024-01-15 09:00",
        event: "Transfer initiated",
        user: "John Doe",
      },
      {
        date: "2024-01-15 10:30",
        event: "Transfer approved",
        user: "Jane Smith",
      },
      {
        date: "2024-01-15 14:00",
        event: "Items packed and shipped",
        user: "John Doe",
      },
      {
        date: "2024-01-17 11:00",
        event: "Items received",
        user: "Mike Johnson",
      },
    ],
  };

  useEffect(() => {
    setTimeout(() => setLoading(false), 300);
  }, [params.id]);

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <Badge variant="default" className="bg-green-500">
            <CheckCircle className="mr-1 h-3 w-3" />
            Completed
          </Badge>
        );
      case "pending":
        return (
          <Badge
            variant="outline"
            className="bg-yellow-50 text-yellow-700 border-yellow-300"
          >
            <Clock className="mr-1 h-3 w-3" />
            Pending
          </Badge>
        );
      case "in-transit":
        return (
          <Badge
            variant="outline"
            className="bg-blue-50 text-blue-700 border-blue-300"
          >
            <Package className="mr-1 h-3 w-3" />
            In Transit
          </Badge>
        );
      case "cancelled":
        return (
          <Badge variant="destructive">
            <XCircle className="mr-1 h-3 w-3" />
            Cancelled
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return <PageLoadingSkeleton />;
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
              <Package className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">{transfer.transferNumber}</h1>
              <p className="text-muted-foreground">
                {transfer.fromWarehouse} → {transfer.toWarehouse}
              </p>
            </div>
          </div>
          {renderStatusBadge(transfer.status)}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => window.print()}>
            Print
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              router.push(`/inventory/transfer/${transfer.id}/edit`)
            }
          >
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </Button>
        </div>
      </div>

      <Separator />

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-blue-500" />
              <span className="text-2xl font-bold">
                {transfer.items.length}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Quantity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold">
              {transfer.items.reduce((sum, item) => sum + item.quantity, 0)}
            </span>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Transfer Date
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-lg font-semibold">
              {transfer.transferDate}
            </span>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Expected Arrival
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-lg font-semibold">
              {transfer.expectedArrival}
            </span>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="info" className="space-y-4">
        <TabsList>
          <TabsTrigger value="info">Information</TabsTrigger>
          <TabsTrigger value="items">Items</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
        </TabsList>

        {/* Information Tab */}
        <TabsContent value="info" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Transfer Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Transfer Number
                  </p>
                  <p className="font-semibold">{transfer.transferNumber}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  {renderStatusBadge(transfer.status)}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    From Warehouse
                  </p>
                  <p className="font-semibold">{transfer.fromWarehouse}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">To Warehouse</p>
                  <p className="font-semibold">{transfer.toWarehouse}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Transfer Date</p>
                  <p className="font-semibold">{transfer.transferDate}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    Actual Arrival
                  </p>
                  <p className="font-semibold">{transfer.actualArrival}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Personnel</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Initiated By</p>
                  <p className="font-semibold">{transfer.initiatedBy}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Approved By</p>
                  <p className="font-semibold">{transfer.approvedBy}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Received By</p>
                  <p className="font-semibold">{transfer.receivedBy}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{transfer.notes}</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Items Tab */}
        <TabsContent value="items" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Transfer Items</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SKU</TableHead>
                    <TableHead>Product Name</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transfer.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono">{item.sku}</TableCell>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell className="text-right font-semibold">
                        {item.quantity}
                      </TableCell>
                      <TableCell>{item.unit}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className="bg-green-50 text-green-700 border-green-300"
                        >
                          {item.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Timeline Tab */}
        <TabsContent value="timeline" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Transfer Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {transfer.timeline.map((event, index) => (
                  <div key={index} className="flex gap-4">
                    <div className="w-2 h-2 rounded-full bg-primary mt-2"></div>
                    <div className="flex-1">
                      <p className="font-semibold">{event.event}</p>
                      <p className="text-sm text-muted-foreground">
                        {event.date}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        By: {event.user}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}



