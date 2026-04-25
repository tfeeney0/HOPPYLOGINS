import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createServerClient } from "@/utils/supabase/server";
import { InboxList, type EmailRecord } from "./inbox-list";

type Profile = {
  id: string;
  role: string;
};

const DASHBOARD_PATH = "/dashboard";
const LOGIN_PATH = "/login";

async function signOut(): Promise<void> {
  "use server";

  try {
    const supabase = await createServerClient();
    const { error } = await supabase.auth.signOut();

    if (error) {
      throw new Error(error.message);
    }

    revalidatePath(DASHBOARD_PATH);
    revalidatePath(LOGIN_PATH);
    redirect(LOGIN_PATH);
  } catch {
    revalidatePath(DASHBOARD_PATH);
    revalidatePath(LOGIN_PATH);
    redirect(`${LOGIN_PATH}?error=${encodeURIComponent("No se pudo cerrar sesion")}`);
  }
}

export default async function DashboardPage() {
  const supabase = await createServerClient();

  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect(LOGIN_PATH);
  }

  const [{ data: profile, error: profileError }, { data: emails, error: emailsError }] =
    await Promise.all([
      supabase.from("profiles").select("id, role").eq("id", user.id).maybeSingle<Profile>(),
      supabase
        .from("emails")
        .select("*")
        .order("created_at", { ascending: false })
        .returns<EmailRecord[]>()
    ]);

  const isAdmin = profile?.role === "admin";
  const emailList = emails ?? [];
  const hasProfileWarning = Boolean(profileError);
  const inboxErrorMessage = emailsError
    ? "No se pudieron cargar los correos. Reintenta en unos segundos."
    : null;

  return (
    <main className="min-h-svh bg-slate-50 px-4 py-6 sm:px-6 sm:py-8">
      <section className="mx-auto w-full max-w-4xl space-y-5">
        <header className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm sm:px-5">
          <div>
            <h1 className="text-lg font-semibold text-slate-900">Bandeja de Entrada</h1>
            <p className="text-xs text-slate-500">Mensajes visibles por tus reglas RLS</p>
          </div>

          <div className="flex items-center gap-2">
            {isAdmin && (
              <Link
                href="/dashboard/admin"
                className="rounded-md px-3 py-2 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
              >
                Ir a Panel Admin
              </Link>
            )}

            <form action={signOut}>
              <button
                type="submit"
                className="rounded-md border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2"
              >
                Cerrar sesion
              </button>
            </form>
          </div>
        </header>

        {hasProfileWarning && (
          <section className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 shadow-sm">
            No se pudo validar el perfil completo. Algunas funciones pueden verse
            limitadas temporalmente.
          </section>
        )}

        {inboxErrorMessage ? (
          <section className="rounded-xl border border-red-200 bg-red-50 p-6 text-center shadow-sm">
            <h2 className="text-base font-semibold text-red-900">Error de carga</h2>
            <p className="mt-2 text-sm text-red-700">{inboxErrorMessage}</p>
            <Link
              href={DASHBOARD_PATH}
              className="mt-4 inline-flex rounded-md border border-red-300 px-3 py-2 text-xs font-medium text-red-800 transition-colors hover:bg-red-100"
            >
              Reintentar
            </Link>
          </section>
        ) : (
          <InboxList emails={emailList} />
        )}
      </section>
    </main>
  );
}
