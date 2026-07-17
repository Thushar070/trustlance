"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  AlertTriangle,
  Award,
  Search,
  ArrowRight,
  Briefcase,
  Zap,
} from "lucide-react";
import { Role } from "@prisma/client";

export default function LandingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");

  // Redirect authenticated users to their correct dashboards
  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      const role = session.user.role;
      if (role === Role.ADMIN) {
        router.replace("/admin/overview");
      } else if (role === Role.CLIENT) {
        router.replace("/client/projects");
      } else if (role === Role.FREELANCER) {
        router.replace("/projects");
      } else {
        router.replace("/select-role");
      }
    }
  }, [status, session, router]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(`/login?query=${encodeURIComponent(searchQuery)}`);
  };

  // While checking auth state, display a loading spinner
  if (status === "loading" || status === "authenticated") {
    return (
      <div className="flex-grow flex flex-col justify-center items-center py-12 px-4 bg-black">
        <div className="w-6 h-6 rounded-full border-2 border-zinc-800 border-t-white animate-spin mb-4" />
        <p className="text-xs text-zinc-400 font-bold uppercase tracking-widest animate-pulse">Connecting securely...</p>
      </div>
    );
  }

  return (
    <div className="flex-grow flex flex-col bg-[var(--background)] text-[var(--foreground)] selection:bg-[var(--foreground)] selection:text-[var(--background)]">
      {/* Hero Section (Grid and status indicator style) */}
      <section className="pt-24 pb-16 px-4 sm:px-6 lg:px-8 relative overflow-hidden flex flex-col items-center text-center">
        {/* Decorative Grid Lines */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--border-subtle)_1px,transparent_1px),linear-gradient(to_bottom,var(--border-subtle)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-80" />

        <div className="max-w-4xl mx-auto relative z-10 space-y-6">
          {/* Status Badge Pill */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-zinc-800 bg-zinc-950 text-zinc-400 text-[10px] font-mono uppercase tracking-widest">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>System Status: Active</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold tracking-tight text-white leading-[1.05]">
            Secure payments for <br />
            <span className="text-zinc-200">freelance milestones.</span>
          </h1>

          <p className="text-xs sm:text-sm text-zinc-400 max-w-xl mx-auto leading-relaxed tracking-wide font-normal">
            TrustLance provides secure client-freelancer collaboration workflows. Lock milestone payments into structured application-level holding containers and release funds only after reviewing completed deliverables.
          </p>

          {/* Search bar explaining login requirements */}
          <form onSubmit={handleSearchSubmit} className="max-w-xl mx-auto pt-4">
            <div className="flex items-center gap-2 p-1 bg-zinc-950 border border-zinc-800 rounded-lg">
              <div className="flex items-center gap-2 flex-grow pl-3">
                <Search className="w-4 h-4 text-zinc-500 shrink-0" />
                <input
                  type="text"
                  placeholder="Search directory (Sign-in required)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-transparent text-xs text-white placeholder-zinc-500 focus:outline-none border-none py-2"
                />
              </div>
              <button
                type="submit"
                className="bg-white hover:bg-zinc-200 text-black text-[10px] font-bold uppercase tracking-widest px-4 py-2.5 rounded-md transition-colors cursor-pointer"
              >
                Search
              </button>
            </div>
          </form>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link
              href="/login"
              className="w-full sm:w-auto bg-white hover:bg-zinc-200 text-black font-bold text-xs uppercase tracking-widest px-6 py-3 rounded text-center transition-colors"
            >
              Start Escrow
            </Link>
            <Link
              href="/login"
              className="w-full sm:w-auto border border-zinc-800 hover:border-zinc-700 text-white font-bold text-xs uppercase tracking-widest px-6 py-3 rounded text-center transition-colors bg-transparent"
            >
              View Documentation
            </Link>
          </div>
        </div>
      </section>

      {/* Grid of 3 Honest Feature Cards (Image 1 style) */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto w-full">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Milestone Workflow */}
          <div className="border border-zinc-900 bg-zinc-950/40 hover:border-zinc-800 rounded-xl p-6 flex flex-col justify-between space-y-6 transition-colors shadow-sm text-left">
            <div className="space-y-3">
              <div className="w-8 h-8 rounded border border-zinc-800 bg-zinc-900 flex items-center justify-center text-white">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Milestone Escrow Workflow</h3>
              <p className="text-xs text-zinc-400 leading-relaxed font-light">
                Allocate project funds to specific milestone targets prior to development. Payments are held in a secure workflow state at the application level and only released after your formal approval.
              </p>
            </div>
            {/* Status panel */}
            <div className="p-3 bg-black border border-zinc-900 rounded font-mono text-[9px] text-zinc-500 space-y-1">
              <div className="flex justify-between">
                <span>Escrow Model</span>
                <span className="text-zinc-300">Application-Level Container</span>
              </div>
              <div className="flex justify-between">
                <span>Verification State</span>
                <span className="text-white">EscrowService Enforced</span>
              </div>
            </div>
          </div>

          {/* Card 2: Neutral Arbitration */}
          <div className="border border-zinc-900 bg-zinc-950/40 hover:border-zinc-800 rounded-xl p-6 flex flex-col justify-between space-y-6 transition-colors shadow-sm text-left">
            <div className="space-y-3">
              <div className="w-8 h-8 rounded border border-zinc-800 bg-zinc-900 flex items-center justify-center text-white">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Evidence-Based Disputes</h3>
              <p className="text-xs text-zinc-400 leading-relaxed font-light">
                If conflicts arise, parties can submit files, screenshots, and context comments. Platform administrators manually inspect all evidence and handle the final milestone capital release.
              </p>
            </div>
            {/* Status panel */}
            <div className="p-3 bg-black border border-zinc-900 rounded font-mono text-[9px] text-zinc-500 space-y-1">
              <div className="flex justify-between">
                <span>Audit Logs</span>
                <span className="text-zinc-300">Prisma Transaction Locked</span>
              </div>
              <div className="flex justify-between">
                <span>Mediation Console</span>
                <span className="text-white">Manual Admin Intervention</span>
              </div>
            </div>
          </div>

          {/* Card 3: Social Discovery */}
          <div className="border border-zinc-900 bg-zinc-950/40 hover:border-zinc-800 rounded-xl p-6 flex flex-col justify-between space-y-6 transition-colors shadow-sm text-left">
            <div className="space-y-3">
              <div className="w-8 h-8 rounded border border-zinc-800 bg-zinc-900 flex items-center justify-center text-white">
                <Award className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Discovery & Reputation</h3>
              <p className="text-xs text-zinc-400 leading-relaxed font-light">
                Discover collaboration counterparties securely. Verify reputations through direct connection directories, rating histories, and onboarding onboarding roles.
              </p>
            </div>
            {/* Status panel */}
            <div className="p-3 bg-black border border-zinc-900 rounded font-mono text-[9px] text-zinc-500 space-y-1">
              <div className="flex justify-between">
                <span>Reputation Layer</span>
                <span className="text-zinc-300">Collaborator Rating Logs</span>
              </div>
              <div className="flex justify-between">
                <span>Security Layer</span>
                <span className="text-white">Session Gated Inbox</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Monochromatic Dashboard Visual Mockup */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto w-full">
        <div className="text-center mb-10">
          <h2 className="text-xl font-bold tracking-tight text-white uppercase tracking-wider">The Control Center</h2>
          <p className="text-xs text-zinc-500 mt-1 font-light">A streamlined visual dashboard layout designed to track your active contract states.</p>
        </div>

        {/* Dashboard Mock Container */}
        <div className="border border-zinc-900 bg-zinc-950/20 rounded-xl overflow-hidden flex flex-col sm:flex-row h-72">
          {/* Left Mock Sidebar */}
          <div className="w-full sm:w-48 bg-zinc-950/40 border-b sm:border-b-0 sm:border-r border-zinc-900 p-4 space-y-2 shrink-0 text-left">
            <div className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest px-2 mb-3">Overview</div>
            <div className="px-3 py-1.5 text-xs font-semibold text-white bg-zinc-900 rounded">Active Contracts</div>
            <div className="px-3 py-1.5 text-xs font-semibold text-zinc-400 hover:text-white transition-colors">Pending Release</div>
            <div className="px-3 py-1.5 text-xs font-semibold text-zinc-400 hover:text-white transition-colors">Disputes</div>
          </div>

          {/* Right Mock Table */}
          <div className="flex-1 p-6 overflow-x-auto text-left">
            <div className="text-[9px] font-mono text-zinc-500 mb-4">/escrow/active-contracts</div>
            <table className="w-full text-left border-collapse text-[11px]">
              <thead>
                <tr className="border-b border-zinc-900 text-zinc-500 uppercase font-mono tracking-wider">
                  <th className="pb-2 font-light">Contract ID</th>
                  <th className="pb-2 font-light">Counterparty</th>
                  <th className="pb-2 font-light">Amount</th>
                  <th className="pb-2 font-light text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900 font-mono text-zinc-400">
                <tr>
                  <td className="py-3">TR-8492</td>
                  <td className="py-3">Acme Corp</td>
                  <td className="py-3">₹45,000.00</td>
                  <td className="py-3 text-right text-white">● Funded</td>
                </tr>
                <tr>
                  <td className="py-3">TR-8493</td>
                  <td className="py-3">Globex</td>
                  <td className="py-3">₹12,500.00</td>
                  <td className="py-3 text-right text-zinc-600">○ Pending</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── How It Works — 3 Steps ── */}
      <section id="how-it-works" className="py-20 border-t border-zinc-900">
        <div className="max-w-4xl mx-auto px-6 text-center space-y-12">
          <h2 className="text-xl font-bold uppercase tracking-wider text-white">
            How TrustLance Works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-full border border-zinc-800 flex items-center justify-center mx-auto text-zinc-400 font-mono text-xs">
                01
              </div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Scope Project</h3>
              <p className="text-xs text-zinc-400 leading-relaxed max-w-xs mx-auto">
                Define deliverables, schedule milestones, and detail payment criteria clearly.
              </p>
            </div>

            {/* Step 2 */}
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-full border border-zinc-800 flex items-center justify-center mx-auto text-zinc-400 font-mono text-xs">
                02
              </div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Fund Escrow</h3>
              <p className="text-xs text-zinc-400 leading-relaxed max-w-xs mx-auto">
                Lock contract payments into a milestone container securely. Work begins with complete payment safety.
              </p>
            </div>

            {/* Step 3 */}
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-full border border-white bg-white text-black flex items-center justify-center mx-auto font-mono text-xs">
                03
              </div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Verify & Release</h3>
              <p className="text-xs text-zinc-400 leading-relaxed max-w-xs mx-auto">
                Inspect submissions. Verify requirements are met and release funds step-by-step.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Join Section ── */}
      <section className="py-20 border-t border-zinc-900 bg-zinc-950/20">
        <div className="max-w-4xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
          <div className="border border-zinc-900 bg-zinc-950/40 p-8 rounded-lg flex flex-col justify-between space-y-6">
            <div>
              <h3 className="text-base font-bold text-white uppercase tracking-wider">Hire Trusted Experts</h3>
              <p className="text-xs text-zinc-400 leading-relaxed font-light mt-2">
                Connect with onboarded experts, negotiate milestone scopes, and pay with transparent, secure holding channels.
              </p>
            </div>
            <Link
              href="/login"
              className="bg-white hover:bg-zinc-200 text-black font-bold text-xs uppercase tracking-widest py-3.5 rounded text-center transition-colors"
            >
              Join as Client
            </Link>
          </div>

          <div className="border border-zinc-900 bg-zinc-950/40 p-8 rounded-lg flex flex-col justify-between space-y-6">
            <div>
              <h3 className="text-base font-bold text-white uppercase tracking-wider">Offer Technical Services</h3>
              <p className="text-xs text-zinc-400 leading-relaxed font-light mt-2">
                Browse open projects, apply with custom proposals, and work knowing contract funds are secured in the milestone workflow beforehand.
              </p>
            </div>
            <Link
              href="/login"
              className="border border-zinc-800 hover:border-zinc-700 text-white font-bold text-xs uppercase tracking-widest py-3.5 rounded text-center transition-colors bg-transparent"
            >
              Join as Freelancer
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
