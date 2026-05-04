import { redirect } from "next/navigation";
import { createServerClient } from "@/utils/supabase/server";
import { InboxList, type EmailRecord } from "./inbox-list";

const DASHBOARD_PATH = "/dashboard";
const LOGIN_PATH = "/login";

export default async function DashboardPage() {
  const supabase = await createServerClient();

  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect(LOGIN_PATH);
  }

  const { data: emails, error: emailsError } = await supabase
    .from("emails")
    .select("*")
    .order("created_at", { ascending: false })
    .returns<EmailRecord[]>();

  const emailList = emails ?? [];
  const inboxErrorMessage = emailsError
    ? "Unable to load emails. Please try again in a few seconds."
    : null;

  return (
    <main className="min-h-svh bg-slate-50 px-4 py-6 sm:px-6 sm:py-8">
      <section className="mx-auto w-full max-w-4xl space-y-5">
        <header>
          <h1 className="text-lg font-semibold text-slate-900">Inbox</h1>
          <p className="text-xs text-slate-500">Messages visible under your RLS rules</p>
        </header>

        {inboxErrorMessage ? (
          <section className="rounded-xl border border-red-200 bg-red-50 p-6 text-center shadow-sm">
            <h2 className="text-base font-semibold text-red-900">Loading error</h2>
            <p className="mt-2 text-sm text-red-700">{inboxErrorMessage}</p>
            <a
              href={DASHBOARD_PATH}
              className="mt-4 inline-flex rounded-md border border-red-300 px-3 py-2 text-xs font-medium text-red-800 transition-colors hover:bg-red-100"
            >
              Retry
            </a>
          </section>
        ) : (
          <InboxList emails={emailList} />
        )}
      </section>
    </main>
  );
}
