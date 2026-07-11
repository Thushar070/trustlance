"use client";

import { useSession } from "next-auth/react";

export default function Home() {
  const { data: session } = useSession();

  return (
    <div className="flex-grow flex flex-col items-center justify-center p-6 bg-gray-50">
      <div className="max-w-3xl w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-8 sm:p-12 text-center">
        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-indigo-50 text-indigo-700 mb-4">
          🔐 TrustLance Workspace
        </span>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight mb-4">
          Welcome back, {session?.user?.name || "User"}!
        </h1>
        <p className="text-base text-gray-600 max-w-lg mx-auto mb-8">
          You are currently signed in as a <span className="font-bold text-indigo-600">{session?.user?.role || "user without role"}</span>. 
          Use the dashboard menu to navigate the escrow workflows.
        </p>

        <div className="border-t border-gray-100 pt-8 mt-8">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Current Phase Features</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left max-w-xl mx-auto">
            <div className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-100/50">
              <span className="font-semibold text-indigo-900 block mb-1">🔑 Google OAuth</span>
              <span className="text-xs text-indigo-700">Seamless sign-in utilizing secure Google Cloud identity provider.</span>
            </div>
            <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-100/50">
              <span className="font-semibold text-emerald-900 block mb-1">🛡️ Role-Based RBAC</span>
              <span className="text-xs text-emerald-700">Automatic email role mapping or selective onboarding for client/freelancer roles.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

