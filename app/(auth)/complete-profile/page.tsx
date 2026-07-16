"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Role } from "@prisma/client";
import { User, Phone, MapPin, Building, FileText, AlertCircle } from "lucide-react";

export default function CompleteProfilePage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [bio, setBio] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const userRole = session?.user?.role;
  const isProfileCompleted = session?.user?.profileCompleted;

  // Initial form field values from session user
  useEffect(() => {
    if (session?.user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (session.user.name) setName(session.user.name);
    }
  }, [session]);

  // Redirect logic if profile is already complete or no role selected
  useEffect(() => {
    if (status === "authenticated") {
      if (!userRole) {
        router.replace("/select-role");
      } else if (isProfileCompleted) {
        router.replace("/");
      }
    }
  }, [status, userRole, isProfileCompleted, router]);

  if (status === "loading") {
    return (
      <div className="flex-grow flex flex-col justify-center items-center py-12 px-4 bg-[var(--background)] text-[var(--foreground)]">
        <div className="w-6 h-6 rounded-full border-2 border-[var(--border)] border-t-[var(--text-primary)] animate-spin mb-4" />
        <p className="text-xs text-[var(--text-secondary)] font-bold uppercase tracking-widest animate-pulse">Checking onboarding status...</p>
      </div>
    );
  }

  if (!session || !userRole || isProfileCompleted) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setFieldErrors({});

    try {
      const payload = {
        name,
        phone,
        location,
        ...(userRole === Role.CLIENT ? { businessName } : { bio }),
      };

      const res = await fetch("/api/users/complete-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.details && typeof data.details === "object" && !Array.isArray(data.details)) {
          setFieldErrors(data.details);
          throw new Error("Please correct the validation errors below.");
        }
        throw new Error(data.error || (typeof data.details === "string" ? data.details : "Failed to complete profile."));
      }

      // Update nextauth session state
      await update();

      // Force a full reload to reset router mapping and state
      window.location.href = "/";
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "An unexpected error occurred.";
      setError(msg);
      setLoading(false);
    }
  };

  return (
    <div className="flex-grow flex flex-col justify-center items-center py-20 px-4 sm:px-6 lg:px-8 bg-[var(--background)] text-[var(--foreground)]">
      <div className="w-full max-w-md space-y-8 animate-slideUp">
        {/* Brand Header */}
        <div className="text-center">
          <div className="flex justify-center items-center gap-2 mb-2">
            <img src="/logo-mark.png" alt="TrustLance" className="w-6 h-6 rounded" />
            <span className="text-lg font-bold tracking-tight text-[var(--text-primary)]">TrustLance</span>
          </div>
          <p className="text-xs text-zinc-550 uppercase tracking-widest font-bold">
            Complete your <span className="text-[var(--text-primary)]">{userRole.toLowerCase()}</span> profile
          </p>
        </div>

        {/* Card Container */}
        <div className="border border-[var(--border)] bg-[var(--surface)] rounded-lg p-8 space-y-6 shadow-sm">
          {error && (
            <div className="bg-red-950/20 border border-red-900/50 p-4 rounded text-xs flex items-start gap-2.5 text-red-400 animate-fadeIn">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <p className="font-semibold leading-relaxed">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-left">
            {/* Full Name */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">
                Full Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
                  <User className="h-4.5 w-4.5" />
                </div>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Jane Doe"
                  className="w-full pl-10 pr-4 py-2.5 bg-[var(--input-bg)] border border-[var(--input-border)] rounded text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--text-primary)] focus:ring-0"
                />
              </div>
              {fieldErrors.name && (
                <p className="text-[10px] text-red-450 font-semibold mt-1">{fieldErrors.name[0]}</p>
              )}
            </div>

            {/* Phone Number */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">
                Phone Number
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
                  <Phone className="h-4.5 w-4.5" />
                </div>
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. +1 555-0199"
                  className="w-full pl-10 pr-4 py-2.5 bg-[var(--input-bg)] border border-[var(--input-border)] rounded text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--text-primary)] focus:ring-0"
                />
              </div>
              {fieldErrors.phone && (
                <p className="text-[10px] text-red-455 font-semibold mt-1">{fieldErrors.phone[0]}</p>
              )}
            </div>

            {/* Location */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">
                Location
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
                  <MapPin className="h-4.5 w-4.5" />
                </div>
                <input
                  type="text"
                  required
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. San Francisco, CA"
                  className="w-full pl-10 pr-4 py-2.5 bg-[var(--input-bg)] border border-[var(--input-border)] rounded text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--text-primary)] focus:ring-0"
                />
              </div>
              {fieldErrors.location && (
                <p className="text-[10px] text-red-455 font-semibold mt-1">{fieldErrors.location[0]}</p>
              )}
            </div>

            {/* Conditional Business Name for Clients */}
            {userRole === Role.CLIENT && (
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">
                  Business Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
                    <Building className="h-4.5 w-4.5" />
                  </div>
                  <input
                    type="text"
                    required
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="e.g. Acme Corporation"
                    className="w-full pl-10 pr-4 py-2.5 bg-[var(--input-bg)] border border-[var(--input-border)] rounded text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--text-primary)] focus:ring-0"
                  />
                </div>
                {fieldErrors.businessName && (
                  <p className="text-[10px] text-red-455 font-semibold mt-1">{fieldErrors.businessName[0]}</p>
                )}
              </div>
            )}

            {/* Conditional Bio for Freelancers */}
            {userRole === Role.FREELANCER && (
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">
                  Professional Bio
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 pt-3 flex items-start pointer-events-none text-zinc-400">
                    <FileText className="h-4.5 w-4.5" />
                  </div>
                  <textarea
                    required
                    rows={4}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Describe your professional skills and experience..."
                    className="w-full pl-10 pr-4 py-2.5 bg-[var(--input-bg)] border border-[var(--input-border)] rounded text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--text-primary)] focus:ring-0 leading-relaxed resize-none"
                  />
                </div>
                {fieldErrors.bio && (
                  <p className="text-[10px] text-red-455 font-semibold mt-1">{fieldErrors.bio[0]}</p>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center py-3 px-4 rounded bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-xs font-bold text-[var(--btn-primary-text)] border border-[var(--accent)] uppercase tracking-widest transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer focus:outline-none mt-4"
            >
              {loading ? "Completing Profile..." : "Complete Profile"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
