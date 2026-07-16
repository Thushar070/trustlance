"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Shield,
  ArrowRight,
  MessageSquare,
  Search,
  Award,
  Briefcase,
  DollarSign,
  ShieldCheck,
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
    if (!searchQuery.trim()) return;
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
      {/* Hero Section (Reference Mockup 2 style) */}
      <section className="pt-24 pb-16 px-4 sm:px-6 lg:px-8 relative overflow-hidden flex flex-col items-center text-center">
        {/* Decorative Grid Lines */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--border-subtle)_1px,transparent_1px),linear-gradient(to_bottom,var(--border-subtle)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-80" />

        <div className="max-w-4xl mx-auto relative z-10 space-y-6">
          {/* Status Badge Pill */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-500 dark:text-zinc-400 text-[10px] font-bold uppercase tracking-widest">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>System Status: Secure</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold tracking-tight text-black dark:text-white leading-[1.05]">
            Enterprise-grade<br />freelance escrow.
          </h1>

          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 max-w-xl mx-auto leading-relaxed tracking-wide font-normal">
            Secure collaboration infrastructure for Fortune 500s. We eliminate payment friction, ensure compliance, and streamline dispute resolution with architectural precision.
          </p>

          {/* Search bar integrated cleanly into Hero */}
          <form onSubmit={handleSearchSubmit} className="max-w-xl mx-auto pt-4">
            <div className="flex items-center gap-2 p-1 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg">
              <div className="flex items-center gap-2 flex-grow pl-3">
                <Search className="w-4 h-4 text-zinc-400 shrink-0" />
                <input
                  type="text"
                  placeholder="Search directory or projects (e.g. AWS, smart contract)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-transparent text-xs text-black dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none border-none py-2"
                />
              </div>
              <button
                type="submit"
                className="bg-black hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-200 dark:text-black text-[10px] font-bold uppercase tracking-widest px-4 py-2.5 rounded-md transition-colors cursor-pointer"
              >
                Search
              </button>
            </div>
          </form>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link
              href="/login"
              className="w-full sm:w-auto bg-black hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-200 dark:text-black font-bold text-xs uppercase tracking-widest px-6 py-3 rounded text-center transition-colors"
            >
              Start Escrow
            </Link>
            <Link
              href="/login"
              className="w-full sm:w-auto border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 text-black dark:text-white font-bold text-xs uppercase tracking-widest px-6 py-3 rounded text-center transition-colors"
            >
              View Documentation
            </Link>
          </div>
        </div>
      </section>

      {/* Grid of 4 Feature Cards (Reference Mockup 2 style) */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card 1 */}
          <div className="border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/30 rounded-lg p-6 flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="w-8 h-8 rounded border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-500 dark:text-zinc-400">
                <Shield className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-black dark:text-white uppercase tracking-wider">Cryptographic Security</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed font-light">
                Multi-signature escrow vaults ensure funds are only released upon cryptographic verification of milestone completion.
              </p>
            </div>
            {/* Mock panel box */}
            <div className="p-3 bg-white dark:bg-black border border-zinc-100 dark:border-zinc-900 rounded font-mono text-[9px] text-zinc-500 space-y-1">
              <div className="flex justify-between">
                <span>Status</span>
                <span className="text-emerald-500">● Verified</span>
              </div>
              <div className="flex justify-between">
                <span>Hash</span>
                <span>0x7a83...9f2b</span>
              </div>
            </div>
          </div>

          {/* Card 2 */}
          <div className="border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/30 rounded-lg p-6 flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="w-8 h-8 rounded border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-500 dark:text-zinc-400">
                <Zap className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-black dark:text-white uppercase tracking-wider">Regulatory Compliance</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed font-light">
                Automated tax reporting and cross-border regulatory adherence built-in to facilitate global enterprise payments.
              </p>
            </div>
            <div className="p-3 bg-white dark:bg-black border border-zinc-100 dark:border-zinc-900 rounded font-mono text-[9px] text-zinc-500 flex justify-between items-center">
              <span>KYB/AML Compliance</span>
              <span className="text-black dark:text-white">Active</span>
            </div>
          </div>

          {/* Card 3 */}
          <div className="border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/30 rounded-lg p-6 flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="w-8 h-8 rounded border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-500 dark:text-zinc-400">
                <Award className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-black dark:text-white uppercase tracking-wider">Neutral Arbitration</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed font-light">
                Smart-contract enforced dispute resolution protocols backed by professional third-party mediator panels.
              </p>
            </div>
            <div className="p-3 bg-white dark:bg-black border border-zinc-100 dark:border-zinc-900 rounded font-mono text-[9px] text-zinc-500 flex justify-between items-center">
              <span>Arbitration Node</span>
              <span className="text-zinc-500 dark:text-zinc-400">Online</span>
            </div>
          </div>

          {/* Card 4 */}
          <div className="border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/30 rounded-lg p-6 flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="w-8 h-8 rounded border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-500 dark:text-zinc-400">
                <Briefcase className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-black dark:text-white uppercase tracking-wider">Deterministic Workflows</h3>
              <p className="text-xs text-zinc-550 dark:text-zinc-400 leading-relaxed font-light">
                Map complex project deliverables to exact capital release schedules with automated triggers.
              </p>
            </div>
            {/* Slider mock */}
            <div className="p-3 bg-white dark:bg-black border border-zinc-100 dark:border-zinc-900 rounded space-y-2">
              <div className="h-1 bg-zinc-200 dark:bg-zinc-800 rounded overflow-hidden">
                <div className="h-full bg-black dark:bg-white w-2/3" />
              </div>
              <div className="flex justify-between font-mono text-[8px] text-zinc-400 dark:text-zinc-600">
                <span>Phase 1: Completed</span>
                <span>Phase 2: Escrow Lock</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* "The Control Center" Dashboard Visual Mockup Panel (Reference Image 2 bottom style) */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto w-full">
        <div className="text-center mb-10">
          <h2 className="text-xl font-bold tracking-tight uppercase tracking-wider">The Control Center</h2>
          <p className="text-xs text-zinc-500 mt-1 font-light">A strictly monochromatic interface designed for zero cognitive friction.</p>
        </div>

        {/* Dashboard Mock Container */}
        <div className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black rounded-lg overflow-hidden flex flex-col sm:flex-row h-72">
          {/* Left Mock Sidebar */}
          <div className="w-full sm:w-48 bg-zinc-50/50 dark:bg-zinc-950/50 border-b sm:border-b-0 sm:border-r border-zinc-100 dark:border-zinc-900 p-4 space-y-2 shrink-0">
            <div className="text-[9px] font-bold text-zinc-555 uppercase tracking-widest px-2 mb-3">Overview</div>
            <div className="px-3 py-1.5 text-xs font-semibold text-black dark:text-white bg-zinc-100 dark:bg-zinc-900 rounded">Active Contracts</div>
            <div className="px-3 py-1.5 text-xs font-semibold text-zinc-500 hover:text-black dark:hover:text-white transition-colors">Pending Release</div>
            <div className="px-3 py-1.5 text-xs font-semibold text-zinc-500 hover:text-black dark:hover:text-white transition-colors">Disputes</div>
          </div>

          {/* Right Mock Table */}
          <div className="flex-1 p-6 overflow-x-auto">
            <div className="text-[9px] font-mono text-zinc-400 dark:text-zinc-650 mb-4">/escrow/active-contracts</div>
            <table className="w-full text-left border-collapse text-[11px]">
              <thead>
                <tr className="border-b border-zinc-100 dark:border-zinc-900 text-zinc-500 uppercase font-mono tracking-wider">
                  <th className="pb-2 font-light">Contract ID</th>
                  <th className="pb-2 font-light">Counterparty</th>
                  <th className="pb-2 font-light">Amount</th>
                  <th className="pb-2 font-light text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900 font-mono text-zinc-500 dark:text-zinc-400">
                <tr>
                  <td className="py-3">TR-8492</td>
                  <td className="py-3">Acme Corp</td>
                  <td className="py-3">$45,000.00</td>
                  <td className="py-3 text-right text-black dark:text-white">● Funded</td>
                </tr>
                <tr>
                  <td className="py-3">TR-8493</td>
                  <td className="py-3">Globex</td>
                  <td className="py-3">$12,500.00</td>
                  <td className="py-3 text-right text-zinc-400 dark:text-zinc-600">○ Pending</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── How It Works — 3 Steps ── */}
      <section id="how-it-works" className="py-20 border-t border-zinc-200 dark:border-zinc-900">
        <div className="max-w-4xl mx-auto px-6 text-center space-y-12">
          <h2 className="text-xl font-bold uppercase tracking-wider text-black dark:text-white">
            How TrustLance Works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-full border border-zinc-200 dark:border-zinc-800 flex items-center justify-center mx-auto text-zinc-500 dark:text-zinc-400 font-mono text-xs">
                01
              </div>
              <h3 className="text-sm font-bold text-black dark:text-white uppercase tracking-wider">Scope Project</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed max-w-xs mx-auto">
                Define deliverables, schedule milestones, and detail payment criteria clearly.
              </p>
            </div>

            {/* Step 2 */}
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-full border border-zinc-200 dark:border-zinc-800 flex items-center justify-center mx-auto text-zinc-500 dark:text-zinc-400 font-mono text-xs">
                02
              </div>
              <h3 className="text-sm font-bold text-black dark:text-white uppercase tracking-wider">Fund Escrow</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed max-w-xs mx-auto">
                Lock contract payments into a milestone container securely. Work begins with complete payment safety.
              </p>
            </div>

            {/* Step 3 */}
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-full border border-black dark:border-white bg-black dark:bg-white text-white dark:text-black flex items-center justify-center mx-auto font-mono text-xs">
                03
              </div>
              <h3 className="text-sm font-bold text-black dark:text-white uppercase tracking-wider">Verify & Release</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed max-w-xs mx-auto">
                Inspect submissions. Verify requirements are met and release funds step-by-step.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Join Section ── */}
      <section className="py-20 border-t border-zinc-200 dark:border-zinc-900 bg-zinc-50/30 dark:bg-zinc-950/20">
        <div className="max-w-4xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="border border-zinc-200 dark:border-zinc-850 p-8 rounded-lg flex flex-col justify-between space-y-6">
            <div>
              <h3 className="text-base font-bold text-black dark:text-white uppercase tracking-wider">Hire Trusted Experts</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed font-light mt-2">
                Connect with vetted freelancers, negotiate milestone scopes, and pay with transparent, secure escrow channels.
              </p>
            </div>
            <Link
              href="/login"
              className="bg-black hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-200 dark:text-black font-bold text-xs uppercase tracking-widest py-3.5 rounded text-center transition-colors"
            >
              Join as Client
            </Link>
          </div>

          <div className="border border-zinc-200 dark:border-zinc-850 p-8 rounded-lg flex flex-col justify-between space-y-6">
            <div>
              <h3 className="text-base font-bold text-black dark:text-white uppercase tracking-wider">Offer Enterprise Services</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed font-light mt-2">
                Browse open milestones, apply with custom bid files, and work knowing contract funds are secured in escrow beforehand.
              </p>
            </div>
            <Link
              href="/login"
              className="border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 text-black dark:text-white font-bold text-xs uppercase tracking-widest py-3.5 rounded text-center transition-colors"
            >
              Join as Freelancer
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
