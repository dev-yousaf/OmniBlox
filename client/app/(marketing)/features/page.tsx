"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle, Package, ShoppingCart, BarChart3, Users, Warehouse, Shield, FileText, RotateCcw, Tag, Ruler, Receipt, Building, History, DollarSign } from "lucide-react";
import { motion } from "framer-motion";
import { useRef } from "react";
import { useInView } from "framer-motion";

function FadeIn({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
      transition={{ duration: 0.6, delay, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}

const featureGroups = [
  {
    title: "Inventory Management",
    desc: "Complete control over your stock with real-time tracking and intelligent automation.",
    icon: Package,
    color: "from-blue-500/20 to-blue-600/20 text-blue-600",
    items: [
      "Real-time stock tracking across all warehouses",
      "Barcode and QR code generation & printing",
      "Low stock alerts and automated reorder points",
      "Stock adjustments with audit trail",
      "Expiry date tracking for perishable goods",
      "Bulk import/export via CSV/Excel",
    ],
  },
  {
    title: "Sales & Purchases",
    desc: "End-to-end sales and purchase management from quotation to payment.",
    icon: ShoppingCart,
    color: "from-emerald-500/20 to-emerald-600/20 text-emerald-600",
    items: [
      "Create quotations, sales orders, and invoices",
      "Purchase orders with automated bill tracking",
      "Sales and purchase returns with full history",
      "Multi-currency support for international trade",
      "Payment tracking with due date reminders",
      "Print professional invoices and receipts",
    ],
  },
  {
    title: "Analytics & Reports",
    desc: "Beautiful dashboards and detailed reports to understand your business at a glance.",
    icon: BarChart3,
    color: "from-purple-500/20 to-purple-600/20 text-purple-600",
    items: [
      "Real-time sales and profit dashboards",
      "Top selling products and low stock reports",
      "Expense tracking by category",
      "Customer and supplier analytics",
      "Period comparison (daily, weekly, monthly, yearly)",
      "Export reports to PDF and CSV",
    ],
  },
  {
    title: "Team & Access Control",
    desc: "Granular role-based permissions to keep your data secure.",
    icon: Users,
    color: "from-amber-500/20 to-amber-600/20 text-amber-600",
    items: [
      "Role-based access: OWNER, ADMIN, MANAGER, STAFF",
      "Custom permission sets for each role",
      "Audit logging for every action taken",
      "Biller and user management",
      "Activity history with IP tracking",
      "Secure authentication with OTP and magic links",
    ],
  },
  {
    title: "Multi-Warehouse",
    desc: "Manage multiple locations with seamless stock transfers.",
    icon: Warehouse,
    color: "from-cyan-500/20 to-cyan-600/20 text-cyan-600",
    items: [
      "Unlimited warehouses and storage locations",
      "Stock transfers between warehouses",
      "Warehouse-specific inventory reports",
      "Bin/location tracking within warehouses",
      "Transfer history with full audit trail",
      "Real-time stock levels per warehouse",
    ],
  },
  {
    title: "Security & Compliance",
    desc: "Enterprise-grade security to protect your business data.",
    icon: Shield,
    color: "from-rose-500/20 to-rose-600/20 text-rose-600",
    items: [
      "End-to-end encryption for all data",
      "SOC2-grade security practices",
      "Audit logging with user action history",
      "Two-factor authentication (OTP)",
      "Magic link authentication",
      "GDPR-compliant data handling",
    ],
  },
];

const additionalFeatures = [
  { icon: FileText, title: "Quotations", desc: "Create and manage professional quotes that convert to sales." },
  { icon: RotateCcw, title: "Returns Management", desc: "Handle sales and purchase returns seamlessly." },
  { icon: Tag, title: "Product Categories", desc: "Organize products with categories, brands, and units." },
  { icon: Ruler, title: "Variant Attributes", desc: "Track product variants like size, color, and material." },
  { icon: Receipt, title: "Bills & Expenses", desc: "Track bills and categorize expenses effortlessly." },
  { icon: Building, title: "Supplier Management", desc: "Manage suppliers and purchase history in one place." },
  { icon: DollarSign, title: "Expense Tracking", desc: "Monitor and categorize business expenses." },
  { icon: History, title: "Audit Log", desc: "Complete history of every action in your business." },
];

export default function FeaturesPage() {
  return (
    <div>
      {/* Hero */}
      <section className="pt-32 pb-16 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-background" />
        <div className="relative mx-auto max-w-4xl px-6">
          <FadeIn>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
              Powerful Features for{" "}
              <span className="bg-gradient-to-r from-primary to-chart-4 bg-clip-text text-transparent">Growing Businesses</span>
            </h1>
          </FadeIn>
          <FadeIn delay={0.1}>
            <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
              Everything you need to manage inventory, sales, purchases, team, and finances — all in one integrated platform.
            </p>
          </FadeIn>
        </div>
      </section>

      {/* Feature Groups */}
      <section className="pb-24">
        <div className="mx-auto max-w-7xl px-6 space-y-24">
          {featureGroups.map((group, i) => (
            <FadeIn key={group.title} delay={i * 0.1}>
              <div className={`grid lg:grid-cols-2 gap-12 items-center ${i % 2 === 1 ? "lg:grid-flow-dense" : ""}`}>
                <div className={i % 2 === 1 ? "lg:col-start-2" : ""}>
                  <div className={`inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${group.color} mb-6`}>
                    <group.icon className="h-7 w-7" />
                  </div>
                  <h2 className="text-3xl font-bold mb-4">{group.title}</h2>
                  <p className="text-muted-foreground mb-6 text-lg">{group.desc}</p>
                  <ul className="space-y-3">
                    {group.items.map((item) => (
                      <li key={item} className="flex items-start gap-3">
                        <CheckCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className={`relative ${i % 2 === 1 ? "lg:col-start-1" : ""}`}>
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent rounded-3xl" />
                  <div className="relative rounded-3xl border bg-card p-8">
                    <div className="grid grid-cols-2 gap-4">
                      {[...Array(6)].map((_, j) => (
                        <div key={j} className="h-20 rounded-xl bg-muted/50 animate-pulse" style={{ animationDelay: `${j * 0.1}s`, animationDuration: "2s" }} />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* Additional Features */}
      <section className="py-24 bg-muted/30">
        <div className="mx-auto max-w-7xl px-6">
          <FadeIn>
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold">And So Much More</h2>
              <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
                OmniBlox is packed with features to cover every aspect of your business operations.
              </p>
            </div>
          </FadeIn>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {additionalFeatures.map((f, i) => (
              <FadeIn key={f.title} delay={i * 0.05}>
                <div className="rounded-xl border bg-card p-6 text-center hover:border-primary/20 hover:shadow-md transition-all">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-chart-4/20 text-primary mx-auto mb-4">
                    <f.icon className="h-6 w-6" />
                  </div>
                  <h3 className="font-semibold mb-1">{f.title}</h3>
                  <p className="text-sm text-muted-foreground">{f.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24">
        <FadeIn>
          <div className="mx-auto max-w-4xl px-6 text-center">
            <div className="rounded-3xl bg-gradient-to-br from-primary via-primary to-chart-4 p-12 md:p-16 relative overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent_60%)]" />
              <div className="relative">
                <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Ready to Get Started?</h2>
                <p className="text-white/80 text-lg max-w-2xl mx-auto mb-8">
                  Start your free trial today. No credit card required.
                </p>
                <Button size="lg" variant="secondary" className="h-12 px-8 text-base shadow-lg" asChild>
                  <Link href="/signup">
                    Start Free Trial
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </FadeIn>
      </section>
    </div>
  );
}
