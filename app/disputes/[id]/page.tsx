"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useNotification } from "@/components/NotificationProvider";
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
  const { showWarning } = useNotification();

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
      showWarning("File size exceeds the 50MB limit.");
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
        ? "bg-emerald-950/20 text-emerald-400 border-emerald-900/50"
        : "bg-red-950/20 text-red-400 border-red-900/50";
    }
    return status === DisputeStatus.OPEN
      ? "bg-yellow-950/20 text-yellow-400 border-yellow-900/50"
      : "bg-zinc-950 text-zinc-400 border-zinc-800";
  };

  if (loading) {
    return (
      <div className="flex-grow flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 rounded-full border-2 border-zinc-800 border-t-white animate-spin" />
          <p className="text-zinc-550 text-[10px] font-bold uppercase tracking-widest">Loading case file...</p>
        </div>
      </div>
    );
  }

  if (errorMsg || !dispute) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center animate-fadeIn">
        <div className="bg-red-950/20 border border-red-900/50 p-6 rounded">
          <p className="text-xs font-semibold text-red-400 mb-3">{errorMsg || "Dispute not found"}</p>
          <button
            onClick={() => router.push("/projects")}
            className="border border-zinc-800 hover:border-zinc-700 bg-zinc-950 text-white font-bold text-[10px] uppercase tracking-widest px-4 py-2 rounded transition-colors cursor-pointer"
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

  const clientEvidence = dispute.evidence.filter((ev) => ev.userId === project.clientId);
  const freelancerEvidence = dispute.evidence.filter((ev) => ev.userId === project.freelancerId);
  const userEvidenceCount = dispute.evidence.filter((ev) => ev.userId === session?.user?.id).length;
  const hasReachedLimit = userEvidenceCount >= 10;

  return (
    <div className="space-y-8 w-full min-w-0 animate-fadeIn text-left text-zinc-300">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-zinc-900 pb-6 gap-4">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">
            <span>Escrow</span>
            <span>&gt;</span>
            <span>Disputes</span>
            <span>&gt;</span>
            <span className="text-zinc-400 font-bold">Case File #{dispute.id.slice(-6).toUpperCase()}</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white leading-tight">
            {project.title}
          </h1>
          <p className="text-xs text-zinc-550 font-light mt-1 font-mono">
            Disputed Escrow Value: ₹{project.budget.toLocaleString()}
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className={`px-2.5 py-0.5 rounded text-[9px] font-bold border uppercase tracking-widest ${getStatusBadge(dispute.status, dispute.escrow?.status)}`}>
            {isResolved
              ? `RESOLVED: ${dispute.escrow?.status === EscrowStatus.RELEASED ? "RELEASED" : "REFUNDED"}`
              : dispute.status}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <div className="lg:col-span-2 space-y-8">
          <div className="border border-zinc-800 bg-[#09090b]/40 rounded-lg p-6">
            <h2 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-3">Initial Dispute Reason</h2>
            <div className="text-zinc-400 text-xs leading-relaxed whitespace-pre-wrap bg-zinc-950 border border-zinc-900 rounded p-5">
              <span className="font-mono text-zinc-500 block mb-2 text-[9px] uppercase tracking-wider">
                Raised by {dispute.raisedBy === project.clientId ? "Client" : "Freelancer"} on {new Date(dispute.createdAt).toLocaleString()}
              </span>
              <p className="italic text-zinc-350 leading-relaxed">"{dispute.reason}"</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
                <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Client's Evidence</h3>
                <span className="text-[9px] font-mono text-zinc-550">{clientEvidence.length} items</span>
              </div>

              {clientEvidence.length === 0 ? (
                <div className="bg-zinc-950 border border-dashed border-zinc-900 rounded p-6 text-center text-xs text-zinc-600 italic font-light">
                  No evidence uploaded by client yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {clientEvidence.map((ev) => (
                    <div key={ev.id} className="bg-black border border-zinc-850 rounded p-4">
                      <div className="flex items-start gap-3">
                        <span className="text-zinc-600 mt-0.5 shrink-0">
                          {ev.type === "file" ? <FileText className="w-3.5 h-3.5" /> : <Link2 className="w-3.5 h-3.5" />}
                        </span>
                        <div className="min-w-0 flex-grow text-xs">
                          <a
                            href={ev.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-bold text-white hover:underline block truncate"
                          >
                            {ev.type === "file" ? ev.url.split("/").pop() || "Evidence File" : ev.url}
                          </a>
                          <span className="text-[9px] text-zinc-550 block mt-1 font-mono">
                            Uploaded {new Date(ev.createdAt).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
                <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Freelancer's Evidence</h3>
                <span className="text-[9px] font-mono text-zinc-550">{freelancerEvidence.length} items</span>
              </div>

              {freelancerEvidence.length === 0 ? (
                <div className="bg-zinc-950 border border-dashed border-zinc-900 rounded p-6 text-center text-xs text-zinc-600 italic font-light">
                  No evidence uploaded by freelancer yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {freelancerEvidence.map((ev) => (
                    <div key={ev.id} className="bg-black border border-zinc-850 rounded p-4">
                      <div className="flex items-start gap-3">
                        <span className="text-zinc-600 mt-0.5 shrink-0">
                          {ev.type === "file" ? <FileText className="w-3.5 h-3.5" /> : <Link2 className="w-3.5 h-3.5" />}
                        </span>
                        <div className="min-w-0 flex-grow text-xs">
                          <a
                            href={ev.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-bold text-white hover:underline block truncate"
                          >
                            {ev.type === "file" ? ev.url.split("/").pop() || "Evidence File" : ev.url}
                          </a>
                          <span className="text-[9px] text-zinc-550 block mt-1 font-mono">
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

          {(isClient || isFreelancer) && !isResolved && (
            <div className="border border-zinc-800 bg-[#09090b]/40 rounded-lg p-6">
              <div className="mb-4">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Upload Supporting Evidence</h3>
                <p className="text-xs text-zinc-550 mt-1 font-light">
                  Upload files, screenshots, or links to external resources. Allowed limit: {userEvidenceCount} of 10 items.
                </p>
              </div>

              {evidenceError && (
                <div className="mb-4 bg-red-950/20 border border-red-900/50 p-4 rounded text-xs text-red-400">
                  <p className="font-semibold">{evidenceError}</p>
                </div>
              )}

              {hasReachedLimit ? (
                <div className="bg-zinc-950 border border-zinc-900 rounded p-4 text-center text-xs text-zinc-500 font-bold uppercase tracking-wider flex items-center justify-center gap-1.5">
                  <Lock className="w-3.5 h-3.5" />
                  Evidence upload limit reached (10 items maximum).
                </div>
              ) : (
                <form onSubmit={handleEvidenceUpload} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Deliverable File (ZIP, PDF, images - Max 50MB)</label>
                    <input
                      type="file"
                      onChange={handleFileChange}
                      disabled={submittingEvidence}
                      className="w-full text-xs text-zinc-400 file:mr-4 file:py-1.5 file:px-3 file:rounded file:border file:border-zinc-800 file:text-[10px] file:font-bold file:bg-zinc-950 file:text-white hover:file:bg-zinc-900 cursor-pointer disabled:opacity-50"
                    />
                    {selectedFile && (
                      <p className="text-[10px] text-emerald-400 font-mono">
                        Selected: {selectedFile.name} ({(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)
                      </p>
                    )}
                  </div>

                  <div className="flex items-center text-[10px] text-zinc-650 font-bold my-4">
                    <div className="flex-grow border-t border-zinc-900" />
                    <span className="px-3 uppercase tracking-wider font-mono">OR</span>
                    <div className="flex-grow border-t border-zinc-900" />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Evidence Link / URL</label>
                    <input
                      type="url"
                      placeholder="e.g. https://github.com/username/repo"
                      value={linkUrl}
                      onChange={(e) => setLinkUrl(e.target.value)}
                      disabled={submittingEvidence}
                      className="w-full px-3 py-2 bg-black border border-zinc-800 rounded text-xs text-white placeholder-zinc-700 focus:outline-none"
                    />
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      disabled={submittingEvidence || uploadingFile}
                      className="bg-white hover:bg-zinc-200 text-black font-bold text-[10px] uppercase tracking-widest px-4 py-2 rounded transition-colors cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
                    >
                      <Upload className="w-3 h-3 text-black" />
                      {uploadingFile ? "Uploading File..." : submittingEvidence ? "Adding Evidence..." : "Add Evidence"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>

        <div className="lg:col-span-1 space-y-6">
          <div className="border border-zinc-850 bg-black rounded-lg p-6 space-y-4">
            <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider pb-2 border-b border-zinc-900">Contract Specifications</h3>
            <div className="space-y-3.5 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-zinc-500">Escrow Value</span>
                <span className="font-bold text-white font-mono">₹{project.budget.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-500">Client User</span>
                <span className="font-bold text-white truncate max-w-[120px]">{project.client.name || "Client"}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-500">Freelancer</span>
                <span className="font-bold text-white truncate max-w-[120px]">{project.freelancer?.name || "Freelancer"}</span>
              </div>
              <div className="border-t border-zinc-900 pt-3">
                <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">Contract Description</span>
                <p className="text-[11px] text-zinc-400 leading-relaxed font-light line-clamp-4">{project.description}</p>
              </div>
            </div>
          </div>

          {isAdmin && !isResolved && (
            <div className="border border-red-950/30 bg-red-950/5 p-6 rounded-lg space-y-4">
              <h3 className="text-[10px] font-bold text-red-400 uppercase tracking-wider pb-2 border-b border-red-950/20">Adjudicate Dispute</h3>

              {resolveError && (
                <div className="bg-red-950/20 border border-red-900/50 p-4 rounded text-xs text-red-400">
                  <p className="font-semibold">{resolveError}</p>
                </div>
              )}

              <div className="space-y-4 text-left">
                {confirmAction === null ? (
                  <>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Resolution Notes (Required)</label>
                      <textarea
                        placeholder="Provide details and justification explaining the resolution decision..."
                        rows={4}
                        required
                        value={resolutionNotes}
                        onChange={(e) => setResolutionNotes(e.target.value)}
                        disabled={resolvingAction !== null}
                        className="w-full px-3 py-2 bg-black border border-zinc-800 rounded text-xs text-white placeholder-zinc-700 focus:outline-none leading-relaxed resize-none"
                      />
                    </div>

                    <div className="flex flex-col gap-2 pt-2">
                      <button
                        onClick={() => setConfirmAction("RELEASE")}
                        disabled={!resolutionNotes.trim()}
                        className="w-full bg-emerald-950/20 text-emerald-400 border border-emerald-900/50 hover:bg-emerald-950/40 text-[10px] font-bold uppercase tracking-widest py-2 rounded transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        Release to Freelancer
                      </button>
                      <button
                        onClick={() => setConfirmAction("REFUND")}
                        disabled={!resolutionNotes.trim()}
                        className="w-full bg-red-950/20 text-red-400 border border-red-900/50 hover:bg-red-950/40 text-[10px] font-bold uppercase tracking-widest py-2 rounded transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        Refund to Client
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="p-4 rounded border border-zinc-900 bg-zinc-950 text-xs leading-relaxed space-y-4">
                    <div className="font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-yellow-400" />
                      Final Confirmation
                    </div>
                    <div className="text-zinc-400 font-light">
                      {confirmAction === "RELEASE" ? (
                        <span>
                          You are about to release <strong>₹{(project.agreedAmount || project.budget || 0).toLocaleString()}</strong> to <strong>{project.freelancer?.name || "the freelancer"}</strong>. This action cannot be undone.
                        </span>
                      ) : (
                        <span>
                          You are about to refund <strong>₹{(project.agreedAmount || project.budget || 0).toLocaleString()}</strong> to <strong>{project.client.name || "the client"}</strong>. This action cannot be undone.
                        </span>
                      )}
                    </div>

                    <div className="flex gap-2.5 pt-2">
                      <button
                        onClick={() => handleResolve(confirmAction)}
                        disabled={resolvingAction !== null}
                        className={`flex-grow py-2 px-3 text-[10px] font-bold uppercase tracking-widest text-white rounded transition-colors cursor-pointer ${
                          confirmAction === "RELEASE"
                            ? "bg-emerald-700 hover:bg-emerald-600"
                            : "bg-red-700 hover:bg-red-600"
                        }`}
                      >
                        {resolvingAction !== null ? "Processing..." : "Confirm"}
                      </button>
                      <button
                        onClick={() => setConfirmAction(null)}
                        disabled={resolvingAction !== null}
                        className="border border-zinc-800 hover:border-zinc-700 bg-zinc-950 text-white font-bold text-[10px] uppercase tracking-widest px-4 py-2 rounded transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {isResolved && (
            <div className="border border-zinc-850 bg-black rounded-lg p-6 space-y-4">
              <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider pb-2 border-b border-zinc-900">Resolution Outcome</h3>
              <div className="space-y-4 text-xs">
                <div>
                  <span className="text-[9px] font-bold text-zinc-550 uppercase tracking-wider block mb-1">Decision</span>
                  <span className={`font-bold uppercase tracking-widest text-sm ${
                    dispute.escrow?.status === EscrowStatus.RELEASED ? "text-emerald-400" : "text-red-400"
                  }`}>
                    {dispute.escrow?.status === EscrowStatus.RELEASED ? "Released to Freelancer" : "Refunded to Client"}
                  </span>
                </div>
                <div className="border-t border-zinc-900 pt-3">
                  <span className="text-[9px] font-bold text-zinc-550 uppercase tracking-wider block mb-1.5">Resolution Notes</span>
                  <p className="bg-zinc-950 border border-zinc-900 rounded p-4 font-light text-zinc-300 leading-relaxed whitespace-pre-wrap italic">
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
