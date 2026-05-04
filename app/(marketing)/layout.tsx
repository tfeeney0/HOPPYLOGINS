import Link from "next/link";
import type { ReactNode } from "react";
import { FooterPublic } from "@/app/(marketing)/components/footer-public";

type MarketingLayoutProps = {
  children: ReactNode;
};

export default function MarketingLayout({ children }: MarketingLayoutProps) {
  return (
    <div className="flex min-h-dvh flex-col bg-gradient-to-b from-white to-slate-50 text-slate-900">
      <header className="border-b border-slate-200/80 bg-white/80 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="text-sm font-semibold tracking-tight text-slate-900">
            HoppyLogins
          </Link>
          <Link
            href="/login"
            className="inline-flex h-9 items-center rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-100"
          >
            Sign in
          </Link>
        </div>
      </header>

      <main className="flex-1">{children}</main>
      <FooterPublic />
    </div>
  );
}
