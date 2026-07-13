"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Shield, ArrowRight, MessageSquare, Search, Award, ChevronRight } from "lucide-react";
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
      <div className="flex-grow flex flex-col justify-center items-center py-12 px-4 bg-[var(--background)]">
        <div className="w-8 h-8 rounded-full border-4 border-[var(--border)] border-t-[var(--accent)] animate-spin mb-4" />
        <p className="text-sm text-[var(--text-secondary)] font-medium animate-pulse">Connecting securely...</p>
      </div>
    );
  }

  return (
    <div className="flex-grow flex flex-col bg-[var(--background)]">


      {/* ── Hero Section ── */}
      <section className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8 relative overflow-hidden bg-radial from-[var(--surface-subtle)] via-[var(--background)] to-[var(--background)]">
        <div className="max-w-4xl mx-auto text-center relative z-10">
          {/* Trust Badge Pill */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--brand-primary)] dark:text-[var(--accent)] text-xs font-bold uppercase tracking-wider mb-8 shadow-sm">
            <img src="/logo-mark.png" alt="" width={14} height={14} className="w-3.5 h-3.5 rounded-sm" />
            <span>Institutional-Grade Escrow Network</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-[var(--text-primary)] mb-6 leading-[1.08]">
            Trust the Process.<br />
            <span className="bg-gradient-to-r from-[var(--accent)] to-[var(--brand-primary)] bg-clip-text text-transparent">Secure the Talent.</span>
          </h1>
          <p className="text-base sm:text-lg text-[var(--text-secondary)] max-w-xl mx-auto mb-10 leading-relaxed font-medium">
            Escrow-protected milestone payments and credential-verified talent partnerships for professional enterprise contracts.
          </p>

          {/* Search bar inside hero */}
          <form onSubmit={handleSearchSubmit} className="max-w-2xl mx-auto mb-12">
            <div className="bg-[var(--surface)] p-2 rounded-2xl border border-[var(--border)] shadow-[var(--card-shadow-hover)] flex items-center gap-2">
              <div className="flex items-center gap-2 flex-grow pl-3">
                <Search className="w-5 h-5 text-[var(--text-muted)] flex-shrink-0" />
                <input
                  type="text"
                  placeholder="Search projects (e.g. AWS, Smart Contract, Design)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-transparent text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none py-2"
                />
              </div>
              <button
                type="submit"
                className="bg-[var(--brand-primary)] hover:bg-[var(--accent-hover)] text-white text-xs font-bold uppercase tracking-wider px-6 py-3.5 rounded-xl transition-all shadow-sm cursor-pointer whitespace-nowrap"
              >
                Find Opportunities
              </button>
            </div>
          </form>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/login"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl text-xs font-bold uppercase tracking-wider text-white bg-[var(--accent)] hover:bg-[var(--accent-hover)] transition-all shadow-[var(--card-shadow)] cursor-pointer"
            >
              Get Started
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <Link
              href="/login"
              className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-3.5 rounded-xl text-xs font-bold uppercase tracking-wider text-[var(--text-primary)] bg-[var(--surface)] border border-[var(--border)] hover:bg-[var(--surface-subtle)] transition-all cursor-pointer shadow-sm"
            >
              Browse Network
            </Link>
          </div>
        </div>
      </section>

      {/* ── Engineered for Trust — 3 Feature Cards ── */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 border-t border-[var(--border)]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-xs font-extrabold text-[var(--accent)] uppercase tracking-widest">Security Architecture</h2>
            <p className="text-2xl sm:text-3xl font-black text-[var(--text-primary)] mt-2 tracking-tight">Engineered for Trust</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1: Payment Protection */}
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-8 shadow-[var(--card-shadow)] hover:shadow-[var(--card-shadow-hover)] hover:-translate-y-0.5 transition-all duration-200">
              <div className="w-12 h-12 rounded-xl bg-[var(--accent-light)] flex items-center justify-center mb-6">
                <Shield className="w-6 h-6 text-[var(--accent)]" />
              </div>
              <h3 className="text-base font-extrabold text-[var(--text-primary)] mb-3">Milestone Escrow Protection</h3>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed font-medium">
                Contract funds are safely secured in smart escrow containers and auto-released only upon explicit client milestone approval.
              </p>
            </div>

            {/* Card 2: Verified Networks */}
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-8 shadow-[var(--card-shadow)] hover:shadow-[var(--card-shadow-hover)] hover:-translate-y-0.5 transition-all duration-200">
              <div className="w-12 h-12 rounded-xl bg-[var(--status-success-bg)] flex items-center justify-center mb-6">
                <Award className="w-6 h-6 text-[var(--status-success-text)]" />
              </div>
              <h3 className="text-base font-extrabold text-[var(--text-primary)] mb-3">Vetted Credentials</h3>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed font-medium">
                Identity and corporate status checks ensure all participants are legally validated, mitigating system fraud risks.
              </p>
            </div>

            {/* Card 3: Real-time Workspaces */}
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-8 shadow-[var(--card-shadow)] hover:shadow-[var(--card-shadow-hover)] hover:-translate-y-0.5 transition-all duration-200">
              <div className="w-12 h-12 rounded-xl bg-[var(--status-progress-bg)] flex items-center justify-center mb-6">
                <MessageSquare className="w-6 h-6 text-[var(--status-progress-text)]" />
              </div>
              <h3 className="text-base font-extrabold text-[var(--text-primary)] mb-3">Auditable Workspaces</h3>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed font-medium">
                Integrated milestones, code delivery interfaces, and legal dispute channels are archived in an immutable system audit trail.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Active Opportunities Section ── */}
      <section id="opportunities" className="py-16 px-4 sm:px-6 lg:px-8 border-t border-[var(--border)] bg-[var(--surface-subtle)]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-xs font-extrabold text-[var(--accent)] uppercase tracking-widest">Marketplace Overview</h2>
            <p className="text-2xl sm:text-3xl font-black text-[var(--text-primary)] mt-2 tracking-tight">Active Opportunities</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Project 1 */}
            <div className="bg-[var(--surface)] border border-[var(--border)] border-l-4 border-l-[var(--status-open-text)] rounded-xl p-6 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-4">
                  <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider block">Acme Enterprise</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[var(--status-open-bg)] text-[var(--status-open-text)] uppercase">Open</span>
                </div>
                <h4 className="text-sm font-extrabold text-[var(--text-primary)] mb-2 line-clamp-1">Enterprise Cloud Migration</h4>
                <p className="text-xs text-[var(--text-secondary)] mb-4 line-clamp-2 leading-relaxed">
                  Migrate legacy infrastructure components to high-availability AWS containers using CloudFormation.
                </p>
                <div className="flex flex-wrap gap-1.5 mb-6">
                  <span className="px-2 py-0.5 rounded bg-[var(--surface-subtle)] text-[var(--text-secondary)] text-[10px] font-semibold border border-[var(--border)]">AWS</span>
                  <span className="px-2 py-0.5 rounded bg-[var(--surface-subtle)] text-[var(--text-secondary)] text-[10px] font-semibold border border(--border)">CloudFormation</span>
                </div>
              </div>
              <div className="flex justify-between items-center border-t border-[var(--border-subtle)] pt-4">
                <span className="text-xs font-black text-[var(--text-primary)]">₹15,00,000</span>
                <span className="text-[10px] font-bold text-[var(--text-muted)]">2 days left</span>
              </div>
            </div>

            {/* Project 2 */}
            <div className="bg-[var(--surface)] border border-[var(--border)] border-l-4 border-l-[var(--status-open-text)] rounded-xl p-6 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-4">
                  <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider block">TrustLabs Security</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[var(--status-open-bg)] text-[var(--status-open-text)] uppercase">Open</span>
                </div>
                <h4 className="text-sm font-extrabold text-[var(--text-primary)] mb-2 line-clamp-1">Smart Contract Escrow Audit</h4>
                <p className="text-xs text-[var(--text-secondary)] mb-4 line-clamp-2 leading-relaxed">
                  Perform full white-box audit and static analysis checks on multi-signature escrow wallet contracts.
                </p>
                <div className="flex flex-wrap gap-1.5 mb-6">
                  <span className="px-2 py-0.5 rounded bg-[var(--surface-subtle)] text-[var(--text-secondary)] text-[10px] font-semibold border border-[var(--border)]">Solidity</span>
                  <span className="px-2 py-0.5 rounded bg-[var(--surface-subtle)] text-[var(--text-secondary)] text-[10px] font-semibold border border(--border)">Smart Contracts</span>
                </div>
              </div>
              <div className="flex justify-between items-center border-t border-[var(--border-subtle)] pt-4">
                <span className="text-xs font-black text-[var(--text-primary)]">₹4,00,000</span>
                <span className="text-[10px] font-bold text-[var(--text-muted)]">5 days left</span>
              </div>
            </div>

            {/* CTA Banner Card */}
            <div className="bg-[var(--brand-primary)] text-white rounded-xl p-6 shadow-md flex flex-col justify-between relative overflow-hidden">
              <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-24 h-24 rounded-full bg-white/5" />
              <div>
                <h4 className="text-sm font-extrabold uppercase tracking-wider text-[var(--accent)] mb-3">Enterprise Talent Portal</h4>
                <p className="text-xs text-white/80 mb-6 leading-relaxed">
                  Post detailed contract requirements or review existing verification files. Partner with verified developers securely.
                </p>
              </div>
              <Link
                href="/login"
                className="inline-flex items-center justify-between w-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-xs font-bold uppercase tracking-wider px-4 py-3 rounded-xl transition-all shadow-sm group"
              >
                <span>Access Network Now</span>
                <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── How TrustLance Works — 3 Steps ── */}
      <section id="how-it-works" className="py-16 px-4 sm:px-6 lg:px-8 border-t border-[var(--border)] bg-[var(--surface)]">
        <div className="max-w-4xl mx-auto border border-[var(--border)] rounded-2xl shadow-[var(--card-shadow)] p-8 sm:p-12">
          <h2 className="text-2xl sm:text-3xl font-black text-[var(--text-primary)] text-center mb-12 tracking-tight">
            How TrustLance Works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            {/* Step 1 */}
            <div className="flex flex-col items-center">
              <div className="w-14 h-14 rounded-full border-2 border-[var(--border)] flex items-center justify-center mb-4 bg-[var(--surface-subtle)] text-[var(--brand-primary)] shadow-sm">
                <span className="text-base font-black">1</span>
              </div>
              <h3 className="text-base font-extrabold text-[var(--text-primary)] mb-2">Scope Project</h3>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed max-w-xs font-medium">
                Define specifications, schedule milestones, and detail payment criteria clearly.
              </p>
            </div>

            {/* Step 2 */}
            <div className="flex flex-col items-center">
              <div className="w-14 h-14 rounded-full border-2 border-[var(--border)] flex items-center justify-center mb-4 bg-[var(--surface-subtle)] text-[var(--brand-primary)] shadow-sm">
                <span className="text-base font-black">2</span>
              </div>
              <h3 className="text-base font-extrabold text-[var(--text-primary)] mb-2">Fund Escrow</h3>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed max-w-xs font-medium">
                Lock contract payments into a milestone container securely. Work begins with complete payment safety.
              </p>
            </div>

            {/* Step 3 */}
            <div className="flex flex-col items-center">
              <div className="w-14 h-14 rounded-full border-2 border-[var(--accent)] bg-[var(--accent)] flex items-center justify-center mb-4 text-white shadow-md">
                <span className="text-base font-black">3</span>
              </div>
              <h3 className="text-base font-extrabold text-[var(--text-primary)] mb-2">Verify & Release</h3>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed max-w-xs font-medium">
                Inspect submissions. Verify requirements are met and release funds step-by-step.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Join Section ── */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 border-t border-[var(--border)] bg-[var(--background)]">
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-8 shadow-sm flex flex-col justify-between">
            <div>
              <h3 className="text-lg font-black text-[var(--text-primary)] mb-2">Hire Trusted Experts</h3>
              <p className="text-xs text-[var(--text-secondary)] mb-6 leading-relaxed">
                Connect with vetted freelancers, negotiate milestone scopes, and pay with transparent, secure escrow channels.
              </p>
            </div>
            <Link
              href="/login"
              className="inline-flex items-center justify-center px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-wider text-white bg-[var(--brand-primary)] hover:bg-[var(--accent-hover)] transition-all shadow-sm w-full"
            >
              Join as Client
            </Link>
          </div>

          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-8 shadow-sm flex flex-col justify-between">
            <div>
              <h3 className="text-lg font-black text-[var(--text-primary)] mb-2">Offer Enterprise Services</h3>
              <p className="text-xs text-[var(--text-secondary)] mb-6 leading-relaxed">
                Browse open milestones, apply with custom bid files, and work knowing contract funds are secured in escrow beforehand.
              </p>
            </div>
            <Link
              href="/login"
              className="inline-flex items-center justify-center px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-wider text-[var(--text-primary)] bg-[var(--surface-subtle)] border border-[var(--border)] hover:bg-[var(--surface)] transition-all shadow-sm w-full"
            >
              Join as Freelancer
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
