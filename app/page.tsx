import Link from "next/link";
import { createServerClient } from "@/utils/supabase/server";

type CtaConfig = {
  href: "/dashboard" | "/login";
  label: "Ir al Dashboard" | "Iniciar Sesion";
};

async function getPrimaryCta(): Promise<CtaConfig> {
  try {
    const supabase = await createServerClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (user) {
      return { href: "/dashboard", label: "Ir al Dashboard" };
    }
  } catch {
    // Public page: fall back to guest CTA if session check fails.
  }

  return { href: "/login", label: "Iniciar Sesion" };
}

export default async function HomePage() {
  const primaryCta = await getPrimaryCta();

  return (
    <div className="min-h-svh bg-gradient-to-b from-white to-slate-50 text-slate-900">
      <header className="border-b border-slate-200/80 bg-white/80 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="text-sm font-semibold tracking-tight text-slate-900">
            Hoppylogins
          </Link>
          <Link
            href={primaryCta.href}
            className="inline-flex h-9 items-center rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-100"
          >
            {primaryCta.label}
          </Link>
        </div>
      </header>

      <main>
        <section
          id="caracteristicas"
          className="mx-auto flex w-full max-w-6xl flex-col items-center px-4 py-20 text-center sm:px-6 sm:py-24 lg:py-28"
        >
          <span className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 shadow-sm">
            Seguridad y control para equipos modernos
          </span>

          <h1 className="mt-6 max-w-4xl text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
            Buzon de Correos Seguro y Granular
          </h1>

          <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
            Gestiona accesos temporales y protege la privacidad de tu equipo con
            politicas RLS directamente en la base de datos.
          </p>

          <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row">
            <Link
              href={primaryCta.href}
              className="inline-flex h-11 items-center justify-center rounded-md bg-slate-900 px-5 text-sm font-medium text-white shadow-md transition-colors hover:bg-slate-800"
            >
              {primaryCta.label}
            </Link>
            <Link
              href="#caracteristicas"
              className="inline-flex h-11 items-center justify-center rounded-md border border-slate-300 bg-white px-5 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-100"
            >
              Saber mas
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200/80 bg-white/70">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5 text-xs text-slate-500 sm:px-6">
          <p>(c) {new Date().getFullYear()} Hoppylogins</p>
          <p>Privacidad primero</p>
        </div>
      </footer>
    </div>
  );
}
