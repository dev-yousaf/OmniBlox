"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Building2,
  Globe,
  DollarSign,
  Package,
  Database,
  Loader2,
} from "lucide-react";
import { useSettings } from "@/contexts/settings-context";
import { useAuth } from "@/contexts/auth-context";
import { useWarehouses } from "@/hooks/use-warehouses";
import { usePermissions } from "@/hooks/use-permissions";
import { useToast } from "@/hooks/use-toast";
import { formatMoney } from "@/lib/money";
import { api } from "@/lib/api";

export default function SettingsPage() {
  const { settings, loading, updateSettings } = useSettings();
  const { user, refreshUser } = useAuth();
  const { warehouses } = useWarehouses();
  const { canEdit, isOwner, isAdmin } = usePermissions();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [savingCompany, setSavingCompany] = useState(false);

  const [companyName, setCompanyName] = useState("");
  const [companyIndustry, setCompanyIndustry] = useState("");
  const [companyCountry, setCompanyCountry] = useState("");
  const [companyWorkspace, setCompanyWorkspace] = useState("");

  const [timezone, setTimezone] = useState("utc");
  const [language, setLanguage] = useState("en");
  const [dateFormat, setDateFormat] = useState("mdy");
  const [timeFormat, setTimeFormat] = useState("12");

  const [currencyCode, setCurrencyCode] = useState("usd");
  const [currencySymbol, setCurrencySymbol] = useState("$");
  const [decimalPlaces, setDecimalPlaces] = useState("2");

  const [lowStockThreshold, setLowStockThreshold] = useState("10");
  const [lowStockAlerts, setLowStockAlerts] = useState(true);
  const [defaultWarehouseId, setDefaultWarehouseId] = useState("none");

  const [autoBackup, setAutoBackup] = useState(true);
  const [backupTime, setBackupTime] = useState("02:00");
  const [dataRetention, setDataRetention] = useState("1year");

  useEffect(() => {
    if (!settings) return;
    setTimezone(settings.timezone);
    setLanguage(settings.language);
    setDateFormat(settings.dateFormat);
    setTimeFormat(settings.timeFormat);
    setCurrencyCode(settings.currencyCode);
    setCurrencySymbol(settings.currencySymbol);
    setDecimalPlaces(String(settings.decimalPlaces));
    setLowStockThreshold(String(settings.lowStockThreshold));
    setLowStockAlerts(settings.lowStockAlerts);
    setDefaultWarehouseId(settings.defaultWarehouseId ?? "none");
    setAutoBackup(settings.autoBackup);
    setBackupTime(settings.backupTime);
    setDataRetention(settings.dataRetention);
  }, [settings]);

  useEffect(() => {
    if (!user?.company) return;
    setCompanyName(user.company.name ?? "");
    setCompanyIndustry(user.company.industry ?? "");
    setCompanyCountry(user.company.country ?? "");
    setCompanyWorkspace(user.company.workspaceUrl ?? "");
  }, [user]);

  const saveTab = useCallback(
    async (payload: any, message: string) => {
      if (!canEdit) {
        toast({
          title: "Permission denied",
          description: "Only managers and above can update settings.",
          variant: "destructive",
        });
        return;
      }
      setSaving(true);
      try {
        await updateSettings(payload);
        toast({ title: message });
      } catch (error: any) {
        toast({
          title: "Failed to save",
          description: error?.message ?? "Something went wrong",
          variant: "destructive",
        });
      } finally {
        setSaving(false);
      }
    },
    [canEdit, updateSettings, toast]
  );

  const saveCompany = async () => {
    if (!isOwner && !isAdmin) {
      toast({
        title: "Permission denied",
        description: "Only owners and admins can update company details.",
        variant: "destructive",
      });
      return;
    }
    setSavingCompany(true);
    try {
      await api.put("/auth/company", {
        name: companyName,
        industry: companyIndustry,
        country: companyCountry,
      });
      await refreshUser({ silent: true });
      toast({ title: "Company details updated" });
    } catch (error: any) {
      toast({
        title: "Failed to save",
        description: error?.message ?? "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setSavingCompany(false);
    }
  };

  const clearLocalData = () => {
    localStorage.clear();
    window.location.reload();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage system configuration and preferences
        </p>
      </div>

      <Tabs defaultValue="company" className="space-y-6">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="company">Company</TabsTrigger>
          <TabsTrigger value="regional">Regional</TabsTrigger>
          <TabsTrigger value="currencies">Currencies</TabsTrigger>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
        </TabsList>

        <TabsContent value="company" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                <CardTitle>Company Information</CardTitle>
              </div>
              <CardDescription>
                Update your company details. These sync across the whole
                workspace.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="company-name">Company Name</Label>
                  <Input
                    id="company-name"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company-workspace">Workspace URL</Label>
                  <Input
                    id="company-workspace"
                    value={companyWorkspace}
                    readOnly
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground">
                    Workspace URL cannot be changed
                  </p>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="company-industry">Industry</Label>
                  <Select
                    value={companyIndustry}
                    onValueChange={setCompanyIndustry}
                  >
                    <SelectTrigger id="company-industry">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="retail">Retail</SelectItem>
                      <SelectItem value="hardware">Hardware</SelectItem>
                      <SelectItem value="technology">Technology</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company-country">Country</Label>
                  <Select value={companyCountry} onValueChange={setCompanyCountry}>
                    <SelectTrigger id="company-country">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="us">United States</SelectItem>
                      <SelectItem value="ca">Canada</SelectItem>
                      <SelectItem value="gb">United Kingdom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={saveCompany} disabled={savingCompany}>
                {savingCompany && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Save Changes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="regional" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                <CardTitle>Regional Settings</CardTitle>
              </div>
              <CardDescription>
                Configure timezone, language, and date formats
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select value={timezone} onValueChange={setTimezone}>
                    <SelectTrigger id="timezone">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="utc">UTC</SelectItem>
                      <SelectItem value="est">Eastern Time (EST)</SelectItem>
                      <SelectItem value="cst">Central Time (CST)</SelectItem>
                      <SelectItem value="pst">Pacific Time (PST)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="language">Language</Label>
                  <Select value={language} onValueChange={setLanguage}>
                    <SelectTrigger id="language">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="es">Spanish</SelectItem>
                      <SelectItem value="fr">French</SelectItem>
                      <SelectItem value="de">German</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="date-format">Date Format</Label>
                  <Select value={dateFormat} onValueChange={setDateFormat}>
                    <SelectTrigger id="date-format">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mdy">MM/DD/YYYY</SelectItem>
                      <SelectItem value="dmy">DD/MM/YYYY</SelectItem>
                      <SelectItem value="ymd">YYYY-MM-DD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="time-format">Time Format</Label>
                  <Select value={timeFormat} onValueChange={setTimeFormat}>
                    <SelectTrigger id="time-format">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="12">12 Hour</SelectItem>
                      <SelectItem value="24">24 Hour</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button
                onClick={() =>
                  saveTab(
                    {
                      timezone,
                      language,
                      dateFormat,
                      timeFormat,
                    },
                    "Regional settings saved"
                  )
                }
                disabled={saving || !canEdit}
              >
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="currencies" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                <CardTitle>Currency Settings</CardTitle>
              </div>
              <CardDescription>
                The base currency is used across the entire workspace — sales,
                purchases, expenses, and reports
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="base-currency">Base Currency</Label>
                  <Select value={currencyCode} onValueChange={setCurrencyCode}>
                    <SelectTrigger id="base-currency">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="usd">USD - US Dollar</SelectItem>
                      <SelectItem value="eur">EUR - Euro</SelectItem>
                      <SelectItem value="gbp">GBP - British Pound</SelectItem>
                      <SelectItem value="jpy">JPY - Japanese Yen</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currency-symbol">Currency Symbol</Label>
                  <Input
                    id="currency-symbol"
                    value={currencySymbol}
                    onChange={(e) => setCurrencySymbol(e.target.value)}
                    maxLength={4}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Decimal Places</Label>
                <Select value={decimalPlaces} onValueChange={setDecimalPlaces}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">0</SelectItem>
                    <SelectItem value="2">2</SelectItem>
                    <SelectItem value="3">3</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="rounded-md border p-4 text-sm">
                <span className="font-medium">Preview: </span>
                <span className="tabular-nums">{formatMoney(1234567.891)}</span>
              </div>
              <Button
                onClick={() =>
                  saveTab(
                    {
                      currencyCode,
                      currencySymbol,
                      decimalPlaces: Number(decimalPlaces),
                    },
                    "Currency settings saved"
                  )
                }
                disabled={saving || !canEdit}
              >
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inventory" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                <CardTitle>Inventory Settings</CardTitle>
              </div>
              <CardDescription>
                Configure inventory and stock management
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="low-stock-threshold">
                  Low Stock Threshold
                </Label>
                <Input
                  id="low-stock-threshold"
                  type="number"
                  min={0}
                  value={lowStockThreshold}
                  onChange={(e) => setLowStockThreshold(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Products at or below this quantity count as low stock
                </p>
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Low Stock Alerts</Label>
                  <p className="text-sm text-muted-foreground">
                    Show alerts when stock is low
                  </p>
                </div>
                <Switch
                  checked={lowStockAlerts}
                  onCheckedChange={setLowStockAlerts}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="default-warehouse">Default Warehouse</Label>
                <Select
                  value={defaultWarehouseId}
                  onValueChange={setDefaultWarehouseId}
                >
                  <SelectTrigger id="default-warehouse">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {warehouses.map((w) => (
                      <SelectItem key={w.id} value={w.id}>
                        {w.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  New products receive initial stock in this warehouse
                </p>
              </div>
              <Button
                onClick={() =>
                  saveTab(
                    {
                      lowStockThreshold: Number(lowStockThreshold),
                      lowStockAlerts,
                      defaultWarehouseId:
                        defaultWarehouseId === "none"
                          ? null
                          : defaultWarehouseId,
                    },
                    "Inventory settings saved"
                  )
                }
                disabled={saving || !canEdit}
              >
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                <CardTitle>System Settings</CardTitle>
              </div>
              <CardDescription>
                Configure system preferences and maintenance
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Automatic Backups</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically backup data daily
                  </p>
                </div>
                <Switch checked={autoBackup} onCheckedChange={setAutoBackup} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="backup-time">Backup Time</Label>
                <Input
                  id="backup-time"
                  type="time"
                  value={backupTime}
                  onChange={(e) => setBackupTime(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Data Retention</Label>
                <Select
                  value={dataRetention}
                  onValueChange={setDataRetention}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="6months">6 Months</SelectItem>
                    <SelectItem value="1year">1 Year</SelectItem>
                    <SelectItem value="2years">2 Years</SelectItem>
                    <SelectItem value="forever">Forever</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={() =>
                  saveTab(
                    {
                      autoBackup,
                      backupTime,
                      dataRetention,
                    },
                    "System settings saved"
                  )
                }
                disabled={saving || !canEdit}
              >
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
              <div className="pt-4 border-t">
                <Button variant="destructive" onClick={clearLocalData}>
                  Clear All Local Data
                </Button>
                <p className="text-sm text-muted-foreground mt-2">
                  This will remove all locally stored data. This action cannot
                  be undone.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
