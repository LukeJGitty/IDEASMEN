import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseConfig, isConfigured } from "@/lib/config";

// API routes are refreshed here but answer 401/403 themselves, as JSON.
const protectedPages = ["/dashboard", "/ideas", "/patients", "/consultations", "/tasks", "/handover", "/roster", "/referrals"];

export async function proxy(request: NextRequest) {
  if (!isConfigured()) return NextResponse.next({ request });
  let response = NextResponse.next({ request });
  const { url, key } = getSupabaseConfig();
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(values) {
        values.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        values.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });
  const { data } = await supabase.auth.getClaims();
  const { pathname } = request.nextUrl;
  if (
    protectedPages.some((page) => pathname.startsWith(page)) &&
    !data?.claims.sub
  ) {
    const login = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.getAll().forEach((cookie) => login.cookies.set(cookie));
    login.headers.set("Cache-Control", "private, no-store");
    return login;
  }
  // Never cache a response containing a user's refreshed session cookies.
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
export const config = {
  matcher: [
    "/dashboard/:path*",
    "/ideas/:path*",
    "/patients/:path*",
    "/consultations/:path*",
    "/tasks/:path*",
    "/handover/:path*",
    "/roster/:path*",
    "/referrals/:path*",
    "/api/:path*",
    "/not-authorised",
    "/login",
  ],
};
