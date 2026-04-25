import { redirect } from "next/navigation";
import { createServerClient } from "@/utils/supabase/server";
import { AdminPanel, type AccessRuleRecord, type AdminPanelUser } from "./admin-panel";

const ADMIN_ROLE = "admin";
const LOGIN_PATH = "/login";
const DASHBOARD_PATH = "/dashboard";

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

type AdminPageData = {
  users: AdminPanelUser[];
  fetchError: string | null;
};

function buildUsersWithRules(
  profiles: ProfileRow[],
  accessRules: AccessRuleRow[]
): AdminPanelUser[] {
  const rulesByUserId = new Map<string, AccessRuleRecord[]>();

  for (const rule of accessRules) {
    const currentRules = rulesByUserId.get(rule.user_id) ?? [];
    currentRules.push({
      id: rule.id,
      user_id: rule.user_id,
      recipient_prefix: rule.recipient_prefix,
      expires_at: rule.expires_at,
      is_active: rule.is_active
    });
    rulesByUserId.set(rule.user_id, currentRules);
  }

  const users: AdminPanelUser[] = profiles.map((profile) => ({
    id: profile.id,
    role: profile.role ?? "user",
    rules: (rulesByUserId.get(profile.id) ?? []).sort((left, right) => right.id - left.id)
  }));

  const profileIds = new Set(profiles.map((profile) => profile.id));

  for (const [userId, rules] of rulesByUserId.entries()) {
    if (!profileIds.has(userId)) {
      users.push({
        id: userId,
        role: "unknown",
        rules: [...rules].sort((left, right) => right.id - left.id)
      });
    }
  }

  return users.sort((left, right) => left.id.localeCompare(right.id, "en"));
}

async function getAdminPageData(): Promise<AdminPageData> {
  const supabase = await createServerClient();

  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect(LOGIN_PATH);
  }

  const { data: currentProfile, error: profileError } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .maybeSingle<ProfileRow>();

  if (profileError) {
    throw new Error("No se pudo validar el rol del usuario administrador.");
  }

  if (!currentProfile || currentProfile.role !== ADMIN_ROLE) {
    redirect(DASHBOARD_PATH);
  }

  const [{ data: profiles, error: profilesError }, { data: rules, error: rulesError }] =
    await Promise.all([
      supabase.from("profiles").select("id, role").returns<ProfileRow[]>().order("id"),
      supabase
        .from("access_rules")
        .select("id, user_id, recipient_prefix, expires_at, is_active")
        .returns<AccessRuleRow[]>()
        .order("id", { ascending: false })
    ]);

  const fetchError = profilesError || rulesError
    ? "No se pudo cargar toda la informacion de administracion."
    : null;

  return {
    users: buildUsersWithRules(profiles ?? [], rules ?? []),
    fetchError
  };
}

export default async function AdminDashboardPage() {
  const { users, fetchError } = await getAdminPageData();

  return (
    <main className="min-h-svh bg-slate-50 px-4 py-6 sm:px-6 sm:py-8">
      <section className="mx-auto w-full max-w-6xl space-y-6">
        <header>
          <h1 className="text-2xl font-semibold text-slate-900">Panel de Administracion</h1>
          <p className="mt-1 text-sm text-slate-600">
            Gestion de usuarios y reglas de acceso de correo.
          </p>
        </header>

        <AdminPanel users={users} fetchError={fetchError} />
      </section>
    </main>
  );
}
