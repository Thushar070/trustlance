"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import Logo from "@/components/Logo";
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
  ChevronDown,
  Search,
  Users,
} from "lucide-react";

export default function Navbar() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const moreMenuRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close menus on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setMoreMenuOpen(false);
      }
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

  const getLinkClass = (href: string, exact = false) => {
    const isActive = exact ? pathname === href : pathname?.startsWith(href);
    return `inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold rounded-lg transition-colors duration-150 ${
      isActive
        ? "bg-[var(--accent-light)] text-[var(--accent)]"
        : "text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)] hover:text-[var(--text-primary)]"
    }`;
  };

  const getMobileLinkClass = (href: string, exact = false) => {
    const isActive = exact ? pathname === href : pathname?.startsWith(href);
    return `flex items-center gap-3 px-4 py-3.5 rounded-xl text-base font-semibold transition-colors duration-150 ${
      isActive
        ? "bg-[var(--accent-light)] text-[var(--accent)]"
        : "text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)] hover:text-[var(--text-primary)]"
    }`;
  };

  // Define desktop and mobile link hierarchies
  const getDesktopLinks = () => {
    if (isAdmin) {
      return {
        critical: [
          { href: "/admin/overview", label: "Overview", icon: LayoutDashboard, exact: true },
          { href: "/admin/assignments", label: "Assignments", icon: Briefcase, exact: false },
        ],
        more: [
          { href: "/admin/disputes", label: "Disputes", icon: AlertTriangle, exact: false },
          { href: "/admin/reports", label: "Reports", icon: Shield, exact: false },
          { href: "/payments", label: "Payments", icon: CreditCard, exact: false },
        ]
      };
    }
    if (isClient) {
      return {
        critical: [
          { href: "/client/projects", label: "My Projects", icon: Briefcase, exact: false },
          { href: "/search", label: "Search", icon: Search, exact: false },
          { href: "/connections", label: "Connections", icon: Users, exact: false },
          { href: "/payments", label: "Payments", icon: CreditCard, exact: false },
        ],
        more: []
      };
    }
    if (isFreelancer) {
      return {
        critical: [
          { href: "/projects", label: "Browse Projects", icon: FolderSearch, exact: false },
          { href: "/search", label: "Search", icon: Search, exact: false },
          { href: "/connections", label: "Connections", icon: Users, exact: false },
          { href: "/payments", label: "Payments", icon: CreditCard, exact: false },
        ],
        more: []
      };
    }
    return { critical: [], more: [] };
  };

  const getMobileLinks = () => {
    const links = [];
    if (isAdmin) {
      links.push(
        { href: "/admin/overview", label: "Admin Overview", icon: LayoutDashboard, exact: true },
        { href: "/admin/assignments", label: "Assignments", icon: Briefcase, exact: false },
        { href: "/admin/disputes", label: "Disputes", icon: AlertTriangle, exact: false },
        { href: "/admin/reports", label: "Reports Audit", icon: Shield, exact: false },
        { href: "/payments", label: "Payments Ledger", icon: CreditCard, exact: false }
      );
    } else if (isClient) {
      links.push(
        { href: "/client/projects", label: "My Projects", icon: Briefcase, exact: false },
        { href: "/search", label: "Search Directory", icon: Search, exact: false },
        { href: "/connections", label: "Connections Inbox", icon: Users, exact: false },
        { href: "/payments", label: "Payments Ledger", icon: CreditCard, exact: false }
      );
    } else if (isFreelancer) {
      links.push(
        { href: "/projects", label: "Browse Projects", icon: FolderSearch, exact: false },
        { href: "/search", label: "Search Directory", icon: Search, exact: false },
        { href: "/connections", label: "Connections Inbox", icon: Users, exact: false },
        { href: "/payments", label: "Payments Ledger", icon: CreditCard, exact: false }
      );
    }
    return links;
  };

  const desktopLinks = getDesktopLinks();
  const mobileLinks = getMobileLinks();

  return (
    <>
      <nav className="glass sticky top-0 z-40 border-b border-[var(--border)] shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            {/* Left side brand name & logo */}
            <div className="flex items-center">
              <Link href="/" className="flex items-center gap-2 group mr-6 shrink-0">
                <Logo className="w-8 h-8" />
                <span className="text-lg font-bold tracking-tight text-[var(--text-primary)]">
                  Trust<span className="text-[var(--accent)]">Lance</span>
                </span>
              </Link>

              {/* Desktop links */}
              {session && session.user?.profileCompleted ? (
                <div className="hidden lg:flex items-center space-x-2">
                  {desktopLinks.critical.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={getLinkClass(link.href, link.exact)}
                    >
                      <link.icon className="w-4 h-4 shrink-0" />
                      <span>{link.label}</span>
                    </Link>
                  ))}

                  {/* Desktop "More" Dropdown (For Admin or overflow) */}
                  {desktopLinks.more.length > 0 && (
                    <div className="relative" ref={moreMenuRef}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setMoreMenuOpen(!moreMenuOpen);
                          setUserMenuOpen(false);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold rounded-lg text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)] hover:text-[var(--text-primary)] transition-all cursor-pointer focus:outline-none"
                      >
                        <span>More</span>
                        <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${moreMenuOpen ? "rotate-180" : ""}`} />
                      </button>

                      {moreMenuOpen && (
                        <div className="absolute left-0 mt-1.5 w-48 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border)] shadow-lg py-1.5 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                          {desktopLinks.more.map((link) => (
                            <Link
                              key={link.href}
                              href={link.href}
                              onClick={() => setMoreMenuOpen(false)}
                              className="flex items-center gap-2 px-4 py-2.5 text-sm text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)] hover:text-[var(--text-primary)] transition-colors"
                            >
                              <link.icon className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
                              <span>{link.label}</span>
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                !session && (
                  <div className="hidden sm:flex items-center gap-6 ml-6">
                    <Link
                      href="/"
                      className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                    >
                      Home
                    </Link>
                    <Link
                      href={pathname === "/" ? "#how-it-works" : "/#how-it-works"}
                      className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                    >
                      How It Works
                    </Link>
                    <Link
                      href={pathname === "/" ? "#opportunities" : "/#opportunities"}
                      className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                    >
                      Opportunities
                    </Link>
                  </div>
                )
              )}
            </div>

            {/* Right side controls (User Profile) */}
            <div className="flex items-center gap-3">

              {status === "loading" ? (
                <div className="flex items-center justify-center w-8 h-8">
                  <div className="w-4 h-4 rounded-full border-2 border-[var(--border)] border-t-[var(--accent)] animate-spin" />
                </div>
              ) : session ? (
                <>
                  {/* Desktop User Dropdown */}
                  <div className="hidden lg:block relative" ref={userMenuRef}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setUserMenuOpen(!userMenuOpen);
                        setMoreMenuOpen(false);
                      }}
                      className="flex items-center gap-2.5 p-1 rounded-full hover:bg-[var(--surface-subtle)] transition-colors cursor-pointer focus:outline-none"
                    >
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--gradient-subtle-from)] to-[var(--gradient-subtle-to)] flex items-center justify-center ring-2 ring-[var(--surface)] shadow-sm">
                        <span className="text-sm font-bold text-[var(--accent)]">
                          {session.user.name?.[0]?.toUpperCase() || "U"}
                        </span>
                      </div>
                      <ChevronDown className={`w-4 h-4 text-[var(--text-muted)] transition-transform duration-200 ${userMenuOpen ? "rotate-180" : ""}`} />
                    </button>

                    {userMenuOpen && (
                      <div className="absolute right-0 mt-1.5 w-56 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border)] shadow-lg py-2 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                        <div className="px-4 py-2.5 border-b border-[var(--border)] mb-1.5">
                          <div className="text-sm font-bold text-[var(--text-primary)] truncate">{session.user.name}</div>
                          <div className="inline-block text-[9px] text-[var(--accent)] bg-[var(--accent-light)] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border border-[var(--border)] mt-1">
                            {session.user.role || "No Role"}
                          </div>
                        </div>
                        <Link
                          href="/profile"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2 px-4 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)] hover:text-[var(--text-primary)] transition-colors"
                        >
                          <User className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
                          <span>Profile Settings</span>
                        </Link>
                        <button
                          onClick={handleSignOut}
                          className="w-full flex items-center gap-2 px-4 py-2 text-sm text-left text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)] hover:text-[var(--status-negative-text)] transition-colors cursor-pointer border-t border-[var(--border)] mt-1.5 pt-2"
                        >
                          <LogOut className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
                          <span>Sign Out</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Hamburger menu button for mobile */}
                  {session.user?.profileCompleted && (
                    <button
                      onClick={() => setMobileMenuOpen(true)}
                      aria-label="Open menu"
                      className="lg:hidden inline-flex items-center justify-center p-2 rounded-lg text-[var(--text-muted)] hover:bg-[var(--surface-subtle)] hover:text-[var(--text-primary)] cursor-pointer focus:outline-none"
                    >
                      <Menu className="w-6 h-6" />
                    </button>
                  )}
                </>
              ) : (
                <div className="flex items-center gap-4">
                  {pathname !== "/login" && (
                    <>
                      <Link
                        href="/login"
                        className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors px-3 py-1.5"
                      >
                        Login
                      </Link>
                      <Link
                        href="/login"
                        className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold uppercase tracking-wider text-[var(--btn-primary-text)] bg-[var(--accent)] hover:bg-[var(--accent-hover)] rounded-lg transition-all shadow-[var(--card-shadow)]"
                      >
                        <Shield className="w-3.5 h-3.5" />
                        Sign Up
                      </Link>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Full-screen Mobile Menu Slide-in Panel */}
      {mobileMenuOpen && session && (
        <div className="fixed inset-0 z-50 lg:hidden flex flex-col bg-[var(--surface)] animate-in slide-in-from-right duration-200">
          {/* Header Row */}
          <div className="flex items-center justify-between px-6 h-16 border-b border-[var(--border)]">
            <div className="flex items-center gap-2">
              <Logo className="w-8 h-8" />
              <span className="text-lg font-bold tracking-tight text-[var(--text-primary)]">
                Trust<span className="text-[var(--accent)]">Lance</span>
              </span>
            </div>
            <button
              onClick={() => setMobileMenuOpen(false)}
              aria-label="Close menu"
              className="p-2 rounded-lg text-[var(--text-muted)] hover:bg-[var(--surface-subtle)] hover:text-[var(--text-primary)] cursor-pointer focus:outline-none"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Links Area */}
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-2">
            {mobileLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={getMobileLinkClass(link.href, link.exact)}
              >
                <link.icon className="w-5 h-5 shrink-0" />
                <span>{link.label}</span>
              </Link>
            ))}
          </div>

          {/* Footer Area with User Profile & Sign Out */}
          <div className="p-6 border-t border-[var(--border)] bg-[var(--surface-subtle)]">
            <div className="flex items-center gap-4 mb-5">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[var(--gradient-subtle-from)] to-[var(--gradient-subtle-to)] flex items-center justify-center ring-2 ring-[var(--surface)] shadow-md">
                <span className="text-base font-bold text-[var(--accent)]">
                  {session.user.name?.[0]?.toUpperCase() || "U"}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-base font-bold text-[var(--text-primary)] truncate">{session.user.name}</div>
                <div className="text-xs text-[var(--text-secondary)] truncate">{session.user.email}</div>
                <div className="inline-block text-[9px] text-[var(--accent)] bg-[var(--accent-light)] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider border border-[var(--border)] mt-1.5">
                  {session.user.role || "No Role"}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Link
                href="/profile"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-center gap-2 px-4 py-3 text-sm font-bold rounded-xl text-[var(--text-secondary)] bg-[var(--surface)] border border-[var(--border)] hover:bg-[var(--surface-subtle)] hover:text-[var(--text-primary)] transition-colors text-center"
              >
                <User className="w-4 h-4 shrink-0" />
                <span>Profile</span>
              </Link>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleSignOut();
                }}
                className="flex items-center justify-center gap-2 px-4 py-3 text-sm font-bold rounded-xl text-[var(--btn-primary-text)] bg-[var(--accent)] hover:bg-[var(--accent-hover)] transition-colors cursor-pointer text-center"
              >
                <LogOut className="w-4 h-4 shrink-0" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
