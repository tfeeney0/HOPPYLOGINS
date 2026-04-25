import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerClient } from "@/utils/supabase/server";
import { InboxList, type EmailRecord } from "./inbox-list";

type Profile = {
  id: string;
  role: string;
};

async function signOut(): Promise<void> {
  "use server";

  const supabase = await createServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export default async function DashboardPage() {
  const supabase = await createServerClient();

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [{ data: profile, error: profileError }, { data: emails, error: emailsError }] =
    await Promise.all([
      supabase.from("profiles").select("id, role").eq("id", user.id).maybeSingle<Profile>(),
      supabase.from("emails").select("*").order("created_at", { ascending: false })
    ]);

  if (profileError) {
    throw new Error(`Could not load profile: ${profileError.message}`);
  }

  if (emailsError) {
    throw new Error(`Could not load inbox emails: ${emailsError.message}`);
  }

  const isAdmin = profile?.role === "admin";
  const emailList = (emails ?? []) as EmailRecord[];

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

        <InboxList emails={emailList} />
      </section>
    </main>
  );
}
