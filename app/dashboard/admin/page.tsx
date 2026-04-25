import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient, type User } from "@supabase/supabase-js";
import { createServerClient } from "@/utils/supabase/server";

const ADMIN_ROLE = "admin";
const ADMIN_DASHBOARD_PATH = "/dashboard/admin";
const MIN_PASSWORD_LENGTH = 6;

type PageSearchParams = Record<string, string | string[] | undefined>;

type Profile = {
  id: string;
  role: string;
};

type AccessRule = {
  id: number;
  user_id: string;
  recipient_prefix: string;
  expires_at: string | null;
  is_active: boolean;
};

type UserOption = {
  id: string;
  role: string;
  email: string | null;
};

type AdminPageProps = {
  searchParams?: Promise<PageSearchParams>;
};

function normalizeFormValue(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value.trim() : "";
}

function getSingleSearchParam(
  searchParams: PageSearchParams | undefined,
  key: string
): string | null {
  const rawValue = searchParams?.[key];
  if (typeof rawValue !== "string" || rawValue.length === 0) {
    return null;
  }

  return rawValue;
}

function toIsoDateTime(datetimeLocal: string): string | null {
  if (!datetimeLocal) {
    return null;
  }

  const parsedDate = new Date(datetimeLocal);
  if (Number.isNaN(parsedDate.getTime())) {
    throw new Error("Invalid expiration date.");
  }

  return parsedDate.toISOString();
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function withAdminError(message: string): string {
  return `${ADMIN_DASHBOARD_PATH}?error=${encodeURIComponent(message)}`;
}

function withAdminSuccess(message: string): string {
  return `${ADMIN_DASHBOARD_PATH}?success=${encodeURIComponent(message)}`;
}

function getServiceRoleClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY."
    );
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

async function assertAdminSession() {
  const supabase = await createServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .maybeSingle<Profile>();

  if (error) {
    throw new Error(`Could not validate admin role: ${error.message}`);
  }

  if (!profile || profile.role !== ADMIN_ROLE) {
    return { supabase, isAdmin: false as const };
  }

  return { supabase, isAdmin: true as const };
}

async function createNewUser(formData: FormData): Promise<void> {
  "use server";

  const { isAdmin } = await assertAdminSession();
  if (!isAdmin) {
    redirect(withAdminError("Acceso denegado"));
  }

  const email = normalizeFormValue(formData.get("email")).toLowerCase();
  const password = normalizeFormValue(formData.get("password"));

  if (!email || !password) {
    redirect(withAdminError("Completa email y contrasena"));
  }

  if (!isValidEmail(email)) {
    redirect(withAdminError("El email no es valido"));
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    redirect(
      withAdminError(`La contrasena debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres`)
    );
  }

  const serviceRoleClient = getServiceRoleClient();
  const { error } = await serviceRoleClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true
  });

  if (error) {
    redirect(withAdminError(`No se pudo crear el usuario: ${error.message}`));
  }

  revalidatePath(ADMIN_DASHBOARD_PATH);
  redirect(withAdminSuccess("Usuario creado correctamente"));
}

async function createAccessRule(formData: FormData): Promise<void> {
  "use server";

  const { supabase, isAdmin } = await assertAdminSession();
  if (!isAdmin) {
    redirect(withAdminError("Acceso denegado"));
  }

  const userId = normalizeFormValue(formData.get("user_id"));
  const recipientPrefix = normalizeFormValue(formData.get("recipient_prefix"));
  const expiresAtInput = normalizeFormValue(formData.get("expires_at"));

  if (!userId || !recipientPrefix) {
    redirect(withAdminError("Completa usuario y prefijo"));
  }

  const expiresAtIso = toIsoDateTime(expiresAtInput);

  const { error } = await supabase.from("access_rules").insert({
    user_id: userId,
    recipient_prefix: recipientPrefix,
    expires_at: expiresAtIso,
    is_active: true
  });

  if (error) {
    redirect(withAdminError("No se pudo crear la regla"));
  }

  revalidatePath(ADMIN_DASHBOARD_PATH);
  redirect(withAdminSuccess("Regla creada correctamente"));
}

async function revokeAccessRule(formData: FormData): Promise<void> {
  "use server";

  const { supabase, isAdmin } = await assertAdminSession();
  if (!isAdmin) {
    redirect(withAdminError("Acceso denegado"));
  }

  const ruleIdRaw = normalizeFormValue(formData.get("rule_id"));
  const ruleId = Number.parseInt(ruleIdRaw, 10);

  if (!Number.isInteger(ruleId)) {
    redirect(withAdminError("Regla invalida para revocar"));
  }

  const { error } = await supabase
    .from("access_rules")
    .update({ is_active: false })
    .eq("id", ruleId);

  if (error) {
    redirect(withAdminError("No se pudo revocar la regla"));
  }

  revalidatePath(ADMIN_DASHBOARD_PATH);
  redirect(withAdminSuccess("Regla revocada correctamente"));
}

function formatDateLabel(value: string | null): string {
  if (!value) {
    return "Sin expiracion";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Fecha invalida";
  }

  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

function formatUserLabel(user: UserOption): string {
  const emailLabel = user.email ?? "Sin email";
  return `${emailLabel} (${user.role})`;
}

function renderStatusChip(isActive: boolean) {
  return isActive ? (
    <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700">
      Activa
    </span>
  ) : (
    <span className="inline-flex rounded-full bg-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700">
      Revocada
    </span>
  );
}

function sortUserOptions(users: UserOption[]): UserOption[] {
  return [...users].sort((left, right) => {
    const leftLabel = left.email ?? left.id;
    const rightLabel = right.email ?? right.id;
    return leftLabel.localeCompare(rightLabel, "es");
  });
}

export default async function AdminDashboardPage({ searchParams }: AdminPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const errorMessage = getSingleSearchParam(resolvedSearchParams, "error");
  const successMessage = getSingleSearchParam(resolvedSearchParams, "success");

  const { supabase, isAdmin } = await assertAdminSession();

  if (!isAdmin) {
    return (
      <main className="min-h-svh bg-slate-50 px-4 py-8 sm:px-6">
        <section className="mx-auto w-full max-w-xl rounded-xl border border-amber-200 bg-amber-50 p-6">
          <h1 className="text-xl font-semibold text-amber-900">Acceso denegado</h1>
          <p className="mt-2 text-sm text-amber-800">
            Esta seccion solo esta disponible para administradores.
          </p>
        </section>
      </main>
    );
  }

  const serviceRoleClient = getServiceRoleClient();

  const [
    { data: profiles, error: profilesError },
    { data: rules, error: rulesError },
    { data: authUsersData, error: authUsersError }
  ] = await Promise.all([
    supabase.from("profiles").select("id, role").order("id"),
    supabase
      .from("access_rules")
      .select("id, user_id, recipient_prefix, expires_at, is_active")
      .order("is_active", { ascending: false })
      .order("id", { ascending: false }),
    serviceRoleClient.auth.admin.listUsers({
      page: 1,
      perPage: 1000
    })
  ]);

  if (profilesError) {
    throw new Error(`Could not load profiles: ${profilesError.message}`);
  }

  if (rulesError) {
    throw new Error(`Could not load access rules: ${rulesError.message}`);
  }

  if (authUsersError) {
    throw new Error(`Could not load auth users: ${authUsersError.message}`);
  }

  const profileList = (profiles ?? []) as Profile[];
  const ruleList = (rules ?? []) as AccessRule[];
  const authUsers = (authUsersData?.users ?? []) as User[];

  const profileRoleById = new Map(profileList.map((profile) => [profile.id, profile.role]));

  const authEmailById = new Map(
    authUsers.map((authUser) => [authUser.id, authUser.email ?? null])
  );

  const userOptions = sortUserOptions(
    authUsers.map((authUser) => ({
      id: authUser.id,
      role: profileRoleById.get(authUser.id) ?? "user",
      email: authUser.email ?? null
    }))
  );

  return (
    <main className="min-h-svh bg-slate-50 px-4 py-6 sm:px-6 sm:py-8">
      <section className="mx-auto w-full max-w-6xl space-y-6">
        <header>
          <h1 className="text-2xl font-semibold text-slate-900">Panel de Admin</h1>
          <p className="mt-1 text-sm text-slate-600">
            Gestiona usuarios y reglas de acceso para lectura de correos.
          </p>
        </header>

        {errorMessage && (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {errorMessage}
          </p>
        )}

        {successMessage && (
          <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {successMessage}
          </p>
        )}

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-lg font-semibold text-slate-900">Crear Nuevo Usuario</h2>
          <form action={createNewUser} className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label
                htmlFor="email"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                placeholder="usuario@empresa.com"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label
                htmlFor="password"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                Contrasena
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                minLength={MIN_PASSWORD_LENGTH}
                placeholder={`Minimo ${MIN_PASSWORD_LENGTH} caracteres`}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-500"
              />
            </div>

            <div className="sm:col-span-2">
              <button
                type="submit"
                className="inline-flex w-full items-center justify-center rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 sm:w-auto"
              >
                Crear Usuario
              </button>
            </div>
          </form>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-lg font-semibold text-slate-900">
            Asignacion de Reglas
          </h2>
          <form action={createAccessRule} className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label
                htmlFor="user_id"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                Usuario
              </label>
              <select
                id="user_id"
                name="user_id"
                required
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
                defaultValue=""
              >
                <option value="" disabled>
                  Selecciona un usuario
                </option>
                {userOptions.map((userOption) => (
                  <option key={userOption.id} value={userOption.id}>
                    {formatUserLabel(userOption)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="recipient_prefix"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                Recipient Prefix
              </label>
              <input
                id="recipient_prefix"
                name="recipient_prefix"
                type="text"
                required
                placeholder="landscape"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-500"
              />
            </div>

            <div>
              <label
                htmlFor="expires_at"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                Expira En (opcional)
              </label>
              <input
                id="expires_at"
                name="expires_at"
                type="datetime-local"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
              />
            </div>

            <div className="sm:col-span-2">
              <button
                type="submit"
                className="inline-flex w-full items-center justify-center rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 sm:w-auto"
              >
                Crear Regla
              </button>
            </div>
          </form>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-lg font-semibold text-slate-900">Reglas de Acceso</h2>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-3 py-2 font-medium">Usuario</th>
                  <th className="px-3 py-2 font-medium">Rol</th>
                  <th className="px-3 py-2 font-medium">Prefijo</th>
                  <th className="px-3 py-2 font-medium">Expiracion</th>
                  <th className="px-3 py-2 font-medium">Estado</th>
                  <th className="px-3 py-2 font-medium text-right">Accion</th>
                </tr>
              </thead>
              <tbody>
                {ruleList.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-3 py-4 text-sm text-slate-500">
                      Aun no hay reglas cargadas.
                    </td>
                  </tr>
                )}

                {ruleList.map((rule) => (
                  <tr key={rule.id} className="border-b border-slate-100 text-sm text-slate-700">
                    <td className="px-3 py-3">
                      <div className="font-medium">
                        {authEmailById.get(rule.user_id) ?? "Sin email"}
                      </div>
                      <div className="font-mono text-xs text-slate-500">{rule.user_id}</div>
                    </td>
                    <td className="px-3 py-3">{profileRoleById.get(rule.user_id) ?? "N/A"}</td>
                    <td className="px-3 py-3">{rule.recipient_prefix}</td>
                    <td className="px-3 py-3">{formatDateLabel(rule.expires_at)}</td>
                    <td className="px-3 py-3">{renderStatusChip(rule.is_active)}</td>
                    <td className="px-3 py-3 text-right">
                      {rule.is_active ? (
                        <form action={revokeAccessRule}>
                          <input type="hidden" name="rule_id" value={rule.id} />
                          <button
                            type="submit"
                            className="inline-flex items-center rounded-md border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700 transition-colors hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2"
                          >
                            Revocar
                          </button>
                        </form>
                      ) : (
                        <span className="text-xs text-slate-400">Sin acciones</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </section>
    </main>
  );
}
