import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerClient } from "@/utils/supabase/server";
import { LoginSubmitButton } from "./login-submit-button";

type LoginPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function normalizeTextField(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value.trim() : "";
}

function getErrorMessage(
  searchParams: Record<string, string | string[] | undefined> | undefined
): string | null {
  const rawError = searchParams?.error;
  return typeof rawError === "string" && rawError.length > 0 ? rawError : null;
}

async function login(formData: FormData): Promise<void> {
  "use server";

  const email = normalizeTextField(formData.get("email"));
  const password = normalizeTextField(formData.get("password"));

  if (!email || !password) {
    redirect("/login?error=Completa%20email%20y%20contrasena");
  }

  const supabase = await createServerClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    redirect("/login?error=Credenciales%20invalidas");
  }

  redirect("/dashboard");
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const errorMessage = getErrorMessage(resolvedSearchParams);

  return (
    <main className="min-h-svh bg-slate-50 px-4 pb-8 pt-6 sm:px-6 sm:pt-8">
      <div className="mx-auto w-full max-w-md pt-[max(0px,env(safe-area-inset-top))]">
        <div className="mb-5 sm:mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 transition-colors hover:text-slate-800"
          >
            <span aria-hidden="true">←</span>
            <span>Volver al inicio</span>
          </Link>
        </div>

        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold text-slate-900">Iniciar sesion</h1>
          <p className="mt-2 text-sm text-slate-600">
            Ingresa tus credenciales para acceder al dashboard.
          </p>
        </header>

        {errorMessage && (
          <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {errorMessage}
          </p>
        )}

        <form action={login} className="space-y-4">
          <div>
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
              autoComplete="email"
              required
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-0 placeholder:text-slate-400 focus:border-slate-500"
              placeholder="tu@email.com"
            />
          </div>

          <div>
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
              autoComplete="current-password"
              required
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-0 placeholder:text-slate-400 focus:border-slate-500"
              placeholder="••••••••"
            />
          </div>

          <LoginSubmitButton />
        </form>
        </section>
      </div>
    </main>
  );
}
