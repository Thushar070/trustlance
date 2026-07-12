"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
import { Shield, ArrowRight, FilePlus2, CheckCircle2, DollarSign } from "lucide-react";
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
      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 px-4 sm:px-6 lg:px-8 border-b border-[var(--border)] bg-gradient-to-b from-[var(--surface-subtle)] to-[var(--background)]">
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[var(--accent-light)] text-[var(--accent)] border border-[var(--border)] mb-6 uppercase tracking-wider">
            <Shield className="w-3.5 h-3.5" />
            Verified Escrow Protection
          </span>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-[var(--text-primary)] mb-6 leading-tight">
            The Safe Way to Hire and Work <br className="hidden sm:inline" />
            With <span className="text-[var(--accent)]">Structured Escrow</span>
          </h1>
          <p className="text-base sm:text-lg text-[var(--text-secondary)] max-w-2xl mx-auto mb-10 leading-relaxed">
            TrustLance is a modern freelance marketplace where client payments are locked safely in escrow and only released to freelancers upon successful, approved milestone deliverables.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/login"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-lg text-sm font-semibold text-white bg-[var(--accent)] hover:bg-[var(--accent-hover)] transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--accent)] cursor-pointer"
            >
              Get Started
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/login"
              className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-3.5 rounded-lg text-sm font-semibold text-[var(--text-secondary)] bg-[var(--surface)] border border-[var(--border)] hover:bg-[var(--surface-subtle)] hover:text-[var(--text-primary)] transition-all cursor-pointer"
            >
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)] tracking-tight mb-4">
            How TrustLance Protects Your Work
          </h2>
          <p className="text-sm sm:text-base text-[var(--text-secondary)] max-w-md mx-auto">
            A simple, secure, and structured three-step process built to align incentives and guarantee payment safety.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Step 1 */}
          <div className="p-6 bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-[var(--accent-light)] rounded-bl-full -z-10 group-hover:scale-110 transition-transform duration-200" />
            <div className="w-10 h-10 rounded-lg bg-[var(--accent-light)] flex items-center justify-center text-[var(--accent)] font-bold text-lg mb-4">
              <FilePlus2 className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-[var(--text-primary)] mb-2">1. Post a Project</h3>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
              Clients define project terms, requirements, and budget milestones. Qualified freelancers submit tailored application proposals.
            </p>
          </div>

          {/* Step 2 */}
          <div className="p-6 bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-[var(--status-progress-bg)] rounded-bl-full -z-10 group-hover:scale-110 transition-transform duration-200" />
            <div className="w-10 h-10 rounded-lg bg-[var(--status-progress-bg)] flex items-center justify-center text-[var(--status-progress-text)] font-bold text-lg mb-4">
              <DollarSign className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-[var(--text-primary)] mb-2">2. Secure Milestone Funds</h3>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
              Before work starts, the client funds the project. The payment is held securely in the platform escrow, ensuring the freelancer is guaranteed payment upon delivery.
            </p>
          </div>

          {/* Step 3 */}
          <div className="p-6 bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-[var(--status-success-bg)] rounded-bl-full -z-10 group-hover:scale-110 transition-transform duration-200" />
            <div className="w-10 h-10 rounded-lg bg-[var(--status-success-bg)] flex items-center justify-center text-[var(--status-success-text)] font-bold text-lg mb-4">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-[var(--text-primary)] mb-2">3. Approve & Release</h3>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
              The freelancer submits their completed deliverables directly. Once the client reviews and approves the work, funds are released immediately.
            </p>
          </div>
        </div>
      </section>

      {/* Trust & Escrow Detail Card Section */}
      <section className="py-16 bg-[var(--surface-subtle)] border-t border-b border-[var(--border)] px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto bg-[var(--surface)] rounded-2xl border border-[var(--border)] shadow-sm p-8 sm:p-10 flex flex-col md:flex-row items-center gap-8">
          <div className="w-16 h-16 rounded-2xl bg-[var(--accent-light)] flex items-center justify-center text-[var(--accent)] flex-shrink-0">
            <Shield className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">Platform Dispute Resolution</h3>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
              In case of mismatched expectations, either side can initiate a dispute. Our dedicated moderators review the project specifications, messaging logs, and submitted work history to issue a fair resolve.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
