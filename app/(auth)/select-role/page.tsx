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
    <div className="flex-grow flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-gray-50">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="text-center text-3xl font-extrabold text-gray-900 tracking-tight">
          Select Your Role
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Tell us how you plan to use TrustLance. This choice is permanent.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-4xl px-4">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-gray-100">
          {error && (
            <div className="mb-6 bg-red-50 border-l-4 border-red-400 p-4 rounded-md">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {/* Client Option Card */}
            <div className="border border-gray-200 rounded-2xl p-6 flex flex-col justify-between hover:border-indigo-500 hover:shadow-md transition-all duration-200 bg-gray-50">
              <div>
                <div className="h-12 w-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 text-2xl font-bold mb-4">
                  💼
                </div>
                <h3 className="text-lg font-bold text-gray-900">I am a Client</h3>
                <p className="mt-2 text-sm text-gray-500">
                  I want to post projects, hire talented freelancers, and manage secure escrow payments.
                </p>
              </div>
              <button
                disabled={loading}
                onClick={() => handleSelectRole("CLIENT")}
                className="mt-6 w-full inline-flex justify-center items-center px-4 py-2.5 border border-transparent text-sm font-semibold rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 cursor-pointer transition-all"
              >
                {loading ? "Processing..." : "Select Client"}
              </button>
            </div>

            {/* Freelancer Option Card */}
            <div className="border border-gray-200 rounded-2xl p-6 flex flex-col justify-between hover:border-emerald-500 hover:shadow-md transition-all duration-200 bg-gray-50">
              <div>
                <div className="h-12 w-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 text-2xl font-bold mb-4">
                  🛠️
                </div>
                <h3 className="text-lg font-bold text-gray-900">I am a Freelancer</h3>
                <p className="mt-2 text-sm text-gray-500">
                  I want to browse projects, submit proposals, deliver high-quality work, and secure my payments.
                </p>
              </div>
              <button
                disabled={loading}
                onClick={() => handleSelectRole("FREELANCER")}
                className="mt-6 w-full inline-flex justify-center items-center px-4 py-2.5 border border-transparent text-sm font-semibold rounded-lg text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 cursor-pointer transition-all"
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
