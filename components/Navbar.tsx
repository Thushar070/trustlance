"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const { data: session, status } = useSession();
  const pathname = usePathname();

  const handleSignOut = () => {
    signOut({ callbackUrl: "/login" });
  };

  const isClient = session?.user?.role === "CLIENT";

  const getLinkClass = (href: string, exact = false) => {
    const isActive = exact ? pathname === href : pathname?.startsWith(href);
    return `inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-all duration-200 ${
      isActive
        ? "border-indigo-500 text-slate-900"
        : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700"
    }`;
  };

  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 shadow-[0_1px_3px_0_rgb(0_0_0/0.04)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link href="/" className="flex items-center gap-2 group">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-sm shadow-indigo-200/50 group-hover:shadow-md group-hover:shadow-indigo-300/50 transition-all duration-200">
                  <span className="text-white font-bold text-sm">T</span>
                </div>
                <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
                  TrustLance
                </span>
              </Link>
            </div>
            {session && (
              <div className="hidden sm:ml-8 sm:flex sm:space-x-6">
                <Link href="/" className={getLinkClass("/", true)}>
                  Dashboard
                </Link>
                {isClient && (
                  <Link href="/client/projects" className={getLinkClass("/client/projects")}>
                    My Projects
                  </Link>
                )}
                <Link href="/projects" className={getLinkClass("/projects")}>
                  Browse Projects
                </Link>
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            {status === "loading" ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full border-2 border-slate-200 border-t-indigo-500 animate-spin" />
                <span className="text-sm text-slate-400">Loading...</span>
              </div>
            ) : session ? (
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-100 to-violet-100 flex items-center justify-center ring-2 ring-white shadow-sm">
                    <span className="text-sm font-bold text-indigo-600">
                      {session.user.name?.[0]?.toUpperCase() || "U"}
                    </span>
                  </div>
                  <div className="hidden sm:flex flex-col text-right">
                    <span className="text-sm font-semibold text-slate-700 leading-tight">{session.user.name}</span>
                    <span className="text-[10px] text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full font-bold uppercase tracking-widest self-end mt-0.5 leading-tight">
                      {session.user.role || "No Role"}
                    </span>
                  </div>
                </div>
                <button
                  onClick={handleSignOut}
                  className="inline-flex items-center px-3.5 py-2 text-sm font-semibold rounded-lg text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 shadow-sm shadow-indigo-200/50 hover:shadow-md hover:shadow-indigo-300/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200 cursor-pointer"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="inline-flex items-center px-4 py-2 text-sm font-semibold rounded-lg text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 shadow-sm shadow-indigo-200/50 hover:shadow-md hover:shadow-indigo-300/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
