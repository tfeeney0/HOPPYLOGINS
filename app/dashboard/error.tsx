"use client";

type DashboardErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function DashboardError({ error, reset }: DashboardErrorProps) {
  return (
    <main className="min-h-svh bg-slate-50 px-4 py-6 sm:px-6 sm:py-8">
      <section className="mx-auto w-full max-w-2xl rounded-xl border border-red-200 bg-white p-6 shadow-sm sm:p-8">
        <h1 className="text-lg font-semibold text-red-900">
          Unable to render the dashboard
        </h1>
        <p className="mt-2 text-sm text-slate-700">
          An unexpected server error occurred. You can try again now.
        </p>
        <p className="mt-3 rounded-md bg-slate-100 px-3 py-2 text-xs text-slate-600">
          {error.message}
        </p>

        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={reset}
            className="rounded-md bg-slate-900 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-slate-700"
          >
            Retry
          </button>
          <a
            href="/login"
            className="rounded-md border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100"
          >
            Go to login
          </a>
        </div>
      </section>
    </main>
  );
}
