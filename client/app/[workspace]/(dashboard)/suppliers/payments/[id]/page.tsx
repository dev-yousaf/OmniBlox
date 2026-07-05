"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useWorkspace } from "@/hooks/use-workspace";
import { PageLoadingSkeleton } from "@/components/ui/page-loading-skeleton";
import {
  ArrowLeft,
  Edit,
  Trash2,
  DollarSign,
  Calendar,
  CreditCard,
  User,
  FileText,
  CheckCircle,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function PaymentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const ws = useWorkspace();
  const [loading, setLoading] = useState(true);

  // Mock data - replace with actual API call
  const payment = {
    id: params.id as string,
    supplier: "John Electronics Ltd",
    supplierEmail: "contact@johnelectronics.com",
    supplierPhone: "+1 (555) 123-4567",
    date: "2024-01-15",
    amount: 45230.5,
    method: "Bank Transfer",
    status: "completed",
    reference: "TXN123456789",
    bankName: "Chase Bank",
    accountNumber: "**** **** **** 4567",
    description: "Payment for Purchase Order PO-001",
    approvedBy: "John Doe",
    approvedDate: "2024-01-15",
    processedBy: "Finance Department",
    processedDate: "2024-01-15",
    notes: "Payment processed successfully via bank transfer",
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
      case "failed":
        return <Badge variant="destructive">Failed</Badge>;
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
            <h1 className="text-3xl font-bold">Payment {payment.id}</h1>
            <p className="text-muted-foreground">
              Payment to {payment.supplier}
            </p>
          </div>
          {renderStatusBadge(payment.status)}
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <FileText className="mr-2 h-4 w-4" />
            Receipt
          </Button>
          <Button variant="outline">
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </Button>
          <Button variant="destructive">
            <Trash2 className="mr-2 h-4 w-4" />
            Void
          </Button>
        </div>
      </div>

      <Separator />

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Payment Amount
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-500" />
              <span className="text-2xl font-bold">
                ${payment.amount.toLocaleString()}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Payment Date
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-500" />
              <span className="text-lg font-semibold">{payment.date}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Payment Method
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-purple-500" />
              <span className="text-lg font-semibold">{payment.method}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Reference Number
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-orange-500" />
              <span className="text-sm font-mono font-semibold">
                {payment.reference}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Payment Details */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Payment Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Payment ID</p>
                  <p className="font-medium">{payment.id}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <div className="mt-1">
                    {renderStatusBadge(payment.status)}
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Payment Date</p>
                  <p className="font-medium">{payment.date}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Amount</p>
                  <p className="font-semibold text-lg">
                    ${payment.amount.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    Payment Method
                  </p>
                  <p className="font-medium">{payment.method}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    Reference Number
                  </p>
                  <p className="font-mono text-sm font-medium">
                    {payment.reference}
                  </p>
                </div>
              </div>

              <Separator />

              <div>
                <p className="text-sm text-muted-foreground mb-2">
                  Description
                </p>
                <p className="font-medium">{payment.description}</p>
              </div>
            </CardContent>
          </Card>

          {/* Bank Details */}
          <Card>
            <CardHeader>
              <CardTitle>Bank Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Bank Name</p>
                  <p className="font-medium">{payment.bankName}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    Account Number
                  </p>
                  <p className="font-medium">{payment.accountNumber}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Approval & Processing */}
          <Card>
            <CardHeader>
              <CardTitle>Approval & Processing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Approved By</p>
                  <p className="font-medium">{payment.approvedBy}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Approval Date</p>
                  <p className="font-medium">{payment.approvedDate}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Processed By</p>
                  <p className="font-medium">{payment.processedBy}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    Processing Date
                  </p>
                  <p className="font-medium">{payment.processedDate}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          {payment.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Payment Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{payment.notes}</p>
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
                <p className="font-medium">{payment.supplier}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{payment.supplierEmail}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Phone</p>
                <p className="font-medium">{payment.supplierPhone}</p>
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

          {/* Payment Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Payment Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    <div className="w-0.5 h-full bg-gray-200"></div>
                  </div>
                  <div className="pb-4">
                    <p className="font-medium flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      Payment Initiated
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {payment.date}
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    <div className="w-0.5 h-full bg-gray-200"></div>
                  </div>
                  <div className="pb-4">
                    <p className="font-medium flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      Approved
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {payment.approvedDate}
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  </div>
                  <div>
                    <p className="font-medium flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      Completed
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {payment.processedDate}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full justify-start gap-2" variant="outline">
                <FileText className="h-4 w-4" />
                Download Receipt
              </Button>
              <Button className="w-full justify-start gap-2" variant="outline">
                <DollarSign className="h-4 w-4" />
                View Related Orders
              </Button>
              <Button className="w-full justify-start gap-2" variant="outline">
                <User className="h-4 w-4" />
                Contact Supplier
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}



