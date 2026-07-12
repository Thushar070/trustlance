"use client";

import { useSession } from "next-auth/react";
import { useState } from "react";
import { Role } from "@prisma/client";
import { Shield, Briefcase, Wrench, AlertCircle } from "lucide-react";

export default function SelectRolePage() {
  const { update } = useSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSelectRole = async (selectedRole: typeof Role.CLIENT | typeof Role.FREELANCER) => {
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
    <div className="flex-grow flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 bg-[var(--background)]">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-br from-[var(--gradient-from)] to-[var(--gradient-to)] flex items-center justify-center shadow-lg mb-6">
          <Shield className="w-7 h-7 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">
          Select Your Role
        </h1>
        <p className="mt-2 text-sm text-[var(--text-secondary)] max-w-sm mx-auto">
          Tell us how you plan to use TrustLance. This choice is permanent.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-3xl">
        <div className="bg-[var(--surface)] py-8 px-6 sm:px-10 shadow-sm border border-[var(--border)] rounded-xl">
          {error && (
            <div className="mb-6 bg-[var(--status-negative-bg)] border border-[var(--status-negative-border)] p-4 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-4 h-4 text-[var(--status-negative-text)] mt-0.5 flex-shrink-0" />
              <p className="text-sm text-[var(--status-negative-text)] font-medium">{error}</p>
            </div>
          )}

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {/* Client Option Card */}
            <div className="group border border-[var(--border)] rounded-xl p-6 flex flex-col justify-between hover:border-[var(--accent)] hover:shadow-md transition-all duration-200 bg-[var(--surface)]">
              <div>
                <div className="h-12 w-12 rounded-xl bg-[var(--accent-light)] flex items-center justify-center mb-4 group-hover:scale-105 transition-transform duration-200">
                  <Briefcase className="w-6 h-6 text-[var(--accent)]" />
                </div>
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">I am a Client</h3>
                <p className="mt-2 text-sm text-[var(--text-secondary)] leading-relaxed">
                  I want to post projects, hire talented freelancers, and manage secure escrow payments.
                </p>
              </div>
              <button
                disabled={loading}
                onClick={() => handleSelectRole("CLIENT")}
                className="mt-6 w-full inline-flex justify-center items-center px-4 py-2.5 text-sm font-semibold rounded-lg text-white bg-[var(--accent)] hover:bg-[var(--accent-hover)] shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--accent)] disabled:opacity-50 cursor-pointer transition-colors duration-150"
              >
                {loading ? "Processing..." : "Select Client"}
              </button>
            </div>

            {/* Freelancer Option Card */}
            <div className="group border border-[var(--border)] rounded-xl p-6 flex flex-col justify-between hover:border-[var(--status-success-text)] hover:shadow-md transition-all duration-200 bg-[var(--surface)]">
              <div>
                <div className="h-12 w-12 rounded-xl bg-[var(--status-success-bg)] flex items-center justify-center mb-4 group-hover:scale-105 transition-transform duration-200">
                  <Wrench className="w-6 h-6 text-[var(--status-success-text)]" />
                </div>
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">I am a Freelancer</h3>
                <p className="mt-2 text-sm text-[var(--text-secondary)] leading-relaxed">
                  I want to browse projects, submit proposals, deliver high-quality work, and secure my payments.
                </p>
              </div>
              <button
                disabled={loading}
                onClick={() => handleSelectRole("FREELANCER")}
                className="mt-6 w-full inline-flex justify-center items-center px-4 py-2.5 text-sm font-semibold rounded-lg text-white bg-[var(--status-success-text)] hover:brightness-110 shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--status-success-text)] disabled:opacity-50 cursor-pointer transition-colors duration-150"
              >
                {loading ? "Processing..." : "Select Freelancer"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
