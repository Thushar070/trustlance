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
    <div className="flex-grow flex flex-col items-center justify-center py-20 px-4 sm:px-6 lg:px-8 bg-black text-white min-h-screen">
      <div className="w-full max-w-xl space-y-8 animate-slideUp">
        {/* Brand Header */}
        <div className="text-center">
          <div className="flex justify-center items-center gap-2 mb-2">
            <img src="/logo-mark.png" alt="TrustLance" className="w-6 h-6 rounded" />
            <span className="text-lg font-bold tracking-tight text-white">TrustLance</span>
          </div>
          <p className="text-xs text-zinc-500 uppercase tracking-widest font-bold">Account Setup Phase 1</p>
        </div>

        {error && (
          <div className="bg-red-950/20 border border-red-900/50 p-4 rounded text-xs flex items-start gap-2.5 text-red-400 animate-fadeIn">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <p className="font-semibold leading-relaxed">{error}</p>
          </div>
        )}

        {/* Role Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Client Card */}
          <button
            type="button"
            onClick={() => setSelectedRole("CLIENT")}
            className={`relative text-left p-6 rounded-lg border transition-all duration-150 cursor-pointer bg-[#09090b] ${
              selectedRole === "CLIENT"
                ? "border-white ring-1 ring-white"
                : "border-zinc-800 hover:border-zinc-700"
            }`}
          >
            {/* Custom Dot Indicator */}
            <div className="absolute top-5 right-5">
              <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                selectedRole === "CLIENT" ? "border-white bg-white" : "border-zinc-650"
              }`}>
                {selectedRole === "CLIENT" && (
                  <div className="w-1.5 h-1.5 rounded-full bg-black" />
                )}
              </div>
            </div>

            <div className="w-8 h-8 rounded border border-zinc-800 flex items-center justify-center mb-4 text-zinc-400">
              <Briefcase className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-1">Hire Talent</h3>
            <p className="text-[11px] text-zinc-400 leading-normal font-light">
              Post contract projects, lock payments into secure escrow, and hire certified specialists.
            </p>
          </button>

          {/* Freelancer Card */}
          <button
            type="button"
            onClick={() => setSelectedRole("FREELANCER")}
            className={`relative text-left p-6 rounded-lg border transition-all duration-150 cursor-pointer bg-[#09090b] ${
              selectedRole === "FREELANCER"
                ? "border-white ring-1 ring-white"
                : "border-zinc-800 hover:border-zinc-700"
            }`}
          >
            {/* Custom Dot Indicator */}
            <div className="absolute top-5 right-5">
              <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                selectedRole === "FREELANCER" ? "border-white bg-white" : "border-zinc-650"
              }`}>
                {selectedRole === "FREELANCER" && (
                  <div className="w-1.5 h-1.5 rounded-full bg-black" />
                )}
              </div>
            </div>

            <div className="w-8 h-8 rounded border border-zinc-800 flex items-center justify-center mb-4 text-zinc-400">
              <Wrench className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-1">Offer Services</h3>
            <p className="text-[11px] text-zinc-400 leading-normal font-light">
              Submit work milestones, bid on projects, and secure payments in escrow before starting.
            </p>
          </button>
        </div>

        {/* Action Button */}
        <button
          onClick={handleContinue}
          disabled={!selectedRole || loading}
          className="w-full flex justify-center items-center gap-2 py-3 px-4 rounded bg-white text-xs font-bold text-black uppercase tracking-widest hover:bg-zinc-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer focus:outline-none"
        >
          {loading ? "Processing..." : "Continue Setup"}
          {!loading && <ArrowRight className="w-3.5 h-3.5 shrink-0" />}
        </button>

        {/* Footer Link */}
        <p className="text-center text-[11px] text-zinc-500">
          Want to access another account?{" "}
          <Link href="/login" className="text-white font-bold hover:underline">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
