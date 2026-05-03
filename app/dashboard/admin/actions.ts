"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import {
  createDynamicRoute,
  deleteDynamicRoute,
  type MailgunRouteResponse
} from "@/src/lib/mailgun-routes";
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
  mailgun_route_id: string | null;
  is_active: boolean;
};

type AccessRuleLookupRow = {
  id: number;
  mailgun_route_id: string | null;
};

type RouteClient = {
  createDynamicRoute: (prefix: string) => Promise<MailgunRouteResponse>;
  deleteDynamicRoute: (routeId: string) => Promise<MailgunRouteResponse>;
};

type AdminSupabaseClient = Awaited<ReturnType<typeof createServerClient>>;

const defaultRouteClient: RouteClient = {
  createDynamicRoute,
  deleteDynamicRoute
};

export type AdminActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

class AuthorizationError extends Error {
  constructor(message = "No tienes permisos para ejecutar esta accion.") {
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
    throw new Error(`${fieldName} es obligatorio.`);
  }

  return normalized;
}

function normalizeRuleId(ruleId: string): number {
  const normalized = normalizeRequiredText(ruleId, "rule_id");
  const parsed = Number.parseInt(normalized, 10);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error("rule_id es invalido.");
  }

  return parsed;
}

function normalizePrefix(prefix: string): string {
  const normalized = normalizeRequiredText(prefix, "recipient_prefix");

  if (normalized.length > MAX_PREFIX_LENGTH) {
    throw new Error("recipient_prefix supera el maximo permitido.");
  }

  return normalized;
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
    throw new AuthorizationError("Sesion invalida. Inicia sesion nuevamente.");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .maybeSingle<ProfileRow>();

  if (profileError) {
    throw new Error("No se pudo validar el rol del administrador.");
  }

  if (!profile || profile.role !== ADMIN_ROLE) {
    throw new AuthorizationError();
  }

  return supabase;
}

function extractMailgunRouteId(response: MailgunRouteResponse): string {
  const routeId = response.route?.id?.trim();

  if (!routeId) {
    throw new Error("Mailgun no devolvio un routeId valido.");
  }

  return routeId;
}

async function grantAccessWithClient(
  supabase: AdminSupabaseClient,
  userId: string,
  prefix: string,
  routeClient: RouteClient
): Promise<AccessRuleRow> {
  const normalizedUserId = normalizeRequiredText(userId, "user_id");
  const normalizedPrefix = normalizePrefix(prefix);

  const { data: existingRoute, error: existingRouteError } = await supabase
    .from("access_rules")
    .select("mailgun_route_id")
    .eq("recipient_prefix", normalizedPrefix)
    .not("mailgun_route_id", "is", null)
    .limit(1)
    .maybeSingle<{ mailgun_route_id: string | null }>();

  if (existingRouteError) {
    throw new Error(`No se pudo validar la ruta existente: ${existingRouteError.message}`);
  }

  const existingRouteId = existingRoute?.mailgun_route_id?.trim() ?? "";
  let routeId = existingRouteId;
  let wasRouteCreated = false;

  if (!routeId) {
    const createdRoute = await routeClient.createDynamicRoute(normalizedPrefix);
    routeId = extractMailgunRouteId(createdRoute);
    wasRouteCreated = true;
  }

  try {
    const { data, error } = await supabase
      .from("access_rules")
      .insert({
        user_id: normalizedUserId,
        recipient_prefix: normalizedPrefix,
        mailgun_route_id: routeId,
        is_active: true
      })
      .select("id, user_id, recipient_prefix, mailgun_route_id, is_active")
      .single<AccessRuleRow>();

    if (error || !data) {
      throw new Error(error?.message ?? "No se pudo crear la regla de acceso.");
    }

    return data;
  } catch (insertError: unknown) {
    if (wasRouteCreated) {
      try {
        await routeClient.deleteDynamicRoute(routeId);
      } catch (rollbackError: unknown) {
        const rollbackReason =
          rollbackError instanceof Error ? rollbackError.message : "Error desconocido";
        console.error(`Rollback Mailgun fallido para routeId ${routeId}: ${rollbackReason}`);
      }
    }

    throw insertError;
  }
}

async function revokeAccessWithClient(
  supabase: AdminSupabaseClient,
  ruleId: string,
  routeClient: RouteClient
): Promise<AccessRuleLookupRow> {
  const normalizedRuleId = normalizeRuleId(ruleId);

  const { data: currentRule, error: fetchError } = await supabase
    .from("access_rules")
    .select("id, mailgun_route_id")
    .eq("id", normalizedRuleId)
    .maybeSingle<AccessRuleLookupRow>();

  if (fetchError) {
    throw new Error(`No se pudo leer la regla: ${fetchError.message}`);
  }

  if (!currentRule) {
    throw new Error("La regla indicada no existe o ya no esta disponible.");
  }

  const { data: updatedRule, error: updateError } = await supabase
    .from("access_rules")
    .update({ is_active: false })
    .eq("id", normalizedRuleId)
    .select("id, mailgun_route_id")
    .single<AccessRuleLookupRow>();

  if (updateError || !updatedRule) {
    throw new Error(updateError?.message ?? "No se pudo revocar la regla de acceso.");
  }

  return updatedRule;
}

export async function grantAccess(userId: string, prefix: string): Promise<AccessRuleRow> {
  const supabase = await requireAdminSupabaseClient();
  const createdRule = await grantAccessWithClient(supabase, userId, prefix, defaultRouteClient);
  revalidatePath(ADMIN_DASHBOARD_PATH);
  return createdRule;
}

export async function revokeAccess(ruleId: string): Promise<AccessRuleLookupRow> {
  const supabase = await requireAdminSupabaseClient();
  const revokedRule = await revokeAccessWithClient(supabase, ruleId, defaultRouteClient);
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
      message: "No se pudo validar la sesion del administrador."
    };
  }

  const email = normalizeFormValue(formData.get("email")).toLowerCase();
  const password = normalizeFormValue(formData.get("password"));

  if (!email || !password) {
    return {
      status: "error",
      message: "Debes completar email y contrasena."
    };
  }

  if (!isValidEmail(email)) {
    return {
      status: "error",
      message: "El email no tiene un formato valido."
    };
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    return {
      status: "error",
      message: `La contrasena debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`
    };
  }

  try {
    const serviceRoleClient = getServiceRoleClient();
    const { error } = await serviceRoleClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    });

    if (error) {
      return {
        status: "error",
        message: `No se pudo crear el usuario: ${error.message}`
      };
    }
  } catch {
    return {
      status: "error",
      message: "Error inesperado al crear el usuario."
    };
  }

  revalidatePath(ADMIN_DASHBOARD_PATH);

  return {
    status: "success",
    message: "Usuario creado correctamente."
  };
}

export async function createAccessRule(
  _prevState: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  const userId = normalizeFormValue(formData.get("user_id"));
  const recipientPrefix = normalizeFormValue(formData.get("recipient_prefix"));

  try {
    await grantAccess(userId, recipientPrefix);
  } catch (error: unknown) {
    if (error instanceof AuthorizationError) {
      return { status: "error", message: error.message };
    }

    if (error instanceof Error) {
      return { status: "error", message: `No se pudo crear la regla: ${error.message}` };
    }

    return {
      status: "error",
      message: "Error inesperado al crear la regla de acceso."
    };
  }

  return {
    status: "success",
    message: "Regla creada correctamente."
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
      return { status: "error", message: `No se pudo revocar la regla: ${error.message}` };
    }

    return {
      status: "error",
      message: "Error inesperado al revocar la regla de acceso."
    };
  }

  return {
    status: "success",
    message: "Regla revocada correctamente."
  };
}
