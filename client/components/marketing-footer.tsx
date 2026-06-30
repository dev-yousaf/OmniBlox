import Link from "next/link";
import { Button } from "@/components/ui/button";

const footerLinks = {
  Product: [
    { href: "/features", label: "Features" },
    { href: "/pricing", label: "Pricing" },
    { href: "/about", label: "About" },
    { href: "/contact", label: "Contact" },
  ],
  Resources: [
    { href: "/docs", label: "Documentation" },
    { href: "/blog", label: "Blog" },
    { href: "/guides", label: "Guides" },
    { href: "/support", label: "Support" },
  ],
  Company: [
    { href: "/about", label: "About Us" },
    { href: "/careers", label: "Careers" },
    { href: "/privacy", label: "Privacy Policy" },
    { href: "/terms", label: "Terms of Service" },
  ],
};

export function MarketingFooter() {
  return (
    <footer className="border-t bg-muted/30">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-chart-4 text-white font-bold text-xs">
                N
              </div>
              <span className="text-base font-bold">OmniBlox</span>
            </Link>
            <p className="text-xs text-muted-foreground max-w-xs">
              Complete ERP platform for modern businesses. Streamline inventory, sales, purchases, and team management.
            </p>
          </div>
          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              <h4 className="font-semibold text-xs mb-3 uppercase tracking-wider text-muted-foreground">{title}</h4>
              <ul className="space-y-2">
                {links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-8 pt-6 border-t flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} OmniBlox. All rights reserved.
          </p>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" className="text-xs h-7 px-2" asChild>
              <Link href="/terms">Terms</Link>
            </Button>
            <Button variant="ghost" size="sm" className="text-xs h-7 px-2" asChild>
              <Link href="/privacy">Privacy</Link>
            </Button>
          </div>
        </div>
      </div>
    </footer>
  );
}
