import { NextRequest, NextResponse } from "next/server";

const GUEST_PATHS = ["/", "/features", "/pricing", "/about", "/contact", "/login", "/signup", "/forgot-password", "/accept-invitation"];

// Old app routes that existed before workspace prefix migration — redirect to login
const OLD_APP_ROUTES = ["/dashboard", "/sales", "/products", "/purchases", "/expenses", "/inventory", "/people", "/settings", "/suppliers", "/quotations", "/audit-log", "/sales-returns", "/purchase-returns"];

export function middleware(req: NextRequest) {
  try {
    const url = req.nextUrl.clone();
    const path = url.pathname;

    const accept = req.headers.get("accept") || "";
    const isHtml = accept.includes("text/html");
    const isAsset =
      path.startsWith("/_next") ||
      path.startsWith("/api") ||
      path.startsWith("/favicon.ico") ||
      path.startsWith("/static") ||
      /\.[\w.-]+$/.test(path);

    if (!isHtml || isAsset || req.method === "HEAD" || req.method === "OPTIONS") {
      return NextResponse.next();
    }

    const hasCookie = req.cookies.get("omniblox_logged_in")?.value === "1" || 
                      !!req.cookies.get("better-auth.session_token");
    const workspace = req.cookies.get("omniblox_workspace")?.value;

    if (hasCookie) {
      // If workspace cookie is missing, redirect to login so client can re-establish it
      if (!workspace) {
        url.pathname = "/login";
        return NextResponse.redirect(url);
      }

      const isGuestPath = GUEST_PATHS.some((g) => path === g || path.startsWith(g + "/"));
      const firstSegment = path.split("/").filter(Boolean)[0] || "";

      if (isGuestPath || firstSegment !== workspace) {
        url.pathname = `/${workspace}/dashboard`;
        return NextResponse.redirect(url);
      }
    }

    // If no session, redirect old app route bookmarks to login
    if (!hasCookie) {
      const isOldRoute = OLD_APP_ROUTES.some((r) => path === r || path.startsWith(r + "/"));
      if (isOldRoute) {
        url.pathname = "/login";
        return NextResponse.redirect(url);
      }
    }

    return NextResponse.next();
  } catch {
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|_next/webpack-hmr|_next/flight|favicon.ico|robots.txt|sitemap.xml|site.webmanifest|static).*)",
  ],
};
