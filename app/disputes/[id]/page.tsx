"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { DisputeStatus, EscrowStatus } from "@prisma/client";
import AuditHistory from "@/components/AuditHistory";

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
          throw new Error("Direct S3 upload failed.");
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
        ? "bg-emerald-50 text-emerald-700 border-emerald-250"
        : "bg-red-50 text-red-700 border-red-250";
    }
    return status === DisputeStatus.OPEN
      ? "bg-amber-50 text-amber-700 border-amber-250"
      : "bg-slate-100 text-slate-600 border-slate-250";
  };

  if (loading) {
    return (
      <div className="flex-grow flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 rounded-full border-2 border-slate-200 border-t-indigo-500 animate-spin" />
          <p className="text-slate-400 text-sm">Loading case file...</p>
        </div>
      </div>
    );
  }

  if (errorMsg || !dispute) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-lg">
          <p className="text-sm text-red-700 font-semibold mb-3">{errorMsg || "Dispute not found"}</p>
          <button
            onClick={() => router.push("/projects")}
            className="text-xs px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 font-bold rounded-lg transition-colors cursor-pointer"
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Dispute Header Case File branding */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-slate-200/80 pb-6 mb-8 gap-4">
        <div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
            Escrow Case File #{dispute.id.slice(-6).toUpperCase()}
          </span>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            {project.title}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Case Details (Columns client vs freelancer) */}
        <div className="lg:col-span-2 space-y-8">
          {/* Dispute details reason */}
          <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/40 border border-slate-100 p-6 sm:p-8">
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Initial Dispute Reason</h2>
            <div className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap bg-slate-50 border border-slate-100 rounded-xl p-5">
              <span className="font-bold text-slate-900 block mb-1">
                Raised by {dispute.raisedBy === project.clientId ? "Client" : "Freelancer"} on {new Date(dispute.createdAt).toLocaleString()}
              </span>
              &ldquo;{dispute.reason}&rdquo;
            </div>
          </div>

          {/* Two Columns Evidence */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Client Column */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Client&apos;s Evidence</h3>
                <span className="text-xs font-semibold text-slate-400">{clientEvidence.length} items</span>
              </div>
              
              {clientEvidence.length === 0 ? (
                <div className="bg-slate-50/50 border border-dashed border-slate-200 rounded-2xl p-6 text-center text-xs text-slate-400 italic">
                  No evidence uploaded by client yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {clientEvidence.map((ev) => (
                    <div key={ev.id} className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-start gap-3">
                        <span className="text-lg flex-shrink-0 mt-0.5">{ev.type === "file" ? "📁" : "🔗"}</span>
                        <div className="min-w-0 flex-grow">
                          <a
                            href={ev.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:underline block truncate"
                          >
                            {ev.type === "file" ? ev.url.split("/").pop() || "Evidence File" : ev.url}
                          </a>
                          <span className="text-[10px] text-slate-400 block mt-1">
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
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Freelancer&apos;s Evidence</h3>
                <span className="text-xs font-semibold text-slate-400">{freelancerEvidence.length} items</span>
              </div>

              {freelancerEvidence.length === 0 ? (
                <div className="bg-slate-50/50 border border-dashed border-slate-200 rounded-2xl p-6 text-center text-xs text-slate-400 italic">
                  No evidence uploaded by freelancer yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {freelancerEvidence.map((ev) => (
                    <div key={ev.id} className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-start gap-3">
                        <span className="text-lg flex-shrink-0 mt-0.5">{ev.type === "file" ? "📁" : "🔗"}</span>
                        <div className="min-w-0 flex-grow">
                          <a
                            href={ev.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:underline block truncate"
                          >
                            {ev.type === "file" ? ev.url.split("/").pop() || "Evidence File" : ev.url}
                          </a>
                          <span className="text-[10px] text-slate-400 block mt-1">
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
            <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/40 border border-slate-100 p-6 sm:p-8">
              <div className="mb-4">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Upload Supporting Evidence</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Upload file logs, screenshots, or link relevant external demos/repos. You have uploaded {userEvidenceCount} of 10 allowed items.
                </p>
              </div>

              {evidenceError && (
                <div className="mb-4 bg-red-50 border-l-4 border-red-400 p-3 rounded-lg">
                  <p className="text-xs text-red-700 font-semibold">{evidenceError}</p>
                </div>
              )}

              {hasReachedLimit ? (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center text-xs text-amber-700 font-medium">
                  🔒 You have reached the evidence limit of 10 items for this dispute.
                </div>
              ) : (
                <form onSubmit={handleEvidenceUpload} className="space-y-4">
                  {/* File Selector */}
                  <div>
                    <label className="block text-xs font-bold text-slate-450 uppercase mb-1">Deliverable file (ZIP, PDF, PNG, JPG - Max 50MB)</label>
                    <input
                      type="file"
                      onChange={handleFileChange}
                      disabled={submittingEvidence}
                      className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-[11px] file:font-bold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer disabled:opacity-50"
                    />
                    {selectedFile && (
                      <p className="mt-1 text-xs text-green-600 font-semibold">
                        Selected: {selectedFile.name} ({(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)
                      </p>
                    )}
                  </div>

                  {/* Divider */}
                  <div className="flex items-center text-xs text-slate-400 font-medium my-3">
                    <div className="flex-grow border-t border-slate-100" />
                    <span className="px-3">OR</span>
                    <div className="flex-grow border-t border-slate-100" />
                  </div>

                  {/* Link Input */}
                  <div>
                    <label className="block text-xs font-bold text-slate-450 uppercase mb-1">Evidence URL/Link (Alternative to file upload)</label>
                    <input
                      type="url"
                      placeholder="e.g. https://github.com/username/repo or hosted site link"
                      value={linkUrl}
                      onChange={(e) => setLinkUrl(e.target.value)}
                      disabled={submittingEvidence}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 text-sm transition-all disabled:opacity-50"
                    />
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      disabled={submittingEvidence || uploadingFile}
                      className="px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 shadow-sm disabled:opacity-50 cursor-pointer transition-all duration-200"
                    >
                      {uploadingFile ? "Uploading File to S3..." : submittingEvidence ? "Adding Evidence..." : "Add Evidence"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>

        {/* Sidebar details & Admin controls */}
        <div className="lg:col-span-1 space-y-6">
          {/* Dispute Contract Specs Card */}
          <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/40 border border-slate-100 p-6 text-slate-800">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Project Contract Information</h3>
            <div className="space-y-4 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-450">Escrow Value</span>
                <span className="font-bold text-slate-900">₹{project.budget.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-450">Client User</span>
                <span className="font-semibold text-slate-900">{project.client.name || "Client"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-450">Freelancer</span>
                <span className="font-semibold text-slate-900">{project.freelancer?.name || "Freelancer"}</span>
              </div>
              <div className="border-t border-slate-100 pt-4">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Contract Description</span>
                <p className="text-xs text-slate-500 leading-relaxed truncate">{project.description}</p>
              </div>
            </div>
          </div>

          {/* Admin Adjudication Card */}
          {isAdmin && !isResolved && (
            <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/40 border border-slate-100 p-6">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Adjudicate Dispute</h3>
              
              {resolveError && (
                <div className="mb-4 bg-red-50 border-l-4 border-red-400 p-3 rounded-lg">
                  <p className="text-xs text-red-700 font-semibold">{resolveError}</p>
                </div>
              )}

              <div className="space-y-4">
                {confirmAction === null ? (
                  <>
                    <div>
                      <label className="block text-xs font-bold text-slate-450 uppercase mb-2">Resolution Notes (Required)</label>
                      <textarea
                        placeholder="Provide details and justification explaining the resolution decision..."
                        rows={4}
                        required
                        value={resolutionNotes}
                        onChange={(e) => setResolutionNotes(e.target.value)}
                        disabled={resolvingAction !== null}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 text-xs transition-all leading-relaxed"
                      />
                    </div>

                    <div className="flex flex-col gap-2.5 pt-2">
                      <button
                        onClick={() => setConfirmAction("RELEASE")}
                        disabled={!resolutionNotes.trim()}
                        className="w-full inline-flex justify-center items-center py-2.5 px-4 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-650 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 cursor-pointer transition-all duration-200 shadow-sm"
                      >
                        Release to Freelancer
                      </button>
                      <button
                        onClick={() => setConfirmAction("REFUND")}
                        disabled={!resolutionNotes.trim()}
                        className="w-full inline-flex justify-center items-center py-2.5 px-4 rounded-xl text-xs font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 cursor-pointer transition-all duration-200 shadow-sm"
                      >
                        Refund to Client
                      </button>
                    </div>
                  </>
                ) : (
                  <div className={`p-5 rounded-2xl border text-xs leading-relaxed space-y-4 ${
                    confirmAction === "RELEASE" 
                      ? "bg-emerald-50 border-emerald-200 text-emerald-850" 
                      : "bg-red-50 border-red-200 text-red-850"
                  }`}>
                    <div className="font-semibold text-sm">Adjudication Confirmation Required</div>
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
                    
                    <div className="flex gap-3 pt-2">
                      <button
                        onClick={() => handleResolve(confirmAction)}
                        disabled={resolvingAction !== null}
                        className={`flex-grow inline-flex justify-center items-center py-2.5 px-4 rounded-xl text-xs font-semibold text-white transition-all cursor-pointer ${
                          confirmAction === "RELEASE"
                            ? "bg-emerald-600 hover:bg-emerald-750"
                            : "bg-red-600 hover:bg-red-750"
                        }`}
                      >
                        {resolvingAction !== null ? "Processing..." : "Yes, Confirm & Submit"}
                      </button>
                      <button
                        onClick={() => setConfirmAction(null)}
                        disabled={resolvingAction !== null}
                        className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-xl text-xs transition-all cursor-pointer"
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
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Resolution Outcome</h3>
              <div className="space-y-3 text-xs text-slate-700 leading-relaxed">
                <div>
                  <span className="font-bold text-slate-450 block uppercase tracking-wider mb-0.5">Decision</span>
                  <span className={`font-bold uppercase tracking-wider ${
                    dispute.escrow?.status === EscrowStatus.RELEASED ? "text-emerald-700" : "text-red-700"
                  }`}>
                    {dispute.escrow?.status === EscrowStatus.RELEASED ? "Released to Freelancer" : "Refunded to Client"}
                  </span>
                </div>
                <div className="border-t border-slate-200/60 pt-3">
                  <span className="font-bold text-slate-450 block uppercase tracking-wider mb-0.5">Resolution Notes</span>
                  <p className="bg-white border border-slate-100 rounded-xl p-3 font-medium text-slate-800 whitespace-pre-wrap leading-relaxed">
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
