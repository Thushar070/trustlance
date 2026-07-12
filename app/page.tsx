"use client";

import { useSession } from "next-auth/react";
import { Key, Shield, CreditCard, FolderUp } from "lucide-react";

export default function Home() {
  const { data: session } = useSession();

  return (
    <div className="flex-grow flex flex-col items-center justify-center p-6 sm:p-10 bg-[var(--background)]">
      <div className="max-w-3xl w-full bg-[var(--surface)] rounded-xl shadow-sm border border-[var(--border)] p-8 sm:p-12 text-center relative overflow-hidden">
        <div className="relative">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold bg-[var(--accent-light)] text-[var(--accent)] border border-[var(--border)] mb-5 uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse" />
            TrustLance Workspace
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)] tracking-tight mb-3">
            Welcome back, <span className="text-[var(--accent)]">{session?.user?.name || "User"}</span>!
          </h1>
          <p className="text-sm text-[var(--text-secondary)] max-w-lg mx-auto mb-8 leading-relaxed">
            You are currently signed in as a <span className="font-semibold text-[var(--accent)] uppercase text-xs bg-[var(--accent-light)] px-2 py-0.5 rounded-md border border-[var(--border)]">{session?.user?.role || "user"}</span>.
            Use the dashboard menu to navigate the escrow workflows.
          </p>

          <div className="border-t border-[var(--border-subtle)] pt-8">
            <h2 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-5">Platform Capabilities</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left max-w-xl mx-auto">
              <div className="group p-4 bg-[var(--surface-subtle)] rounded-xl border border-[var(--border)] hover:shadow-md hover:border-[var(--text-muted)] transition-all duration-150">
                <span className="font-semibold text-[var(--text-primary)] block mb-1.5 text-sm flex items-center gap-1.5">
                  <Key className="w-4 h-4 text-[var(--accent)]" /> Secure Sign-In
                </span>
                <span className="text-xs text-[var(--text-secondary)] leading-relaxed">Seamless sign-in utilizing secure, trusted identity providers.</span>
              </div>
              <div className="group p-4 bg-[var(--surface-subtle)] rounded-xl border border-[var(--border)] hover:shadow-md hover:border-[var(--text-muted)] transition-all duration-150">
                <span className="font-semibold text-[var(--text-primary)] block mb-1.5 text-sm flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-[var(--status-success-text)]" /> Tailored Workspaces
                </span>
                <span className="text-xs text-[var(--text-secondary)] leading-relaxed">Tailored workspace views and dashboard capabilities for clients and freelancers.</span>
              </div>
              <div className="group p-4 bg-[var(--surface-subtle)] rounded-xl border border-[var(--border)] hover:shadow-md hover:border-[var(--text-muted)] transition-all duration-150">
                <span className="font-semibold text-[var(--text-primary)] block mb-1.5 text-sm flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-[var(--status-progress-text)]" /> Secure Escrow Payments
                </span>
                <span className="text-xs text-[var(--text-secondary)] leading-relaxed">Application-level escrow protection for the entire contract lifecycle.</span>
              </div>
              <div className="group p-4 bg-[var(--surface-subtle)] rounded-xl border border-[var(--border)] hover:shadow-md hover:border-[var(--text-muted)] transition-all duration-150">
                <span className="font-semibold text-[var(--text-primary)] block mb-1.5 text-sm flex items-center gap-1.5">
                  <FolderUp className="w-4 h-4 text-[var(--status-review-text)]" /> Cloud Deliverables
                </span>
                <span className="text-xs text-[var(--text-secondary)] leading-relaxed">Direct file uploads with structured review, milestone checks, and dispute workflows.</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
