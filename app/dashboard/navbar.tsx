"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { signOut } from "./actions";

type NavbarRole = "admin" | "user";

type NavbarProps = {
  email: string | null;
  role: NavbarRole;
};

type NavItem = {
  href: string;
  label: string;
};

function isPathActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") {
    return pathname === "/dashboard";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

function getRoleBadge(role: NavbarRole): { label: string; className: string } {
  if (role === "admin") {
    return {
      label: "Admin",
      className:
        "border border-violet-200 bg-violet-50 text-violet-700"
    };
  }

  return {
    label: "User",
    className: "border border-slate-200 bg-slate-100 text-slate-700"
  };
}

function NavLinks({ items, pathname }: { items: NavItem[]; pathname: string }) {
  return (
    <nav className="flex items-center gap-1">
      {items.map((item) => {
        const active = isPathActive(pathname, item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={[
              "inline-flex h-10 items-center border-b-2 px-3 text-sm font-medium transition-colors",
              active
                ? "border-slate-900 text-slate-900"
                : "border-transparent text-slate-500 hover:text-slate-800"
            ].join(" ")}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function RefreshButton({
  loading,
  onRefresh,
  compact = false
}: {
  loading: boolean;
  onRefresh: () => void;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onRefresh}
      disabled={loading}
      className={[
        "inline-flex items-center justify-center rounded-md border border-slate-300 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-70",
        compact ? "h-10 w-10" : "h-9 gap-2 px-3"
      ].join(" ")}
      aria-label="Refrescar"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        className={`h-5 w-5 ${loading ? "animate-spin" : ""}`}
        aria-hidden="true"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M20 12a8 8 0 10-2.34 5.66M20 4v8h-8" />
      </svg>
      {!compact && <span>{loading ? "Cargando..." : "Refrescar"}</span>}
    </button>
  );
}

export function Navbar({ email, role }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isRefreshing, startRefreshTransition] = useTransition();
  const roleBadge = getRoleBadge(role);
  const userEmail = email ?? "Usuario sin email";

  const navItems: NavItem[] = [
    { href: "/dashboard", label: "Inbox" },
    ...(role === "admin" ? [{ href: "/dashboard/admin", label: "Admin Panel" }] : [])
  ];

  useEffect(() => {
    if (!mobileMenuOpen) {
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMobileMenuOpen(false);
      }
    }

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [mobileMenuOpen]);

  function handleRefresh() {
    startRefreshTransition(() => {
      router.refresh();
    });
  }

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-4">
            <Link
              href="/dashboard"
              className="shrink-0 text-sm font-semibold tracking-tight text-slate-900"
            >
              Hoppylogins
            </Link>
            <div className="hidden md:block">
              <NavLinks items={navItems} pathname={pathname} />
            </div>
          </div>

          <div className="hidden items-center gap-3 md:flex">
            <div className="flex min-w-0 items-center gap-2">
              <p className="max-w-[280px] truncate text-sm text-slate-700">{userEmail}</p>
              <span
                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${roleBadge.className}`}
              >
                {roleBadge.label}
              </span>
            </div>

            <RefreshButton loading={isRefreshing} onRefresh={handleRefresh} />

            <form action={signOut}>
              <button
                type="submit"
                className="inline-flex h-9 items-center rounded-md border border-slate-300 px-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2"
              >
                Cerrar Sesion
              </button>
            </form>
          </div>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((current) => !current)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-300 text-slate-700 transition-colors hover:bg-slate-100 md:hidden"
            aria-expanded={mobileMenuOpen}
            aria-controls="dashboard-mobile-menu"
            aria-label={mobileMenuOpen ? "Cerrar menu" : "Abrir menu"}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              className="h-6 w-6"
              aria-hidden="true"
            >
              <path strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          </button>
        </div>
      </header>

      <div
        className={[
          "fixed inset-0 z-[100] md:hidden transition-opacity duration-300",
          mobileMenuOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        ].join(" ")}
      >
        <button
          type="button"
          aria-label="Cerrar menu"
          className="absolute inset-0 bg-slate-900/35 backdrop-blur-sm"
          onClick={() => setMobileMenuOpen(false)}
        />

        <aside
          id="dashboard-mobile-menu"
          className={[
            "absolute inset-y-0 right-0 flex w-[22rem] max-w-[92vw] flex-col border-l border-slate-200 bg-white shadow-2xl transition-transform duration-300 ease-out",
            mobileMenuOpen ? "translate-x-0" : "translate-x-full"
          ].join(" ")}
          role="dialog"
          aria-modal="true"
        >
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <p className="text-base font-semibold text-slate-900">Menu</p>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-300 text-slate-700 transition-colors hover:bg-slate-100"
              aria-label="Cerrar menu"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                className="h-6 w-6"
                aria-hidden="true"
              >
                <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>

          <div className="flex h-full flex-col px-5 py-5">
            <nav className="space-y-2">
              {navItems.map((item) => {
                const active = isPathActive(pathname, item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={[
                      "block rounded-md px-3 py-2.5 text-base font-medium",
                      active
                        ? "bg-slate-900 text-white"
                        : "text-slate-700 hover:bg-slate-100"
                    ].join(" ")}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="truncate text-sm text-slate-700">{userEmail}</p>
              <span
                className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${roleBadge.className}`}
              >
                {roleBadge.label}
              </span>
            </div>

            <div className="mt-4">
              <RefreshButton loading={isRefreshing} onRefresh={handleRefresh} />
            </div>

            <form action={signOut} className="mt-auto pt-4">
              <button
                type="submit"
                className="inline-flex h-11 w-full items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
              >
                Cerrar Sesion
              </button>
            </form>
          </div>
        </aside>
      </div>
    </>
  );
}
