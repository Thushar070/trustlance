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
      <section className="py-24 sm:py-32 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        {/* Subtle radial gradient background */}
        <div className="absolute inset-0 bg-radial from-[var(--surface-subtle)] via-[var(--background)] to-[var(--background)] opacity-60" />

        <div className="max-w-4xl mx-auto text-center relative z-10 animate-slideUp">
          {/* Trust Badge Pill */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--brand-primary)] dark:text-[var(--accent)] text-[10px] font-bold uppercase tracking-widest mb-8 shadow-sm">
            <img src="/logo-mark.png" alt="" width={14} height={14} className="w-3.5 h-3.5 rounded-sm" />
            <span>Institutional-Grade Escrow Network</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-[var(--text-primary)] mb-6 leading-[1.08]">
            Trust the Process.<br />
            <span className="bg-gradient-to-r from-[var(--accent)] to-[var(--brand-primary)] bg-clip-text text-transparent">Secure the Talent.</span>
          </h1>
          <p className="text-base sm:text-lg text-[var(--text-secondary)] max-w-xl mx-auto mb-12 leading-relaxed font-medium">
            Escrow-protected milestone payments and credential-verified talent partnerships for professional enterprise contracts.
          </p>

          {/* Search bar inside hero */}
          <form onSubmit={handleSearchSubmit} className="max-w-2xl mx-auto mb-12">
            <div className="card p-2 flex items-center gap-2 shadow-[var(--card-shadow-hover)]">
              <div className="flex items-center gap-2 flex-grow pl-3">
                <Search className="w-5 h-5 text-[var(--text-muted)] flex-shrink-0" />
                <input
                  type="text"
                  placeholder="Search projects (e.g. AWS, Smart Contract, Design)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-transparent text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none py-2.5 border-none shadow-none"
                />
              </div>
              <button
                type="submit"
                className="bg-[var(--brand-primary)] dark:bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-xs font-bold uppercase tracking-wider px-6 py-3.5 rounded-xl transition-all shadow-sm cursor-pointer whitespace-nowrap"
              >
                Find Opportunities
              </button>
            </div>
          </form>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/login"
              className="w-full sm:w-auto btn-primary px-8 py-3.5"
            >
              Get Started
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <Link
              href="/login"
              className="w-full sm:w-auto btn-ghost px-8 py-3.5"
            >
              Browse Network
            </Link>
          </div>
        </div>
      </section>

      {/* ── Engineered for Trust — 3 Feature Cards ── */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 border-t border-[var(--border)]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="section-header-label">Security Architecture</p>
            <h2 className="section-header-title text-2xl sm:text-3xl">Engineered for Trust</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 stagger-children">
            {/* Card 1: Payment Protection */}
            <div className="card p-8 card-hover-lift">
              <div className="w-12 h-12 rounded-xl bg-[var(--accent-light)] flex items-center justify-center mb-6">
                <Shield className="w-6 h-6 text-[var(--accent)]" />
              </div>
              <h3 className="text-base font-extrabold text-[var(--text-primary)] mb-3">Milestone Escrow Protection</h3>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed font-medium">
                Contract funds are safely secured in smart escrow containers and auto-released only upon explicit client milestone approval.
              </p>
            </div>

            {/* Card 2: Verified Networks */}
            <div className="card p-8 card-hover-lift">
              <div className="w-12 h-12 rounded-xl bg-[var(--status-success-bg)] flex items-center justify-center mb-6">
                <Award className="w-6 h-6 text-[var(--status-success-text)]" />
              </div>
              <h3 className="text-base font-extrabold text-[var(--text-primary)] mb-3">Vetted Credentials</h3>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed font-medium">
                Identity and corporate status checks ensure all participants are legally validated, mitigating system fraud risks.
              </p>
            </div>

            {/* Card 3: Real-time Workspaces */}
            <div className="card p-8 card-hover-lift">
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

      {/* ── How TrustLance Works — 3 Steps ── */}
      <section id="how-it-works" className="py-20 px-4 sm:px-6 lg:px-8 border-t border-[var(--border)] bg-[var(--surface)]">
        <div className="max-w-4xl mx-auto card p-8 sm:p-12">
          <h2 className="section-header-title text-2xl sm:text-3xl text-center mb-12">
            How TrustLance Works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center stagger-children">
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
      <section className="py-20 px-4 sm:px-6 lg:px-8 border-t border-[var(--border)] bg-[var(--background)]">
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 stagger-children">
          <div className="card p-8 flex flex-col justify-between">
            <div>
              <h3 className="text-lg font-black text-[var(--text-primary)] mb-2">Hire Trusted Experts</h3>
              <p className="text-xs text-[var(--text-secondary)] mb-6 leading-relaxed font-medium">
                Connect with vetted freelancers, negotiate milestone scopes, and pay with transparent, secure escrow channels.
              </p>
            </div>
            <Link
              href="/login"
              className="btn-primary w-full justify-center"
            >
              Join as Client
            </Link>
          </div>

          <div className="card p-8 flex flex-col justify-between">
            <div>
              <h3 className="text-lg font-black text-[var(--text-primary)] mb-2">Offer Enterprise Services</h3>
              <p className="text-xs text-[var(--text-secondary)] mb-6 leading-relaxed font-medium">
                Browse open milestones, apply with custom bid files, and work knowing contract funds are secured in escrow beforehand.
              </p>
            </div>
            <Link
              href="/login"
              className="btn-ghost w-full justify-center"
            >
              Join as Freelancer
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
