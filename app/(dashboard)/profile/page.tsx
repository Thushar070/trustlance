"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { User, Phone, MapPin, Building, FileText, CheckCircle, AlertCircle, Save } from "lucide-react";

export default function ProfilePage() {
  const { data: session, update: updateSession } = useSession();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [bio, setBio] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string[]>>({});

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch("/api/users/me");
        if (res.ok) {
          const user = await res.json();
          setName(user.name || "");
          setPhone(user.phone || "");
          setLocation(user.location || "");
          setBusinessName(user.businessName || "");
          setBio(user.bio || "");
        }
      } catch {
        setErrorMsg("Failed to load profile details.");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg(null);
    setErrorMsg(null);
    setValidationErrors({});

    try {
      const res = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name || "",
          phone: phone || "",
          location: location || "",
          businessName: businessName || "",
          bio: bio || "",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.details) {
          setValidationErrors(data.details);
        } else {
          setErrorMsg(data.error || "Failed to update profile.");
        }
        return;
      }

      setSuccessMsg("Profile updated successfully!");
      // Optionally update local NextAuth session cache if name changed
      if (session) {
        await updateSession({
          ...session,
          user: {
            ...session.user,
            name: data.name,
          },
        });
      }
    } catch {
      setErrorMsg("An unexpected error occurred. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-grow flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 rounded-full border-2 border-[var(--border)] border-t-[var(--accent)] animate-spin" />
          <p className="text-[var(--text-muted)] text-sm">Loading your profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-[var(--surface)] rounded-xl shadow-sm border border-[var(--border)] p-6 sm:p-10 relative overflow-hidden">
        <div className="relative">
          <div className="flex items-center gap-2 mb-2">
            <User className="w-5 h-5 text-[var(--accent)]" />
            <h1 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">Your Profile Settings</h1>
          </div>
          <p className="text-sm text-[var(--text-secondary)] mb-8 leading-relaxed">
            Update your personal contact details, location, and business attributes.
          </p>

          {successMsg && (
            <div className="mb-6 bg-[var(--status-success-bg)] border border-[var(--status-success-border)] p-4 rounded-lg flex items-start gap-3">
              <CheckCircle className="w-4 h-4 text-[var(--status-success-text)] mt-0.5 flex-shrink-0" />
              <p className="text-sm text-[var(--status-success-text)] font-medium">{successMsg}</p>
            </div>
          )}

          {errorMsg && (
            <div className="mb-6 bg-[var(--status-negative-bg)] border border-[var(--status-negative-border)] p-4 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-4 h-4 text-[var(--status-negative-text)] mt-0.5 flex-shrink-0" />
              <p className="text-sm text-[var(--status-negative-text)] font-medium">{errorMsg}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">Display Name</label>
                <div className="relative rounded-lg shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                  </div>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Jane Doe"
                    className="w-full pl-8 pr-4 py-2.5 border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 focus:border-[var(--accent)] text-sm transition-all"
                  />
                </div>
                {validationErrors.name && (
                  <p className="mt-1.5 text-xs text-[var(--status-negative-text)] font-medium">{validationErrors.name[0]}</p>
                )}
              </div>

              {/* Phone */}
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">Phone Number</label>
                <div className="relative rounded-lg shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Phone className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                  </div>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. +919876543210"
                    className="w-full pl-8 pr-4 py-2.5 border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 focus:border-[var(--accent)] text-sm transition-all"
                  />
                </div>
                {validationErrors.phone && (
                  <p className="mt-1.5 text-xs text-[var(--status-negative-text)] font-medium">{validationErrors.phone[0]}</p>
                )}
              </div>

              {/* Location */}
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">Location</label>
                <div className="relative rounded-lg shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MapPin className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                  </div>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. Bangalore, India"
                    className="w-full pl-8 pr-4 py-2.5 border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 focus:border-[var(--accent)] text-sm transition-all"
                  />
                </div>
                {validationErrors.location && (
                  <p className="mt-1.5 text-xs text-[var(--status-negative-text)] font-medium">{validationErrors.location[0]}</p>
                )}
              </div>

              {/* Business Name */}
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">Business Name</label>
                <div className="relative rounded-lg shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Building className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                  </div>
                  <input
                    type="text"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="e.g. Acme Corp LLC"
                    className="w-full pl-8 pr-4 py-2.5 border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 focus:border-[var(--accent)] text-sm transition-all"
                  />
                </div>
                {validationErrors.businessName && (
                  <p className="mt-1.5 text-xs text-[var(--status-negative-text)] font-medium">{validationErrors.businessName[0]}</p>
                )}
              </div>
            </div>

            {/* Bio */}
            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">Bio / Professional Summary</label>
              <div className="relative rounded-lg shadow-sm">
                <div className="absolute top-3 left-3 pointer-events-none">
                  <FileText className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                </div>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Introduce yourself or your organization..."
                  rows={5}
                  className="w-full pl-8 pr-4 py-2.5 border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 focus:border-[var(--accent)] text-sm transition-all leading-relaxed"
                />
              </div>
              {validationErrors.bio && (
                <p className="mt-1.5 text-xs text-[var(--status-negative-text)] font-medium">{validationErrors.bio[0]}</p>
              )}
            </div>

            {/* Save Button */}
            <div className="flex justify-end border-t border-[var(--border-subtle)] pt-6">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-xs font-semibold text-white bg-[var(--accent)] hover:bg-[var(--accent-hover)] shadow-sm disabled:opacity-50 cursor-pointer transition-colors"
              >
                <Save className="w-3.5 h-3.5" />
                {saving ? "Saving Changes..." : "Save Profile"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
