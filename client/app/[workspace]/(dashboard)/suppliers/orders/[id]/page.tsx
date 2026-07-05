"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useWorkspace } from "@/hooks/use-workspace";
import { PageLoadingSkeleton } from "@/components/ui/page-loading-skeleton";
import {
  ArrowLeft,
  Edit,
  Trash2,
  Package,
  Calendar,
  DollarSign,
  User,
  FileText,
  Truck,
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

export default function PurchaseOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const ws = useWorkspace();
  const [loading, setLoading] = useState(true);

  // Mock data - replace with actual API call
  const order = {
    id: params.id as string,
    supplier: "John Electronics Ltd",
    supplierEmail: "contact@johnelectronics.com",
    supplierPhone: "+1 (555) 123-4567",
    date: "2024-01-15",
    expectedDelivery: "2024-01-22",
    amount: 45230.5,
    status: "completed",
    items: [
      {
        id: 1,
        name: "Laptop Computer",
        sku: "LAP-001",
        quantity: 5,
        unitPrice: 1200.0,
        total: 6000.0,
      },
      {
        id: 2,
        name: "Wireless Mouse",
        sku: "MOU-001",
        quantity: 20,
        unitPrice: 25.0,
        total: 500.0,
      },
      {
        id: 3,
        name: "USB-C Cable",
        sku: "CAB-001",
        quantity: 50,
        unitPrice: 12.0,
        total: 600.0,
      },
      {
        id: 4,
        name: "External Hard Drive",
        sku: "HDD-001",
        quantity: 10,
        unitPrice: 150.0,
        total: 1500.0,
      },
    ],
    subtotal: 8600.0,
    tax: 860.0,
    shipping: 50.0,
    total: 9510.0,
    notes: "Urgent order - please expedite shipping",
  };

  useEffect(() => {
    // Simulate loading
    setTimeout(() => setLoading(false), 300);
  }, [params.id]);

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <Badge variant="default" className="bg-green-500">
            Completed
          </Badge>
        );
      case "pending":
        return <Badge variant="secondary">Pending</Badge>;
      case "cancelled":
        return <Badge variant="destructive">Cancelled</Badge>;
      case "processing":
        return (
          <Badge
            variant="outline"
            className="bg-blue-50 text-blue-700 border-blue-300"
          >
            Processing
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Purchase Order {order.id}</h1>
            <p className="text-muted-foreground">Order from {order.supplier}</p>
          </div>
          {renderStatusBadge(order.status)}
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </Button>
          <Button variant="outline">
            <FileText className="mr-2 h-4 w-4" />
            Print
          </Button>
          <Button variant="destructive">
            <Trash2 className="mr-2 h-4 w-4" />
            Cancel Order
          </Button>
        </div>
      </div>

      <Separator />

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Order Date
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-500" />
              <span className="text-lg font-semibold">{order.date}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Expected Delivery
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-orange-500" />
              <span className="text-lg font-semibold">
                {order.expectedDelivery}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-purple-500" />
              <span className="text-2xl font-bold">{order.items.length}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Amount
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-500" />
              <span className="text-2xl font-bold">
                ${order.total.toLocaleString()}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Order Items */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Order Items</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead className="text-right">Unit Price</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {item.sku}
                      </TableCell>
                      <TableCell className="text-right">
                        {item.quantity}
                      </TableCell>
                      <TableCell className="text-right">
                        ${item.unitPrice.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        ${item.total.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <Separator className="my-4" />

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium">
                    ${order.subtotal.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tax (10%)</span>
                  <span className="font-medium">${order.tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Shipping</span>
                  <span className="font-medium">
                    ${order.shipping.toFixed(2)}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="font-semibold">Total</span>
                  <span className="text-xl font-bold">
                    ${order.total.toFixed(2)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          {order.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Order Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{order.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Supplier Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Supplier Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Company Name</p>
                <p className="font-medium">{order.supplier}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{order.supplierEmail}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Phone</p>
                <p className="font-medium">{order.supplierPhone}</p>
              </div>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => router.push(`/${ws}/suppliers`)}
              >
                View Supplier Details
              </Button>
            </CardContent>
          </Card>

          {/* Order Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Order Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    <div className="w-0.5 h-full bg-gray-200"></div>
                  </div>
                  <div className="pb-4">
                    <p className="font-medium">Order Placed</p>
                    <p className="text-sm text-muted-foreground">
                      {order.date}
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    <div className="w-0.5 h-full bg-gray-200"></div>
                  </div>
                  <div className="pb-4">
                    <p className="font-medium">Processing</p>
                    <p className="text-sm text-muted-foreground">
                      {order.date}
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="w-2 h-2 rounded-full bg-gray-300"></div>
                  </div>
                  <div>
                    <p className="font-medium text-muted-foreground">
                      Delivery Expected
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {order.expectedDelivery}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}



