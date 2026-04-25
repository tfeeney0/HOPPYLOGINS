export default function DashboardLoading() {
  return (
    <main className="min-h-svh bg-slate-50 px-4 py-6 sm:px-6 sm:py-8">
      <section className="mx-auto w-full max-w-4xl space-y-5">
        <header className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm sm:px-5">
          <div className="h-5 w-44 animate-pulse rounded bg-slate-200" />
          <div className="mt-2 h-3 w-64 animate-pulse rounded bg-slate-100" />
        </header>

        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="h-4 w-36 animate-pulse rounded bg-slate-200" />
          <div className="mt-3 h-3 w-full animate-pulse rounded bg-slate-100" />
          <div className="mt-2 h-3 w-5/6 animate-pulse rounded bg-slate-100" />
          <div className="mt-2 h-3 w-2/3 animate-pulse rounded bg-slate-100" />
        </section>
      </section>
    </main>
  );
}
