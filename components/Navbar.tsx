"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import ThemeToggle from "@/components/ThemeToggle";
import {
  Shield,
  Briefcase,
  FolderSearch,
  CreditCard,
  AlertTriangle,
  LayoutDashboard,
  LogOut,
  Menu,
  X,
  User,
} from "lucide-react";

export default function Navbar() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSignOut = () => {
    signOut({ callbackUrl: "/login" });
  };

  const isClient = session?.user?.role === "CLIENT";
  const isAdmin = session?.user?.role === "ADMIN";

  const getLinkClass = (href: string, exact = false) => {
    const isActive = exact ? pathname === href : pathname?.startsWith(href);
    return `inline-flex items-center gap-1.5 px-1 pt-1 border-b-2 text-sm font-medium transition-colors duration-150 ${
      isActive
        ? "border-[var(--accent)] text-[var(--text-primary)]"
        : "border-transparent text-[var(--text-muted)] hover:border-[var(--border)] hover:text-[var(--text-secondary)]"
    }`;
  };

  const getMobileLinkClass = (href: string, exact = false) => {
    const isActive = exact ? pathname === href : pathname?.startsWith(href);
    return `flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 ${
      isActive
        ? "bg-[var(--accent-light)] text-[var(--accent)]"
        : "text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)] hover:text-[var(--text-primary)]"
    }`;
  };

  const navLinks = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard, exact: true },
    ...(isClient
      ? [{ href: "/client/projects", label: "My Projects", icon: Briefcase, exact: false }]
      : []),
    { href: "/projects", label: "Browse Projects", icon: FolderSearch, exact: false },
    ...(session
      ? [
          { href: "/payments", label: "Payments", icon: CreditCard, exact: false },
          { href: "/profile", label: "Profile", icon: User, exact: false }
        ]
      : []),
    ...(isAdmin
      ? [
          { href: "/admin/disputes", label: "Disputes", icon: AlertTriangle, exact: false },
          { href: "/admin/overview", label: "Admin", icon: Shield, exact: false },
        ]
      : []),
  ];

  return (
    <>
      <nav className="sticky top-0 z-50 bg-[var(--surface)]/80 backdrop-blur-xl border-b border-[var(--border)] shadow-[0_1px_3px_0_rgb(0_0_0/0.04)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <Link href="/" className="flex items-center gap-2 group">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--gradient-from)] to-[var(--gradient-to)] flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow duration-200">
                    <Shield className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-lg font-bold tracking-tight text-[var(--text-primary)]">
                    Trust<span className="text-[var(--accent)]">Lance</span>
                  </span>
                </Link>
              </div>
              {session && (
                <div className="hidden md:ml-8 md:flex md:space-x-5">
                  {navLinks.map((link) => (
                    <Link key={link.href} href={link.href} className={getLinkClass(link.href, link.exact)}>
                      <link.icon className="w-3.5 h-3.5" />
                      {link.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              <ThemeToggle />
              {status === "loading" ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full border-2 border-[var(--border)] border-t-[var(--accent)] animate-spin" />
                  <span className="text-sm text-[var(--text-muted)]">Loading...</span>
                </div>
              ) : session ? (
                <div className="flex items-center gap-3">
                  <div className="hidden sm:flex items-center gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--gradient-subtle-from)] to-[var(--gradient-subtle-to)] flex items-center justify-center ring-2 ring-[var(--surface)] shadow-sm">
                        <span className="text-sm font-bold text-[var(--accent)]">
                          {session.user.name?.[0]?.toUpperCase() || "U"}
                        </span>
                      </div>
                      <div className="flex flex-col text-right">
                        <span className="text-sm font-semibold text-[var(--text-primary)] leading-tight">{session.user.name}</span>
                        <span className="text-[10px] text-[var(--accent)] bg-[var(--accent-light)] px-2 py-0.5 rounded-full font-bold uppercase tracking-widest self-end mt-0.5 leading-tight border border-[var(--border)]">
                          {session.user.role || "No Role"}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={handleSignOut}
                    className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold rounded-lg text-[var(--text-secondary)] border border-[var(--border)] hover:bg-[var(--surface-subtle)] hover:border-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--accent)] cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Sign Out
                  </button>

                  {/* Mobile menu toggle */}
                  <button
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    className="md:hidden inline-flex items-center justify-center p-2 rounded-lg text-[var(--text-muted)] hover:bg-[var(--surface-subtle)] hover:text-[var(--text-primary)] cursor-pointer focus:outline-none"
                  >
                    {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                  </button>
                </div>
              ) : (
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg text-white bg-[var(--accent)] hover:bg-[var(--accent-hover)] shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--accent)]"
                >
                  <Shield className="w-3.5 h-3.5" />
                  Sign In
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Mobile menu panel */}
        {mobileMenuOpen && session && (
          <div className="md:hidden border-t border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur-lg">
            <div className="px-4 py-3 space-y-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={getMobileLinkClass(link.href, link.exact)}
                >
                  <link.icon className="w-4 h-4" />
                  {link.label}
                </Link>
              ))}
            </div>
            <div className="border-t border-[var(--border)] px-4 py-3">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[var(--gradient-subtle-from)] to-[var(--gradient-subtle-to)] flex items-center justify-center">
                  <span className="text-sm font-bold text-[var(--accent)]">
                    {session.user.name?.[0]?.toUpperCase() || "U"}
                  </span>
                </div>
                <div>
                  <div className="text-sm font-semibold text-[var(--text-primary)]">{session.user.name}</div>
                  <div className="text-[10px] text-[var(--accent)] font-bold uppercase tracking-widest">
                    {session.user.role || "No Role"}
                  </div>
                </div>
              </div>
              <button
                onClick={handleSignOut}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 text-sm font-semibold rounded-lg text-[var(--text-secondary)] border border-[var(--border)] hover:bg-[var(--surface-subtle)] cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign Out
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* Mobile menu backdrop overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
    </>
  );
}
