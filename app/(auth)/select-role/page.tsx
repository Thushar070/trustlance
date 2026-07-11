"use client";

import { useSession } from "next-auth/react";
import { useState } from "react";
import { Role } from "@prisma/client";

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
    <div className="flex-grow flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-200/60 mb-6">
          <span className="text-white font-bold text-xl">T</span>
        </div>
        <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          Select Your Role
        </h2>
        <p className="mt-2 text-sm text-slate-500 max-w-sm mx-auto">
          Tell us how you plan to use TrustLance. This choice is permanent.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-3xl px-4">
        <div className="bg-white py-8 px-6 sm:px-10 shadow-xl shadow-slate-200/40 rounded-2xl border border-slate-100">
          {error && (
            <div className="mb-6 bg-red-50 border-l-4 border-red-400 p-4 rounded-lg">
              <p className="text-sm text-red-700 font-medium">{error}</p>
            </div>
          )}

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {/* Client Option Card */}
            <div className="group border border-slate-200 rounded-2xl p-6 flex flex-col justify-between hover:border-indigo-400 hover:shadow-lg hover:shadow-indigo-100/50 transition-all duration-200 bg-gradient-to-br from-slate-50/80 to-white relative overflow-hidden">
              <div className="absolute -top-10 -right-10 w-24 h-24 bg-indigo-100/30 rounded-full blur-2xl pointer-events-none group-hover:bg-indigo-100/50 transition-colors duration-300" />
              <div className="relative">
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-indigo-100 to-indigo-50 flex items-center justify-center text-2xl mb-4 group-hover:scale-105 transition-transform duration-200">
                  💼
                </div>
                <h3 className="text-lg font-bold text-slate-900">I am a Client</h3>
                <p className="mt-2 text-sm text-slate-500 leading-relaxed">
                  I want to post projects, hire talented freelancers, and manage secure escrow payments.
                </p>
              </div>
              <button
                disabled={loading}
                onClick={() => handleSelectRole("CLIENT")}
                className="mt-6 w-full inline-flex justify-center items-center px-4 py-2.5 text-sm font-semibold rounded-xl text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 shadow-sm shadow-indigo-200/50 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 cursor-pointer transition-all duration-200"
              >
                {loading ? "Processing..." : "Select Client"}
              </button>
            </div>

            {/* Freelancer Option Card */}
            <div className="group border border-slate-200 rounded-2xl p-6 flex flex-col justify-between hover:border-emerald-400 hover:shadow-lg hover:shadow-emerald-100/50 transition-all duration-200 bg-gradient-to-br from-slate-50/80 to-white relative overflow-hidden">
              <div className="absolute -top-10 -right-10 w-24 h-24 bg-emerald-100/30 rounded-full blur-2xl pointer-events-none group-hover:bg-emerald-100/50 transition-colors duration-300" />
              <div className="relative">
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-emerald-100 to-emerald-50 flex items-center justify-center text-2xl mb-4 group-hover:scale-105 transition-transform duration-200">
                  🛠️
                </div>
                <h3 className="text-lg font-bold text-slate-900">I am a Freelancer</h3>
                <p className="mt-2 text-sm text-slate-500 leading-relaxed">
                  I want to browse projects, submit proposals, deliver high-quality work, and secure my payments.
                </p>
              </div>
              <button
                disabled={loading}
                onClick={() => handleSelectRole("FREELANCER")}
                className="mt-6 w-full inline-flex justify-center items-center px-4 py-2.5 text-sm font-semibold rounded-xl text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-sm shadow-emerald-200/50 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 cursor-pointer transition-all duration-200"
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
