"use server";

import { revalidatePath } from "next/cache";
import { createServerClient } from "@/utils/supabase/server";

const ADMIN_ROLE = "admin";
const ADMIN_DASHBOARD_PATH = "/dashboard/admin";

type ProfileRow = {
  id: string;
  role: string | null;
};

export type AdminActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

type AdminGuardResult =
  | {
      ok: true;
      supabase: Awaited<ReturnType<typeof createServerClient>>;
    }
  | {
      ok: false;
      message: string;
    };

function normalizeFormValue(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value.trim() : "";
}

function parseExpirationDateTime(rawValue: string): {
  isoValue: string | null;
  errorMessage: string | null;
} {
  if (!rawValue) {
    return { isoValue: null, errorMessage: null };
  }

  const parsedDate = new Date(rawValue);
  if (Number.isNaN(parsedDate.getTime())) {
    return { isoValue: null, errorMessage: "La fecha de expiracion es invalida." };
  }

  return { isoValue: parsedDate.toISOString(), errorMessage: null };
}

async function requireAdminSession(): Promise<AdminGuardResult> {
  const supabase = await createServerClient();

  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      ok: false,
      message: "Sesion invalida. Inicia sesion nuevamente."
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .maybeSingle<ProfileRow>();

  if (profileError) {
    return {
      ok: false,
      message: "No se pudo validar el rol del administrador."
    };
  }

  if (!profile || profile.role !== ADMIN_ROLE) {
    return {
      ok: false,
      message: "No tienes permisos para ejecutar esta accion."
    };
  }

  return {
    ok: true,
    supabase
  };
}

export async function createAccessRule(
  _prevState: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  const adminSession = await requireAdminSession();
  if (!adminSession.ok) {
    return { status: "error", message: adminSession.message };
  }

  const userId = normalizeFormValue(formData.get("user_id"));
  const recipientPrefix = normalizeFormValue(formData.get("recipient_prefix"));
  const expirationInput = normalizeFormValue(formData.get("expires_at"));

  if (!userId || !recipientPrefix) {
    return {
      status: "error",
      message: "Debes completar user_id y recipient_prefix."
    };
  }

  if (recipientPrefix.length > 120) {
    return {
      status: "error",
      message: "recipient_prefix supera el maximo permitido."
    };
  }

  const parsedExpiration = parseExpirationDateTime(expirationInput);
  if (parsedExpiration.errorMessage) {
    return {
      status: "error",
      message: parsedExpiration.errorMessage
    };
  }

  let shouldRevalidate = false;

  try {
    const { error } = await adminSession.supabase.from("access_rules").insert({
      user_id: userId,
      recipient_prefix: recipientPrefix,
      expires_at: parsedExpiration.isoValue,
      is_active: true
    });

    if (error) {
      return {
        status: "error",
        message: `No se pudo crear la regla: ${error.message}`
      };
    }

    shouldRevalidate = true;
  } catch {
    return {
      status: "error",
      message: "Error inesperado al crear la regla de acceso."
    };
  }

  if (shouldRevalidate) {
    revalidatePath(ADMIN_DASHBOARD_PATH);
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
  const adminSession = await requireAdminSession();
  if (!adminSession.ok) {
    return { status: "error", message: adminSession.message };
  }

  const ruleIdRaw = normalizeFormValue(formData.get("rule_id"));
  const ruleId = Number.parseInt(ruleIdRaw, 10);

  if (!Number.isInteger(ruleId) || ruleId <= 0) {
    return {
      status: "error",
      message: "rule_id es invalido."
    };
  }

  let shouldRevalidate = false;

  try {
    const { data, error } = await adminSession.supabase
      .from("access_rules")
      .update({ is_active: false })
      .eq("id", ruleId)
      .select("id")
      .maybeSingle<{ id: number }>();

    if (error) {
      return {
        status: "error",
        message: `No se pudo revocar la regla: ${error.message}`
      };
    }

    if (!data) {
      return {
        status: "error",
        message: "La regla indicada no existe o ya no esta disponible."
      };
    }

    shouldRevalidate = true;
  } catch {
    return {
      status: "error",
      message: "Error inesperado al revocar la regla de acceso."
    };
  }

  if (shouldRevalidate) {
    revalidatePath(ADMIN_DASHBOARD_PATH);
  }

  return {
    status: "success",
    message: "Regla revocada correctamente."
  };
}
