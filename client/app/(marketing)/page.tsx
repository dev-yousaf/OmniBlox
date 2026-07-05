"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Package,
  ShoppingCart,
  BarChart3,
  Users,
  Warehouse,
  Shield,
  Zap,
  Globe,
  CheckCircle,
  ArrowRight,
  TrendingUp,
  Clock,
} from "lucide-react";
import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";

function FadeIn({
  children,
  delay = 0,
  direction = "up",
}: {
  children: React.ReactNode;
  delay?: number;
  direction?: "up" | "left" | "right";
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const variants = {
    hidden: {
      opacity: 0,
      y: direction === "up" ? 40 : 0,
      x: direction === "left" ? -40 : direction === "right" ? 40 : 0,
    },
    visible: { opacity: 1, y: 0, x: 0 },
  };
  return (
    <motion.div
      ref={ref}
      variants={variants}
      initial="hidden"
      animate={inView ? "visible" : "hidden"}
      transition={{ duration: 0.6, delay, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}

const features = [
  {
    icon: Package,
    title: "Inventory Management",
    desc: "Real-time stock tracking, barcode scanning, and automated reorder alerts to keep your business running.",
  },
  {
    icon: ShoppingCart,
    title: "Sales & Invoicing",
    desc: "Create quotes, invoices, and process payments with a few clicks. Track every transaction from start to finish.",
  },
  {
    icon: BarChart3,
    title: "Advanced Analytics",
    desc: "Beautiful dashboards with real-time insights into sales, profits, inventory turnover, and business trends.",
  },
  {
    icon: Users,
    title: "Team Management",
    desc: "Role-based access control with granular permissions. Manage your team with OWNER, ADMIN, MANAGER, and STAFF roles.",
  },
  {
    icon: Warehouse,
    title: "Multi-Warehouse",
    desc: "Manage multiple warehouses and transfer stock between locations with full tracking and audit history.",
  },
  {
    icon: Shield,
    title: "Enterprise Security",
    desc: "Audit logging, OTP verification, magic link login, and SOC2-grade encryption to protect your data.",
  },
];

const testimonials = [
  {
    name: "Sarah Chen",
    role: "Operations Director",
    company: "TechFlow Inc.",
    quote:
      "OmniBlox transformed our inventory management. We reduced stockouts by 80% in the first quarter.",
  },
  {
    name: "Marcus Rodriguez",
    role: "CEO",
    company: "DistribuPro",
    quote:
      "The analytics dashboard alone is worth it. We finally have real-time visibility into our entire operation.",
  },
  {
    name: "Emily Watson",
    role: "Supply Chain Manager",
    company: "GlobalTrade Co.",
    quote:
      "Multi-warehouse support is flawless. Stock transfers that used to take hours now happen in minutes.",
  },
];

const stats = [
  { icon: Zap, label: "No Upfront Cost", desc: "Pay as you grow" },
  { icon: Globe, label: "All-in-One", desc: "Inventory, sales, finance" },
  {
    icon: Shield,
    label: "Secure & Reliable",
    desc: "Enterprise-grade security",
  },
  { icon: TrendingUp, label: "Dedicated Support", desc: "We're here to help" },
];

export default function LandingPage() {
  return (
    <div>
      {/* Hero */}
      <section className="relative pt-32 pb-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-background" />
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full bg-primary/5 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-6 text-center">
          <FadeIn>
            <div className="inline-flex items-center gap-2 rounded-full border bg-muted/50 px-4 py-1.5 text-sm text-muted-foreground mb-8">
              <Zap className="h-3.5 w-3.5 text-primary" />
              All-in-one ERP for modern businesses
            </div>
          </FadeIn>
          <FadeIn delay={0.1}>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight max-w-4xl mx-auto leading-[1.1]">
              Complete Business Management{" "}
              <span className="bg-gradient-to-r from-primary via-primary to-chart-4 bg-clip-text text-transparent">
                Made Simple
              </span>
            </h1>
          </FadeIn>
          <FadeIn delay={0.2}>
            <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
              Inventory, sales, purchases, team management, and analytics — all
              in one powerful platform. Stop juggling spreadsheets and start
              growing.
            </p>
          </FadeIn>
          <FadeIn delay={0.3}>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                size="lg"
                className="h-12 px-8 text-base shadow-lg shadow-primary/25"
                asChild
              >
                <Link href="/signup">
                  Start Free Trial
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-12 px-8 text-base"
                asChild
              >
                <Link href="/login">Sign In to Dashboard</Link>
              </Button>
            </div>
          </FadeIn>
          <FadeIn delay={0.4}>
            <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-8 max-w-3xl mx-auto">
              {stats.map((stat) => (
                <div key={stat.label} className="text-center">
                  <stat.icon className="h-5 w-5 mx-auto text-primary mb-2" />
                  <div className="text-sm font-semibold">{stat.label}</div>
                  <div className="text-xs text-muted-foreground">
                    {stat.desc}
                  </div>
                </div>
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 bg-muted/30">
        <div className="mx-auto max-w-7xl px-6">
          <FadeIn>
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold">
                Everything You Need to Run Your Business
              </h2>
              <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
                From inventory to invoicing, OmniBlox brings all your operations
                into one seamless platform.
              </p>
            </div>
          </FadeIn>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <FadeIn key={feature.title} delay={i * 0.1}>
                <div className="group relative rounded-2xl border bg-card p-8 hover:shadow-lg hover:border-primary/20 transition-all duration-300">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.03] to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="relative">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-chart-4/20 text-primary mb-5 group-hover:scale-110 transition-transform">
                      <feature.icon className="h-6 w-6" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {feature.desc}
                    </p>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose */}
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <FadeIn direction="left">
              <div>
                <h2 className="text-3xl md:text-4xl font-bold mb-6">
                  Why Choose{" "}
                  <span className="bg-gradient-to-r from-primary to-chart-4 bg-clip-text text-transparent">
                    OmniBlox
                  </span>
                  ?
                </h2>
                <p className="text-muted-foreground mb-8">
                  We built OmniBlox for growing businesses that need
                  enterprise-grade features without the complexity.
                </p>
                <ul className="space-y-4">
                  {[
                    "All-in-one platform — no more switching between 5 apps",
                    "Real-time sync across all devices and locations",
                    "Role-based access with granular permissions",
                    "99.9% uptime with enterprise-grade security",
                    "Dedicated support team available 24/7",
                    "Regular updates with new features every month",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </FadeIn>
            <FadeIn direction="right">
              <div className="grid grid-cols-2 gap-4">
                {[
                  {
                    icon: Zap,
                    title: "Lightning Fast",
                    desc: "Optimized for speed",
                  },
                  {
                    icon: Globe,
                    title: "Cloud Native",
                    desc: "Access from anywhere",
                  },
                  {
                    icon: Shield,
                    title: "Bank-Grade Security",
                    desc: "Your data is safe",
                  },
                  {
                    icon: TrendingUp,
                    title: "Always Improving",
                    desc: "Weekly updates",
                  },
                ].map((item) => (
                  <div
                    key={item.title}
                    className="rounded-xl border bg-card p-6 text-center hover:border-primary/20 transition-colors"
                  >
                    <item.icon className="h-8 w-8 mx-auto text-primary mb-3" />
                    <h4 className="font-semibold text-sm">{item.title}</h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      {item.desc}
                    </p>
                  </div>
                ))}
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 bg-muted/30">
        <div className="mx-auto max-w-7xl px-6">
          <FadeIn>
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold">
                Trusted by Business Leaders
              </h2>
              <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
                See what our customers have to say about their experience with
                OmniBlox.
              </p>
            </div>
          </FadeIn>
          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <FadeIn key={t.name} delay={i * 0.15}>
                <div className="rounded-2xl border bg-card p-8 h-full flex flex-col">
                  <div className="flex gap-1 mb-4">
                    {[...Array(5)].map((_, j) => (
                      <svg
                        key={j}
                        className="h-4 w-4 fill-primary"
                        viewBox="0 0 20 20"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <p className="text-muted-foreground flex-1">
                    &ldquo;{t.quote}&rdquo;
                  </p>
                  <div className="mt-6 pt-6 border-t">
                    <div className="font-semibold text-sm">{t.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {t.role}, {t.company}
                    </div>
                  </div>
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
                <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                  Ready to Transform Your Business?
                </h2>
                <p className="text-white/80 text-lg max-w-2xl mx-auto mb-8">
                  Join thousands of businesses already using OmniBlox to
                  streamline their operations and drive growth.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <Button
                    size="lg"
                    variant="secondary"
                    className="h-12 px-8 text-base shadow-lg"
                    asChild
                  >
                    <Link href="/signup">
                      Start Free Trial
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className="h-12 px-8 text-base bg-white text-orange-500 border-white hover:bg-orange-500 hover:text-white"
                    asChild
                  >
                    <Link href="/login">Sign In</Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </FadeIn>
      </section>
    </div>
  );
}
