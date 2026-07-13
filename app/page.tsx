"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
import { Shield, ArrowRight, Users, MessageSquare } from "lucide-react";
import { Role } from "@prisma/client";

export default function LandingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

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
        // Fallback for logged in users with no role yet
        router.replace("/select-role");
      }
    }
  }, [status, session, router]);

  // While checking auth state, display a loading spinner
  if (status === "loading" || status === "authenticated") {
    return (
      <div className="flex-grow flex flex-col justify-center items-center py-12 px-4 bg-[var(--background)]">
        <div className="w-8 h-8 rounded-full border-4 border-[var(--border)] border-t-[var(--accent)] animate-spin mb-4" />
        <p className="text-sm text-[var(--text-secondary)] font-medium">Redirecting you to dashboard...</p>
      </div>
    );
  }

  return (
    <div className="flex-grow flex flex-col bg-[var(--background)]">
      {/* ── Sticky Nav ── */}
      <nav className="sticky top-0 z-30 bg-[var(--surface)]/80 backdrop-blur-lg border-b border-[var(--border)]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="text-lg font-bold text-[var(--accent)] tracking-tight">TrustLance</Link>
            <div className="hidden sm:flex items-center gap-5">
              <Link href="/" className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-medium transition-colors">Home</Link>
              <a href="#how-it-works" className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-medium transition-colors">How It Works</a>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors px-3 py-1.5"
            >
              Login
            </Link>
            <Link
              href="/login"
              className="text-sm font-semibold text-white bg-[var(--accent)] hover:bg-[var(--accent-hover)] px-4 py-2 rounded-lg transition-colors"
            >
              Sign Up
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero Section ── */}
      <section className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-[var(--text-primary)] mb-6 leading-[1.1]">
            The Secure Bridge for{" "}
            <span className="text-[var(--accent)]">Elite Freelancing.</span>
          </h1>
          <p className="text-base sm:text-lg text-[var(--text-secondary)] max-w-2xl mx-auto mb-10 leading-relaxed">
            Escrow-protected payments and professional networking for the modern marketplace. Connect with top talent without financial risk.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/login"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-lg text-sm font-bold text-white bg-[var(--accent)] hover:bg-[var(--accent-hover)] transition-all shadow-sm cursor-pointer"
            >
              Get Started
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/login"
              className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-3.5 rounded-lg text-sm font-semibold text-[var(--text-primary)] bg-[var(--surface)] border border-[var(--border)] hover:bg-[var(--surface-subtle)] transition-all cursor-pointer shadow-[var(--card-shadow)]"
            >
              Browse Marketplace
            </Link>
          </div>
        </div>
      </section>

      {/* ── Engineered for Trust — 3 Feature Cards ── */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)] text-center mb-12 tracking-tight">
            Engineered for Trust
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1: Payment Protection */}
            <div className="bg-[var(--surface)] rounded-2xl p-6 shadow-[var(--card-shadow)] hover:shadow-[var(--card-shadow-hover)] transition-shadow duration-200">
              <div className="w-10 h-10 rounded-xl bg-[var(--accent-light)] flex items-center justify-center mb-4">
                <Shield className="w-5 h-5 text-[var(--accent)]" />
              </div>
              <h3 className="text-base font-bold text-[var(--text-primary)] mb-2">Payment Protection (Escrow)</h3>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                Funds are securely held in escrow until milestones are approved. Zero financial risk for high-stakes projects.
              </p>
            </div>

            {/* Card 2: Verified Networks */}
            <div className="bg-[var(--surface)] rounded-2xl p-6 shadow-[var(--card-shadow)] hover:shadow-[var(--card-shadow-hover)] transition-shadow duration-200">
              <div className="w-10 h-10 rounded-xl bg-[var(--status-success-bg)] flex items-center justify-center mb-4">
                <Users className="w-5 h-5 text-[var(--status-success-text)]" />
              </div>
              <h3 className="text-base font-bold text-[var(--text-primary)] mb-2">Verified Networks</h3>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                Every professional is rigorously vetted. Connect only with top-tier talent and reliable enterprises.
              </p>
            </div>

            {/* Card 3: Real-time Workspaces */}
            <div className="bg-[var(--surface)] rounded-2xl p-6 shadow-[var(--card-shadow)] hover:shadow-[var(--card-shadow-hover)] transition-shadow duration-200">
              <div className="w-10 h-10 rounded-xl bg-[var(--status-progress-bg)] flex items-center justify-center mb-4">
                <MessageSquare className="w-5 h-5 text-[var(--status-progress-text)]" />
              </div>
              <h3 className="text-base font-bold text-[var(--text-primary)] mb-2">Real-time Workspaces</h3>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                Collaborate securely within our platform. Integrated messaging and contract management in one unified hub.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── How TrustLance Works — 3 Steps ── */}
      <section id="how-it-works" className="py-16 px-4 sm:px-6 lg:px-8 bg-[var(--surface-subtle)]">
        <div className="max-w-4xl mx-auto bg-[var(--surface)] rounded-2xl shadow-[var(--card-shadow)] p-8 sm:p-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)] text-center mb-12 tracking-tight">
            How TrustLance Works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            {/* Step 1 */}
            <div className="flex flex-col items-center">
              <div className="w-14 h-14 rounded-full border-2 border-[var(--border)] flex items-center justify-center mb-4 bg-[var(--surface)]">
                <span className="text-lg font-bold text-[var(--text-primary)]">1</span>
              </div>
              <h3 className="text-base font-bold text-[var(--text-primary)] mb-2">Post</h3>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed max-w-xs">
                Define your project scope and budget clearly to attract the right expertise.
              </p>
            </div>

            {/* Step 2 */}
            <div className="flex flex-col items-center">
              <div className="w-14 h-14 rounded-full border-2 border-[var(--border)] flex items-center justify-center mb-4 bg-[var(--surface)]">
                <span className="text-lg font-bold text-[var(--text-primary)]">2</span>
              </div>
              <h3 className="text-base font-bold text-[var(--text-primary)] mb-2">Hire</h3>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed max-w-xs">
                Review vetted proposals, interview candidates securely, and lock in contracts.
              </p>
            </div>

            {/* Step 3 */}
            <div className="flex flex-col items-center">
              <div className="w-14 h-14 rounded-full border-2 border-[var(--accent)] bg-[var(--accent)] flex items-center justify-center mb-4">
                <span className="text-lg font-bold text-white">3</span>
              </div>
              <h3 className="text-base font-bold text-[var(--text-primary)] mb-2">Secure</h3>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed max-w-xs">
                Fund the escrow. Work begins safely. Pay only when milestones are met.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
