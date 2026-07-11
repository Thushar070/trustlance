"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import { ProjectStatus, ProposalStatus, EscrowStatus } from "@prisma/client";
import { SKILL_GROUPS } from "@/lib/constants/skills";

interface ClientDetails {
  id: string;
  name: string | null;
  email: string;
}

interface ProjectDetails {
  id: string;
  title: string;
  description: string;
  budget: number;
  deadline: string;
  status: ProjectStatus;
  skills: string[];
  createdAt: string;
  clientId: string;
  freelancerId?: string | null;
  client: ClientDetails;
  agreedAmount?: number | null;
  payment?: {
    id: string;
    projectId: string;
    razorpayOrderId: string;
    razorpayPaymentId?: string | null;
    amount: number;
    status: "PENDING" | "SUCCESS" | "FAILED";
  } | null;
  escrow?: {
    id: string;
    projectId: string;
    status: EscrowStatus;
  } | null;
}

interface ProposalDetails {
  id: string;
  projectId: string;
  freelancerId: string;
  message: string;
  estimatedDays: number;
  price: number;
  status: ProposalStatus;
  createdAt: string;
  freelancer?: {
    id: string;
    name: string | null;
    email: string;
  };
}

interface SubmissionDetails {
  id: string;
  projectId: string;
  fileUrl?: string | null;
  githubLink?: string | null;
  demoLink?: string | null;
  notes?: string | null;
  feedback?: string | null;
  createdAt: string;
}

export default function ProjectDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { data: session } = useSession();

  const [project, setProject] = useState<ProjectDetails | null>(null);
  const [myProposal, setMyProposal] = useState<ProposalDetails | null>(null);
  const [proposals, setProposals] = useState<ProposalDetails[]>([]);

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Submissions State
  const [submissions, setSubmissions] = useState<SubmissionDetails[]>([]);
  const [submissionNotes, setSubmissionNotes] = useState("");
  const [githubLink, setGithubLink] = useState("");
  const [demoLink, setDemoLink] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [submittingWork, setSubmittingWork] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  const ALLOWED_CONTENT_TYPES = [
    "application/zip",
    "application/x-zip-compressed",
    "application/pdf",
    "image/png",
    "image/jpeg",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/gzip",
    "application/x-gzip",
    "application/x-tar",
  ];
  const ALLOWED_EXTENSIONS = [".zip", ".pdf", ".png", ".jpg", ".jpeg", ".docx", ".tar.gz", ".tgz"];
  const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSubmissionError(null);
    const file = e.target.files?.[0];
    if (!file) {
      setSelectedFile(null);
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setSubmissionError("File size must not exceed 50MB.");
      setSelectedFile(null);
      return;
    }

    const fileExt = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();
    const isTarGz = file.name.endsWith(".tar.gz");
    const isValidExt = ALLOWED_EXTENSIONS.includes(fileExt) || isTarGz;
    const isValidType = ALLOWED_CONTENT_TYPES.includes(file.type.toLowerCase());

    if (!isValidExt || !isValidType) {
      setSubmissionError("Invalid file type. Only ZIP, TAR.GZ, PDF, PNG, JPG, JPEG, and DOCX are allowed.");
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
  };

  const handleWorkSubmission = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingWork(true);
    setSubmissionError(null);

    try {
      if (!selectedFile && !githubLink && !demoLink) {
        throw new Error("At least one of File, GitHub link, or Demo link must be provided.");
      }

      let fileUrl = "";

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

        fileUrl = presignData.fileUrl;
        setUploadingFile(false);
      }

      // 3. Post submission metadata
      const submitRes = await fetch(`/api/projects/${project?.id}/submit-work`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileUrl,
          githubLink: githubLink || undefined,
          demoLink: demoLink || undefined,
          notes: submissionNotes || undefined,
        }),
      });

      const submitData = await submitRes.json();
      if (!submitRes.ok) {
        throw new Error(submitData.error || "Work submission failed.");
      }

      // Reset form on success
      setSelectedFile(null);
      setGithubLink("");
      setDemoLink("");
      setSubmissionNotes("");
      alert("Work submitted successfully!");
      setRefreshTrigger((prev) => prev + 1);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "An error occurred submitting work.";
      setSubmissionError(msg);
    } finally {
      setUploadingFile(false);
      setSubmittingWork(false);
    }
  };

  // Client Review State
  const [reviewFeedback, setReviewFeedback] = useState("");
  const [disputeReason, setDisputeReason] = useState("");
  const [activeReviewAction, setActiveReviewAction] = useState<"APPROVE" | "REQUEST_CHANGES" | "DISPUTE" | null>(null);
  const [reviewActionLoading, setReviewActionLoading] = useState(false);
  const [reviewActionError, setReviewActionError] = useState<string | null>(null);

  const handleApprove = async () => {
    setReviewActionLoading(true);
    setReviewActionError(null);
    try {
      const res = await fetch(`/api/projects/${project?.id}/approve`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Approval failed.");
      }
      alert("Project approved and funds released successfully!");
      setActiveReviewAction(null);
      setRefreshTrigger((prev) => prev + 1);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Approval failed";
      setReviewActionError(msg);
    } finally {
      setReviewActionLoading(false);
    }
  };

  const handleRequestChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewFeedback.trim()) {
      setReviewActionError("Feedback is required to request changes.");
      return;
    }
    setReviewActionLoading(true);
    setReviewActionError(null);
    try {
      const res = await fetch(`/api/projects/${project?.id}/request-changes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedback: reviewFeedback }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Request changes failed.");
      }
      alert("Changes requested successfully! Project is back in progress.");
      setReviewFeedback("");
      setActiveReviewAction(null);
      setRefreshTrigger((prev) => prev + 1);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Request changes failed";
      setReviewActionError(msg);
    } finally {
      setReviewActionLoading(false);
    }
  };

  const handleRaiseDispute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!disputeReason.trim()) {
      setReviewActionError("Reason is required to raise a dispute.");
      return;
    }
    setReviewActionLoading(true);
    setReviewActionError(null);
    try {
      const res = await fetch(`/api/projects/${project?.id}/dispute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: disputeReason }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Raising dispute failed.");
      }
      alert("Dispute raised successfully! Project is now flagged.");
      setDisputeReason("");
      setActiveReviewAction(null);
      setRefreshTrigger((prev) => prev + 1);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Dispute failed";
      setReviewActionError(msg);
    } finally {
      setReviewActionLoading(false);
    }
  };

  // Project Edit Mode state (Client owner only)
  const [editMode, setEditMode] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [budget, setBudget] = useState("");
  const [deadline, setDeadline] = useState("");
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [saveLoading, setSaveLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string[]>>({});

  // Proposal Form state (Freelancer apply)
  const [proposalMessage, setProposalMessage] = useState("");
  const [proposalDays, setProposalDays] = useState("");
  const [proposalPrice, setProposalPrice] = useState("");
  
  // Proposal Edit state (Freelancer edit)
  const [editProposalMode, setEditProposalMode] = useState(false);
  const [editProposalMessage, setEditProposalMessage] = useState("");
  const [editProposalDays, setEditProposalDays] = useState("");
  const [editProposalPrice, setEditProposalPrice] = useState("");

  const [proposalValidationErrors, setProposalValidationErrors] = useState<Record<string, string[]>>({});
  const [proposalActionLoading, setProposalActionLoading] = useState(false);
  const [selectLoading, setSelectLoading] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Load Razorpay Script utility
  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handlePayment = async () => {
    if (!project) return;
    setPaymentLoading(true);
    setErrorMsg(null);

    try {
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        alert("Razorpay Checkout SDK failed to load. Please check your internet connection.");
        setPaymentLoading(false);
        return;
      }

      const res = await fetch(`/api/payments/${project.id}/create-order`, {
        method: "POST",
      });

      const orderData = await res.json();
      if (!res.ok) {
        throw new Error(orderData.error || "Failed to create Razorpay order");
      }

      const options = {
        key: orderData.keyId || "rzp_test_placeholder",
        amount: orderData.amount,
        currency: orderData.currency,
        name: "TrustLance Escrow",
        description: `Payment for: ${project.title}`,
        order_id: orderData.orderId,
        handler: async function (response: {
          razorpay_payment_id: string;
          razorpay_order_id: string;
          razorpay_signature: string;
        }) {
          try {
            const verifyRes = await fetch("/api/payments/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
              }),
            });

            const verifyData = await verifyRes.json();
            if (!verifyRes.ok) {
              throw new Error(verifyData.error || "Payment verification failed.");
            }

            // Success! Refresh the page state to reflect payment SUCCESS
            setRefreshTrigger((prev) => prev + 1);
          } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Payment verification failed.";
            alert(msg);
            setRefreshTrigger((prev) => prev + 1);
          } finally {
            setPaymentLoading(false);
          }
        },
        prefill: {
          name: session?.user?.name || "",
          email: session?.user?.email || "",
        },
        theme: {
          color: "#4f46e5",
        },
        modal: {
          ondismiss: function () {
            setPaymentLoading(false);
          },
        },
      };

      const RazorpayConstructor = (window as unknown as { Razorpay: new (options: unknown) => { open: () => void } }).Razorpay;
      const paymentObject = new RazorpayConstructor(options);
      paymentObject.open();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "An error occurred initiating payment.";
      setErrorMsg(msg);
      setPaymentLoading(false);
    }
  };

  useEffect(() => {
    const fetchProposals = async () => {
      try {
        const response = await fetch(`/api/projects/${id}/proposals`);
        if (response.ok) {
          const data = await response.json();
          setProposals(data);
        }
      } catch {
        // Ignore background errors
      }
    };

    const fetchSubmissions = async () => {
      try {
        const response = await fetch(`/api/projects/${id}/submissions`);
        if (response.ok) {
          const data = await response.json();
          setSubmissions(data);
        }
      } catch {
        // Ignore
      }
    };

    const fetchProject = async () => {
      try {
        const response = await fetch(`/api/projects/${id}`);
        if (!response.ok) {
          if (response.status === 404) throw new Error("Project not found");
          throw new Error("Failed to load project details");
        }
        const data = await response.json();
        
        const { myProposal: attachedProposal, ...projDetails } = data;
        setProject(projDetails);
        setMyProposal(attachedProposal);
        
        // Initialize edit project fields
        setTitle(projDetails.title);
        setDescription(projDetails.description);
        setBudget(projDetails.budget.toString());
        setDeadline(new Date(projDetails.deadline).toISOString().split("T")[0]);
        setSelectedSkills(projDetails.skills);

        // Pre-fill freelancer edit proposal fields if applied
        if (attachedProposal) {
          setEditProposalMessage(attachedProposal.message);
          setEditProposalDays(attachedProposal.estimatedDays.toString());
          setEditProposalPrice(attachedProposal.price.toString());
        }

        // Fetch received proposals if logged-in user is project owner Client
        if (session?.user?.id === projDetails.clientId) {
          await fetchProposals();
        }

        // Fetch submissions if user is client owner or assigned freelancer
        if (session?.user?.id === projDetails.clientId || session?.user?.id === projDetails.freelancerId) {
          await fetchSubmissions();
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "An error occurred.";
        setErrorMsg(msg);
      } finally {
        setLoading(false);
      }
    };

    if (id && session?.user?.id) {
      fetchProject();
    }
  }, [id, session?.user?.id, refreshTrigger]);

  const toggleSkill = (skill: string) => {
    if (selectedSkills.includes(skill)) {
      setSelectedSkills(selectedSkills.filter((s) => s !== skill));
    } else {
      setSelectedSkills([...selectedSkills, skill]);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveLoading(true);
    setValidationErrors({});
    setErrorMsg(null);

    const budgetNum = parseInt(budget, 10);

    const payload = {
      title,
      description,
      budget: isNaN(budgetNum) ? undefined : budgetNum,
      deadline,
      skills: selectedSkills,
    };

    try {
      const response = await fetch(`/api/projects/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.details) {
          setValidationErrors(data.details);
        } else {
          setErrorMsg(data.error || "Failed to update project");
        }
        setSaveLoading(false);
        return;
      }

      setEditMode(false);
      setRefreshTrigger((prev) => prev + 1);
    } catch {
      setErrorMsg("An unexpected error occurred while saving.");
      setSaveLoading(false);
    }
  };

  const handleCancelProject = async () => {
    if (!confirm("Are you sure you want to cancel this project? This action is permanent.")) return;
    try {
      const response = await fetch(`/api/projects/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: ProjectStatus.CANCELLED }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to cancel project");
      }

      setRefreshTrigger((prev) => prev + 1);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Could not cancel project.";
      alert(msg);
    }
  };

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    setProposalActionLoading(true);
    setProposalValidationErrors({});
    setErrorMsg(null);

    const priceNum = proposalPrice ? parseInt(proposalPrice, 10) : undefined;
    const daysNum = parseInt(proposalDays, 10);

    const payload = {
      message: proposalMessage,
      estimatedDays: isNaN(daysNum) ? undefined : daysNum,
      price: priceNum,
    };

    try {
      const response = await fetch(`/api/projects/${id}/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.details) {
          setProposalValidationErrors(data.details);
        } else {
          setErrorMsg(data.error || "Failed to submit proposal.");
        }
        setProposalActionLoading(false);
        return;
      }

      setProposalMessage("");
      setProposalDays("");
      setProposalPrice("");
      setRefreshTrigger((prev) => prev + 1);
    } catch {
      setErrorMsg("An unexpected error occurred.");
      setProposalActionLoading(false);
    }
  };

  const handleEditProposal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!myProposal) return;
    setProposalActionLoading(true);
    setProposalValidationErrors({});
    setErrorMsg(null);

    const priceNum = editProposalPrice ? parseInt(editProposalPrice, 10) : undefined;
    const daysNum = parseInt(editProposalDays, 10);

    const payload = {
      message: editProposalMessage,
      estimatedDays: isNaN(daysNum) ? undefined : daysNum,
      price: priceNum,
    };

    try {
      const response = await fetch(`/api/proposals/${myProposal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.details) {
          setProposalValidationErrors(data.details);
        } else {
          setErrorMsg(data.error || "Failed to edit proposal.");
        }
        setProposalActionLoading(false);
        return;
      }

      setEditProposalMode(false);
      setRefreshTrigger((prev) => prev + 1);
    } catch {
      setErrorMsg("An unexpected error occurred.");
      setProposalActionLoading(false);
    }
  };

  const handleWithdrawProposal = async () => {
    if (!myProposal) return;
    if (!confirm("Are you sure you want to withdraw your proposal? This action is permanent.")) return;
    setProposalActionLoading(true);

    try {
      const response = await fetch(`/api/proposals/${myProposal.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to withdraw proposal.");
      }

      setMyProposal(null);
      setEditProposalMode(false);
      setRefreshTrigger((prev) => prev + 1);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Could not withdraw proposal.";
      alert(msg);
    } finally {
      setProposalActionLoading(false);
    }
  };

  const handleSelectFreelancer = async (freelancerId: string, freelancerName: string) => {
    if (!confirm(`Are you sure you want to select ${freelancerName || "this freelancer"} for this project? This will assign the project and lock the contract price.`)) return;
    setSelectLoading(true);

    try {
      const response = await fetch(`/api/projects/${id}/select-freelancer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ freelancerId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to select freelancer.");
      }

      setRefreshTrigger((prev) => prev + 1);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Could not assign project.";
      alert(msg);
    } finally {
      setSelectLoading(false);
    }
  };

  const getStatusBadgeClass = (status: ProjectStatus) => {
    switch (status) {
      case ProjectStatus.OPEN:
        return "bg-sky-50 text-sky-700 border-sky-200";
      case ProjectStatus.ASSIGNED:
        return "bg-amber-50 text-amber-700 border-amber-200";
      case ProjectStatus.IN_PROGRESS:
        return "bg-violet-50 text-violet-700 border-violet-200";
      case ProjectStatus.UNDER_REVIEW:
        return "bg-indigo-50 text-indigo-700 border-indigo-200";
      case ProjectStatus.COMPLETED:
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case ProjectStatus.CANCELLED:
        return "bg-red-50 text-red-700 border-red-200";
      case ProjectStatus.CLOSED:
        return "bg-slate-100 text-slate-600 border-slate-200";
      default:
        return "bg-slate-100 text-slate-600 border-slate-200";
    }
  };

  const getProposalStatusBadge = (status: ProposalStatus) => {
    switch (status) {
      case ProposalStatus.PENDING:
        return "bg-sky-50 text-sky-600 border-sky-200";
      case ProposalStatus.ACCEPTED:
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case ProposalStatus.REJECTED:
        return "bg-red-50 text-red-700 border-red-200";
      default:
        return "bg-slate-100 text-slate-600 border-slate-200";
    }
  };

  if (loading) {
    return (
      <div className="flex-grow flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 rounded-full border-2 border-slate-200 border-t-indigo-500 animate-spin" />
          <p className="text-slate-400 text-sm">Loading project details...</p>
        </div>
      </div>
    );
  }

  if (errorMsg && !project) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-10">
        <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-md text-center">
          <p className="text-sm text-red-700 font-semibold mb-3">{errorMsg}</p>
          <button
            onClick={() => router.push("/projects")}
            className="text-xs px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 font-bold rounded"
          >
            Back to browse
          </button>
        </div>
      </div>
    );
  }

  if (!project) return null;

  const isOwner = session?.user?.id === project.clientId;
  const isFreelancer = session?.user?.role === "FREELANCER";
  const isOpen = project.status === ProjectStatus.OPEN;
  const isFreelancerHired = session?.user?.id === project.freelancerId;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {editMode ? (
        // Inline Edit Mode Panel (Client project editor)
        <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/40 border border-slate-100 p-6 sm:p-10">
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight mb-6">Edit Project Details</h1>
          {errorMsg && (
            <div className="mb-6 bg-red-50 border-l-4 border-red-400 p-4 rounded-md">
              <p className="text-sm text-red-700">{errorMsg}</p>
            </div>
          )}
          <form onSubmit={handleUpdate} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Project Title</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              />
              {validationErrors.title && (
                <p className="mt-1 text-xs text-red-600 font-medium">{validationErrors.title[0]}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Project Description</label>
              <textarea
                required
                rows={6}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              />
              {validationErrors.description && (
                <p className="mt-1 text-xs text-red-600 font-medium">{validationErrors.description[0]}</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Project Budget (INR)</label>
                <div className="relative rounded-lg shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">₹</span>
                  </div>
                  <input
                    type="number"
                    required
                    min="1"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    className="w-full pl-8 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  />
                </div>
                {validationErrors.budget && (
                  <p className="mt-1 text-xs text-red-600 font-medium">{validationErrors.budget[0]}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Project Deadline</label>
                <input
                  type="date"
                  required
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                />
                {validationErrors.deadline && (
                  <p className="mt-1 text-xs text-red-600 font-medium">{validationErrors.deadline[0]}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Skills Required</label>
              {validationErrors.skills && (
                <p className="mb-2 text-xs text-red-600 font-medium">{validationErrors.skills[0]}</p>
              )}
              <div className="space-y-4 border border-gray-100 rounded-xl p-4 bg-gray-50/50 max-h-60 overflow-y-auto">
                {SKILL_GROUPS.map((group) => (
                  <div key={group.category}>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">{group.category}</h3>
                    <div className="flex flex-wrap gap-1.5">
                      {group.skills.map((skill) => {
                        const isSelected = selectedSkills.includes(skill);
                        return (
                          <button
                            key={skill}
                            type="button"
                            onClick={() => toggleSkill(skill)}
                            className={`text-xs px-2.5 py-1 rounded border font-medium cursor-pointer transition-all ${
                              isSelected
                                ? "bg-indigo-600 border-indigo-600 text-white shadow-sm"
                                : "bg-white border-gray-200 text-gray-600 hover:bg-gray-100"
                            }`}
                          >
                            {skill}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end space-x-4 border-t border-gray-100 pt-6">
              <button
                type="button"
                onClick={() => setEditMode(false)}
                className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saveLoading}
                className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 cursor-pointer transition-colors"
              >
                {saveLoading ? "Saving Changes..." : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      ) : (
        // Standard View Mode Layout
        <div className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              {/* Title & Description Box */}
              <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/40 border border-slate-100 p-6 sm:p-8">
                <div className="flex flex-wrap items-center gap-3 mb-4">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-widest ${getStatusBadgeClass(project.status)}`}>
                    {project.status.replace("_", " ")}
                  </span>
                  <span className="text-xs text-slate-400">
                    Posted on {new Date(project.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-6 leading-tight tracking-tight">
                  {project.title}
                </h1>

                <div className="prose max-w-none text-slate-600 text-sm leading-relaxed whitespace-pre-wrap">
                  <h3 className="text-slate-900 font-bold text-base mb-2">Project Description</h3>
                  {project.description}
                </div>
              </div>

              {/* Skills Box */}
              <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/40 border border-slate-100 p-6">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Skills Required</h3>
                <div className="flex flex-wrap gap-2">
                  {project.skills.map((skill) => (
                    <span
                      key={skill}
                      className="bg-indigo-50/60 text-indigo-700 text-xs px-3 py-1.5 rounded-lg border border-indigo-100/80 font-semibold"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              {/* Client Review & Actions Panel */}
              {isOwner && project.status === ProjectStatus.UNDER_REVIEW && (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-lg shadow-slate-200/40 p-6 sm:p-8 space-y-6">
                  <div>
                    <h3 className="text-slate-900 font-extrabold text-lg tracking-tight mb-1.5">Project Review Decisions</h3>
                    <p className="text-xs text-slate-400">
                      The freelancer has submitted deliverables. Review the work details in the history log below and select your review decision.
                    </p>
                  </div>

                  {reviewActionError && (
                    <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-md">
                      <p className="text-sm text-red-700 font-semibold">{reviewActionError}</p>
                    </div>
                  )}

                  {!activeReviewAction && (
                    <div className="flex flex-wrap gap-3">
                      <button
                        onClick={handleApprove}
                        disabled={reviewActionLoading}
                        className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 cursor-pointer transition-all duration-200 shadow-sm shadow-emerald-200/50 hover:shadow-md"
                      >
                        ✓ Approve Project
                      </button>
                      <button
                        onClick={() => {
                          setActiveReviewAction("REQUEST_CHANGES");
                          setReviewActionError(null);
                        }}
                        disabled={reviewActionLoading}
                        className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-amber-500 hover:bg-amber-600 disabled:opacity-50 cursor-pointer transition-all duration-200 shadow-sm"
                      >
                        ↻ Request Changes
                      </button>
                      <button
                        onClick={() => {
                          setActiveReviewAction("DISPUTE");
                          setReviewActionError(null);
                        }}
                        disabled={reviewActionLoading}
                        className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 cursor-pointer transition-all duration-200 shadow-sm"
                      >
                        ⚠ Raise Dispute
                      </button>
                    </div>
                  )}

                  {activeReviewAction === "REQUEST_CHANGES" && (
                    <form onSubmit={handleRequestChanges} className="space-y-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Adjustments & Feedback Required</label>
                        <textarea
                          placeholder="Provide detailed instructions on what changes are needed to resume progress..."
                          rows={4}
                          required
                          value={reviewFeedback}
                          onChange={(e) => setReviewFeedback(e.target.value)}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                        />
                      </div>
                      <div className="flex justify-end gap-3">
                        <button
                          type="button"
                          onClick={() => setActiveReviewAction(null)}
                          className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={reviewActionLoading}
                          className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50 cursor-pointer transition-colors"
                        >
                          {reviewActionLoading ? "Submitting..." : "Send Request"}
                        </button>
                      </div>
                    </form>
                  )}

                  {activeReviewAction === "DISPUTE" && (
                    <form onSubmit={handleRaiseDispute} className="space-y-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Reason for Dispute Escalation</label>
                        <textarea
                          placeholder="Describe the issues, discrepancies, or reasons for escalating to a formal dispute..."
                          rows={4}
                          required
                          value={disputeReason}
                          onChange={(e) => setDisputeReason(e.target.value)}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                        />
                      </div>
                      <div className="flex justify-end gap-3">
                        <button
                          type="button"
                          onClick={() => setActiveReviewAction(null)}
                          className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={reviewActionLoading}
                          className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 cursor-pointer transition-colors"
                        >
                          {reviewActionLoading ? "Escalating..." : "Raise Dispute"}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}

              {/* Freelancer Dispute Trigger */}
              {isFreelancerHired && project.status === ProjectStatus.UNDER_REVIEW && (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-lg shadow-slate-200/40 p-6 sm:p-8 space-y-4">
                  <div>
                    <h3 className="text-slate-900 font-extrabold text-base tracking-tight mb-1">Project is Under Review</h3>
                    <p className="text-xs text-slate-400">
                      The client is currently reviewing your submissions. If there is a dispute or deadlock, you can escalate the project to a formal dispute.
                    </p>
                  </div>

                  {reviewActionError && (
                    <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-md">
                      <p className="text-sm text-red-700 font-semibold">{reviewActionError}</p>
                    </div>
                  )}

                  {activeReviewAction !== "DISPUTE" ? (
                    <button
                      onClick={() => {
                        setActiveReviewAction("DISPUTE");
                        setReviewActionError(null);
                      }}
                      className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-red-600 hover:bg-red-700 cursor-pointer transition-colors shadow-sm"
                    >
                      Raise Dispute
                    </button>
                  ) : (
                    <form onSubmit={handleRaiseDispute} className="space-y-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Reason for Dispute Escalation</label>
                        <textarea
                          placeholder="Describe the issues or reasons for escalating to a formal dispute..."
                          rows={4}
                          required
                          value={disputeReason}
                          onChange={(e) => setDisputeReason(e.target.value)}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                        />
                      </div>
                      <div className="flex justify-end gap-3">
                        <button
                          type="button"
                          onClick={() => setActiveReviewAction(null)}
                          className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={reviewActionLoading}
                          className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 cursor-pointer transition-colors"
                        >
                          {reviewActionLoading ? "Escalating..." : "Raise Dispute"}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}

              {/* Freelancer Work Submission Form */}
              {isFreelancerHired &&
                (project.status === ProjectStatus.ASSIGNED || project.status === ProjectStatus.IN_PROGRESS) && (
                  <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/40 border border-slate-100 p-6 sm:p-8">
                    <h3 className="text-slate-900 font-extrabold text-lg tracking-tight mb-2">Submit Work</h3>
                    <p className="text-xs text-slate-400 mb-6">
                      Upload your project files or provide repository and demo links. At least one of File, GitHub Link, or Demo Link is required.
                    </p>

                    {submissionError && (
                      <div className="mb-4 bg-red-50 border-l-4 border-red-400 p-4 rounded-md">
                        <p className="text-sm text-red-700 font-semibold">{submissionError}</p>
                      </div>
                    )}

                    <form onSubmit={handleWorkSubmission} className="space-y-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Deliverable File (ZIP, TAR.GZ, PDF, PNG, JPG, DOCX - Max 50MB)</label>
                        <input
                          type="file"
                          onChange={handleFileChange}
                          className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
                        />
                        {selectedFile && (
                          <p className="mt-1 text-xs text-green-600 font-semibold">
                            Selected file: {selectedFile.name} ({(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">GitHub Link (Optional)</label>
                        <input
                          type="url"
                          placeholder="https://github.com/username/repo"
                          value={githubLink}
                          onChange={(e) => setGithubLink(e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Demo Link (Optional)</label>
                        <input
                          type="url"
                          placeholder="https://my-demo-app.com"
                          value={demoLink}
                          onChange={(e) => setDemoLink(e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Submission Notes (Optional)</label>
                        <textarea
                          placeholder="Add any instructions, notes, or details about this submission..."
                          rows={4}
                          value={submissionNotes}
                          onChange={(e) => setSubmissionNotes(e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                        />
                      </div>

                      <div className="flex justify-end pt-2">
                        <button
                          type="submit"
                          disabled={submittingWork || uploadingFile}
                          className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 cursor-pointer transition-colors shadow-sm"
                        >
                          {uploadingFile ? "Uploading File to S3..." : submittingWork ? "Submitting Work..." : "Submit Deliverables"}
                        </button>
                      </div>
                    </form>
                  </div>
                )}

              {/* Submission History View */}
              {(isOwner || isFreelancerHired) && submissions.length > 0 && (
                <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/40 border border-slate-100 p-6 sm:p-8">
                  <h3 className="text-slate-900 font-extrabold text-lg tracking-tight mb-4">Submission History</h3>
                  <div className="space-y-6">
                    {submissions.map((sub, index) => (
                      <div key={sub.id} className="border-l-4 border-indigo-400 pl-4 py-1 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold text-slate-900">Round {submissions.length - index}</span>
                          <span className="text-xs text-slate-400">{new Date(sub.createdAt).toLocaleString()}</span>
                        </div>

                        {sub.notes && (
                          <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg border border-gray-100 whitespace-pre-wrap">
                            {sub.notes}
                          </p>
                        )}

                        {sub.feedback && (
                          <div className="text-sm text-amber-850 bg-amber-50/50 p-3 rounded-lg border border-amber-200 whitespace-pre-wrap">
                            <span className="font-bold block mb-1 text-amber-900">Requested Adjustments:</span>
                            {sub.feedback}
                          </div>
                        )}

                        <div className="flex flex-wrap gap-4 text-xs font-semibold text-indigo-600">
                          {sub.fileUrl && (
                            <a
                              href={sub.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 hover:underline bg-indigo-50 px-2.5 py-1 rounded border border-indigo-100"
                            >
                              📁 Download Deliverable File
                            </a>
                          )}
                          {sub.githubLink && (
                            <a
                              href={sub.githubLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 hover:underline bg-indigo-50 px-2.5 py-1 rounded border border-indigo-100"
                            >
                              🔗 GitHub Repository
                            </a>
                          )}
                          {sub.demoLink && (
                            <a
                              href={sub.demoLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 hover:underline bg-indigo-50 px-2.5 py-1 rounded border border-indigo-100"
                            >
                              🌐 Live Demo Url
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Details Sidebar */}
            <div className="lg:col-span-1 space-y-6">
              {/* Budget & Actions Card */}
              <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/40 border border-slate-100 p-6 text-center sticky top-20">
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-widest block mb-1">
                  {project.agreedAmount ? "Agreed Contract Price" : "Project Budget"}
                </span>
                <span className="text-3xl font-black text-slate-900 block mb-6">
                  ₹{(project.agreedAmount || project.budget).toLocaleString()}
                </span>

                <div className="border-t border-slate-100 pt-6 text-left space-y-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Deadline</span>
                    <span className="font-semibold text-slate-900">{new Date(project.deadline).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Client Owner</span>
                    <span className="font-semibold text-slate-900">{project.client.name || "Client"}</span>
                  </div>
                  {project.payment && (
                    <div className="flex justify-between text-sm items-center">
                      <span className="text-slate-400">Payment Status</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        project.payment.status === "SUCCESS"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : project.payment.status === "FAILED"
                          ? "bg-red-50 text-red-700 border border-red-200"
                          : "bg-amber-50 text-amber-700 border border-amber-200"
                      }`}>
                        {project.payment.status}
                      </span>
                    </div>
                  )}
                  {project.escrow && (
                    <div className="flex justify-between text-sm items-center">
                      <span className="text-slate-400">Escrow Status</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        project.escrow.status === "RELEASED"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : project.escrow.status === "REFUNDED"
                          ? "bg-red-50 text-red-700 border border-red-200"
                          : project.escrow.status === "DISPUTED"
                          ? "bg-amber-50 text-amber-700 border border-amber-200"
                          : "bg-indigo-50 text-indigo-700 border border-indigo-200"
                      }`}>
                        {project.escrow.status}
                      </span>
                    </div>
                  )}
                </div>

                {isOwner && isOpen && (
                  <div className="mt-6 pt-6 border-t border-slate-100 flex flex-col gap-2.5">
                    <button
                      onClick={() => setEditMode(true)}
                      className="w-full inline-flex justify-center items-center py-2.5 px-4 border border-indigo-500 rounded-xl text-sm font-semibold text-indigo-600 hover:bg-indigo-50 cursor-pointer transition-all duration-200"
                    >
                      Edit Project
                    </button>
                    <button
                      onClick={handleCancelProject}
                      className="w-full inline-flex justify-center items-center py-2.5 px-4 border border-transparent rounded-xl text-sm font-semibold text-white bg-red-600 hover:bg-red-700 cursor-pointer transition-all duration-200"
                    >
                      Cancel Project
                    </button>
                  </div>
                )}

                {isOwner && project.status === ProjectStatus.ASSIGNED && (!project.payment || project.payment.status !== "SUCCESS") && (
                  <div className="mt-6 pt-6 border-t border-slate-100">
                    <button
                      onClick={handlePayment}
                      disabled={paymentLoading}
                      className="w-full inline-flex justify-center items-center py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 disabled:opacity-50 cursor-pointer transition-all duration-200 shadow-sm shadow-indigo-200/50 hover:shadow-md"
                    >
                      {paymentLoading ? "Processing..." : "Pay Now"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Client Proposal Review Panel */}
          {isOwner && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-lg shadow-slate-200/40 p-6 sm:p-8">
              <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-6">
                <div>
                  <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">Received Proposals</h2>
                  <p className="text-xs text-slate-400 mt-0.5">Review submissions and hire the appropriate freelancer.</p>
                </div>
                <span className="bg-indigo-50 text-indigo-700 font-bold text-[10px] px-2.5 py-1 rounded-full border border-indigo-100 uppercase tracking-widest">
                  {proposals.length} Bids
                </span>
              </div>

              {proposals.length === 0 ? (
                <p className="text-sm text-slate-400 italic text-center py-6">No proposals received for this project yet.</p>
              ) : (
                <div className="space-y-6">
                  {proposals.map((prop) => (
                    <div key={prop.id} className="border border-slate-100 rounded-xl p-5 hover:bg-slate-50/50 transition-all duration-150">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-3 pb-3 border-b border-gray-100/50">
                        <div>
                          <span className="font-bold text-gray-900 text-sm block">
                            {prop.freelancer?.name || "Freelancer"}
                          </span>
                          <span className="text-xs text-gray-400 block">{prop.freelancer?.email}</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                          <div className="text-left sm:text-right">
                            <span className="text-[10px] text-gray-400 uppercase font-semibold block tracking-wider">Bid Amount</span>
                            <span className="text-sm font-bold text-gray-950">
                              ₹{prop.price.toLocaleString()}{" "}
                              {prop.price !== project.budget && (
                                <span className="text-[10px] font-normal text-indigo-600 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded-full ml-1">
                                  Counter-offer
                                </span>
                              )}
                            </span>
                          </div>
                          <div className="text-left sm:text-right border-l sm:border-l-0 sm:border-r border-gray-100 pl-3 sm:pl-0 sm:pr-3">
                            <span className="text-[10px] text-gray-400 uppercase font-semibold block tracking-wider">Est. Delivery</span>
                            <span className="text-sm font-bold text-gray-900">{prop.estimatedDays} days</span>
                          </div>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getProposalStatusBadge(prop.status)}`}>
                            {prop.status}
                          </span>
                        </div>
                      </div>

                      <p className="text-sm text-gray-600 leading-relaxed mb-4 whitespace-pre-wrap">{prop.message}</p>

                      {isOpen && prop.status === ProposalStatus.PENDING && (
                        <div className="flex justify-end">
                          <button
                            onClick={() => handleSelectFreelancer(prop.freelancerId, prop.freelancer?.name || "")}
                            disabled={selectLoading}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-xs font-bold text-white rounded-lg shadow-sm cursor-pointer disabled:opacity-50 transition-colors"
                          >
                            Hire &amp; Assign Project
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Freelancer Apply / View Proposal Panel */}
          {isFreelancer && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-lg shadow-slate-200/40 p-6 sm:p-8">
              {myProposal ? (
                // Freelancer Has Already Applied
                <div className="space-y-6">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                    <div>
                      <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">Your Submitted Proposal</h2>
                      <p className="text-xs text-slate-400 mt-0.5">Manage your active bid details.</p>
                    </div>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${getProposalStatusBadge(myProposal.status)}`}>
                      {myProposal.status}
                    </span>
                  </div>

                  {editProposalMode ? (
                    // Freelancer Inline Proposal Editor
                    <form onSubmit={handleEditProposal} className="space-y-4">
                      {errorMsg && (
                        <p className="text-sm text-red-600 font-semibold">{errorMsg}</p>
                      )}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">Bid Price (Counter-Offer, INR)</label>
                          <input
                            type="number"
                            required
                            min="1"
                            value={editProposalPrice}
                            onChange={(e) => setEditProposalPrice(e.target.value)}
                            className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                          {proposalValidationErrors.price && (
                            <p className="text-[10px] text-red-600 mt-0.5">{proposalValidationErrors.price[0]}</p>
                          )}
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">Estimated Days</label>
                          <input
                            type="number"
                            required
                            min="1"
                            value={editProposalDays}
                            onChange={(e) => setEditProposalDays(e.target.value)}
                            className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                          {proposalValidationErrors.estimatedDays && (
                            <p className="text-[10px] text-red-600 mt-0.5">{proposalValidationErrors.estimatedDays[0]}</p>
                          )}
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">Cover Message</label>
                        <textarea
                          required
                          rows={4}
                          value={editProposalMessage}
                          onChange={(e) => setEditProposalMessage(e.target.value)}
                          className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                        {proposalValidationErrors.message && (
                          <p className="text-[10px] text-red-600 mt-0.5">{proposalValidationErrors.message[0]}</p>
                        )}
                      </div>
                      <div className="flex justify-end gap-3 pt-2">
                        <button
                          type="button"
                          onClick={() => setEditProposalMode(false)}
                          className="px-4 py-2 border border-gray-200 hover:bg-gray-50 text-xs font-bold text-gray-600 rounded-lg cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={proposalActionLoading}
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-xs font-bold text-white rounded-lg shadow-sm cursor-pointer disabled:opacity-50"
                        >
                          {proposalActionLoading ? "Saving..." : "Save Bid"}
                        </button>
                      </div>
                    </form>
                  ) : (
                    // Freelancer Proposal View Details
                    <div className="space-y-4">
                      <div className="flex flex-wrap gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100 text-sm">
                        <div>
                          <span className="text-xs text-gray-400 block font-semibold">Your Bid Amount</span>
                          <span className="font-bold text-gray-950">₹{myProposal.price.toLocaleString()}</span>
                        </div>
                        <div className="border-l border-gray-200 pl-4">
                          <span className="text-xs text-gray-400 block font-semibold">Delivery Time</span>
                          <span className="font-bold text-gray-900">{myProposal.estimatedDays} days</span>
                        </div>
                      </div>
                      <div>
                        <span className="text-xs text-gray-400 block font-semibold mb-1">Cover Message</span>
                        <p className="text-sm text-gray-600 leading-relaxed bg-white border border-gray-50 rounded-xl p-4 whitespace-pre-wrap">
                          {myProposal.message}
                        </p>
                      </div>

                      {isOpen && myProposal.status === ProposalStatus.PENDING && (
                        <div className="flex gap-3 pt-2">
                          <button
                            onClick={() => setEditProposalMode(true)}
                            className="px-4 py-2 border border-indigo-600 hover:bg-indigo-50 text-xs font-bold text-indigo-600 rounded-lg cursor-pointer"
                          >
                            Edit Bid
                          </button>
                          <button
                            onClick={handleWithdrawProposal}
                            disabled={proposalActionLoading}
                            className="px-4 py-2 border border-red-200 hover:bg-red-50 text-xs font-bold text-red-600 rounded-lg cursor-pointer disabled:opacity-50"
                          >
                            Withdraw Proposal
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : isOpen ? (
                // Freelancer Has Not Applied Yet (Submit New Proposal Form)
                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">Submit a Proposal</h2>
                    <p className="text-xs text-slate-400 mt-0.5">Apply for this project listing by submitting your counter price and message.</p>
                  </div>
                  {errorMsg && (
                    <div className="bg-red-50 border-l-4 border-red-400 p-3 rounded-md">
                      <p className="text-xs text-red-700 font-semibold">{errorMsg}</p>
                    </div>
                  )}
                  <form onSubmit={handleApply} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">
                          Counter-Offer Price (INR, Optional)
                        </label>
                        <div className="relative rounded-lg shadow-sm">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <span className="text-gray-400 text-xs">₹</span>
                          </div>
                          <input
                            type="number"
                            min="1"
                            value={proposalPrice}
                            onChange={(e) => setProposalPrice(e.target.value)}
                            placeholder={project.budget.toString()}
                            className="w-full pl-7 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>
                        {proposalValidationErrors.price && (
                          <p className="text-[10px] text-red-600 mt-0.5">{proposalValidationErrors.price[0]}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">
                          Estimated Days to Complete (Required)
                        </label>
                        <input
                          type="number"
                          required
                          min="1"
                          value={proposalDays}
                          onChange={(e) => setProposalDays(e.target.value)}
                          placeholder="e.g. 5"
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                        {proposalValidationErrors.estimatedDays && (
                          <p className="text-[10px] text-red-600 mt-0.5">{proposalValidationErrors.estimatedDays[0]}</p>
                        )}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">
                        Cover Letter / Proposal Details (Min 10 chars)
                      </label>
                      <textarea
                        required
                        rows={4}
                        value={proposalMessage}
                        onChange={(e) => setProposalMessage(e.target.value)}
                        placeholder="Introduce yourself and explain how you will complete the project deliverables..."
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                      {proposalValidationErrors.message && (
                        <p className="text-[10px] text-red-600 mt-0.5">{proposalValidationErrors.message[0]}</p>
                      )}
                    </div>
                    <div className="flex justify-end pt-2">
                      <button
                        type="submit"
                        disabled={proposalActionLoading}
                        className="px-5 py-2.5 rounded-lg text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 shadow-sm cursor-pointer transition-colors"
                      >
                        {proposalActionLoading ? "Submitting Proposal..." : "Submit Proposal"}
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                // Freelancer Has Not Applied & Project Is Not Open
                <div className="bg-gray-50 border border-gray-150 rounded-xl p-6 text-center">
                  <p className="text-sm text-gray-500 italic">This project is no longer accepting proposal applications.</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
