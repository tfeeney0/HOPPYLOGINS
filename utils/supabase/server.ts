import { createServerClient as createSupabaseServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

type SupabaseServerConfig = {
  url: string;
  publishableKey: string;
};

function getServerConfig(): SupabaseServerConfig {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !publishableKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY."
    );
  }

  return { url, publishableKey };
}

export async function createServerClient() {
  const cookieStore = await cookies();
  const { url, publishableKey } = getServerConfig();

  return createSupabaseServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Components cannot mutate cookies reliably.
          // Session refresh is handled in middleware.
        }
      }
    }
  });
}

// Backward-compatible alias for older imports in the codebase.
export const createClient = createServerClient;
