"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, Check, X } from "lucide-react";
import { motion } from "framer-motion";
import { useRef } from "react";
import { useInView } from "framer-motion";

function FadeIn({
  children,
  delay = 0,
}: {
  children: React.ReactNode;
  delay?: number;
}) {
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

const plans = [
  {
    name: "Starter",
    desc: "Perfect for small businesses getting started with inventory management.",
    price: "$29",
    period: "/month",
    popular: false,
    features: [
      { text: "Up to 500 products", included: true },
      { text: "1 warehouse", included: true },
      { text: "Basic analytics dashboard", included: true },
      { text: "Invoice generation", included: true },
      { text: "Up to 3 team members", included: true },
      { text: "Email support", included: true },
      { text: "Barcode printing", included: false },
      { text: "Multi-warehouse", included: false },
      { text: "Advanced reports", included: false },
      { text: "API access", included: false },
    ],
  },
  {
    name: "Business",
    desc: "For growing businesses that need advanced features and multi-user access.",
    price: "$79",
    period: "/month",
    popular: true,
    features: [
      { text: "Up to 5,000 products", included: true },
      { text: "Up to 3 warehouses", included: true },
      { text: "Advanced analytics", included: true },
      { text: "Invoice & quote generation", included: true },
      { text: "Up to 15 team members", included: true },
      { text: "Priority email & chat support", included: true },
      { text: "Barcode printing", included: true },
      { text: "Multi-warehouse transfers", included: true },
      { text: "Advanced reports", included: false },
      { text: "API access", included: false },
    ],
  },
  {
    name: "Enterprise",
    desc: "For large organizations with complex needs and dedicated support.",
    price: "$199",
    period: "/month",
    popular: false,
    features: [
      { text: "Unlimited products", included: true },
      { text: "Unlimited warehouses", included: true },
      { text: "Real-time analytics", included: true },
      { text: "Full invoicing & quoting", included: true },
      { text: "Unlimited team members", included: true },
      { text: "Dedicated account manager", included: true },
      { text: "Barcode printing", included: true },
      { text: "Multi-warehouse transfers", included: true },
      { text: "Advanced reports & exports", included: true },
      { text: "Full API access", included: true },
    ],
  },
];

const faqs = [
  {
    q: "Can I upgrade or downgrade my plan anytime?",
    a: "Yes. You can change your plan at any time. When upgrading, you'll be charged the prorated difference. When downgrading, the new rate applies at the next billing cycle.",
  },
  {
    q: "Is there a free trial?",
    a: "Yes! All plans come with a 14-day free trial. No credit card required. You can explore all features during your trial.",
  },
  {
    q: "What payment methods do you accept?",
    a: "We accept all major credit cards (Visa, Mastercard, Amex), PayPal, and bank transfers for annual plans.",
  },
  {
    q: "Can I cancel my subscription?",
    a: "Absolutely. You can cancel anytime from your settings. Your data remains accessible until the end of your billing period.",
  },
  {
    q: "Do you offer discounts for annual billing?",
    a: "Yes. Annual plans are billed at 2 months free — you pay for 10 months and get 12 months of service.",
  },
  {
    q: "Is my data secure?",
    a: "Absolutely. We use end-to-end encryption, regular security audits, and SOC2-grade practices. Your data is backed up daily.",
  },
];

export default function PricingPage() {
  return (
    <div>
      {/* Hero */}
      <section className="pt-32 pb-16 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-background" />
        <div className="relative mx-auto max-w-4xl px-6">
          <FadeIn>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
              Simple, Transparent{" "}
              <span className="bg-gradient-to-r from-primary to-chart-4 bg-clip-text text-transparent">
                Pricing
              </span>
            </h1>
          </FadeIn>
          <FadeIn delay={0.1}>
            <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
              Choose the plan that fits your business. All plans include a
              14-day free trial.
            </p>
          </FadeIn>
        </div>
      </section>

      {/* Plans */}
      <section className="pb-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid md:grid-cols-3 gap-8">
            {plans.map((plan, i) => (
              <FadeIn key={plan.name} delay={i * 0.1}>
                <div
                  className={`relative rounded-2xl border bg-card p-8 flex flex-col ${plan.popular ? "border-primary shadow-lg shadow-primary/10 scale-[1.02]" : ""}`}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="inline-flex items-center rounded-full bg-gradient-to-r from-primary to-chart-4 px-4 py-1 text-xs font-semibold text-white">
                        Most Popular
                      </span>
                    </div>
                  )}
                  <div className="mb-8">
                    <h3 className="text-xl font-bold">{plan.name}</h3>
                    <p className="text-sm text-muted-foreground mt-2">
                      {plan.desc}
                    </p>
                    <div className="mt-6 flex items-baseline gap-1">
                      <span className="text-4xl font-bold">{plan.price}</span>
                      <span className="text-muted-foreground">
                        {plan.period}
                      </span>
                    </div>
                  </div>
                  <ul className="space-y-3 flex-1 mb-8">
                    {plan.features.map((f) => (
                      <li
                        key={f.text}
                        className="flex items-start gap-3 text-sm"
                      >
                        {f.included ? (
                          <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                        ) : (
                          <X className="h-4 w-4 text-muted-foreground/40 shrink-0 mt-0.5" />
                        )}
                        <span
                          className={
                            f.included ? "" : "text-muted-foreground/60"
                          }
                        >
                          {f.text}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="w-full h-11 bg-primary text-primary-foreground hover:bg-primary/90"
                    asChild
                  >
                    <Link href="/signup">
                      Start Free Trial
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-24 bg-muted/30">
        <div className="mx-auto max-w-3xl px-6">
          <FadeIn>
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold">
                Frequently Asked Questions
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Everything you need to know about OmniBlox pricing.
              </p>
            </div>
          </FadeIn>
          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <FadeIn key={faq.q} delay={i * 0.05}>
                <details className="group rounded-xl border bg-card p-6 [&_summary::-webkit-details-marker]:hidden">
                  <summary className="flex items-center justify-between cursor-pointer">
                    <h3 className="font-semibold text-sm">{faq.q}</h3>
                    <svg
                      className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </summary>
                  <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
                    {faq.a}
                  </p>
                </details>
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
                  Still Have Questions?
                </h2>
                <p className="text-white/80 text-lg max-w-2xl mx-auto mb-8">
                  Our team is here to help you find the perfect plan for your
                  business.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <Button
                    size="lg"
                    variant="secondary"
                    className="h-12 px-8 text-base shadow-lg"
                    asChild
                  >
                    <Link href="/contact">Contact Sales</Link>
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className="h-12 px-8 text-base bg-white text-primary border-white hover:bg-primary hover:text-white"
                    asChild
                  >
                    <Link href="/signup">Start Free Trial</Link>
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
