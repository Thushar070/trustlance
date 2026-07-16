"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { DisputeStatus, EscrowStatus } from "@prisma/client";
import AuditHistory from "@/components/AuditHistory";
import {
  FileText,
  Link2,
  AlertTriangle,
  Lock,
  CheckCircle,
  XCircle,
  Upload,
} from "lucide-react";

interface EvidenceItem {
  id: string;
  userId: string;
  type: "file" | "link" | "screenshot";
  url: string;
  createdAt: string;
}

interface DisputeDetails {
  id: string;
  escrowId: string;
  raisedBy: string;
  reason: string;
  status: DisputeStatus;
  resolution: string | null;
  createdAt: string;
  evidence: EvidenceItem[];
  escrow: {
    id: string;
    status: EscrowStatus;
    project: {
      id: string;
      title: string;
      description: string;
      budget: number;
      agreedAmount: number | null;
      clientId: string;
      freelancerId: string | null;
      client: {
        id: string;
        name: string | null;
        email: string;
      };
      freelancer?: {
        id: string;
        name: string | null;
        email: string;
      } | null;
    };
  };
}

export default function DisputeDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { data: session } = useSession();

  const [dispute, setDispute] = useState<DisputeDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Evidence upload states
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [evidenceError, setEvidenceError] = useState<string | null>(null);
  const [submittingEvidence, setSubmittingEvidence] = useState(false);

  // Admin resolution states
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [resolvingAction, setResolvingAction] = useState<"RELEASE" | "REFUND" | null>(null);
  const [resolveError, setResolveError] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<"RELEASE" | "REFUND" | null>(null);

  useEffect(() => {
    const fetchDispute = async () => {
      try {
        const res = await fetch(`/api/disputes/${id}`);
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Failed to load dispute details");
        }
        const data = await res.json();
        setDispute(data);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "An error occurred.";
        setErrorMsg(msg);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchDispute();
    }
  }, [id, refreshTrigger]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) {
      alert("File size exceeds the 50MB limit.");
      return;
    }

    setSelectedFile(file);
  };

  const handleEvidenceUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingEvidence(true);
    setEvidenceError(null);

    try {
      if (!selectedFile && !linkUrl) {
        throw new Error("Please select a file or enter a link.");
      }

      let type: "file" | "link" = "link";
      let url = linkUrl;

      if (selectedFile) {
        setUploadingFile(true);
        // 1. Get presigned upload URL
        const presignRes = await fetch("/api/uploads/presign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: selectedFile.name,
            contentType: selectedFile.type,
            fileSize: selectedFile.size,
          }),
        });

        const presignData = await presignRes.json();
        if (!presignRes.ok) {
          throw new Error(presignData.error || "Failed to generate upload link.");
        }

        // 2. Direct upload to S3
        const s3Res = await fetch(presignData.uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": selectedFile.type },
          body: selectedFile,
        });

        if (!s3Res.ok) {
          throw new Error("Direct cloud upload failed.");
        }

        type = "file";
        url = presignData.fileUrl;
        setUploadingFile(false);
      }

      // 3. Post evidence details to dispute
      const submitRes = await fetch(`/api/disputes/${id}/evidence`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, url }),
      });

      const submitData = await submitRes.json();
      if (!submitRes.ok) {
        throw new Error(submitData.error || "Evidence submission failed.");
      }

      setSelectedFile(null);
      setLinkUrl("");
      setRefreshTrigger((prev) => prev + 1);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to upload evidence.";
      setEvidenceError(msg);
    } finally {
      setUploadingFile(false);
      setSubmittingEvidence(false);
    }
  };

  const handleResolve = async (resolution: "RELEASE" | "REFUND") => {
    if (!resolutionNotes || resolutionNotes.trim() === "") {
      setResolveError("Resolution notes explaining the decision are required.");
      return;
    }

    // Double-submission protection: exit if already processing
    if (resolvingAction !== null) {
      return;
    }

    setResolvingAction(resolution);
    setResolveError(null);

    try {
      const res = await fetch(`/api/disputes/${id}/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resolution, notes: resolutionNotes }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to resolve dispute.");
      }

      setConfirmAction(null);
      setRefreshTrigger((prev) => prev + 1);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "An error occurred during resolution.";
      setResolveError(msg);
    } finally {
      setResolvingAction(null);
    }
  };

  const getStatusBadge = (status: DisputeStatus, escrowStatus?: EscrowStatus) => {
    if (status === DisputeStatus.RESOLVED) {
      return escrowStatus === EscrowStatus.RELEASED
        ? "bg-[var(--status-success-bg)] text-[var(--status-success-text)] border-[var(--status-success-border)]"
        : "bg-[var(--status-negative-bg)] text-[var(--status-negative-text)] border-[var(--status-negative-border)]";
    }
    return status === DisputeStatus.OPEN
      ? "bg-[var(--status-open-bg)] text-[var(--status-open-text)] border-[var(--status-open-border)]"
      : "bg-[var(--status-neutral-bg)] text-[var(--status-neutral-text)] border-[var(--status-neutral-border)]";
  };

  if (loading) {
    return (
      <div className="flex-grow flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 rounded-full border-2 border-[var(--border)] border-t-[var(--accent)] animate-spin" />
          <p className="text-[var(--text-muted)] text-xs font-bold uppercase tracking-wider">Loading case file...</p>
        </div>
      </div>
    );
  }

  if (errorMsg || !dispute) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center animate-fadeIn">
        <div className="bg-[var(--status-negative-bg)] border border-[var(--status-negative-border)] p-6 rounded-xl shadow-sm">
          <p className="text-sm text-[var(--status-negative-text)] font-semibold mb-3">{errorMsg || "Dispute not found"}</p>
          <button
            onClick={() => router.push("/projects")}
            className="btn-ghost px-4 py-2 text-[var(--status-negative-text)] border-[var(--status-negative-border)]"
          >
            Back to dashboard
          </button>
        </div>
      </div>
    );
  }

  const project = dispute.escrow?.project;
  const isClient = session?.user?.id === project.clientId;
  const isFreelancer = session?.user?.id === project.freelancerId;
  const isAdmin = session?.user?.role === "ADMIN";
  const isResolved = dispute.status === DisputeStatus.RESOLVED;

  // Split evidence into Client's and Freelancer's submissions
  const clientEvidence = dispute.evidence.filter((ev) => ev.userId === project.clientId);
  const freelancerEvidence = dispute.evidence.filter((ev) => ev.userId === project.freelancerId);

  // Count user's current evidence items
  const userEvidenceCount = dispute.evidence.filter((ev) => ev.userId === session?.user?.id).length;
  const hasReachedLimit = userEvidenceCount >= 10;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fadeIn">
      {/* Dispute Header Case File branding */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-[var(--border)] pb-6 mb-8 gap-4">
        <div>
          <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest block mb-1">
            Escrow Case File #{dispute.id.slice(-6).toUpperCase()}
          </span>
          <h1 className="text-xl font-black text-[var(--text-primary)] tracking-tight">
            {project.title}
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1 font-medium">
            Reviewing escrow dispute for ₹{project.budget.toLocaleString()} contract budget.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border uppercase tracking-wider ${getStatusBadge(dispute.status, dispute.escrow?.status)}`}>
            {isResolved
              ? `RESOLVED: ${dispute.escrow?.status === EscrowStatus.RELEASED ? "RELEASED" : "REFUNDED"}`
              : dispute.status}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Case Details (Columns client vs freelancer) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Dispute details reason */}
          <div className="card p-6 sm:p-8">
            <h2 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-4">Initial Dispute Reason</h2>
            <div className="text-[var(--text-secondary)] text-sm leading-relaxed whitespace-pre-wrap bg-[var(--surface-subtle)] border border-[var(--border)] rounded-xl p-5">
              <span className="font-bold text-[var(--text-primary)] block mb-2 text-xs uppercase tracking-wider">
                Raised by {dispute.raisedBy === project.clientId ? "Client" : "Freelancer"} on {new Date(dispute.createdAt).toLocaleString()}
              </span>
              <p className="italic text-[var(--text-secondary)] leading-relaxed">&ldquo;{dispute.reason}&rdquo;</p>
            </div>
          </div>

          {/* Two Columns Evidence */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 stagger-children">
            {/* Client Column */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-2.5">
                <h3 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">Client&apos;s Evidence</h3>
                <span className="text-xs font-semibold text-[var(--text-muted)]">{clientEvidence.length} items</span>
              </div>

              {clientEvidence.length === 0 ? (
                <div className="bg-[var(--surface-subtle)] border border-dashed border-[var(--border)] rounded-xl p-6 text-center text-xs text-[var(--text-muted)] italic">
                  No evidence uploaded by client yet.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {clientEvidence.map((ev) => (
                    <div key={ev.id} className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 shadow-sm hover:shadow-[var(--card-shadow-hover)] hover:-translate-y-0.5 transition-all duration-200">
                      <div className="flex items-start gap-3">
                        <span className="text-[var(--text-muted)] mt-0.5">
                          {ev.type === "file" ? <FileText className="w-4 h-4" /> : <Link2 className="w-4 h-4" />}
                        </span>
                        <div className="min-w-0 flex-grow">
                          <a
                            href={ev.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-bold text-[var(--accent)] hover:text-[var(--accent-hover)] hover:underline block truncate"
                          >
                            {ev.type === "file" ? ev.url.split("/").pop() || "Evidence File" : ev.url}
                          </a>
                          <span className="text-[10px] text-[var(--text-muted)] block mt-1">
                            Uploaded {new Date(ev.createdAt).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Freelancer Column */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-2.5">
                <h3 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">Freelancer&apos;s Evidence</h3>
                <span className="text-xs font-semibold text-[var(--text-muted)]">{freelancerEvidence.length} items</span>
              </div>

              {freelancerEvidence.length === 0 ? (
                <div className="bg-[var(--surface-subtle)] border border-dashed border-[var(--border)] rounded-xl p-6 text-center text-xs text-[var(--text-muted)] italic">
                  No evidence uploaded by freelancer yet.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {freelancerEvidence.map((ev) => (
                    <div key={ev.id} className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 shadow-sm hover:shadow-[var(--card-shadow-hover)] hover:-translate-y-0.5 transition-all duration-200">
                      <div className="flex items-start gap-3">
                        <span className="text-[var(--text-muted)] mt-0.5">
                          {ev.type === "file" ? <FileText className="w-4 h-4" /> : <Link2 className="w-4 h-4" />}
                        </span>
                        <div className="min-w-0 flex-grow">
                          <a
                            href={ev.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-bold text-[var(--accent)] hover:text-[var(--accent-hover)] hover:underline block truncate"
                          >
                            {ev.type === "file" ? ev.url.split("/").pop() || "Evidence File" : ev.url}
                          </a>
                          <span className="text-[10px] text-[var(--text-muted)] block mt-1">
                            Uploaded {new Date(ev.createdAt).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Evidence Upload Area */}
          {(isClient || isFreelancer) && !isResolved && (
            <div className="card p-6 sm:p-8">
              <div className="mb-4">
                <h3 className="text-sm font-black text-[var(--text-primary)] tracking-tight">Upload Supporting Evidence</h3>
                <p className="text-xs text-[var(--text-muted)] mt-1 font-medium">
                  Upload file logs, screenshots, or link relevant external demos/repos. You have uploaded {userEvidenceCount} of 10 allowed items.
                </p>
              </div>

              {evidenceError && (
                <div className="mb-4 bg-[var(--status-negative-bg)] border border-[var(--status-negative-border)] p-4 rounded-xl">
                  <p className="text-xs text-[var(--status-negative-text)] font-semibold">{evidenceError}</p>
                </div>
              )}

              {hasReachedLimit ? (
                <div className="bg-[var(--status-progress-bg)] border border-[var(--status-progress-border)] rounded-xl p-4 text-center text-xs text-[var(--status-progress-text)] font-bold flex items-center justify-center gap-1.5 uppercase tracking-wide">
                  <Lock className="w-4 h-4" />
                  You have reached the evidence limit of 10 items for this dispute.
                </div>
              ) : (
                <form onSubmit={handleEvidenceUpload} className="space-y-4">
                  {/* File Selector */}
                  <div>
                    <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">Deliverable file (ZIP, PDF, PNG, JPG - Max 50MB)</label>
                    <input
                      type="file"
                      onChange={handleFileChange}
                      disabled={submittingEvidence}
                      className="w-full text-xs text-[var(--text-secondary)] file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-[11px] file:font-bold file:bg-[var(--accent-light)] file:text-[var(--accent)] hover:file:opacity-90 cursor-pointer disabled:opacity-50"
                    />
                    {selectedFile && (
                      <p className="mt-1.5 text-xs text-[var(--status-success-text)] font-semibold">
                        Selected: {selectedFile.name} ({(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)
                      </p>
                    )}
                  </div>

                  {/* Divider */}
                  <div className="flex items-center text-xs text-[var(--text-muted)] font-medium my-4">
                    <div className="flex-grow border-t border-[var(--border-subtle)]" />
                    <span className="px-3 uppercase text-[10px] tracking-wider text-[var(--text-muted)] font-bold">OR</span>
                    <div className="flex-grow border-t border-[var(--border-subtle)]" />
                  </div>

                  {/* Link Input */}
                  <div>
                    <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">Evidence URL/Link (Alternative to file upload)</label>
                    <input
                      type="url"
                      placeholder="e.g. https://github.com/username/repo or hosted site link"
                      value={linkUrl}
                      onChange={(e) => setLinkUrl(e.target.value)}
                      disabled={submittingEvidence}
                      className="w-full px-4 py-2.5 border border-[var(--input-border)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--input-focus-ring)] text-sm transition-all disabled:opacity-50 bg-[var(--input-bg)] text-[var(--text-primary)]"
                    />
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      disabled={submittingEvidence || uploadingFile}
                      className="btn-primary"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      {uploadingFile ? "Uploading File to Cloud..." : submittingEvidence ? "Adding Evidence..." : "Add Evidence"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>

        {/* Sidebar details & Admin controls */}
        <div className="lg:col-span-1 space-y-6 animate-slideUp">
          {/* Dispute Contract Specs Card */}
          <div className="card p-6 text-[var(--text-secondary)]">
            <h3 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-4">Project Contract Information</h3>
            <div className="space-y-3.5 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-[var(--text-secondary)]">Escrow Value</span>
                <span className="font-black text-[var(--text-primary)]">₹{project.budget.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[var(--text-secondary)]">Client User</span>
                <span className="font-semibold text-[var(--text-primary)]">{project.client.name || "Client"}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[var(--text-secondary)]">Freelancer</span>
                <span className="font-semibold text-[var(--text-primary)]">{project.freelancer?.name || "Freelancer"}</span>
              </div>
              <div className="border-t border-[var(--border-subtle)] pt-4">
                <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider block mb-1.5">Contract Description</span>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed truncate">{project.description}</p>
              </div>
            </div>
          </div>

          {/* Admin Adjudication Card */}
          {isAdmin && !isResolved && (
            <div className="card p-6">
              <h3 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-4">Adjudicate Dispute</h3>

              {resolveError && (
                <div className="mb-4 bg-[var(--status-negative-bg)] border border-[var(--status-negative-border)] p-4 rounded-xl">
                  <p className="text-xs text-[var(--status-negative-text)] font-semibold">{resolveError}</p>
                </div>
              )}

              <div className="space-y-4">
                {confirmAction === null ? (
                  <>
                    <div>
                      <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">Resolution Notes (Required)</label>
                      <textarea
                        placeholder="Provide details and justification explaining the resolution decision..."
                        rows={4}
                        required
                        value={resolutionNotes}
                        onChange={(e) => setResolutionNotes(e.target.value)}
                        disabled={resolvingAction !== null}
                        className="w-full px-3 py-2 border border-[var(--input-border)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--input-focus-ring)] text-xs transition-all leading-relaxed bg-[var(--input-bg)] text-[var(--text-primary)]"
                      />
                    </div>

                    <div className="flex flex-col gap-2 pt-2">
                      <button
                        onClick={() => setConfirmAction("RELEASE")}
                        disabled={!resolutionNotes.trim()}
                        className="w-full inline-flex justify-center items-center py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-[var(--status-success-text)] hover:opacity-90 disabled:opacity-50 cursor-pointer transition-colors shadow-sm"
                      >
                        <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
                        Release to Freelancer
                      </button>
                      <button
                        onClick={() => setConfirmAction("REFUND")}
                        disabled={!resolutionNotes.trim()}
                        className="w-full inline-flex justify-center items-center py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-[var(--status-negative-text)] hover:opacity-90 disabled:opacity-50 cursor-pointer transition-colors shadow-sm"
                      >
                        <XCircle className="w-3.5 h-3.5 mr-1.5" />
                        Refund to Client
                      </button>
                    </div>
                  </>
                ) : (
                  <div className={`p-5 rounded-xl border text-xs leading-relaxed space-y-4 ${
                    confirmAction === "RELEASE"
                      ? "bg-[var(--status-success-bg)] border-[var(--status-success-border)] text-[var(--status-success-text)]"
                      : "bg-[var(--status-negative-bg)] border-[var(--status-negative-border)] text-[var(--status-negative-text)]"
                  }`}>
                    <div className="font-semibold text-sm flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4" />
                      Adjudication Confirmation
                    </div>
                    <div>
                      {confirmAction === "RELEASE" ? (
                        <span>
                          You are about to release <strong>₹{(project.agreedAmount || project.budget || 0).toLocaleString()}</strong> to <strong>{project.freelancer?.name || "the freelancer"}</strong>. This action is final and cannot be undone.
                        </span>
                      ) : (
                        <span>
                          You are about to refund <strong>₹{(project.agreedAmount || project.budget || 0).toLocaleString()}</strong> to <strong>{project.client.name || "the client"}</strong>. This action is final and cannot be undone.
                        </span>
                      )}
                    </div>

                    <div className="flex gap-2.5 pt-2">
                      <button
                        onClick={() => handleResolve(confirmAction)}
                        disabled={resolvingAction !== null}
                        className={`flex-grow inline-flex justify-center items-center py-2.5 px-4 rounded-xl text-xs font-bold text-white transition-all cursor-pointer ${
                          confirmAction === "RELEASE"
                            ? "bg-[var(--status-success-text)] hover:brightness-110"
                            : "bg-[var(--status-negative-text)] hover:brightness-110"
                        }`}
                      >
                        {resolvingAction !== null ? "Processing..." : "Confirm & Submit"}
                      </button>
                      <button
                        onClick={() => setConfirmAction(null)}
                        disabled={resolvingAction !== null}
                        className="px-4 py-2.5 bg-[var(--surface-subtle)] border border-[var(--border)] hover:bg-[var(--border-subtle)] text-[var(--text-primary)] font-bold rounded-xl text-xs transition-all cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Resolution Outcome Display Card */}
          {isResolved && (
            <div className="card p-6 bg-[var(--surface-subtle)]">
              <h3 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-3">Resolution Outcome</h3>
              <div className="space-y-4 text-xs text-[var(--text-secondary)] leading-relaxed">
                <div>
                  <span className="font-bold text-[var(--text-muted)] block uppercase tracking-wider mb-1">Decision</span>
                  <span className={`font-black uppercase tracking-wider text-sm ${
                    dispute.escrow?.status === EscrowStatus.RELEASED ? "text-[var(--status-success-text)]" : "text-[var(--status-negative-text)]"
                  }`}>
                    {dispute.escrow?.status === EscrowStatus.RELEASED ? "Released to Freelancer" : "Refunded to Client"}
                  </span>
                </div>
                <div className="border-t border-[var(--border-subtle)] pt-3">
                  <span className="font-bold text-[var(--text-muted)] block uppercase tracking-wider mb-1.5">Resolution Notes</span>
                  <p className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-3.5 font-medium text-[var(--text-primary)] whitespace-pre-wrap leading-relaxed">
                    {dispute.resolution || "No notes recorded."}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      {dispute && <AuditHistory entityId={dispute.id} entityType="Dispute" />}
    </div>
  );
}
