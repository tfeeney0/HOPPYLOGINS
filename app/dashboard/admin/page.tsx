import { redirect } from "next/navigation";
import { createClient, type User } from "@supabase/supabase-js";
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

type AuthUserRecord = {
  id: string;
  email: string | null;
};

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

async function listAllAuthUsers(): Promise<AuthUserRecord[]> {
  const serviceRoleClient = getServiceRoleClient();
  const allUsers: AuthUserRecord[] = [];
  const perPage = 1000;
  let page = 1;

  while (true) {
    const { data, error } = await serviceRoleClient.auth.admin.listUsers({
      page,
      perPage
    });

    if (error) {
      throw new Error(`No se pudieron cargar usuarios de auth: ${error.message}`);
    }

    const users: User[] = data.users ?? [];
    for (const user of users) {
      allUsers.push({
        id: user.id,
        email: user.email ?? null
      });
    }

    if (users.length < perPage) {
      break;
    }

    page += 1;
  }

  return allUsers;
}

function buildUsersWithRules(
  authUsers: AuthUserRecord[],
  profiles: ProfileRow[],
  accessRules: AccessRuleRow[]
): AdminPanelUser[] {
  const authById = new Map(authUsers.map((user) => [user.id, user]));
  const profileById = new Map(profiles.map((profile) => [profile.id, profile]));
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

  const userIds = new Set<string>();
  for (const authUser of authUsers) {
    userIds.add(authUser.id);
  }
  for (const profile of profiles) {
    userIds.add(profile.id);
  }
  for (const userId of rulesByUserId.keys()) {
    userIds.add(userId);
  }

  const users: AdminPanelUser[] = Array.from(userIds).map((userId) => {
    const authUser = authById.get(userId);
    const profile = profileById.get(userId);

    return {
      id: userId,
      email: authUser?.email ?? null,
      role: profile?.role ?? "user",
      rules: (rulesByUserId.get(userId) ?? []).sort((left, right) => right.id - left.id)
    };
  });

  return users.sort((left, right) => {
    const leftLabel = left.email ?? left.id;
    const rightLabel = right.email ?? right.id;
    return leftLabel.localeCompare(rightLabel, "es");
  });
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

  let authUsers: AuthUserRecord[] = [];
  let authUsersError: string | null = null;

  try {
    authUsers = await listAllAuthUsers();
  } catch (error) {
    const fallbackMessage =
      error instanceof Error ? error.message : "No se pudieron cargar usuarios de auth.";
    authUsersError = fallbackMessage;
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

  const errors = [profilesError?.message, rulesError?.message, authUsersError].filter(
    (value): value is string => Boolean(value)
  );

  const fetchError =
    errors.length > 0 ? "No se pudo cargar toda la informacion de administracion." : null;

  return {
    users: buildUsersWithRules(authUsers, profiles ?? [], rules ?? []),
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
