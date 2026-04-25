import Link from "next/link";

export function Hero() {
  return (
    <section className="px-4 py-14 text-center sm:px-6 sm:py-20 lg:py-24">
      <p className="mx-auto inline-flex rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-accent">
        Infraestructura B2B para equipos de social media
      </p>

      <h1 className="mx-auto mt-6 max-w-4xl text-3xl font-semibold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
        Gestión Segura de Accesos para Agencias de Social Media.
      </h1>

      <p className="mx-auto mt-5 max-w-3xl text-base leading-7 text-slate-600 sm:text-lg">
        Centraliza las credenciales de tus clientes, delega accesos temporales a tu
        equipo y mantén el control total sin compartir contraseñas.
      </p>

      <div className="mt-10 flex items-center justify-center">
        <Link
          href="/login"
          className="inline-flex h-11 items-center justify-center rounded-md bg-accent px-5 text-sm font-medium text-white shadow-md transition hover:opacity-90"
        >
          Comenzar gratis
        </Link>
      </div>
    </section>
  );
}
