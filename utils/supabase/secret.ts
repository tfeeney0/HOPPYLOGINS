import { createClient as createSupabaseClient } from "@supabase/supabase-js";

function getSupabaseServiceConfig() {
  const supabaseUrl =
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl) {
    throw new Error(
      "Missing SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL environment variable."
    );
  }

  if (!supabaseServiceRoleKey) {
    throw new Error(
      "Missing SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SECRET_KEY environment variable."
    );
  }

  return {
    url: supabaseUrl,
    serviceRoleKey: supabaseServiceRoleKey
  };
}

export function createServiceRoleClient() {
  if (typeof window !== "undefined") {
    throw new Error("createServiceRoleClient can only be used on the server.");
  }

  const { url, serviceRoleKey } = getSupabaseServiceConfig();

  return createSupabaseClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

// Backward-compatible alias for existing imports.
export const createSecretClient = createServiceRoleClient;
