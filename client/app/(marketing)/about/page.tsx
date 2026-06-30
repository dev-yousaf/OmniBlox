"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, Rocket, Target, Heart, Users, Globe, Zap, Award } from "lucide-react";
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

const values = [
  { icon: Rocket, title: "Innovation", desc: "We constantly push boundaries to build tools that make business operations effortless." },
  { icon: Target, title: "Reliability", desc: "Our platform is built for 99.9% uptime. Your business never stops with OmniBlox." },
  { icon: Heart, title: "Customer First", desc: "Every feature we build starts with understanding what our customers truly need." },
  { icon: Users, title: "Community", desc: "We're building more than software — we're building a community of thriving businesses." },
];

const timeline = [
  { year: "2023", event: "OmniBlox was founded with a mission to simplify business management for small and medium enterprises." },
  { year: "2023 Q3", event: "Launched beta version with core inventory management and basic sales tracking." },
  { year: "2024 Q1", event: "Released v1.0 with full sales, purchases, and invoicing capabilities." },
  { year: "2024 Q3", event: "Added multi-warehouse support, advanced analytics, and role-based access control." },
  { year: "2025 Q1", event: "Reached 5,000 active businesses. Introduced API access and integrations." },
  { year: "2025 Q3", event: "Launched expense management, audit logging, and enterprise-grade security features." },
  { year: "2026", event: "10,000+ businesses trust OmniBlox. Continuous improvements with monthly feature releases." },
];

const team = [
  { name: "Alex Mercer", role: "CEO & Co-Founder", initials: "AM" },
  { name: "Jordan Lee", role: "CTO & Co-Founder", initials: "JL" },
  { name: "Priya Sharma", role: "Head of Product", initials: "PS" },
  { name: "Marcus Webb", role: "Head of Engineering", initials: "MW" },
  { name: "Sarah Kim", role: "Head of Design", initials: "SK" },
  { name: "David Chen", role: "Head of Customer Success", initials: "DC" },
];

export default function AboutPage() {
  return (
    <div>
      {/* Hero */}
      <section className="pt-32 pb-24 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-background" />
        <div className="relative mx-auto max-w-4xl px-6">
          <FadeIn>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
              Our Mission: Empower Every Business to{" "}
              <span className="bg-gradient-to-r from-primary to-chart-4 bg-clip-text text-transparent">Thrive</span>
            </h1>
          </FadeIn>
          <FadeIn delay={0.1}>
            <p className="mt-6 text-lg text-muted-foreground max-w-3xl mx-auto">
              We believe that every business deserves enterprise-grade tools. OmniBlox was built to democratize access to powerful business management software — no complex setups, no hidden costs, just simple tools that work.
            </p>
          </FadeIn>
        </div>
      </section>

      {/* Story */}
      <section className="pb-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <FadeIn>
              <div>
                <h2 className="text-3xl font-bold mb-6">Our Story</h2>
                <div className="space-y-4 text-muted-foreground">
                  <p>
                    OmniBlox started in 2023 when our founders, Alex and Jordan, realized that most small businesses were still managing operations with spreadsheets, sticky notes, and a dozen different apps that didn&apos;t talk to each other.
                  </p>
                  <p>
                    Having built enterprise systems for Fortune 500 companies, they knew what great business software looked like. They also knew that most SMEs couldn&apos;t afford those solutions. So they set out to build something different.
                  </p>
                  <p>
                    Today, OmniBlox is used by businesses worldwide who need a better way to manage operations. We&apos;re proud to help companies of all sizes streamline processes, reduce costs, and focus on what matters most — growing their business.
                  </p>
                </div>
              </div>
            </FadeIn>
            <FadeIn delay={0.1}>
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent rounded-3xl" />
                <div className="relative rounded-3xl border bg-card p-8">
                  <h3 className="text-xl font-bold mb-2">Built with Purpose</h3>
                  <p className="text-sm text-muted-foreground mb-6">Every feature we build solves a real problem.</p>
                  <div className="space-y-4">
                    {[
                      { title: "Start Simple", desc: "No bloated features you'll never use. Just the tools you actually need." },
                      { title: "Grow Scalably", desc: "From 10 products to 10,000 — our platform grows with your business." },
                      { title: "Stay Secure", desc: "Enterprise-grade security built in from day one, not bolted on later." },
                      { title: "Get Support", desc: "Real humans who know the product and care about your success." },
                    ].map((item) => (
                      <div key={item.title} className="flex items-start gap-3">
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary shrink-0 mt-0.5">
                          <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg>
                        </div>
                        <div>
                          <div className="font-semibold text-sm">{item.title}</div>
                          <div className="text-sm text-muted-foreground">{item.desc}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-24 bg-muted/30">
        <div className="mx-auto max-w-7xl px-6">
          <FadeIn>
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold">What We Stand For</h2>
              <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
                Our values guide every decision we make and every feature we build.
              </p>
            </div>
          </FadeIn>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((v, i) => (
              <FadeIn key={v.title} delay={i * 0.1}>
                <div className="rounded-xl border bg-card p-8 text-center hover:border-primary/20 transition-colors">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-chart-4/20 text-primary mx-auto mb-5">
                    <v.icon className="h-7 w-7" />
                  </div>
                  <h3 className="font-semibold mb-2">{v.title}</h3>
                  <p className="text-sm text-muted-foreground">{v.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="py-24">
        <div className="mx-auto max-w-3xl px-6">
          <FadeIn>
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold">Our Journey</h2>
              <p className="mt-4 text-lg text-muted-foreground">Key milestones in the OmniBlox story.</p>
            </div>
          </FadeIn>
          <div className="relative">
            <div className="absolute left-8 top-0 bottom-0 w-px bg-border" />
            <div className="space-y-12">
              {timeline.map((t, i) => (
                <FadeIn key={t.year} delay={i * 0.05}>
                  <div className="relative pl-20">
                    <div className="absolute left-4 top-1 flex h-9 w-9 items-center justify-center rounded-full border-2 border-primary bg-background text-xs font-bold text-primary">
                      {i + 1}
                    </div>
                    <div>
                      <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                        {t.year}
                      </span>
                      <p className="mt-3 text-muted-foreground">{t.event}</p>
                    </div>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="py-24 bg-muted/30">
        <div className="mx-auto max-w-7xl px-6">
          <FadeIn>
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold">Meet the Team</h2>
              <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
                We&apos;re a passionate team dedicated to building the best business management platform.
              </p>
            </div>
          </FadeIn>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {team.map((t, i) => (
              <FadeIn key={t.name} delay={i * 0.05}>
                <div className="rounded-xl border bg-card p-6 text-center hover:border-primary/20 transition-colors">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-chart-4/20 text-primary font-bold text-lg mx-auto mb-4">
                    {t.initials}
                  </div>
                  <h3 className="font-semibold">{t.name}</h3>
                  <p className="text-sm text-muted-foreground">{t.role}</p>
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
                <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Join Us on This Journey</h2>
                <p className="text-white/80 text-lg max-w-2xl mx-auto mb-8">
                  Start your free trial today and see why thousands of businesses trust OmniBlox.
                </p>
                <Button size="lg" variant="secondary" className="h-12 px-8 text-base shadow-lg" asChild>
                  <Link href="/signup">
                    Get Started Free
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
