"use client";

import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import React, { Suspense } from "react";
import { AlertCircle } from "lucide-react";

function LoginForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";
  const error = searchParams.get("error");

  const handleGoogleLogin = () => {
    signIn("google", { callbackUrl });
  };

  return (
    <div className="flex-grow flex flex-col justify-center items-center py-20 px-4 sm:px-6 lg:px-8 bg-[var(--background)] text-[var(--foreground)]">
      <div className="w-full max-w-sm space-y-8 animate-slideUp">
        {/* Logo Header */}
        <div className="text-center">
          <div className="flex justify-center items-center gap-2 mb-2">
            <img src="/logo-mark.png" alt="TrustLance" className="w-6 h-6 rounded" />
            <span className="text-lg font-bold tracking-tight text-[var(--text-primary)]">TrustLance</span>
          </div>
        </div>

        {/* Card Container */}
        <div className="border border-[var(--border)] bg-[var(--surface)] rounded-lg p-8 space-y-6 shadow-sm">
          {error && (
            <div className="bg-red-950/20 border border-red-900/50 p-4 rounded text-xs flex items-start gap-2.5 text-red-400 animate-fadeIn">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <p className="font-semibold leading-relaxed">
                Auth Error: {error === "OAuthSignin" || error === "OAuthCallback"
                  ? "Unable to complete Google authentication."
                  : error}
              </p>
            </div>
          )}

          <div className="space-y-3">
            {/* Real Active Auth Trigger */}
            <button
              onClick={handleGoogleLogin}
              className="w-full flex justify-center items-center gap-2 py-3 px-4 rounded bg-[var(--surface)] hover:bg-[var(--surface-subtle)] text-xs font-bold text-[var(--text-primary)] border border-[var(--border)] uppercase tracking-widest cursor-pointer focus:outline-none"
            >
              <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continue with Google SSO
            </button>
          </div>
        </div>

        <p className="text-center text-[10px] text-[var(--text-secondary)] leading-relaxed max-w-xs mx-auto">
          By signing in, you agree to our <span className="text-[var(--text-primary)] font-bold hover:underline cursor-pointer">Terms of Service</span> and <span className="text-[var(--text-primary)] font-bold hover:underline cursor-pointer">Privacy Policy</span>.
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex-grow flex items-center justify-center bg-[var(--background)] text-[var(--foreground)]">
        <div className="w-5 h-5 rounded-full border-2 border-[var(--border)] border-t-[var(--text-primary)] animate-spin" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
