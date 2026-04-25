import Link from "next/link";

export function FooterPublic() {
  return (
    <footer className="border-t border-slate-200/80 bg-white/70">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-start justify-between gap-4 px-4 py-6 sm:flex-row sm:items-center sm:px-6">
        <p className="text-sm text-slate-500">© 2026 HoppyLogins Inc.</p>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/terminos" className="text-slate-600 transition-colors hover:text-slate-900">
            Términos
          </Link>
          <Link
            href="/privacidad"
            className="text-slate-600 transition-colors hover:text-slate-900"
          >
            Privacidad
          </Link>
        </nav>
      </div>
    </footer>
  );
}
