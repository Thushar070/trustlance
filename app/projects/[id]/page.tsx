"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import { ProjectStatus, ProposalStatus, EscrowStatus } from "@prisma/client";
import { SKILL_GROUPS } from "@/lib/constants/skills";
import AuditHistory from "@/components/AuditHistory";
import {
  Clock,
  IndianRupee,
  Calendar,
  AlertTriangle,
  Briefcase,
  FileDown,
  Globe,
  Github,
  User,
  RefreshCw,
  FileText,
  Check,
  Send,
} from "lucide-react";

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

interface MessageItem {
  id: string;
  projectId: string;
  senderId: string;
  content: string;
  createdAt: string;
  sender: {
    id: string;
    name: string | null;
    email: string;
    role: string | null;
  };
}

const getStatusBadgeClass = (status: ProjectStatus) => {
  switch (status) {
    case ProjectStatus.OPEN:
      return "bg-[var(--status-open-bg)] text-[var(--status-open-text)] border-[var(--status-open-border)]";
    case ProjectStatus.ASSIGNED:
      return "bg-[var(--status-progress-bg)] text-[var(--status-progress-text)] border-[var(--status-progress-border)]";
    case ProjectStatus.IN_PROGRESS:
      return "bg-[var(--status-progress-bg)] text-[var(--status-progress-text)] border-[var(--status-progress-border)]";
    case ProjectStatus.UNDER_REVIEW:
      return "bg-[var(--status-review-bg)] text-[var(--status-review-text)] border-[var(--status-review-border)]";
    case ProjectStatus.COMPLETED:
      return "bg-[var(--status-success-bg)] text-[var(--status-success-text)] border-[var(--status-success-border)]";
    case ProjectStatus.CANCELLED:
      return "bg-[var(--status-negative-bg)] text-[var(--status-negative-text)] border-[var(--status-negative-border)]";
    case ProjectStatus.CLOSED:
      return "bg-[var(--status-neutral-bg)] text-[var(--status-neutral-text)] border-[var(--status-neutral-border)]";
    default:
      return "bg-[var(--status-neutral-bg)] text-[var(--status-neutral-text)] border-[var(--status-neutral-border)]";
  }
};

const getProposalStatusBadge = (status: ProposalStatus) => {
  switch (status) {
    case ProposalStatus.PENDING:
      return "bg-[var(--status-open-bg)] text-[var(--status-open-text)] border-[var(--status-open-border)]";
    case ProposalStatus.ACCEPTED:
      return "bg-[var(--status-success-bg)] text-[var(--status-success-text)] border-[var(--status-success-border)]";
    case ProposalStatus.REJECTED:
      return "bg-[var(--status-negative-bg)] text-[var(--status-negative-text)] border-[var(--status-negative-border)]";
    default:
      return "bg-[var(--status-neutral-bg)] text-[var(--status-neutral-text)] border-[var(--status-neutral-border)]";
  }
};

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
      let msg = err instanceof Error ? err.message : "An error occurred submitting work.";
      if (msg.includes("Escrow record not found") || msg.includes("Escrow must be in HOLDING")) {
        msg = "Payment received, but escrow setup is still processing. If this persists, contact support.";
      }
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

  // Messaging state
  const [messages, setMessages] = useState<any[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [messageError, setMessageError] = useState<string | null>(null);

  const fetchMessages = async () => {
    try {
      const res = await fetch(`/api/projects/${id}/messages`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.items || []);
      }
    } catch {
      // Ignore background errors
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim()) return;
    setSendingMessage(true);
    setMessageError(null);
    try {
      const res = await fetch(`/api/projects/${id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: messageInput }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to send message");
      }
      setMessageInput("");
      setMessages((prev) => [...prev, data]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to send message";
      setMessageError(msg);
    } finally {
      setSendingMessage(false);
    }
  };

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
          color: "#4338ca",
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

  useEffect(() => {
    if (!project || project.status === ProjectStatus.OPEN) return;
    const isClientOwner = project.clientId === session?.user?.id;
    const isFreelancerAssigned = project.freelancerId === session?.user?.id;

    if (!isClientOwner && !isFreelancerAssigned) return;

    fetchMessages();
    const interval = setInterval(fetchMessages, 6000);
    return () => clearInterval(interval);
  }, [id, project, session?.user?.id]);

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

  if (loading) {
    return (
      <div className="flex-grow flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 rounded-full border-2 border-slate-200 border-t-[var(--accent)] animate-spin" />
          <p className="text-slate-400 text-sm">Loading project details...</p>
        </div>
      </div>
    );
  }

  if (errorMsg && !project) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="bg-[var(--status-negative-bg)] border-l-4 border-[var(--status-negative-text)] p-4 rounded-lg text-center">
          <p className="text-sm text-[var(--status-negative-text)] font-semibold mb-3">{errorMsg}</p>
          <button
            onClick={() => router.push("/projects")}
            className="text-xs px-4 py-2 bg-white hover:bg-slate-50 text-[var(--status-negative-text)] font-bold rounded-lg border border-red-200 cursor-pointer transition-colors"
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {editMode ? (
        // Inline Edit Mode Panel (Client project editor)
        <div className="bg-white rounded-xl shadow-sm border border-[var(--border)] p-6 sm:p-10 max-w-4xl mx-auto">
          <div className="flex items-center gap-2 mb-6">
            <Briefcase className="w-5 h-5 text-[var(--accent)]" />
            <h1 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">Edit Project Details</h1>
          </div>
          {errorMsg && (
            <div className="mb-6 bg-[var(--status-negative-bg)] border border-[var(--status-negative-border)] p-4 rounded-lg">
              <p className="text-sm text-[var(--status-negative-text)] font-medium">{errorMsg}</p>
            </div>
          )}
          <form onSubmit={handleUpdate} className="space-y-6">
            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">Project Title</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-2.5 border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 focus:border-[var(--accent)] text-sm transition-all"
              />
              {validationErrors.title && (
                <p className="mt-1.5 text-xs text-[var(--status-negative-text)] font-medium">{validationErrors.title[0]}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">Project Description</label>
              <textarea
                required
                rows={6}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-2.5 border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 focus:border-[var(--accent)] text-sm transition-all leading-relaxed"
              />
              {validationErrors.description && (
                <p className="mt-1.5 text-xs text-[var(--status-negative-text)] font-medium">{validationErrors.description[0]}</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">Project Budget (INR)</label>
                <div className="relative rounded-lg shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <IndianRupee className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                  <input
                    type="number"
                    required
                    min="1"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    className="w-full pl-8 pr-4 py-2.5 border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 focus:border-[var(--accent)] text-sm transition-all"
                  />
                </div>
                {validationErrors.budget && (
                  <p className="mt-1.5 text-xs text-[var(--status-negative-text)] font-medium">{validationErrors.budget[0]}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">Project Deadline</label>
                <input
                  type="date"
                  required
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="w-full px-4 py-2.5 border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 focus:border-[var(--accent)] text-sm transition-all"
                />
                {validationErrors.deadline && (
                  <p className="mt-1.5 text-xs text-[var(--status-negative-text)] font-medium">{validationErrors.deadline[0]}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">Skills Required</label>
              {validationErrors.skills && (
                <p className="mb-3 text-xs text-[var(--status-negative-text)] font-medium">{validationErrors.skills[0]}</p>
              )}
              <div className="space-y-4 border border-[var(--border)] rounded-lg p-4 bg-slate-50/50 max-h-60 overflow-y-auto">
                {SKILL_GROUPS.map((group) => (
                  <div key={group.category}>
                    <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">{group.category}</h3>
                    <div className="flex flex-wrap gap-1.5">
                      {group.skills.map((skill) => {
                        const isSelected = selectedSkills.includes(skill);
                        return (
                          <button
                            key={skill}
                            type="button"
                            onClick={() => toggleSkill(skill)}
                            className={`text-[10px] px-2.5 py-1 rounded-md border font-medium cursor-pointer transition-all duration-150 ${
                              isSelected
                                ? "bg-[var(--accent-light)] border-[var(--accent)] text-[var(--accent)] font-bold shadow-sm"
                                : "bg-white border-[var(--border)] text-slate-600 hover:bg-slate-50 hover:border-slate-300"
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

            <div className="flex justify-end gap-3 border-t border-[var(--border-subtle)] pt-6">
              <button
                type="button"
                onClick={() => setEditMode(false)}
                className="px-4 py-2 border border-[var(--border)] rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saveLoading}
                className="px-5 py-2.5 rounded-lg text-xs font-semibold text-white bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-50 cursor-pointer transition-colors"
              >
                {saveLoading ? "Saving Changes..." : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      ) : (
        // Standard View Mode Layout
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            <div className="lg:col-span-2 space-y-6">
              {/* Title & Description Box */}
              <div className="bg-white rounded-xl shadow-sm border border-[var(--border)] p-6 sm:p-8">
                <div className="flex flex-wrap items-center gap-3 mb-4">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${getStatusBadgeClass(project.status)}`}>
                    {project.status.replace("_", " ")}
                  </span>
                  <span className="text-[11px] text-[var(--text-muted)] font-medium flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Posted on {new Date(project.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <h1 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] mb-6 leading-tight tracking-tight">
                  {project.title}
                </h1>

                <div className="prose max-w-none text-[var(--text-secondary)] text-sm leading-relaxed whitespace-pre-wrap">
                  <h3 className="text-[var(--text-primary)] font-bold text-sm uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-slate-400" />
                    Project Description
                  </h3>
                  <div className="border-t border-[var(--border-subtle)] pt-3 text-[var(--text-secondary)]">
                    {project.description}
                  </div>
                </div>
              </div>

              {/* Skills Box */}
              <div className="bg-white rounded-xl shadow-sm border border-[var(--border)] p-6">
                <h3 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-3.5">Skills Required</h3>
                <div className="flex flex-wrap gap-1.5">
                  {project.skills.map((skill) => (
                    <span
                      key={skill}
                      className="bg-indigo-50 text-[var(--accent)] text-[10px] px-2.5 py-1 rounded-md border border-indigo-100 font-bold"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              {/* Client Review & Actions Panel */}
              {isOwner && project.status === ProjectStatus.UNDER_REVIEW && (
                <div className="bg-white rounded-xl border border-[var(--border)] shadow-sm p-6 sm:p-8 space-y-6">
                  <div>
                    <h3 className="text-[var(--text-primary)] font-bold text-base tracking-tight mb-1">Project Review Decisions</h3>
                    <p className="text-xs text-[var(--text-muted)] font-medium leading-relaxed">
                      The freelancer has submitted deliverables. Review the work details in the history log below and select your review decision.
                    </p>
                  </div>

                  {reviewActionError && (
                    <div className="bg-[var(--status-negative-bg)] border border-[var(--status-negative-border)] p-4 rounded-lg">
                      <p className="text-xs text-[var(--status-negative-text)] font-semibold">{reviewActionError}</p>
                    </div>
                  )}

                  {!activeReviewAction && (
                    <div className="flex flex-wrap gap-2.5">
                      <button
                        onClick={handleApprove}
                        disabled={reviewActionLoading}
                        className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-semibold text-white bg-[var(--status-success-text)] hover:bg-emerald-800 disabled:opacity-50 cursor-pointer shadow-sm transition-colors"
                      >
                        <Check className="w-3.5 h-3.5" /> Approve Project
                      </button>
                      <button
                        onClick={() => {
                          setActiveReviewAction("REQUEST_CHANGES");
                          setReviewActionError(null);
                        }}
                        disabled={reviewActionLoading}
                        className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-semibold text-white bg-[var(--status-progress-text)] hover:bg-amber-800 disabled:opacity-50 cursor-pointer shadow-sm transition-colors"
                      >
                        <RefreshCw className="w-3.5 h-3.5" /> Request Changes
                      </button>
                      <button
                        onClick={() => {
                          setActiveReviewAction("DISPUTE");
                          setReviewActionError(null);
                        }}
                        disabled={reviewActionLoading}
                        className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-semibold text-white bg-[var(--status-negative-text)] hover:bg-rose-800 disabled:opacity-50 cursor-pointer shadow-sm transition-colors"
                      >
                        <AlertTriangle className="w-3.5 h-3.5" /> Raise Dispute
                      </button>
                    </div>
                  )}

                  {activeReviewAction === "REQUEST_CHANGES" && (
                    <form onSubmit={handleRequestChanges} className="space-y-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-650 uppercase tracking-wider mb-2">Adjustments & Feedback Required</label>
                        <textarea
                          placeholder="Provide detailed instructions on what changes are needed to resume progress..."
                          rows={4}
                          required
                          value={reviewFeedback}
                          onChange={(e) => setReviewFeedback(e.target.value)}
                          className="w-full px-4 py-2.5 border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 focus:border-[var(--accent)] text-sm transition-all leading-relaxed"
                        />
                      </div>
                      <div className="flex justify-end gap-2.5">
                        <button
                          type="button"
                          onClick={() => setActiveReviewAction(null)}
                          className="px-4 py-2 border border-[var(--border)] rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={reviewActionLoading}
                          className="px-4 py-2.5 rounded-lg text-xs font-semibold text-white bg-[var(--status-progress-text)] hover:bg-amber-850 disabled:opacity-50 cursor-pointer transition-colors"
                        >
                          {reviewActionLoading ? "Submitting..." : "Send Request"}
                        </button>
                      </div>
                    </form>
                  )}

                  {activeReviewAction === "DISPUTE" && (
                    <form onSubmit={handleRaiseDispute} className="space-y-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-650 uppercase tracking-wider mb-2">Reason for Dispute Escalation</label>
                        <textarea
                          placeholder="Describe the issues, discrepancies, or reasons for escalating to a formal dispute..."
                          rows={4}
                          required
                          value={disputeReason}
                          onChange={(e) => setDisputeReason(e.target.value)}
                          className="w-full px-4 py-2.5 border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 focus:border-[var(--accent)] text-sm transition-all leading-relaxed"
                        />
                      </div>
                      <div className="flex justify-end gap-2.5">
                        <button
                          type="button"
                          onClick={() => setActiveReviewAction(null)}
                          className="px-4 py-2 border border-[var(--border)] rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={reviewActionLoading}
                          className="px-4 py-2.5 rounded-lg text-xs font-semibold text-white bg-[var(--status-negative-text)] hover:bg-rose-850 disabled:opacity-50 cursor-pointer transition-colors"
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
                <div className="bg-white rounded-xl border border-[var(--border)] shadow-sm p-6 sm:p-8 space-y-4">
                  <div>
                    <h3 className="text-[var(--text-primary)] font-bold text-base tracking-tight mb-1">Project is Under Review</h3>
                    <p className="text-xs text-[var(--text-muted)] font-medium leading-relaxed">
                      The client is currently reviewing your submissions. If there is a dispute or deadlock, you can escalate the project to a formal dispute.
                    </p>
                  </div>

                  {reviewActionError && (
                    <div className="bg-[var(--status-negative-bg)] border border-[var(--status-negative-border)] p-4 rounded-lg">
                      <p className="text-xs text-[var(--status-negative-text)] font-semibold">{reviewActionError}</p>
                    </div>
                  )}

                  {activeReviewAction !== "DISPUTE" ? (
                    <button
                      onClick={() => {
                        setActiveReviewAction("DISPUTE");
                        setReviewActionError(null);
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-semibold text-white bg-[var(--status-negative-text)] hover:bg-rose-800 cursor-pointer transition-colors shadow-sm"
                    >
                      <AlertTriangle className="w-3.5 h-3.5" /> Raise Dispute
                    </button>
                  ) : (
                    <form onSubmit={handleRaiseDispute} className="space-y-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-650 uppercase tracking-wider mb-2">Reason for Dispute Escalation</label>
                        <textarea
                          placeholder="Describe the issues or reasons for escalating to a formal dispute..."
                          rows={4}
                          required
                          value={disputeReason}
                          onChange={(e) => setDisputeReason(e.target.value)}
                          className="w-full px-4 py-2.5 border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 focus:border-[var(--accent)] text-sm transition-all leading-relaxed"
                        />
                      </div>
                      <div className="flex justify-end gap-2.5">
                        <button
                          type="button"
                          onClick={() => setActiveReviewAction(null)}
                          className="px-4 py-2 border border-[var(--border)] rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={reviewActionLoading}
                          className="px-4 py-2.5 rounded-lg text-xs font-semibold text-white bg-[var(--status-negative-text)] hover:bg-rose-850 disabled:opacity-50 cursor-pointer transition-colors"
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
                  <div className="bg-white rounded-xl shadow-sm border border-[var(--border)] p-6 sm:p-8">
                    <h3 className="text-[var(--text-primary)] font-bold text-base tracking-tight mb-1">Submit Deliverables</h3>
                    <p className="text-xs text-[var(--text-muted)] font-medium leading-relaxed mb-6">
                      Upload your project files or provide repository and demo links. At least one of File, GitHub Link, or Demo Link is required.
                    </p>

                    {submissionError && (
                      <div className="mb-4 bg-[var(--status-negative-bg)] border border-[var(--status-negative-border)] p-4 rounded-lg">
                        <p className="text-xs text-[var(--status-negative-text)] font-semibold">{submissionError}</p>
                      </div>
                    )}

                    {project.payment?.status === "SUCCESS" && !project.escrow && (
                      <div className="mb-4 bg-[var(--status-progress-bg)] border border-[var(--status-progress-border)] p-4 rounded-lg">
                        <p className="text-xs text-[var(--status-progress-text)] font-semibold">
                          Payment received, but escrow setup is still processing. If this persists, contact support.
                        </p>
                      </div>
                    )}

                    <form onSubmit={handleWorkSubmission} className="space-y-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-650 uppercase tracking-wider mb-2">Deliverable File (ZIP, TAR.GZ, PDF, PNG, JPG, DOCX - Max 50MB)</label>
                        <input
                          type="file"
                          onChange={handleFileChange}
                          className="w-full text-xs text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-lg file:border file:border-slate-200 file:text-[11px] file:font-semibold file:bg-slate-50 hover:file:bg-slate-100 cursor-pointer transition-colors"
                        />
                        {selectedFile && (
                          <p className="mt-1.5 text-xs text-[var(--status-success-text)] font-semibold">
                            Selected file: {selectedFile.name} ({(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-650 uppercase tracking-wider mb-2">GitHub Link (Optional)</label>
                        <input
                          type="url"
                          placeholder="https://github.com/username/repo"
                          value={githubLink}
                          onChange={(e) => setGithubLink(e.target.value)}
                          className="w-full px-4 py-2.5 border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 focus:border-[var(--accent)] text-sm transition-all"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-650 uppercase tracking-wider mb-2">Demo Link (Optional)</label>
                        <input
                          type="url"
                          placeholder="https://my-demo-app.com"
                          value={demoLink}
                          onChange={(e) => setDemoLink(e.target.value)}
                          className="w-full px-4 py-2.5 border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 focus:border-[var(--accent)] text-sm transition-all"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-650 uppercase tracking-wider mb-2">Submission Notes (Optional)</label>
                        <textarea
                          placeholder="Add any instructions, notes, or details about this submission..."
                          rows={4}
                          value={submissionNotes}
                          onChange={(e) => setSubmissionNotes(e.target.value)}
                          className="w-full px-4 py-2.5 border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 focus:border-[var(--accent)] text-sm transition-all leading-relaxed"
                        />
                      </div>

                      <div className="flex justify-end pt-2">
                        <button
                          type="submit"
                          disabled={submittingWork || uploadingFile}
                          className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-xs font-semibold text-white bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-50 cursor-pointer shadow-sm transition-colors"
                        >
                          {uploadingFile ? "Uploading File to S3..." : submittingWork ? "Submitting Work..." : "Submit Deliverables"}
                        </button>
                      </div>
                    </form>
                  </div>
                )}

              {/* Submission History View */}
              {(isOwner || isFreelancerHired) && submissions.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-[var(--border)] p-6 sm:p-8">
                  <h3 className="text-[var(--text-primary)] font-bold text-base tracking-tight mb-6">Submission History</h3>
                  <div className="relative border-l border-slate-100 ml-2.5 space-y-8 pb-2">
                    {submissions.map((sub, index) => (
                      <div key={sub.id} className="relative pl-6">
                        {/* Timeline node dot */}
                        <div className="absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full bg-[var(--accent)] ring-4 ring-white" />

                        <div className="space-y-3">
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-xs font-bold text-[var(--text-primary)] bg-slate-50 border border-slate-150 px-2 py-0.5 rounded-md">
                              Round {submissions.length - index}
                            </span>
                            <span className="text-[10px] text-[var(--text-muted)] font-semibold flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {new Date(sub.createdAt).toLocaleString()}
                            </span>
                          </div>

                          {sub.notes && (
                            <p className="text-sm text-[var(--text-secondary)] bg-slate-50/70 p-3.5 rounded-lg border border-slate-100 whitespace-pre-wrap leading-relaxed">
                              {sub.notes}
                            </p>
                          )}

                          {sub.feedback && (
                            <div className="text-sm text-[var(--status-progress-text)] bg-[var(--status-progress-bg)] p-3.5 rounded-lg border border-[var(--status-progress-border)] whitespace-pre-wrap leading-relaxed">
                              <span className="font-bold block mb-1 text-[var(--status-progress-text)] text-xs uppercase tracking-wider">Requested Adjustments:</span>
                              {sub.feedback}
                            </div>
                          )}

                          <div className="flex flex-wrap gap-2 pt-1">
                            {sub.fileUrl && (
                              <a
                                href={sub.fileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 hover:underline bg-[var(--accent-light)] text-[var(--accent)] text-[10px] font-bold px-2.5 py-1.5 rounded-md border border-indigo-100 transition-colors"
                              >
                                <FileDown className="w-3.5 h-3.5" /> Download Deliverable File
                              </a>
                            )}
                            {sub.githubLink && (
                              <a
                                href={sub.githubLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 hover:underline bg-slate-50 hover:bg-slate-100 text-slate-700 text-[10px] font-bold px-2.5 py-1.5 rounded-md border border-slate-200 transition-colors"
                              >
                                <Github className="w-3.5 h-3.5" /> GitHub Repository
                              </a>
                            )}
                            {sub.demoLink && (
                              <a
                                href={sub.demoLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 hover:underline bg-slate-50 hover:bg-slate-100 text-slate-700 text-[10px] font-bold px-2.5 py-1.5 rounded-md border border-slate-200 transition-colors"
                              >
                                <Globe className="w-3.5 h-3.5" /> Live Demo URL
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Private Client-Freelancer Messaging Panel */}
              {(isOwner || isFreelancerHired) && project.status !== ProjectStatus.OPEN && (
                <div className="bg-white rounded-xl shadow-sm border border-[var(--border)] p-6 sm:p-8 space-y-4">
                  <div>
                    <h3 className="text-[var(--text-primary)] font-bold text-base tracking-tight mb-1 flex items-center gap-2">
                      <Send className="w-4 h-4 text-[var(--accent)]" />
                      Workspace Collaboration Messages
                    </h3>
                    <p className="text-xs text-[var(--text-muted)] font-medium leading-relaxed">
                      Secure, private discussion channel. Copy-paste any statement below into the dispute evidence field to submit it for official review.
                    </p>
                  </div>

                  {messageError && (
                    <div className="bg-[var(--status-negative-bg)] border border-[var(--status-negative-border)] p-3 rounded-lg">
                      <p className="text-xs text-[var(--status-negative-text)] font-semibold">{messageError}</p>
                    </div>
                  )}

                  <div className="border border-[var(--border-subtle)] rounded-lg p-4 bg-slate-50/30 max-h-[350px] overflow-y-auto space-y-4">
                    {messages.length === 0 ? (
                      <p className="text-xs text-[var(--text-muted)] italic text-center py-6">No messages sent in this workspace channel yet.</p>
                    ) : (
                      messages.map((msg) => {
                        const isMe = msg.senderId === session?.user?.id;
                        return (
                          <div
                            key={msg.id}
                            className={`flex flex-col max-w-[85%] ${isMe ? "ml-auto items-end" : "mr-auto items-start"}`}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-[10px] font-bold text-[var(--text-primary)]">
                                {msg.sender?.name || "Participant"}
                              </span>
                              <span className="text-[9px] text-[var(--text-muted)]">
                                {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <div
                              className={`p-3 rounded-lg text-sm leading-relaxed ${
                                isMe
                                  ? "bg-[var(--accent)] text-white rounded-tr-none shadow-sm"
                                  : "bg-white border border-[var(--border)] text-[var(--text-secondary)] rounded-tl-none shadow-sm"
                              }`}
                            >
                              <p className="whitespace-pre-wrap">{msg.content}</p>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  <form onSubmit={handleSendMessage} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Type a secure message..."
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      disabled={sendingMessage}
                      className="flex-grow px-4 py-2.5 border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 focus:border-[var(--accent)] text-sm transition-all"
                    />
                    <button
                      type="submit"
                      disabled={sendingMessage || !messageInput.trim()}
                      className="inline-flex items-center justify-center p-2.5 rounded-lg text-white bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-50 cursor-pointer transition-colors shadow-sm"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </form>
                </div>
              )}
            </div>

            {/* Details Sidebar */}
            <div className="lg:col-span-1 space-y-6">
              {/* Budget & Actions Card */}
              <div className="bg-white rounded-xl shadow-sm border border-[var(--border)] p-6 text-center sticky top-20">
                <span className="text-[10px] text-[var(--text-muted)] uppercase font-bold tracking-wider block mb-1">
                  {project.agreedAmount ? "Agreed Contract Price" : "Project Budget"}
                </span>
                <span className="text-2xl font-black text-[var(--text-primary)] block mb-5">
                  ₹{(project.agreedAmount || project.budget).toLocaleString()}
                </span>

                <div className="border-t border-[var(--border-subtle)] pt-5 text-left space-y-3.5">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-[var(--text-secondary)] font-medium">Deadline</span>
                    <span className="font-semibold text-[var(--text-primary)] flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      {new Date(project.deadline).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-[var(--text-secondary)] font-medium">Client Owner</span>
                    <span className="font-semibold text-[var(--text-primary)] flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      {project.client.name || "Client"}
                    </span>
                  </div>
                  {project.payment && (
                    <div className="flex justify-between text-sm items-center font-medium">
                      <span className="text-[var(--text-secondary)]">Payment Status</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                        project.payment.status === "SUCCESS"
                          ? "bg-[var(--status-success-bg)] text-[var(--status-success-text)] border-[var(--status-success-border)]"
                          : project.payment.status === "FAILED"
                          ? "bg-[var(--status-negative-bg)] text-[var(--status-negative-text)] border-[var(--status-negative-border)]"
                          : "bg-[var(--status-progress-bg)] text-[var(--status-progress-text)] border-[var(--status-progress-border)]"
                      }`}>
                        {project.payment.status}
                      </span>
                    </div>
                  )}
                  {project.escrow && (
                    <div className="flex justify-between text-sm items-center font-medium">
                      <span className="text-[var(--text-secondary)]">Escrow Status</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                        project.escrow.status === "RELEASED"
                          ? "bg-[var(--status-success-bg)] text-[var(--status-success-text)] border-[var(--status-success-border)]"
                          : project.escrow.status === "REFUNDED"
                          ? "bg-[var(--status-negative-bg)] text-[var(--status-negative-text)] border-[var(--status-negative-border)]"
                          : project.escrow.status === "DISPUTED"
                          ? "bg-[var(--status-disputed-bg)] text-[var(--status-disputed-text)] border-[var(--status-disputed-border)]"
                          : "bg-[var(--status-review-bg)] text-[var(--status-review-text)] border-[var(--status-review-border)]"
                      }`}>
                        {project.escrow.status}
                      </span>
                    </div>
                  )}
                </div>

                {isOwner && isOpen && (
                  <div className="mt-6 pt-5 border-t border-[var(--border-subtle)] flex flex-col gap-2">
                    <button
                      onClick={() => setEditMode(true)}
                      className="w-full inline-flex justify-center items-center py-2.5 px-4 border border-[var(--accent)] rounded-lg text-xs font-semibold text-[var(--accent)] hover:bg-[var(--accent-light)] cursor-pointer transition-colors"
                    >
                      Edit Project Details
                    </button>
                    <button
                      onClick={handleCancelProject}
                      className="w-full inline-flex justify-center items-center py-2.5 px-4 border border-transparent rounded-lg text-xs font-semibold text-white bg-[var(--status-negative-text)] hover:bg-rose-800 cursor-pointer transition-colors"
                    >
                      Cancel Project
                    </button>
                  </div>
                )}

                {isOwner && project.status === ProjectStatus.ASSIGNED && (!project.payment || project.payment.status !== "SUCCESS") && (
                  <div className="mt-6 pt-5 border-t border-[var(--border-subtle)]">
                    <button
                      onClick={handlePayment}
                      disabled={paymentLoading}
                      className="w-full inline-flex justify-center items-center py-2.5 px-4 rounded-lg text-xs font-semibold text-white bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-50 cursor-pointer shadow-sm transition-colors"
                    >
                      {paymentLoading ? "Processing..." : "Pay Contract Escrow"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Client Proposal Review Panel */}
          {isOwner && (
            <div className="bg-white rounded-xl border border-[var(--border)] shadow-sm p-6 sm:p-8">
              <div className="flex justify-between items-center border-b border-[var(--border-subtle)] pb-4 mb-6">
                <div>
                  <h2 className="text-base font-bold text-[var(--text-primary)] tracking-tight">Received Proposals</h2>
                  <p className="text-xs text-[var(--text-muted)] font-medium mt-0.5">Review submissions and hire the appropriate freelancer.</p>
                </div>
                <span className="bg-[var(--accent-light)] text-[var(--accent)] font-bold text-[10px] px-2.5 py-1 rounded-md border border-indigo-150 uppercase tracking-wider">
                  {proposals.length} Bids
                </span>
              </div>

              {proposals.length === 0 ? (
                <p className="text-sm text-[var(--text-muted)] italic text-center py-8">No proposals received for this project yet.</p>
              ) : (
                <div className="space-y-4">
                  {proposals.map((prop) => (
                    <div key={prop.id} className="border border-[var(--border)] rounded-xl p-5 hover:bg-slate-50/50 transition-all duration-150">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 pb-4 border-b border-[var(--border-subtle)]">
                        <div>
                          <span className="font-bold text-[var(--text-primary)] text-sm block">
                            {prop.freelancer?.name || "Freelancer"}
                          </span>
                          <span className="text-xs text-[var(--text-muted)] font-medium block mt-0.5">{prop.freelancer?.email}</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-4">
                          <div className="text-left sm:text-right">
                            <span className="text-[10px] text-[var(--text-muted)] uppercase font-semibold block tracking-wider mb-0.5">Bid Amount</span>
                            <span className="text-sm font-bold text-[var(--text-primary)]">
                              ₹{prop.price.toLocaleString()}{" "}
                              {prop.price !== project.budget && (
                                <span className="text-[9px] font-bold text-[var(--accent)] bg-[var(--accent-light)] border border-indigo-100 px-1.5 py-0.5 rounded-full ml-1 uppercase">
                                  Counter-offer
                                </span>
                              )}
                            </span>
                          </div>
                          <div className="text-left sm:text-right border-l border-slate-100 pl-4">
                            <span className="text-[10px] text-[var(--text-muted)] uppercase font-semibold block tracking-wider mb-0.5">Est. Delivery</span>
                            <span className="text-sm font-bold text-[var(--text-primary)]">{prop.estimatedDays} days</span>
                          </div>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${getProposalStatusBadge(prop.status)}`}>
                            {prop.status}
                          </span>
                        </div>
                      </div>

                      <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-4 whitespace-pre-wrap">{prop.message}</p>

                      {isOpen && prop.status === ProposalStatus.PENDING && (
                        <div className="flex justify-end">
                          <button
                            onClick={() => handleSelectFreelancer(prop.freelancerId, prop.freelancer?.name || "")}
                            disabled={selectLoading}
                            className="px-4 py-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-xs font-semibold text-white rounded-lg shadow-sm cursor-pointer disabled:opacity-50 transition-colors"
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
            <div className="bg-white rounded-xl border border-[var(--border)] shadow-sm p-6 sm:p-8">
              {myProposal ? (
                // Freelancer Has Already Applied
                <div className="space-y-6">
                  <div className="flex justify-between items-center border-b border-[var(--border-subtle)] pb-4">
                    <div>
                      <h2 className="text-base font-bold text-[var(--text-primary)] tracking-tight">Your Submitted Proposal</h2>
                      <p className="text-xs text-[var(--text-muted)] font-medium mt-0.5">Manage your active bid details.</p>
                    </div>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${getProposalStatusBadge(myProposal.status)}`}>
                      {myProposal.status}
                    </span>
                  </div>

                  {editProposalMode ? (
                    // Freelancer Inline Proposal Editor
                    <form onSubmit={handleEditProposal} className="space-y-4">
                      {errorMsg && (
                        <p className="text-xs text-[var(--status-negative-text)] font-semibold">{errorMsg}</p>
                      )}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-slate-650 uppercase tracking-wider mb-2">Bid Price (Counter-Offer, INR)</label>
                          <input
                            type="number"
                            required
                            min="1"
                            value={editProposalPrice}
                            onChange={(e) => setEditProposalPrice(e.target.value)}
                            className="w-full text-sm px-3 py-2 border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 focus:border-[var(--accent)]"
                          />
                          {proposalValidationErrors.price && (
                            <p className="text-[10px] text-[var(--status-negative-text)] mt-0.5">{proposalValidationErrors.price[0]}</p>
                          )}
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-650 uppercase tracking-wider mb-2">Estimated Days</label>
                          <input
                            type="number"
                            required
                            min="1"
                            value={editProposalDays}
                            onChange={(e) => setEditProposalDays(e.target.value)}
                            className="w-full text-sm px-3 py-2 border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 focus:border-[var(--accent)]"
                          />
                          {proposalValidationErrors.estimatedDays && (
                            <p className="text-[10px] text-[var(--status-negative-text)] mt-0.5">{proposalValidationErrors.estimatedDays[0]}</p>
                          )}
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-650 uppercase tracking-wider mb-2">Cover Message</label>
                        <textarea
                          required
                          rows={4}
                          value={editProposalMessage}
                          onChange={(e) => setEditProposalMessage(e.target.value)}
                          className="w-full text-sm px-3 py-2 border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 focus:border-[var(--accent)] leading-relaxed"
                        />
                        {proposalValidationErrors.message && (
                          <p className="text-[10px] text-[var(--status-negative-text)] mt-0.5">{proposalValidationErrors.message[0]}</p>
                        )}
                      </div>
                      <div className="flex justify-end gap-2.5 pt-2">
                        <button
                          type="button"
                          onClick={() => setEditProposalMode(false)}
                          className="px-4 py-2 border border-[var(--border)] hover:bg-slate-50 text-xs font-semibold text-slate-600 rounded-lg cursor-pointer transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={proposalActionLoading}
                          className="px-4 py-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-xs font-semibold text-white rounded-lg shadow-sm cursor-pointer disabled:opacity-50 transition-colors"
                        >
                          {proposalActionLoading ? "Saving..." : "Save Bid"}
                        </button>
                      </div>
                    </form>
                  ) : (
                    // Freelancer Proposal View Details
                    <div className="space-y-4">
                      <div className="flex flex-wrap gap-4 bg-slate-50/70 p-4 rounded-xl border border-slate-100 text-sm">
                        <div>
                          <span className="text-[10px] text-[var(--text-muted)] block font-semibold uppercase tracking-wider mb-0.5">Your Bid Amount</span>
                          <span className="font-bold text-[var(--text-primary)]">₹{myProposal.price.toLocaleString()}</span>
                        </div>
                        <div className="border-l border-slate-200 pl-4">
                          <span className="text-[10px] text-[var(--text-muted)] block font-semibold uppercase tracking-wider mb-0.5">Delivery Time</span>
                          <span className="font-bold text-[var(--text-primary)]">{myProposal.estimatedDays} days</span>
                        </div>
                      </div>
                      <div>
                        <span className="text-[10px] text-[var(--text-muted)] block font-semibold uppercase tracking-wider mb-1.5">Cover Message</span>
                        <p className="text-sm text-[var(--text-secondary)] leading-relaxed bg-white border border-slate-100 rounded-lg p-4 whitespace-pre-wrap">
                          {myProposal.message}
                        </p>
                      </div>

                      {isOpen && myProposal.status === ProposalStatus.PENDING && (
                        <div className="flex gap-2.5 pt-2">
                          <button
                            onClick={() => setEditProposalMode(true)}
                            className="px-4 py-2 border border-[var(--accent)] hover:bg-[var(--accent-light)] text-xs font-semibold text-[var(--accent)] rounded-lg cursor-pointer transition-all duration-150"
                          >
                            Edit Bid
                          </button>
                          <button
                            onClick={handleWithdrawProposal}
                            disabled={proposalActionLoading}
                            className="px-4 py-2 border border-[var(--border)] hover:bg-slate-50 text-xs font-semibold text-[var(--status-negative-text)] rounded-lg cursor-pointer disabled:opacity-50 transition-all duration-150"
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
                    <h2 className="text-base font-bold text-[var(--text-primary)] tracking-tight">Submit a Proposal</h2>
                    <p className="text-xs text-[var(--text-muted)] font-medium mt-0.5">Apply for this project listing by submitting your counter price and message.</p>
                  </div>
                  {errorMsg && (
                    <div className="bg-[var(--status-negative-bg)] border border-[var(--status-negative-border)] p-3 rounded-lg">
                      <p className="text-xs text-[var(--status-negative-text)] font-semibold">{errorMsg}</p>
                    </div>
                  )}
                  <form onSubmit={handleApply} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-650 uppercase tracking-wider mb-2">
                          Counter-Offer Price (INR, Optional)
                        </label>
                        <div className="relative rounded-lg shadow-sm">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <IndianRupee className="w-3.5 h-3.5 text-slate-400" />
                          </div>
                          <input
                            type="number"
                            min="1"
                            value={proposalPrice}
                            onChange={(e) => setProposalPrice(e.target.value)}
                            placeholder={project.budget.toString()}
                            className="w-full pl-7 pr-3 py-2 text-sm border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 focus:border-[var(--accent)]"
                          />
                        </div>
                        {proposalValidationErrors.price && (
                          <p className="text-[10px] text-[var(--status-negative-text)] mt-0.5">{proposalValidationErrors.price[0]}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-650 uppercase tracking-wider mb-2">
                          Estimated Days to Complete (Required)
                        </label>
                        <input
                          type="number"
                          required
                          min="1"
                          value={proposalDays}
                          onChange={(e) => setProposalDays(e.target.value)}
                          placeholder="e.g. 5"
                          className="w-full px-3 py-2 text-sm border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 focus:border-[var(--accent)]"
                        />
                        {proposalValidationErrors.estimatedDays && (
                          <p className="text-[10px] text-[var(--status-negative-text)] mt-0.5">{proposalValidationErrors.estimatedDays[0]}</p>
                        )}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-650 uppercase tracking-wider mb-2">
                        Cover Letter / Proposal Details (Min 10 chars)
                      </label>
                      <textarea
                        required
                        rows={4}
                        value={proposalMessage}
                        onChange={(e) => setProposalMessage(e.target.value)}
                        placeholder="Introduce yourself and explain how you will complete the project deliverables..."
                        className="w-full px-3 py-2 text-sm border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 focus:border-[var(--accent)] leading-relaxed"
                      />
                      {proposalValidationErrors.message && (
                        <p className="text-[10px] text-[var(--status-negative-text)] mt-0.5">{proposalValidationErrors.message[0]}</p>
                      )}
                    </div>
                    <div className="flex justify-end pt-2">
                      <button
                        type="submit"
                        disabled={proposalActionLoading}
                        className="px-5 py-2.5 rounded-lg text-xs font-semibold text-white bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-50 shadow-sm cursor-pointer transition-colors"
                      >
                        {proposalActionLoading ? "Submitting Proposal..." : "Submit Proposal"}
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                // Freelancer Has Not Applied & Project Is Not Open
                <div className="bg-slate-50 border border-slate-150 rounded-xl p-6 text-center">
                  <p className="text-sm text-[var(--text-muted)] italic">This project is no longer accepting proposal applications.</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
      {project && <AuditHistory entityId={project.id} entityType="Project" />}
    </div>
  );
}
