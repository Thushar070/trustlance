"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  User as UserIcon, 
  MapPin, 
  Star, 
  Award, 
  Mail, 
  Phone, 
  Lock, 
  MessageSquare,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle
} from "lucide-react";

interface ReviewItem {
  id: string;
  score: number;
  comment: string | null;
  createdAt: string;
  raterName: string;
  raterRole: string;
}

interface UserProfileData {
  id: string;
  name: string | null;
  role: string;
  businessName: string | null;
  bio: string | null;
  location: string | null;
  skills: string[];
  averageRating: number;
  completedProjectCount: number;
  reviews: ReviewItem[];
  email?: string;
  phone?: string;
  isContactVisible: boolean;
}

export default function PublicProfilePage() {
  const params = useParams();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);

  const userId = params.userId as string;

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/users/${userId}/public-profile`);
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Profile not found.");
        }
        const data = await res.json();
        setProfile(data);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Could not load public profile.";
        setErrorMsg(msg);
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchProfile();
    }
  }, [userId]);

  const handleConnectToggle = () => {
    setConnecting(true);
    setTimeout(() => {
      setConnected(!connected);
      setConnecting(false);
    }, 800);
  };

  if (loading) {
    return (
      <div className="flex-grow flex items-center justify-center min-h-screen bg-[var(--background)]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 rounded-full border-2 border-[var(--border)] border-t-[var(--accent)] animate-spin" />
          <p className="text-[var(--text-muted)] text-sm">Loading public profile...</p>
        </div>
      </div>
    );
  }

  if (errorMsg || !profile) {
    return (
      <div className="min-h-screen bg-[var(--background)] py-12 px-4">
        <div className="max-w-md mx-auto bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 text-center shadow-md">
          <AlertTriangle className="w-12 h-12 text-[var(--status-negative-text)] mx-auto mb-4" />
          <h2 className="text-lg font-bold text-[var(--text-primary)] mb-2">Failed to Load Profile</h2>
          <p className="text-sm text-[var(--text-secondary)] mb-6">{errorMsg || "The requested profile could not be found."}</p>
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--text-primary)] py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Back Link */}
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] mb-6 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Directory
        </button>

        {/* Profile Card Header */}
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 sm:p-8 shadow-sm mb-6 relative overflow-hidden">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 pb-6 border-b border-[var(--border)]">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[var(--gradient-from)] to-[var(--gradient-to)] flex items-center justify-center text-white text-2xl font-bold shadow-md">
                {profile.name?.[0]?.toUpperCase() || "U"}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] tracking-tight">
                    {profile.name || "Marketplace Participant"}
                  </h1>
                  <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold border uppercase tracking-wider bg-[var(--accent-light)] text-[var(--accent)] border-[var(--border)]">
                    {profile.role}
                  </span>
                </div>
                {profile.businessName && (
                  <p className="text-sm font-semibold text-[var(--text-secondary)] mt-0.5">
                    {profile.businessName}
                  </p>
                )}
                {profile.location && (
                  <p className="flex items-center gap-1 text-xs text-[var(--text-muted)] mt-1.5 font-medium">
                    <MapPin className="w-3.5 h-3.5" />
                    {profile.location}
                  </p>
                )}
              </div>
            </div>

            {/* Actions: Connect / Direct message */}
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                onClick={handleConnectToggle}
                disabled={connecting}
                className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4.5 py-2.5 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                  connected
                    ? "bg-[var(--status-success-bg)] text-[var(--status-success-text)] border-[var(--status-success-border)]"
                    : "bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white border-transparent shadow-sm"
                }`}
              >
                {connected ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Connected</span>
                  </>
                ) : (
                  <>
                    <UserIcon className="w-4 h-4" />
                    <span>{connecting ? "Connecting..." : "Connect"}</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-2 gap-4 pt-6">
            <div className="flex items-center gap-3 bg-[var(--surface-subtle)] p-4 rounded-xl border border-[var(--border-subtle)]">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  Reputation Rating
                </div>
                <div className="text-lg font-bold text-[var(--text-primary)]">
                  {profile.averageRating} <span className="text-xs text-[var(--text-muted)] font-medium">/ 5.0</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-[var(--surface-subtle)] p-4 rounded-xl border border-[var(--border-subtle)]">
              <div className="w-10 h-10 rounded-lg bg-[var(--accent-light)] flex items-center justify-center">
                <Award className="w-5 h-5 text-[var(--accent)]" />
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  Escrows Completed
                </div>
                <div className="text-lg font-bold text-[var(--text-primary)]">
                  {profile.completedProjectCount} <span className="text-xs text-[var(--text-muted)] font-medium">contracts</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Grid: Bio & Reviews */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Column: Bio & Skills */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Bio Card */}
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm">
              <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--text-muted)] mb-3">
                About Summary
              </h2>
              {profile.bio ? (
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed whitespace-pre-line">
                  {profile.bio}
                </p>
              ) : (
                <p className="text-sm text-[var(--text-muted)] italic">
                  No about description provided by this user.
                </p>
              )}
            </div>

            {/* Skills Card */}
            {profile.skills.length > 0 && (
              <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm">
                <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--text-muted)] mb-3">
                  Marketplace Endorsements
                </h2>
                <div className="flex flex-wrap gap-2">
                  {profile.skills.map((skill) => (
                    <span
                      key={skill}
                      className="px-3 py-1 bg-[var(--surface-subtle)] border border-[var(--border)] rounded-lg text-xs font-semibold text-[var(--text-secondary)]"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Reviews Section */}
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm">
              <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--text-muted)] mb-4 flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4 text-[var(--accent)]" />
                Work History Feedback ({profile.reviews.length})
              </h2>

              {profile.reviews.length === 0 ? (
                <div className="py-8 text-center border border-dashed border-[var(--border)] rounded-xl bg-[var(--surface-subtle)]">
                  <p className="text-sm text-[var(--text-muted)] font-medium">
                    No rating reviews submitted for this user yet.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-[var(--border-subtle)] space-y-4">
                  {profile.reviews.map((rev, index) => (
                    <div key={rev.id} className={`${index > 0 ? "pt-4" : ""} space-y-2`}>
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <div className="font-semibold text-sm text-[var(--text-primary)]">
                            {rev.raterName}
                          </div>
                          <div className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-wider mt-0.5">
                            {rev.raterRole}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 text-amber-500 text-xs font-bold">
                          <Star className="w-3 h-3 fill-amber-500 shrink-0" />
                          <span>{rev.score}.0</span>
                        </div>
                      </div>
                      {rev.comment ? (
                        <p className="text-xs text-[var(--text-secondary)] leading-relaxed italic bg-[var(--surface-subtle)] p-3 rounded-lg border border-[var(--border-subtle)]">
                          &ldquo;{rev.comment}&rdquo;
                        </p>
                      ) : (
                        <p className="text-xs text-[var(--text-muted)] italic">
                          No feedback comment left.
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Contact details (visible only if associated) */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm">
              <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--text-muted)] mb-4">
                Secure Connection Details
              </h2>

              {profile.isContactVisible ? (
                <div className="space-y-4">
                  <div className="flex items-start gap-3 bg-[var(--accent-light)] p-3 rounded-xl border border-[var(--border)]">
                    <Mail className="w-4 h-4 text-[var(--accent)] mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-[9px] font-bold text-[var(--accent)] uppercase tracking-wider">
                        Email Address
                      </div>
                      <div className="text-sm font-bold text-[var(--text-primary)] break-all mt-0.5 select-all">
                        {profile.email}
                      </div>
                    </div>
                  </div>

                  {profile.phone && (
                    <div className="flex items-start gap-3 bg-[var(--accent-light)] p-3 rounded-xl border border-[var(--border)]">
                      <Phone className="w-4 h-4 text-[var(--accent)] mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <div className="text-[9px] font-bold text-[var(--accent)] uppercase tracking-wider">
                          Phone Number
                        </div>
                        <div className="text-sm font-bold text-[var(--text-primary)] break-all mt-0.5 select-all">
                          {profile.phone}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 border border-dashed border-[var(--border)] rounded-xl bg-[var(--surface-subtle)] text-center space-y-2.5">
                    <Lock className="w-8 h-8 text-[var(--text-muted)] mx-auto" />
                    <p className="text-xs font-semibold text-[var(--text-secondary)] leading-relaxed">
                      Contact credentials are encrypted.
                    </p>
                    <p className="text-[10px] text-[var(--text-muted)] leading-relaxed">
                      Direct phone and email details are only exchanged when a verified client-freelancer contract relationship (active proposal or escrow assignment) is initiated.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
