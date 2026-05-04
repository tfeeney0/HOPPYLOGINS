"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createServerClient } from "@/utils/supabase/server";

const DASHBOARD_PATH = "/dashboard";
const ADMIN_DASHBOARD_PATH = "/dashboard/admin";
const LOGIN_PATH = "/login";

export async function signOut(): Promise<void> {
  let redirectPath = LOGIN_PATH;

  try {
    const supabase = await createServerClient();
    const { error } = await supabase.auth.signOut();

    if (error) {
      redirectPath = `${LOGIN_PATH}?error=${encodeURIComponent("Could not sign out")}`;
    }
  } catch {
    redirectPath = `${LOGIN_PATH}?error=${encodeURIComponent("Could not sign out")}`;
  }

  revalidatePath(DASHBOARD_PATH);
  revalidatePath(ADMIN_DASHBOARD_PATH);
  revalidatePath(LOGIN_PATH);
  redirect(redirectPath);
}
