"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useNotification } from "@/components/NotificationProvider";
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
  const { showSuccess, showError, showInfo } = useNotification();
  
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
      showSuccess("Connection request sent successfully!");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error sending request.";
      showError(msg);
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
        showSuccess("Connection request accepted!");
        // Reload public profile to load newly unmasked contact credentials
        await fetchProfile();
      } else {
        showInfo("Connection request declined.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error responding to request.";
      showError(msg);
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
      showSuccess("Report submitted successfully.");
      setTimeout(() => {
        setReportOpen(false);
        setReportSuccess(false);
      }, 1500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error submitting report.";
      showError(msg);
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
            className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--btn-primary-text)] text-sm font-semibold rounded-lg transition-colors cursor-pointer"
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
        <span className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-emerald-950/20 text-emerald-400 border border-emerald-900/50 rounded text-[10px] font-bold uppercase tracking-widest shrink-0">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          Connected
        </span>
      );
    }

    if (connStatus === "PENDING") {
      if (connRequesterId === callerId) {
        return (
          <button
            disabled
            className="inline-flex items-center gap-1.5 px-4.5 py-2.5 bg-zinc-950 text-zinc-550 border border-zinc-900 rounded text-[10px] font-bold uppercase tracking-widest cursor-not-allowed shrink-0"
          >
            <Clock className="w-3.5 h-3.5 text-zinc-550" />
            Request Pending
          </button>
        );
      } else {
        return (
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mr-1 hidden sm:inline">Incoming Request:</span>
            <button
              onClick={() => handleRespond("ACCEPTED")}
              disabled={connecting}
              className="bg-emerald-950/20 text-emerald-400 border border-emerald-900/50 hover:bg-emerald-950/40 text-[10px] font-bold uppercase tracking-widest px-4 py-2 rounded transition-colors cursor-pointer disabled:opacity-50 inline-flex items-center gap-1"
            >
              <Check className="w-3 h-3" />
              Accept
            </button>
            <button
              onClick={() => handleRespond("DECLINED")}
              disabled={connecting}
              className="bg-red-950/20 text-red-400 border border-red-900/50 hover:bg-red-950/40 text-[10px] font-bold uppercase tracking-widest px-4 py-2 rounded transition-colors cursor-pointer disabled:opacity-50 inline-flex items-center gap-1"
            >
              <X className="w-3 h-3" />
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
        className="bg-white hover:bg-zinc-200 text-black font-bold text-[10px] uppercase tracking-widest px-5 py-2.5 rounded transition-colors cursor-pointer shrink-0 inline-flex items-center gap-1.5"
      >
        <UserIcon className="w-3.5 h-3.5 text-black" />
        {connecting ? "Connecting..." : "Connect"}
      </button>
    );
  };

  return (
    <div className="space-y-8 w-full min-w-0 animate-fadeIn text-left text-zinc-300">
      
      {/* Navigation Toolbar */}
      <div className="flex justify-between items-center">
        <button
          onClick={() => router.back()}
          className="border border-zinc-800 hover:border-zinc-700 bg-zinc-950 text-white font-bold text-[10px] uppercase tracking-widest px-3 py-1.5 rounded transition-colors cursor-pointer"
        >
          &lt; Back
        </button>
        
        {/* Flag/Report Trigger (only for other users) */}
        {!isOwnProfile && (
          <button
            onClick={() => setReportOpen(true)}
            className="border border-red-950 text-red-400 bg-red-950/20 hover:bg-red-950/40 text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded transition-colors cursor-pointer"
          >
            Report User
          </button>
        )}
      </div>

      {/* Profile Card Header */}
      <div className="border border-zinc-800 bg-[#09090b]/40 rounded-lg p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 pb-6 border-b border-zinc-900">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded border border-zinc-800 bg-zinc-950 flex items-center justify-center text-white text-2xl font-bold font-mono">
              {profile.name?.[0]?.toUpperCase() || "U"}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-white tracking-tight leading-none">
                  {profile.name || "Marketplace Participant"}
                </h1>
                <span className="px-2 py-0.5 rounded text-[8px] font-bold border uppercase bg-zinc-950 text-zinc-400 border-zinc-800">
                  {profile.role}
                </span>
              </div>
              {profile.businessName && (
                <p className="text-xs text-zinc-450 mt-1 font-medium">
                  {profile.businessName}
                </p>
              )}
              {profile.location && (
                <p className="flex items-center gap-1.5 text-[10px] text-zinc-500 mt-2 font-mono">
                  <MapPin className="w-3 h-3" />
                  {profile.location}
                </p>
              )}
            </div>
          </div>

          {/* Render dynamically managed Connection button workflow */}
          <div className="w-full sm:w-auto shrink-0">
            {renderConnectActions()}
          </div>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-2 gap-4 pt-6">
          <div className="flex items-center gap-3 border border-zinc-850 bg-black p-4 rounded">
            <div className="w-10 h-10 rounded border border-yellow-950 bg-yellow-950/20 flex items-center justify-center">
              <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
            </div>
            <div>
              <div className="text-[9px] font-bold uppercase tracking-wider text-zinc-550">
                Reputation Rating
              </div>
              <div className="text-base font-bold text-white font-mono mt-0.5">
                {profile.averageRating.toFixed(1)} <span className="text-[10px] font-sans text-zinc-500 font-normal">/ 5.0</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 border border-zinc-850 bg-black p-4 rounded">
            <div className="w-10 h-10 rounded border border-zinc-800 bg-zinc-950 flex items-center justify-center">
              <Award className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-[9px] font-bold uppercase tracking-wider text-zinc-550">
                Escrows Completed
              </div>
              <div className="text-base font-bold text-white font-mono mt-0.5">
                {profile.completedProjectCount} <span className="text-[10px] font-sans text-zinc-500 font-normal">contracts</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* Bio Card */}
          <div className="border border-zinc-850 bg-black p-6 rounded-lg space-y-3">
            <h2 className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 pb-2 border-b border-zinc-900">
              About Summary
            </h2>
            {profile.bio ? (
              <p className="text-xs text-zinc-400 leading-relaxed font-light whitespace-pre-line">
                {profile.bio}
              </p>
            ) : (
              <p className="text-xs text-zinc-600 italic">
                No summary description provided by this user.
              </p>
            )}
          </div>

          {/* Skills Card */}
          {profile.skills.length > 0 && (
            <div className="border border-zinc-850 bg-black p-6 rounded-lg space-y-3">
              <h2 className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 pb-2 border-b border-zinc-900">
                Marketplace Endorsements
              </h2>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {profile.skills.map((skill) => (
                  <span
                    key={skill}
                    className="px-2.5 py-0.5 bg-zinc-950 border border-zinc-900 rounded text-[9px] font-mono text-zinc-400"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Reviews Section */}
          <div className="border border-zinc-850 bg-black p-6 rounded-lg space-y-4">
            <h2 className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 pb-2 border-b border-zinc-900 flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5" />
              Work History Feedback ({profile.reviews.length})
            </h2>

            {profile.reviews.length === 0 ? (
              <div className="py-8 text-center border border-dashed border-zinc-900 rounded bg-zinc-950/20">
                <p className="text-xs text-zinc-650 italic">
                  No rating reviews submitted for this user yet.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-zinc-900 space-y-4">
                {profile.reviews.map((rev, index) => (
                  <div key={rev.id} className={`${index > 0 ? "pt-4" : ""} space-y-2 text-left`}>
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <div className="font-bold text-xs text-white">
                          {rev.raterName}
                        </div>
                        <div className="text-[9px] text-zinc-500 font-mono mt-0.5 uppercase">
                          {rev.raterRole}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 bg-yellow-950/20 px-2 py-0.5 rounded border border-yellow-900/50 text-yellow-400 text-[10px] font-mono font-bold">
                        <Star className="w-2.5 h-2.5 fill-yellow-400 shrink-0" />
                        <span>{rev.score.toFixed(1)}</span>
                      </div>
                    </div>
                    {rev.comment ? (
                      <p className="text-xs text-zinc-400 leading-relaxed font-light italic bg-zinc-950 p-3 rounded border border-zinc-900">
                        "{rev.comment}"
                      </p>
                    ) : (
                      <p className="text-xs text-zinc-650 italic">
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
        <div className="lg:col-span-4 space-y-8">
          <div className="border border-zinc-850 bg-black p-6 rounded-lg space-y-4">
            <h2 className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 pb-2 border-b border-zinc-900">
              Connection Details
            </h2>

            {profile.isContactVisible ? (
              <div className="space-y-3 font-mono text-xs text-left">
                <div className="p-3 bg-zinc-950 border border-zinc-900 rounded">
                  <div className="text-[8px] font-sans text-zinc-500 uppercase tracking-widest mb-1">Email Address</div>
                  <div className="font-bold text-white break-all">{profile.email}</div>
                </div>

                {profile.phone && (
                  <div className="p-3 bg-zinc-950 border border-zinc-900 rounded">
                    <div className="text-[8px] font-sans text-zinc-500 uppercase tracking-widest mb-1">Phone Number</div>
                    <div className="font-bold text-white break-all">{profile.phone}</div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 border border-dashed border-zinc-900 rounded bg-zinc-950/20 text-center space-y-3">
                <Lock className="w-6 h-6 text-zinc-650 mx-auto" />
                <p className="text-xs font-semibold text-white">
                  Contact details are locked.
                </p>
                <p className="text-[10px] text-zinc-550 leading-relaxed font-light">
                  Direct phone and email details are only exchanged when a verified client-freelancer contract relationship is initiated.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Flag/Report Modal Dialogue */}
      {reportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="border border-zinc-800 bg-[#09090b] max-w-md w-full p-6 rounded-lg relative space-y-4 text-left">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Report Marketplace Participant</h3>
              <p className="text-[10px] text-zinc-550 mt-1 font-light">
                Flag this user profile for review by the administrators. Please specify a clear explanation detailing the violation.
              </p>
            </div>

            {reportSuccess ? (
              <div className="bg-emerald-950/20 border border-emerald-900/50 text-emerald-400 p-4 rounded text-xs font-bold text-center">
                Report successfully submitted to administrators.
              </div>
            ) : (
              <form onSubmit={handleReport} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                    Explanation / Reason
                  </label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Describe the violation details..."
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    className="w-full px-3 py-2 bg-black border border-zinc-800 rounded text-xs text-white placeholder-zinc-700 focus:outline-none leading-relaxed resize-none"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setReportOpen(false);
                      setReportReason("");
                    }}
                    className="border border-zinc-800 hover:border-zinc-750 text-white font-bold text-[10px] uppercase tracking-widest px-4 py-2 rounded transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={reporting}
                    className="bg-red-650 hover:bg-red-700 text-white text-[10px] font-bold uppercase tracking-widest px-4 py-2 rounded transition-colors cursor-pointer disabled:opacity-50"
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
