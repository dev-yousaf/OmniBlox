import { NextRequest, NextResponse } from "next/server";

const GUEST_PATHS = ["/", "/features", "/pricing", "/about", "/contact", "/login", "/signup", "/forgot-password"];

export function middleware(req: NextRequest) {
  try {
    const url = req.nextUrl.clone();
    const path = url.pathname;

    // Skip non-HTML requests and all framework/static assets to avoid interfering with HMR and static files
    const accept = req.headers.get("accept") || "";
    const isHtml = accept.includes("text/html");
    const isAsset =
      path.startsWith("/_next") ||
      path.startsWith("/api") ||
      path.startsWith("/favicon.ico") ||
      path.startsWith("/static") ||
      /\.[\w.-]+$/.test(path); // any file with extension (css/js/png/etc)

    if (
      !isHtml ||
      isAsset ||
      req.method === "HEAD" ||
      req.method === "OPTIONS"
    ) {
      return NextResponse.next();
    }

    const hasCookie = req.cookies.get("omniblox_logged_in")?.value === "1";

    if (hasCookie) {
      // If user appears logged in and is trying to access guest route, redirect to dashboard
      for (const guest of GUEST_PATHS) {
        if (path === guest || path.startsWith(guest + "/")) {
          url.pathname = "/dashboard";
          return NextResponse.redirect(url);
        }
      }
    }

    return NextResponse.next();
  } catch (err) {
    // On error, don't block the request
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    "/",
    "/login",
    "/signup",
    "/forgot-password",
    // Exclude all Next.js internals and static assets explicitly
    "/((?!api|_next/static|_next/image|_next/webpack-hmr|_next/flight|favicon.ico|robots.txt|sitemap.xml|site.webmanifest|static).*)",
  ],
};
