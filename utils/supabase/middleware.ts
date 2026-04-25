import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabasePublicConfig } from "./env";

export function createClient(request: NextRequest) {
  const { url, publishableKey } = getSupabasePublicConfig();
  let supabaseResponse = NextResponse.next({
    request
  });

  const supabase = createServerClient(
    url,
    publishableKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });

          supabaseResponse = NextResponse.next({
            request
          });

          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options);
          });
        }
      }
    }
  );

  return {
    supabase,
    getResponse() {
      return supabaseResponse;
    }
  };
}

export async function updateSession(request: NextRequest) {
  const { supabase, getResponse } = createClient(request);

  await supabase.auth.getUser();

  return getResponse();
}
