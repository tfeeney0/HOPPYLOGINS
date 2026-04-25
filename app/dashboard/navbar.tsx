"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
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

export function Navbar({ email, role }: NavbarProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const roleBadge = getRoleBadge(role);
  const userEmail = email ?? "Usuario sin email";

  const navItems: NavItem[] = [
    { href: "/dashboard", label: "Inbox" },
    ...(role === "admin" ? [{ href: "/dashboard/admin", label: "Admin Panel" }] : [])
  ];

  return (
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
          className="inline-flex h-10 items-center rounded-md border border-slate-300 px-3 text-sm font-medium text-slate-700 md:hidden"
          aria-expanded={mobileMenuOpen}
          aria-controls="dashboard-mobile-menu"
        >
          Menu
        </button>
      </div>

      {mobileMenuOpen && (
        <div id="dashboard-mobile-menu" className="border-t border-slate-200 bg-white px-4 py-4 md:hidden">
          <div className="space-y-3">
            <nav className="flex flex-col">
              {navItems.map((item) => {
                const active = isPathActive(pathname, item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={[
                      "rounded-md px-3 py-2 text-sm font-medium",
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

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="truncate text-sm text-slate-700">{userEmail}</p>
              <span
                className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${roleBadge.className}`}
              >
                {roleBadge.label}
              </span>
            </div>

            <form action={signOut}>
              <button
                type="submit"
                className="inline-flex h-10 w-full items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
              >
                Cerrar Sesion
              </button>
            </form>
          </div>
        </div>
      )}
    </header>
  );
}
