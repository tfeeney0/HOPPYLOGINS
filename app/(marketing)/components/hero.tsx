import Link from "next/link";

export function Hero() {
  return (
    <section className="px-4 py-14 text-center sm:px-6 sm:py-20 lg:py-24">
      <p className="mx-auto inline-flex rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-accent">
        B2B infrastructure for social media teams
      </p>

      <h1 className="mx-auto mt-6 max-w-4xl text-3xl font-semibold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
        Secure Access Management for Social Media Agencies.
      </h1>

      <p className="mx-auto mt-5 max-w-3xl text-base leading-7 text-slate-600 sm:text-lg">
        Centralize client credentials, delegate temporary access to your team,
        and stay fully in control without sharing passwords.
      </p>

      <div className="mt-10 flex items-center justify-center">
        <Link
          href="/login"
          className="inline-flex h-11 items-center justify-center rounded-md bg-accent px-5 text-sm font-medium text-white shadow-md transition hover:opacity-90"
        >
          Start for free
        </Link>
      </div>
    </section>
  );
}
