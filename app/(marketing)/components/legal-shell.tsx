import type { ReactNode } from "react";

type LegalShellProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
};

export function LegalShell({ title, subtitle, children }: LegalShellProps) {
  return (
    <section className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 sm:py-14 lg:py-16">
      <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
        <header className="border-b border-slate-200 pb-6">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
            {title}
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">{subtitle}</p>
        </header>

        <div className="prose prose-slate mt-8 max-w-none">
          {children}
        </div>
      </article>
    </section>
  );
}
