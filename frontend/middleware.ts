import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

// Routes that require authentication
const AUTH_REQUIRED_PATHS = ["/search", "/billing", "/settings"];

const intlMiddleware = createMiddleware({
  locales: ["ja", "en"],
  defaultLocale: "ja",
});

export async function middleware(request: NextRequest): Promise<NextResponse> {
  // Run next-intl locale routing first
  const intlResponse = intlMiddleware(request);

  // Determine the pathname without locale prefix
  const { pathname } = request.nextUrl;
  const locale = pathname.split("/")[1] || "ja";
  const pathWithoutLocale = pathname.replace(/^\/(ja|en)/, "") || "/";

  // Check if route requires authentication
  const requiresAuth = AUTH_REQUIRED_PATHS.some(
    (p) => pathWithoutLocale === p || pathWithoutLocale.startsWith(p + "/")
  );

  if (requiresAuth) {
    // Create a Supabase server client to check session
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    const response = intlResponse || NextResponse.next();

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    });

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      const loginUrl = new URL(`/${locale}/login`, request.url);
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return intlResponse || NextResponse.next();
}

export const config = {
  // Match all paths except Next.js internals and static files
  matcher: ["/((?!_next|_vercel|.*\\..*).*)"],
};
