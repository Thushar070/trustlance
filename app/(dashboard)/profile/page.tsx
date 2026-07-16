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
    <div className="space-y-8 w-full max-w-4xl mx-auto min-w-0 animate-fadeIn">
      {/* Context breadcrumbs */}
      <div>
        <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">
          <span>Enterprise</span>
          <span>&gt;</span>
          <span className="text-zinc-400 font-bold">Profile Settings</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-white leading-tight">Profile Settings</h1>
        <p className="text-xs text-zinc-550 font-light mt-1">
          Update your personal contact details, location, and business attributes.
        </p>
      </div>

      <div className="border border-zinc-800 bg-[#09090b]/40 rounded-lg p-6 sm:p-8 space-y-6">
        {successMsg && (
          <div className="bg-emerald-950/20 border border-emerald-900/50 p-4 rounded text-xs text-emerald-400 flex items-start gap-3 animate-fadeIn">
            <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
            <p className="font-semibold">{successMsg}</p>
          </div>
        )}

        {errorMsg && (
          <div className="bg-red-950/20 border border-red-900/50 p-4 rounded text-xs text-red-400 flex items-start gap-3 animate-fadeIn">
            <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
            <p className="font-semibold">{errorMsg}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6 text-left">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Full Name */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Display Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Doe"
                className="w-full px-3 py-2 bg-black border border-zinc-800 rounded text-xs text-white placeholder-zinc-700 focus:outline-none"
              />
              {validationErrors.name && (
                <p className="text-[9px] text-red-400 font-semibold mt-1">{validationErrors.name[0]}</p>
              )}
            </div>

            {/* Phone */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Phone Number</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full px-3 py-2 bg-black border border-zinc-800 rounded text-xs text-white placeholder-zinc-700 focus:outline-none"
              />
              {validationErrors.phone && (
                <p className="text-[9px] text-red-400 font-semibold mt-1">{validationErrors.phone[0]}</p>
              )}
            </div>

            {/* Location */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Location</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Bangalore, India"
                className="w-full px-3 py-2 bg-black border border-zinc-800 rounded text-xs text-white placeholder-zinc-700 focus:outline-none"
              />
              {validationErrors.location && (
                <p className="text-[9px] text-red-400 font-semibold mt-1">{validationErrors.location[0]}</p>
              )}
            </div>

            {/* Business Name */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Business Name</label>
              <input
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="Acme Corp LLC"
                className="w-full px-3 py-2 bg-black border border-zinc-800 rounded text-xs text-white placeholder-zinc-700 focus:outline-none"
              />
              {validationErrors.businessName && (
                <p className="text-[9px] text-red-400 font-semibold mt-1">{validationErrors.businessName[0]}</p>
              )}
            </div>
          </div>

          {/* Bio */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Bio / Professional Summary</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Introduce yourself or your organization..."
              rows={5}
              className="w-full px-3 py-2 bg-black border border-zinc-800 rounded text-xs text-white placeholder-zinc-700 focus:outline-none leading-relaxed resize-none"
            />
            {validationErrors.bio && (
              <p className="text-[9px] text-red-400 font-semibold mt-1">{validationErrors.bio[0]}</p>
            )}
          </div>

          {/* Save Button */}
          <div className="flex justify-end border-t border-zinc-900 pt-6">
            <button
              type="submit"
              disabled={saving}
              className="bg-white hover:bg-zinc-200 text-black font-bold text-[10px] uppercase tracking-widest px-4 py-2 rounded transition-colors disabled:opacity-50 cursor-pointer"
            >
              {saving ? "Saving Changes..." : "Save Profile"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
