"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@/utils/supabase/server";

const ADMIN_ROLE = "admin";
const ADMIN_DASHBOARD_PATH = "/dashboard/admin";
const MIN_PASSWORD_LENGTH = 8;
const MAX_PREFIX_LENGTH = 120;

type ProfileRow = {
  id: string;
  role: string | null;
};

type AccessRuleRow = {
  id: number;
  user_id: string;
  recipient_prefix: string;
  expires_at: string | null;
  is_active: boolean;
};

type AccessRuleLookupRow = {
  id: number;
};

type AdminSupabaseClient = Awaited<ReturnType<typeof createServerClient>>;

export type AdminActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

class AuthorizationError extends Error {
  constructor(message = "You do not have permission to perform this action.") {
    super(message);
    this.name = "AuthorizationError";
  }
}

function normalizeFormValue(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeRequiredText(value: string, fieldName: string): string {
  const normalized = value.trim();

  if (!normalized) {
    throw new Error(`${fieldName} is required.`);
  }

  return normalized;
}

function normalizeRuleId(ruleId: string): number {
  const normalized = normalizeRequiredText(ruleId, "rule_id");
  const parsed = Number.parseInt(normalized, 10);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error("rule_id is invalid.");
  }

  return parsed;
}

function normalizePrefix(prefix: string): string {
  const normalized = normalizeRequiredText(prefix, "recipient_prefix");

  if (normalized.length > MAX_PREFIX_LENGTH) {
    throw new Error("recipient_prefix exceeds the maximum length.");
  }

  return normalized;
}

function normalizeOptionalDate(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalizedValue = value.trim();
  if (!normalizedValue) {
    return null;
  }

  const parsedDate = new Date(normalizedValue);
  if (Number.isNaN(parsedDate.getTime())) {
    throw new Error("Invalid expiration date.");
  }
  if (parsedDate.getTime() < Date.now()) {
    throw new Error("Expiration date cannot be in the past.");
  }

  return parsedDate.toISOString();
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function getServiceRoleClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

async function requireAdminSupabaseClient(): Promise<AdminSupabaseClient> {
  const supabase = await createServerClient();

  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new AuthorizationError("Invalid session. Please sign in again.");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .maybeSingle<ProfileRow>();

  if (profileError) {
    throw new Error("Could not validate the admin role.");
  }

  if (!profile || profile.role !== ADMIN_ROLE) {
    throw new AuthorizationError();
  }

  return supabase;
}

async function grantAccessWithClient(
  supabase: AdminSupabaseClient,
  userId: string,
  prefix: string,
  expiresAt: string | null
): Promise<AccessRuleRow> {
  const normalizedUserId = normalizeRequiredText(userId, "user_id");
  const normalizedPrefix = normalizePrefix(prefix);

  const { data, error } = await supabase
    .from("access_rules")
    .insert({
      user_id: normalizedUserId,
      recipient_prefix: normalizedPrefix,
      expires_at: expiresAt,
      is_active: true
    })
    .select("id, user_id, recipient_prefix, expires_at, is_active")
    .single<AccessRuleRow>();

  if (error || !data) {
    throw new Error(error?.message ?? "Could not create access rule.");
  }

  return data;
}

async function revokeAccessWithClient(
  supabase: AdminSupabaseClient,
  ruleId: string
): Promise<AccessRuleLookupRow> {
  const normalizedRuleId = normalizeRuleId(ruleId);

  const { data: currentRule, error: fetchError } = await supabase
    .from("access_rules")
    .select("id")
    .eq("id", normalizedRuleId)
    .maybeSingle<AccessRuleLookupRow>();

  if (fetchError) {
    throw new Error(`Could not read rule: ${fetchError.message}`);
  }

  if (!currentRule) {
    throw new Error("The specified rule does not exist or is no longer available.");
  }

  const { data: updatedRule, error: updateError } = await supabase
    .from("access_rules")
    .update({ is_active: false })
    .eq("id", normalizedRuleId)
    .select("id")
    .single<AccessRuleLookupRow>();

  if (updateError || !updatedRule) {
    throw new Error(updateError?.message ?? "Could not revoke access rule.");
  }

  return updatedRule;
}

export async function grantAccess(
  userId: string,
  prefix: string,
  expiresAt: string | null
): Promise<AccessRuleRow> {
  const supabase = await requireAdminSupabaseClient();
  const createdRule = await grantAccessWithClient(supabase, userId, prefix, expiresAt);
  revalidatePath(ADMIN_DASHBOARD_PATH);
  return createdRule;
}

export async function revokeAccess(ruleId: string): Promise<AccessRuleLookupRow> {
  const supabase = await requireAdminSupabaseClient();
  const revokedRule = await revokeAccessWithClient(supabase, ruleId);
  revalidatePath(ADMIN_DASHBOARD_PATH);
  return revokedRule;
}

export async function adminCreateUser(
  _prevState: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  try {
    await requireAdminSupabaseClient();
  } catch (error: unknown) {
    if (error instanceof AuthorizationError) {
      return { status: "error", message: error.message };
    }
    return {
      status: "error",
      message: "Could not validate the admin session."
    };
  }

  const email = normalizeFormValue(formData.get("email")).toLowerCase();
  const password = normalizeFormValue(formData.get("password"));

  if (!email || !password) {
    return {
      status: "error",
      message: "Email and password are required."
    };
  }

  if (!isValidEmail(email)) {
    return {
      status: "error",
      message: "Invalid email format."
    };
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    return {
      status: "error",
      message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`
    };
  }

  try {
    const serviceRoleClient = getServiceRoleClient();
    const { data, error } = await serviceRoleClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    });

    if (error) {
      return {
        status: "error",
        message: `Could not create user: ${error.message}`
      };
    }

    const createdUserId = data.user?.id;
    if (!createdUserId) {
      return {
        status: "error",
        message: "Could not retrieve the created user ID from Auth."
      };
    }

    const { error: profileInsertError } = await serviceRoleClient
      .from("profiles")
      .insert({ id: createdUserId, role: "user" });

    if (profileInsertError) {
      return {
        status: "error",
        message:
          "User was created in Auth, but profile creation failed."
      };
    }
  } catch {
    return {
      status: "error",
      message: "Unexpected error while creating user."
    };
  }

  revalidatePath(ADMIN_DASHBOARD_PATH);

  return {
    status: "success",
    message: "User created successfully."
  };
}

export async function createAccessRule(
  _prevState: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  const userId = normalizeFormValue(formData.get("user_id"));
  const recipientPrefix = normalizeFormValue(formData.get("recipient_prefix"));

  try {
    const expiresAt = normalizeOptionalDate(formData.get("expires_at"));
    await grantAccess(userId, recipientPrefix, expiresAt);
  } catch (error: unknown) {
    if (error instanceof AuthorizationError) {
      return { status: "error", message: error.message };
    }

    if (error instanceof Error) {
      return { status: "error", message: `Could not create rule: ${error.message}` };
    }

    return {
      status: "error",
      message: "Unexpected error while creating access rule."
    };
  }

  return {
    status: "success",
    message: "Rule created successfully."
  };
}

export async function revokeAccessRule(
  _prevState: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  const ruleId = normalizeFormValue(formData.get("rule_id"));

  try {
    await revokeAccess(ruleId);
  } catch (error: unknown) {
    if (error instanceof AuthorizationError) {
      return { status: "error", message: error.message };
    }

    if (error instanceof Error) {
      return { status: "error", message: `Could not revoke rule: ${error.message}` };
    }

    return {
      status: "error",
      message: "Unexpected error while revoking access rule."
    };
  }

  return {
    status: "success",
    message: "Rule revoked successfully."
  };
}
