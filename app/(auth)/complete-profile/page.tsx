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
      <div className="flex-grow flex flex-col justify-center items-center py-12 px-4 bg-[var(--background)]">
        <div className="w-8 h-8 rounded-full border-4 border-[var(--border)] border-t-[var(--accent)] animate-spin mb-4" />
        <p className="text-sm text-[var(--text-secondary)] font-medium">Checking onboarding status...</p>
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
        if (data.details) {
          setFieldErrors(data.details);
          throw new Error("Please correct the validation errors below.");
        }
        throw new Error(data.error || "Failed to complete profile.");
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
    <div className="flex-grow flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 bg-[var(--background)]">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-br from-[var(--gradient-from)] to-[var(--gradient-to)] flex items-center justify-center shadow-lg mb-6">
          <User className="w-7 h-7 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">
          Complete Your Profile
        </h1>
        <p className="mt-2 text-sm text-[var(--text-secondary)] max-w-sm mx-auto">
          Please provide details for your <span className="font-semibold text-[var(--accent)] uppercase">{userRole.toLowerCase()}</span> profile to access the platform.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-[var(--surface)] py-8 px-6 sm:px-10 shadow-sm border border-[var(--border)] rounded-xl">
          {error && (
            <div className="mb-6 bg-[var(--status-negative-bg)] border border-[var(--status-negative-border)] p-4 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-4 h-4 text-[var(--status-negative-text)] mt-0.5 flex-shrink-0" />
              <p className="text-sm text-[var(--status-negative-text)] font-medium leading-relaxed">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Full Name */}
            <div>
              <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
                Full Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-4 w-4 text-[var(--text-muted)]" />
                </div>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Jane Doe"
                  className="w-full pl-10 pr-4 py-2.5 border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 focus:border-[var(--accent)] text-sm bg-[var(--input-bg)] text-[var(--text-primary)] transition-all"
                />
              </div>
              {fieldErrors.name && (
                <p className="mt-1.5 text-xs text-[var(--status-negative-text)] font-medium">{fieldErrors.name[0]}</p>
              )}
            </div>

            {/* Phone Number */}
            <div>
              <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
                Phone Number
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Phone className="h-4 w-4 text-[var(--text-muted)]" />
                </div>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. +1 555-0199"
                  className="w-full pl-10 pr-4 py-2.5 border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 focus:border-[var(--accent)] text-sm bg-[var(--input-bg)] text-[var(--text-primary)] transition-all"
                />
              </div>
              {fieldErrors.phone && (
                <p className="mt-1.5 text-xs text-[var(--status-negative-text)] font-medium">{fieldErrors.phone[0]}</p>
              )}
            </div>

            {/* Location */}
            <div>
              <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
                Location
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MapPin className="h-4 w-4 text-[var(--text-muted)]" />
                </div>
                <input
                  type="text"
                  required
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. San Francisco, CA"
                  className="w-full pl-10 pr-4 py-2.5 border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 focus:border-[var(--accent)] text-sm bg-[var(--input-bg)] text-[var(--text-primary)] transition-all"
                />
              </div>
              {fieldErrors.location && (
                <p className="mt-1.5 text-xs text-[var(--status-negative-text)] font-medium">{fieldErrors.location[0]}</p>
              )}
            </div>

            {/* Conditional Business Name for Clients */}
            {userRole === Role.CLIENT && (
              <div>
                <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
                  Business Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Building className="h-4 w-4 text-[var(--text-muted)]" />
                  </div>
                  <input
                    type="text"
                    required
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="e.g. Acme Corporation"
                    className="w-full pl-10 pr-4 py-2.5 border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 focus:border-[var(--accent)] text-sm bg-[var(--input-bg)] text-[var(--text-primary)] transition-all"
                  />
                </div>
                {fieldErrors.businessName && (
                  <p className="mt-1.5 text-xs text-[var(--status-negative-text)] font-medium">{fieldErrors.businessName[0]}</p>
                )}
              </div>
            )}

            {/* Conditional Bio for Freelancers */}
            {userRole === Role.FREELANCER && (
              <div>
                <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
                  Professional Bio
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 pt-3 flex items-start pointer-events-none">
                    <FileText className="h-4 w-4 text-[var(--text-muted)]" />
                  </div>
                  <textarea
                    required
                    rows={4}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Describe your professional skills and experience..."
                    className="w-full pl-10 pr-4 py-2.5 border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 focus:border-[var(--accent)] text-sm bg-[var(--input-bg)] text-[var(--text-primary)] transition-all leading-relaxed resize-none"
                  />
                </div>
                {fieldErrors.bio && (
                  <p className="mt-1.5 text-xs text-[var(--status-negative-text)] font-medium">{fieldErrors.bio[0]}</p>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex justify-center items-center px-4 py-2.5 text-sm font-semibold rounded-lg text-white bg-[var(--accent)] hover:bg-[var(--accent-hover)] shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--accent)] disabled:opacity-50 cursor-pointer transition-colors duration-150 mt-4"
            >
              {loading ? "Completing Profile..." : "Complete Profile"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
