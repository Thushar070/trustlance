"use client";

import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import React, { Suspense } from "react";

function LoginForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";
  const error = searchParams.get("error");

  const handleGoogleLogin = () => {
    signIn("google", { callbackUrl });
  };

  return (
    <div className="flex-grow flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-200/60 mb-6">
          <span className="text-white font-bold text-xl">T</span>
        </div>
        <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          Welcome to TrustLance
        </h2>
        <p className="mt-2 text-sm text-slate-500">
          The escrow-backed freelance marketplace.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white py-8 px-6 shadow-xl shadow-slate-200/40 rounded-2xl border border-slate-100">
          {error && (
            <div className="mb-5 bg-red-50 border-l-4 border-red-400 p-4 rounded-lg">
              <p className="text-sm text-red-700 font-medium">
                Authentication error: {error === "OAuthSignin" || error === "OAuthCallback"
                  ? "Unable to sign in with Google. Check server logs."
                  : error}
              </p>
            </div>
          )}

          <div className="space-y-4">
            <button
              onClick={handleGoogleLogin}
              className="w-full flex justify-center items-center py-3 px-4 border border-slate-200 rounded-xl bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 cursor-pointer transition-all duration-200"
            >
              <svg className="h-5 w-5 mr-3" viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
                <path d="M21.35,11.1H12v2.7h5.38C16.88,16.53,14.65,18,12,18a6,6,0,1,1,0-12,5.77,5.77,0,0,1,3.88,1.48L17.8,5.55A8.88,8.88,0,0,0,12,3a9,9,0,1,0,9,9A8.47,8.47,0,0,0,21.35,11.1Z" fill="#4f46e5" />
              </svg>
              Sign in with Google
            </button>
          </div>

          <div className="mt-6 pt-5 border-t border-slate-100">
            <p className="text-center text-xs text-slate-400 leading-relaxed">
              By signing in, you agree to our terms of service. Your data is secured with application-level escrow protections.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex-grow flex items-center justify-center">
        <div className="w-5 h-5 rounded-full border-2 border-slate-200 border-t-indigo-500 animate-spin" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
