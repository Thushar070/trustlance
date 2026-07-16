"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
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
  AlertTriangle,
  ShieldAlert,
  Clock,
  Check,
  X
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
  connection?: {
    status: string;
    id: string | null;
    requesterId: string | null;
  };
}

export default function PublicProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Connection states
  const [connStatus, setConnStatus] = useState<string>("NONE");
  const [connId, setConnId] = useState<string | null>(null);
  const [connRequesterId, setConnRequesterId] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  // Report Modal states
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reporting, setReporting] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);

  const userId = params.userId as string;
  const callerId = session?.user?.id;
  const isOwnProfile = callerId === userId;

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/users/${userId}/public-profile`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Profile not found.");
      }
      const data = await res.json();
      setProfile(data);
      if (data.connection) {
        setConnStatus(data.connection.status);
        setConnId(data.connection.id);
        setConnRequesterId(data.connection.requesterId);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Could not load public profile.";
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) {
      Promise.resolve().then(() => {
        fetchProfile();
      });
    }
  }, [userId, fetchProfile]);

  const handleConnect = async () => {
    if (!profile) return;
    setConnecting(true);
    try {
      const res = await fetch("/api/connections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId: profile.id }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to send connection request.");
      }
      const data = await res.json();
      setConnStatus("PENDING");
      setConnId(data.id);
      setConnRequesterId(callerId || null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error sending request.";
      alert(msg);
    } finally {
      setConnecting(false);
    }
  };

  const handleRespond = async (response: "ACCEPTED" | "DECLINED") => {
    if (!connId) return;
    setConnecting(true);
    try {
      const res = await fetch(`/api/connections/${connId}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ response }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to respond.");
      }
      setConnStatus(response);
      if (response === "ACCEPTED") {
        // Reload public profile to load newly unmasked contact credentials
        await fetchProfile();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error responding to request.";
      alert(msg);
    } finally {
      setConnecting(false);
    }
  };

  const handleReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportReason.trim() || !profile) return;
    setReporting(true);
    try {
      const res = await fetch(`/api/users/${profile.id}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reportReason }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to submit report.");
      }
      setReportSuccess(true);
      setReportReason("");
      setTimeout(() => {
        setReportOpen(false);
        setReportSuccess(false);
      }, 1500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error submitting report.";
      alert(msg);
    } finally {
      setReporting(false);
    }
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

  // Determine Connect Button display states
  const renderConnectActions = () => {
    if (isOwnProfile) return null; // A user cannot connect to themselves

    if (connStatus === "ACCEPTED") {
      return (
        <span className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-[var(--status-success-bg)] text-[var(--status-success-text)] border border-[var(--status-success-border)] rounded-xl text-xs font-bold shrink-0">
          <CheckCircle2 className="w-4 h-4 text-[var(--status-success-text)]" />
          Connected
        </span>
      );
    }

    if (connStatus === "PENDING") {
      if (connRequesterId === callerId) {
        return (
          <button
            disabled
            className="inline-flex items-center gap-1.5 px-4.5 py-2.5 bg-[var(--surface-subtle)] text-[var(--text-muted)] border border-[var(--border)] rounded-xl text-xs font-bold cursor-not-allowed shrink-0"
          >
            <Clock className="w-4 h-4 text-[var(--text-muted)] animate-pulse" />
            Request Pending
          </button>
        );
      } else {
        return (
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-semibold text-[var(--text-secondary)] mr-1 hidden sm:inline">Incoming Request:</span>
            <button
              onClick={() => handleRespond("ACCEPTED")}
              disabled={connecting}
              className="inline-flex items-center gap-1 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              Accept
            </button>
            <button
              onClick={() => handleRespond("DECLINED")}
              disabled={connecting}
              className="inline-flex items-center gap-1 px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              Decline
            </button>
          </div>
        );
      }
    }

    // Default "Connect" (for NONE or DECLINED status)
    return (
      <button
        onClick={handleConnect}
        disabled={connecting}
        className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white border border-transparent shadow-sm rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0"
      >
        <UserIcon className="w-4 h-4 text-white" />
        {connecting ? "Connecting..." : "Connect"}
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--text-primary)] py-8 relative animate-fadeIn">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 w-full min-w-0">
        
        {/* Navigation Toolbar */}
        <div className="flex justify-between items-center mb-6">
          <button
            onClick={() => router.back()}
            className="btn-ghost px-3 py-1.5"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          
          {/* Flag/Report Trigger (only for other users) */}
          {!isOwnProfile && (
            <button
              onClick={() => setReportOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-[var(--status-negative-border)] text-[var(--status-negative-text)] hover:bg-[var(--status-negative-bg)] rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              <ShieldAlert className="w-4 h-4" />
              Report User
            </button>
          )}
        </div>

        {/* Profile Card Header */}
        <div className="card p-6 sm:p-8 mb-6 relative overflow-hidden">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 pb-6 border-b border-[var(--border)]">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[var(--gradient-from)] to-[var(--gradient-to)] flex items-center justify-center text-white text-2xl font-bold shadow-md">
                {profile.name?.[0]?.toUpperCase() || "U"}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-black text-[var(--text-primary)] tracking-tight">
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
                  <p className="flex items-center gap-1 text-xs text-[var(--text-muted)] mt-1.5 font-bold uppercase tracking-wider">
                    <MapPin className="w-3.5 h-3.5 text-[var(--accent)]" />
                    {profile.location}
                  </p>
                )}
              </div>
            </div>

            {/* Render dynamically managed Connection button workflow */}
            <div className="w-full sm:w-auto">
              {renderConnectActions()}
            </div>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-2 gap-4 pt-6">
            <div className="flex items-center gap-3 bg-[var(--surface-subtle)] p-4 rounded-xl border border-[var(--border-subtle)] font-medium">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
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

            <div className="flex items-center gap-3 bg-[var(--surface-subtle)] p-4 rounded-xl border border-[var(--border-subtle)] font-medium">
              <div className="w-10 h-10 rounded-xl bg-[var(--accent-light)] flex items-center justify-center">
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

        {/* Main Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Bio Card */}
            <div className="card p-6">
              <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--text-muted)] mb-3">
                About Summary
              </h2>
              {profile.bio ? (
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed whitespace-pre-line font-medium">
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
              <div className="card p-6">
                <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--text-muted)] mb-3">
                  Marketplace Endorsements
                </h2>
                <div className="flex flex-wrap gap-2">
                  {profile.skills.map((skill) => (
                    <span
                      key={skill}
                      className="px-3 py-1 bg-[var(--surface-subtle)] border border-[var(--border)] rounded-lg text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Reviews Section */}
            <div className="card p-6">
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
                          <div className="font-extrabold text-sm text-[var(--text-primary)]">
                            {rev.raterName}
                          </div>
                          <div className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-wider mt-0.5">
                            {rev.raterRole}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 bg-amber-500/10 px-2 py-0.5 rounded-xl border border-amber-500/20 text-amber-500 text-xs font-bold">
                          <Star className="w-3 h-3 fill-amber-500 shrink-0" />
                          <span>{rev.score}.0</span>
                        </div>
                      </div>
                      {rev.comment ? (
                        <p className="text-xs text-[var(--text-secondary)] leading-relaxed italic bg-[var(--surface-subtle)] p-3 rounded-xl border border-[var(--border-subtle)] font-medium">
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

          {/* Right Column */}
          <div className="lg:col-span-4 space-y-6">
            <div className="card p-6">
              <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--text-muted)] mb-4">
                Secure Connection Details
              </h2>

              {profile.isContactVisible ? (
                <div className="space-y-4">
                  <div className="flex items-start gap-3 bg-[var(--accent-light)] p-3 rounded-xl border border-[var(--border)] animate-slideUp">
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
                    <div className="flex items-start gap-3 bg-[var(--accent-light)] p-3 rounded-xl border border-[var(--border)] animate-slideUp">
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
                    <p className="text-[10px] text-[var(--text-muted)] leading-relaxed font-medium">
                      Direct phone and email details are only exchanged when a verified client-freelancer contract relationship (active proposal, escrow assignment, or accepted connection request) is initiated.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* Flag/Report Modal Dialogue */}
      {reportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="card max-w-md w-full p-6 shadow-xl relative animate-in fade-in zoom-in duration-200">
            <h3 className="text-base font-bold text-[var(--text-primary)] mb-2 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-[var(--status-negative-text)]" />
              Report Marketplace Participant
            </h3>
            <p className="text-xs text-[var(--text-secondary)] mb-4 leading-relaxed font-medium">
              Flag this user profile for review by the administrators. Please specify a clear explanation detailing the violation or conflict.
            </p>

            {reportSuccess ? (
              <div className="bg-emerald-600/10 border border-emerald-500/20 text-emerald-500 p-4 rounded-xl text-xs font-bold text-center">
                Report successfully submitted to administrators.
              </div>
            ) : (
              <form onSubmit={handleReport} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1">
                    Explanation / Reason
                  </label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Describe the issue in detail..."
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-[var(--input-border)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--input-focus-ring)] transition-all bg-[var(--input-bg)] text-[var(--text-primary)] resize-none"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setReportOpen(false);
                      setReportReason("");
                    }}
                    className="btn-ghost px-4 py-2"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={reporting}
                    className="px-4 py-2 bg-[var(--status-negative-text)] hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {reporting ? "Submitting..." : "Submit Report"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
