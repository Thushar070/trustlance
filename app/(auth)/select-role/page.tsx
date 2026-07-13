"use client";

import { useSession } from "next-auth/react";
import { useState } from "react";
import { Briefcase, Wrench, AlertCircle, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function SelectRolePage() {
  const { update } = useSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<"CLIENT" | "FREELANCER" | null>(null);

  const handleContinue = async () => {
    if (!selectedRole) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/select-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: selectedRole }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update role");
      }

      // Update the NextAuth session to populate the new role into the token
      await update();

      // Force a full reload to reset layout and middleware states
      window.location.href = "/";
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "An unexpected error occurred.";
      setError(msg);
      setLoading(false);
    }
  };

  return (
    <div className="flex-grow flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-[var(--background)] min-h-screen">
      {/* Brand */}
      <h2 className="text-2xl font-bold text-[var(--accent)] tracking-tight mb-8">TrustLance</h2>

      {/* Heading */}
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">
          Choose Your Path
        </h1>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          How do you plan to use TrustLance?
        </p>
      </div>

      {error && (
        <div className="mb-6 w-full max-w-2xl bg-[var(--status-negative-bg)] border border-[var(--status-negative-border)] p-4 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-[var(--status-negative-text)] mt-0.5 flex-shrink-0" />
          <p className="text-sm text-[var(--status-negative-text)] font-medium">{error}</p>
        </div>
      )}

      {/* Role Cards */}
      <div className="w-full max-w-2xl grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
        {/* Client Card */}
        <button
          type="button"
          onClick={() => setSelectedRole("CLIENT")}
          className={`relative text-left p-6 rounded-2xl border-2 transition-all duration-200 cursor-pointer bg-[var(--surface)] shadow-[var(--card-shadow)] hover:shadow-[var(--card-shadow-hover)] ${
            selectedRole === "CLIENT"
              ? "border-[var(--accent)] ring-2 ring-[var(--accent)]/20"
              : "border-[var(--border)] hover:border-[var(--accent)]/40"
          }`}
        >
          {/* Radio indicator */}
          <div className="absolute top-5 right-5">
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
              selectedRole === "CLIENT"
                ? "border-[var(--accent)] bg-[var(--accent)]"
                : "border-[var(--text-muted)]"
            }`}>
              {selectedRole === "CLIENT" && (
                <div className="w-2 h-2 rounded-full bg-white" />
              )}
            </div>
          </div>

          <div className="w-12 h-12 rounded-xl bg-[var(--accent-light)] flex items-center justify-center mb-4">
            <Briefcase className="w-6 h-6 text-[var(--accent)]" />
          </div>
          <h3 className="text-lg font-bold text-[var(--text-primary)] mb-1.5">I want to Hire Talent</h3>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed pr-6">
            Post projects, fund escrow, and manage teams.
          </p>

          {/* Illustration area */}
          <div className="mt-6 h-24 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border)] flex items-center justify-center">
            <Briefcase className="w-8 h-8 text-[var(--text-muted)]/30" />
          </div>
        </button>

        {/* Freelancer Card */}
        <button
          type="button"
          onClick={() => setSelectedRole("FREELANCER")}
          className={`relative text-left p-6 rounded-2xl border-2 transition-all duration-200 cursor-pointer bg-[var(--surface)] shadow-[var(--card-shadow)] hover:shadow-[var(--card-shadow-hover)] ${
            selectedRole === "FREELANCER"
              ? "border-[var(--accent)] ring-2 ring-[var(--accent)]/20"
              : "border-[var(--border)] hover:border-[var(--accent)]/40"
          }`}
        >
          {/* Radio indicator */}
          <div className="absolute top-5 right-5">
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
              selectedRole === "FREELANCER"
                ? "border-[var(--accent)] bg-[var(--accent)]"
                : "border-[var(--text-muted)]"
            }`}>
              {selectedRole === "FREELANCER" && (
                <div className="w-2 h-2 rounded-full bg-white" />
              )}
            </div>
          </div>

          <div className="w-12 h-12 rounded-xl bg-[var(--status-success-bg)] flex items-center justify-center mb-4">
            <Wrench className="w-6 h-6 text-[var(--status-success-text)]" />
          </div>
          <h3 className="text-lg font-bold text-[var(--text-primary)] mb-1.5">I want to Work</h3>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed pr-6">
            Browse jobs, build connections, and get paid securely.
          </p>

          {/* Illustration area */}
          <div className="mt-6 h-24 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border)] flex items-center justify-center">
            <Wrench className="w-8 h-8 text-[var(--text-muted)]/30" />
          </div>
        </button>
      </div>

      {/* Continue Button */}
      <button
        onClick={handleContinue}
        disabled={!selectedRole || loading}
        className="w-full max-w-2xl inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl text-sm font-bold text-white bg-[var(--accent)] hover:bg-[var(--accent-hover)] shadow-sm disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all duration-200"
      >
        {loading ? "Processing..." : "Continue"}
        {!loading && <ArrowRight className="w-4 h-4" />}
      </button>

      {/* Footer link */}
      <p className="mt-4 text-sm text-[var(--text-muted)]">
        Already have an account?{" "}
        <Link href="/login" className="text-[var(--accent)] font-semibold hover:text-[var(--accent-hover)]">
          Sign in
        </Link>
      </p>
    </div>
  );
}
