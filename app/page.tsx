"use client";

import { useSession } from "next-auth/react";

export default function Home() {
  const { data: session } = useSession();

  return (
    <div className="flex-grow flex flex-col items-center justify-center p-6 sm:p-10 bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">
      <div className="max-w-3xl w-full bg-white rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-100 p-8 sm:p-12 text-center relative overflow-hidden">
        {/* Decorative background gradient blob */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-gradient-to-br from-indigo-100/40 to-violet-100/30 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-32 h-32 bg-gradient-to-tr from-emerald-100/30 to-teal-100/20 rounded-full blur-2xl pointer-events-none" />

        <div className="relative">
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100/60 mb-5 uppercase tracking-widest">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
            TrustLance Workspace
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mb-3">
            Welcome back, <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">{session?.user?.name || "User"}</span>!
          </h1>
          <p className="text-base text-slate-500 max-w-lg mx-auto mb-10 leading-relaxed">
            You are currently signed in as a <span className="font-bold text-indigo-600">{session?.user?.role || "user without role"}</span>.
            Use the dashboard menu to navigate the escrow workflows.
          </p>

          <div className="border-t border-slate-100 pt-8">
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-5">Platform Capabilities</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left max-w-xl mx-auto">
              <div className="group p-4 bg-gradient-to-br from-indigo-50/80 to-indigo-50/30 rounded-xl border border-indigo-100/50 hover:shadow-md hover:shadow-indigo-100/50 hover:border-indigo-200/60 transition-all duration-200">
                <span className="font-semibold text-indigo-900 block mb-1.5 text-sm">🔑 Google OAuth</span>
                <span className="text-xs text-indigo-600/80 leading-relaxed">Seamless sign-in utilizing secure Google Cloud identity provider.</span>
              </div>
              <div className="group p-4 bg-gradient-to-br from-emerald-50/80 to-emerald-50/30 rounded-xl border border-emerald-100/50 hover:shadow-md hover:shadow-emerald-100/50 hover:border-emerald-200/60 transition-all duration-200">
                <span className="font-semibold text-emerald-900 block mb-1.5 text-sm">🛡️ Role-Based RBAC</span>
                <span className="text-xs text-emerald-600/80 leading-relaxed">Automatic email role mapping or selective onboarding for client/freelancer roles.</span>
              </div>
              <div className="group p-4 bg-gradient-to-br from-amber-50/80 to-amber-50/30 rounded-xl border border-amber-100/50 hover:shadow-md hover:shadow-amber-100/50 hover:border-amber-200/60 transition-all duration-200">
                <span className="font-semibold text-amber-900 block mb-1.5 text-sm">💳 Razorpay Escrow</span>
                <span className="text-xs text-amber-600/80 leading-relaxed">Application-level escrow with full state machine for payment lifecycle.</span>
              </div>
              <div className="group p-4 bg-gradient-to-br from-violet-50/80 to-violet-50/30 rounded-xl border border-violet-100/50 hover:shadow-md hover:shadow-violet-100/50 hover:border-violet-200/60 transition-all duration-200">
                <span className="font-semibold text-violet-900 block mb-1.5 text-sm">📦 S3 Submissions</span>
                <span className="text-xs text-violet-600/80 leading-relaxed">Direct presigned uploads to AWS S3 with work review and dispute workflows.</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
