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
import {
  Plus,
  Search,
  Building2,
  MapPin,
  Phone,
  Mail,
  CheckCircle,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  useBillersApi,
  type Biller,
  type BillersStats,
} from "@/hooks/use-billers-api";
import { useToast } from "@/hooks/use-toast";

const statusConfig = {
  ACTIVE: {
    label: "Active",
    className: "bg-emerald-100 text-emerald-700 border-emerald-200",
    icon: CheckCircle,
  },
  INACTIVE: {
    label: "Inactive",
    className: "bg-gray-100 text-gray-700 border-gray-200",
    icon: XCircle,
  },
};

export default function BillersPage() {
  const [billers, setBillers] = useState<Biller[]>([]);
  const [stats, setStats] = useState<BillersStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const { getBillers, getBillersStats } = useBillersApi();
  const { toast } = useToast();

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [billersResponse, statsResponse] = await Promise.all([
          getBillers(),
          getBillersStats(),
        ]);
        // Backend returns array directly when no pagination params
        const billersList = Array.isArray(billersResponse)
          ? billersResponse
          : billersResponse.billers;
        setBillers(billersList);
        setStats(statsResponse);
      } catch (error) {
        console.error("Error loading billers:", error);
        toast({
          title: "Error",
          description: "Failed to load billers. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [getBillers, getBillersStats, toast]);

  const filteredBillers = (billers || []).filter(
    (biller) =>
      biller.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      biller.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (biller.email &&
        biller.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );
  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h1 className="text-3xl font-semibold tracking-tight">Billers</h1>
        <p className="text-sm text-muted-foreground">
          Manage billing entities and branches
        </p>
      </div>

      <div className="flex items-center justify-between">
        <div></div>
        <Link href="/people/billers/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Add Biller
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Billers</CardDescription>
            <CardTitle className="text-3xl">
              {stats?.totalBillers || 0}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Active Locations</CardDescription>
            <CardTitle className="text-3xl text-emerald-600">
              {stats?.activeBillers || 0}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Recently Added</CardDescription>
            <CardTitle className="text-3xl">
              {stats?.recentlyAdded || 0}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>All Billers</CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search billers..."
                className="pl-9 w-[300px]"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">Loading billers...</div>
            </div>
          ) : filteredBillers.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">
                {searchTerm
                  ? "No billers found matching your search"
                  : "No billers found"}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredBillers.map((biller) => {
                const statusInfo = statusConfig[biller.status];
                const StatusIcon = statusInfo.icon;
                return (
                  <Link key={biller.id} href={`/people/billers/${biller.id}`}>
                    <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Building2 className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <div className="font-medium">{biller.name}</div>
                          <div className="text-sm text-muted-foreground mt-1">
                            Code: {biller.code}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="max-w-xs">
                          {biller.address && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <MapPin className="h-3 w-3" />
                              <span className="truncate">{biller.address}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                            {biller.phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {biller.phone}
                              </span>
                            )}
                            {biller.email && (
                              <span className="flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                {biller.email}
                              </span>
                            )}
                          </div>
                        </div>
                        <Badge
                          variant="outline"
                          className={statusInfo.className}
                        >
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {statusInfo.label}
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
