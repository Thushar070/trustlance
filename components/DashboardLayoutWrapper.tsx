"use client";

import { useSession, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import React, { useState, useEffect, useRef } from "react";
import ThemeToggle from "@/components/ThemeToggle";
import Navbar from "./Navbar";
import {
  Shield,
  Briefcase,
  CreditCard,
  AlertTriangle,
  LayoutDashboard,
  LogOut,
  Menu,
  X,
  User,
  Search,
  Users,
  FolderSearch,
  ChevronDown,
} from "lucide-react";

export default function DashboardLayoutWrapper({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close menus on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    window.addEventListener("click", handleOutsideClick);
    return () => window.removeEventListener("click", handleOutsideClick);
  }, []);

  // Prevent background scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  const handleSignOut = () => {
    signOut({ callbackUrl: "/login" });
  };

  const isClient = session?.user?.role === "CLIENT";
  const isFreelancer = session?.user?.role === "FREELANCER";
  const isAdmin = session?.user?.role === "ADMIN";

  const isDashboardRoute = pathname && !["/", "/login", "/select-role", "/complete-profile"].includes(pathname);

  // If loading or not authenticated or not on dashboard, render standard top navbar + children + footer
  if (status === "loading" || !session || !session.user?.profileCompleted || !isDashboardRoute) {
    return (
      <div className="flex-grow flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-1 flex flex-col">{children}</main>
        {pathname === "/" && (
          <footer className="border-t border-[var(--border)] bg-[var(--surface)]">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col sm:flex-row items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2.5">
                <img src="/logo-mark.png" alt="" width={18} height={18} className="w-[18px] h-[18px] rounded opacity-50" />
                <p className="text-xs text-[var(--text-muted)] font-medium tracking-wide">
                  © 2026 TrustLance. All rights reserved.
                </p>
              </div>
              <div className="flex items-center gap-6 text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] flex-wrap">
                <span>Secure</span>
                <span className="w-1 h-1 rounded-full bg-[var(--text-muted)] opacity-40" />
                <span>Verified</span>
                <span className="w-1 h-1 rounded-full bg-[var(--text-muted)] opacity-40" />
                <span>Escrow-Backed</span>
              </div>
            </div>
          </footer>
        )}
      </div>
    );
  }

  // Define sidebar links based on role
  const getSidebarLinks = () => {
    if (isAdmin) {
      return [
        { href: "/admin/overview", label: "Dashboard", icon: LayoutDashboard, exact: true },
        { href: "/admin/assignments", label: "Assignments", icon: Briefcase },
        { href: "/admin/disputes", label: "Disputes", icon: AlertTriangle },
        { href: "/admin/reports", label: "Reports Console", icon: Shield },
        { href: "/payments", label: "Payments Ledger", icon: CreditCard },
      ];
    }
    if (isClient) {
      return [
        { href: "/client/projects", label: "Dashboard", icon: LayoutDashboard },
        { href: "/search", label: "Search Directory", icon: Search },
        { href: "/connections", label: "Connections", icon: Users },
        { href: "/payments", label: "Payments Ledger", icon: CreditCard },
        { href: "/profile", label: "Settings", icon: User },
      ];
    }
    if (isFreelancer) {
      return [
        { href: "/projects", label: "Browse Projects", icon: FolderSearch },
        { href: "/search", label: "Search Directory", icon: Search },
        { href: "/connections", label: "Connections", icon: Users },
        { href: "/payments", label: "Payments Ledger", icon: CreditCard },
        { href: "/profile", label: "Settings", icon: User },
      ];
    }
    return [];
  };

  const links = getSidebarLinks();

  const getLinkClass = (href: string, exact = false) => {
    const isActive = exact ? pathname === href : pathname?.startsWith(href);
    return `flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors duration-150 ${
      isActive
        ? "bg-[var(--surface-subtle)] text-[var(--text-primary)]"
        : "text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)] hover:text-[var(--text-primary)]"
    }`;
  };

  return (
    <div className="flex-grow flex flex-col lg:flex-row min-h-screen bg-[var(--background)]">
      {/* 1. Desktop Sidebar */}
      <aside className="w-64 border-r border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] hidden lg:flex flex-col justify-between fixed top-0 bottom-0 left-0 z-30">
        <div>
          {/* Logo / Brand Header */}
          <div className="p-6 border-b border-[var(--border)] flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 group">
              <img src="/logo-mark.png" alt="TrustLance" className="w-6 h-6 rounded" />
              <div className="flex flex-col text-left">
                <span className="text-sm font-bold tracking-tight text-[var(--text-primary)] leading-tight">TrustLance</span>
                <span className="text-[8px] font-bold text-[var(--text-muted)] uppercase tracking-widest leading-tight">Escrow Division</span>
              </div>
            </Link>
          </div>

          {/* Links */}
          <nav className="p-4 space-y-1.5">
            {links.map((link) => (
              <Link key={link.href} href={link.href} className={getLinkClass(link.href, link.exact)}>
                <link.icon className="w-4 h-4 shrink-0 text-[var(--text-muted)]" />
                <span>{link.label}</span>
              </Link>
            ))}
          </nav>
        </div>

        {/* User profile dropdown & theme toggle at bottom */}
        <div className="p-4 border-t border-[var(--border)] space-y-3 bg-[var(--surface-subtle)]">
          <div className="flex items-center justify-between px-2">
            <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">Theme Mode</span>
            <ThemeToggle />
          </div>

          <div className="relative pt-2" ref={userMenuRef}>
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-[var(--border-subtle)] transition-colors text-left focus:outline-none cursor-pointer"
            >
              <div className="w-8 h-8 rounded-full bg-[var(--border)] flex items-center justify-center font-black text-sm text-[var(--text-primary)]">
                {session.user.name?.[0]?.toUpperCase() || "U"}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-[var(--text-primary)] truncate leading-tight">{session.user.name}</div>
                <div className="text-[9px] text-[var(--text-muted)] truncate leading-tight uppercase font-bold tracking-wider mt-0.5">
                  {session.user.role}
                </div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-[var(--text-muted)] transition-transform duration-200" />
            </button>

            {userMenuOpen && (
              <div className="absolute bottom-full left-0 right-0 mb-2 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border)] shadow-2xl py-1.5 z-50">
                <Link
                  href="/profile"
                  onClick={() => setUserMenuOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)] hover:text-[var(--text-primary)] transition-colors"
                >
                  <User className="w-4 h-4 shrink-0 text-[var(--text-muted)]" />
                  <span>Profile Settings</span>
                </Link>
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-left text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)] hover:text-red-500 transition-colors border-t border-[var(--border)] mt-1 pt-2 cursor-pointer"
                >
                  <LogOut className="w-4 h-4 shrink-0 text-[var(--text-muted)]" />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* 2. Mobile / Tablet Header Navigation */}
      <header className="lg:hidden w-full h-16 border-b border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] flex items-center justify-between px-6 sticky top-0 z-40">
        <Link href="/" className="flex items-center gap-2 text-[var(--text-primary)]">
          <img src="/logo-mark.png" alt="TrustLance" className="w-6 h-6 rounded" />
          <span className="text-sm font-bold tracking-tight">TrustLance</span>
        </Link>

        <div className="flex items-center gap-4">
          <ThemeToggle />
          <button
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Open navigation drawer"
            className="p-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-subtle)] hover:bg-[var(--border-subtle)] cursor-pointer"
          >
            <Menu className="w-5 h-5 text-[var(--text-primary)]" />
          </button>
        </div>
      </header>
      {/* Mobile Drawer Slide-over */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex flex-col bg-[var(--surface)] text-[var(--text-primary)] animate-in slide-in-from-right duration-200">
          <div className="flex items-center justify-between px-6 h-16 border-b border-[var(--border)]">
            <Link href="/" className="flex items-center gap-2 text-[var(--text-primary)]">
              <img src="/logo-mark.png" alt="TrustLance" className="w-6 h-6 rounded" />
              <span className="text-sm font-bold tracking-tight">TrustLance</span>
            </Link>
            <button
              onClick={() => setMobileMenuOpen(false)}
              aria-label="Close menu"
              className="p-2 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)] hover:text-[var(--text-primary)] cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Mobile links */}
          <nav className="flex-1 overflow-y-auto px-6 py-6 space-y-2">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)] hover:text-[var(--text-primary)] transition-colors"
              >
                <link.icon className="w-5 h-5 shrink-0 text-[var(--text-muted)]" />
                <span>{link.label}</span>
              </Link>
            ))}
          </nav>

          {/* Mobile Footer */}
          <div className="p-6 border-t border-[var(--border)] bg-[var(--surface-subtle)]">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-10 h-10 rounded-full bg-[var(--border)] flex items-center justify-center font-black text-base text-[var(--text-primary)]">
                {session.user.name?.[0]?.toUpperCase() || "U"}
              </div>
              <div>
                <div className="text-sm font-bold text-[var(--text-primary)] leading-tight">{session.user.name}</div>
                <div className="text-[10px] text-[var(--text-muted)] mt-0.5 leading-tight uppercase font-bold tracking-wider">{session.user.role}</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Link
                href="/profile"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-center gap-2 px-4 py-3 text-xs font-bold uppercase tracking-wider rounded-lg text-[var(--text-secondary)] bg-[var(--surface)] border border-[var(--border)] hover:bg-[var(--surface-subtle)] hover:text-[var(--text-primary)] transition-colors text-center"
              >
                <User className="w-4 h-4 shrink-0" />
                <span>Profile</span>
              </Link>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleSignOut();
                }}
                className="flex items-center justify-center gap-2 px-4 py-3 text-xs font-bold uppercase tracking-wider rounded-lg text-[var(--btn-primary-text)] bg-[var(--btn-primary)] hover:bg-[var(--btn-primary-hover)] transition-colors cursor-pointer text-center"
              >
                <LogOut className="w-4 h-4 shrink-0" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Right Content Pane */}
      <div className="flex-1 flex flex-col lg:pl-64 min-w-0 min-h-screen">
        {/* Top small breadcrumb bar */}
        <div className="hidden lg:flex items-center justify-between h-14 px-8 border-b border-[var(--border-subtle)] bg-[var(--surface)] text-xs text-[var(--text-muted)]">
          <div className="flex items-center gap-2 font-medium">
            <span className="uppercase tracking-wider font-semibold">Workspace</span>
            <span>/</span>
            <span className="text-[var(--text-primary)] font-bold capitalize">{pathname.split("/").pop() || "Dashboard"}</span>
          </div>
        </div>

        {/* Dynamic page container */}
        <main className="flex-1 flex flex-col p-6 sm:p-8 lg:p-10">
          {children}
        </main>

        {/* Dashboard Footer */}
        <footer className="border-t border-[var(--border-subtle)] bg-[var(--surface)] py-6 px-6 sm:px-8 lg:px-10 flex flex-col sm:flex-row items-center justify-between gap-3 text-left flex-wrap">
          <p className="text-[10px] text-[var(--text-muted)] font-medium tracking-wide">
            © 2026 TrustLance. All systems operational.
          </p>
          <div className="flex items-center gap-4 text-[9px] font-bold uppercase tracking-widest text-[var(--text-muted)] flex-wrap">
            <span>Terms</span>
            <span>Privacy</span>
            <span>Security</span>
            <span>Contact</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
