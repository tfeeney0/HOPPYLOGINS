import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const DASHBOARD_PATH = "/dashboard";
const LOGIN_PATH = "/login";

function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !publishableKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY."
    );
  }

  return { url, publishableKey };
}

function isDashboardRoute(pathname: string): boolean {
  return pathname === DASHBOARD_PATH || pathname.startsWith(`${DASHBOARD_PATH}/`);
}

function buildLoginRedirectUrl(request: NextRequest): URL {
  const url = request.nextUrl.clone();
  url.pathname = LOGIN_PATH;
  url.searchParams.set("next", request.nextUrl.pathname);
  return url;
}

export async function middleware(request: NextRequest) {
  const { url, publishableKey } = getSupabaseConfig();

  let response = NextResponse.next({
    request
  });

  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });

        response = NextResponse.next({
          request
        });

        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      }
    }
  });

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (isDashboardRoute(request.nextUrl.pathname) && !user) {
    const redirectResponse = NextResponse.redirect(buildLoginRedirectUrl(request));

    response.cookies.getAll().forEach(({ name, value }) => {
      redirectResponse.cookies.set(name, value);
    });

    return redirectResponse;
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|icons/|workbox-|worker-|fallback-|api/inbound|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|txt|xml)$).*)"
  ]
};
