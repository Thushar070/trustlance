"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import { useNotification } from "@/components/NotificationProvider";
import { ProjectStatus, ProposalStatus, EscrowStatus } from "@prisma/client";
import { SKILL_GROUPS } from "@/lib/constants/skills";
import Link from "next/link";
import AuditHistory from "@/components/AuditHistory";
import {
  Clock,
  IndianRupee,
  Calendar,
  AlertTriangle,
  Briefcase,
  FileDown,
  Globe,
  Code2,
  User,
  RefreshCw,
  FileText,
  Check,
  Send,
  ShieldCheck,
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
  const { showSuccess, showError, showInfo, showWarning } = useNotification();

  const [project, setProject] = useState<ProjectDetails | null>(null);
  const [myProposal, setMyProposal] = useState<ProposalDetails | null>(null);
  const [proposals, setProposals] = useState<ProposalDetails[]>([]);

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [clientStats, setClientStats] = useState<{ completedProjectsCount: number; rating: number } | null>(null);

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
          throw new Error("Direct cloud upload failed.");
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
      showSuccess("Work submitted successfully!");
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
      showSuccess("Project approved and funds released successfully!");
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
      showSuccess("Changes requested successfully! Project is back in progress.");
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
      showWarning("Dispute raised successfully! Project is now flagged.");
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
  const [editSkillsOpen, setEditSkillsOpen] = useState(false);
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
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [messageError, setMessageError] = useState<string | null>(null);

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${id}/messages`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.items || []);
      }
    } catch {
      // Ignore background errors
    }
  }, [id]);

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
        showError("Razorpay Checkout SDK failed to load. Please check your internet connection.");
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
            showError(msg);
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

        // Fetch client public profile details
        try {
          fetch(`/api/users/${projDetails.clientId}/public-profile`)
            .then((res) => {
              if (res.ok) return res.json();
              return null;
            })
            .then((profileData) => {
              if (profileData) {
                setClientStats({
                  completedProjectsCount: profileData.completedProjectsCount || 0,
                  rating: profileData.rating || 0,
                });
              }
            })
            .catch(() => {});
        } catch {
          // Ignore
        }

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

    setTimeout(() => {
      fetchMessages();
    }, 0);
    const interval = setInterval(fetchMessages, 6000);
    return () => clearInterval(interval);
  }, [project, session?.user?.id, fetchMessages]);

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
      showError(msg);
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
      showError(msg);
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
      showError(msg);
    } finally {
      setSelectLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-grow flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 rounded-full border-2 border-[var(--border)] border-t-[var(--accent)] animate-spin" />
          <p className="text-[var(--text-muted)] text-xs font-bold uppercase tracking-wider">Loading project details...</p>
        </div>
      </div>
    );
  }

  if (errorMsg && !project) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 animate-fadeIn">
        <div className="bg-[var(--status-negative-bg)] border border-[var(--status-negative-border)] p-6 rounded-xl text-center">
          <p className="text-sm text-[var(--status-negative-text)] font-semibold mb-3">{errorMsg}</p>
          <button
            onClick={() => router.push("/projects")}
            className="btn-ghost px-4 py-2 border-[var(--status-negative-border)] text-[var(--status-negative-text)]"
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
    <div className="space-y-8 w-full min-w-0">
      {/* Breadcrumbs and Context Header Row */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
            <Link href="/projects" className="hover:text-white transition-colors">Enterprise</Link>
            <span>&gt;</span>
            <Link href="/projects" className="hover:text-white transition-colors">Projects</Link>
            <span>&gt;</span>
            <span className="text-zinc-400">{project.id.slice(0, 8).toUpperCase()}...</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white leading-tight">
            {project.title}
          </h1>
          <div className="text-[10px] font-mono text-zinc-500">
            Contract ID: {project.id} | Deployed to Mainnet
          </div>
        </div>

        {/* Top actions */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => showInfo(`Smart contract address mapping: 0x${project.id.slice(0, 20)}...`)}
            className="border border-zinc-800 hover:border-zinc-700 bg-zinc-950 text-white font-bold text-[10px] uppercase tracking-widest px-4 py-2.5 rounded transition-colors cursor-pointer"
          >
            View Smart Contract
          </button>
          
          {isOwner && isOpen && (
            <button
              onClick={() => setEditMode(true)}
              className="bg-white hover:bg-zinc-200 text-black font-bold text-[10px] uppercase tracking-widest px-4 py-2.5 rounded transition-colors cursor-pointer"
            >
              Edit Project Details
            </button>
          )}

          {isOwner && project.status === ProjectStatus.ASSIGNED && (!project.payment || project.payment.status !== "SUCCESS") && (
            <button
              onClick={handlePayment}
              disabled={paymentLoading}
              className="bg-white hover:bg-zinc-200 text-black font-bold text-[10px] uppercase tracking-widest px-4 py-2.5 rounded transition-colors cursor-pointer disabled:opacity-50"
            >
              {paymentLoading ? "Processing..." : "Manage Escrow"}
            </button>
          )}
        </div>
      </div>

      {editMode ? (
        // Inline Edit Mode Panel (Client project editor)
        <div className="border border-zinc-800 bg-[#09090b] rounded-lg p-8 space-y-6 max-w-4xl mx-auto">
          <div className="flex items-center gap-2 pb-3 border-b border-zinc-900">
            <Briefcase className="w-5 h-5 text-zinc-400" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Edit Project Specifications</h2>
          </div>
          {errorMsg && (
            <div className="bg-red-950/20 border border-red-900/50 p-4 rounded text-xs text-red-400">
              <p className="font-semibold">{errorMsg}</p>
            </div>
          )}
          <form onSubmit={handleUpdate} className="space-y-6 text-left">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Project Title</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 bg-black border border-zinc-800 rounded text-xs text-white focus:outline-none"
              />
              {validationErrors.title && (
                <p className="text-[10px] text-red-400 font-semibold mt-1">{validationErrors.title[0]}</p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Project Description</label>
              <textarea
                required
                rows={6}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 bg-black border border-zinc-800 rounded text-xs text-white focus:outline-none leading-relaxed resize-none"
              />
              {validationErrors.description && (
                <p className="text-[10px] text-red-400 font-semibold mt-1">{validationErrors.description[0]}</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Project Budget (INR)</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  className="w-full px-3 py-2 bg-black border border-zinc-800 rounded text-xs text-white focus:outline-none"
                />
                {validationErrors.budget && (
                  <p className="text-[10px] text-red-400 font-semibold mt-1">{validationErrors.budget[0]}</p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Project Deadline</label>
                <input
                  type="date"
                  required
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="w-full px-3 py-2 bg-black border border-zinc-800 rounded text-xs text-zinc-400 focus:outline-none"
                />
                {validationErrors.deadline && (
                  <p className="text-[10px] text-red-400 font-semibold mt-1">{validationErrors.deadline[0]}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setEditSkillsOpen(!editSkillsOpen)}
                  className="text-[10px] font-bold text-white uppercase tracking-wider hover:underline"
                >
                  {editSkillsOpen ? "− Hide skills selection" : "+ Add relevant skills (optional)"}
                </button>
              </div>
              {validationErrors.skills && (
                <p className="text-[10px] text-red-400 font-semibold">{validationErrors.skills[0]}</p>
              )}
              {editSkillsOpen && (
                <div className="border border-zinc-800 rounded p-4 bg-zinc-950 max-h-60 overflow-y-auto space-y-4">
                  {SKILL_GROUPS.map((group) => (
                    <div key={group.category} className="space-y-1.5">
                      <h3 className="text-[8px] font-bold uppercase tracking-widest text-zinc-500">{group.category}</h3>
                      <div className="flex flex-wrap gap-1.5">
                        {group.skills.map((skill) => {
                          const isSelected = selectedSkills.includes(skill);
                          return (
                            <button
                              key={skill}
                              type="button"
                              onClick={() => toggleSkill(skill)}
                              className={`text-[9px] px-2 py-0.5 rounded transition-colors duration-150 cursor-pointer ${
                                isSelected
                                  ? "bg-white text-black font-bold border border-white"
                                  : "bg-transparent border border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:text-zinc-400"
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
              )}
            </div>

            <div className="flex justify-end gap-3 border-t border-zinc-900 pt-6">
              <button
                type="button"
                onClick={() => setEditMode(false)}
                className="border border-zinc-800 hover:border-zinc-750 text-white font-bold text-[10px] uppercase tracking-widest px-4 py-2 rounded transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saveLoading}
                className="bg-white hover:bg-zinc-200 text-black font-bold text-[10px] uppercase tracking-widest px-4 py-2 rounded transition-colors disabled:opacity-50"
              >
                {saveLoading ? "Saving Changes..." : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      ) : (
        // Standard View Mode Layout
        <div className="space-y-8 animate-fadeIn">
          {/* 1. ESCROW STATE TIMELINE (Mockup 4 style) */}
          <div className="border border-zinc-800 bg-[#09090b]/40 rounded-lg p-6 sm:p-8 space-y-6">
            <div className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Escrow State Timeline</div>
            
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 md:gap-4 relative pt-2">
              {/* Connecting line */}
              <div className="absolute top-[21px] left-3.5 right-3.5 h-[1px] bg-zinc-800 hidden md:block z-0" />
              
              {/* Node 1: OPEN */}
              <div className="flex items-center md:flex-col gap-3 md:gap-2.5 relative z-10 text-left md:text-center w-full md:w-1/4">
                <div className="w-5 h-5 rounded-full border border-white bg-white text-black flex items-center justify-center font-bold text-[10px] shrink-0">
                  ✓
                </div>
                <div className="space-y-0.5">
                  <div className="text-[10px] font-bold text-white uppercase tracking-wider">Open</div>
                  <div className="text-[9px] text-zinc-500 font-mono">
                    {new Date(project.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </div>
                </div>
              </div>

              {/* Node 2: PAYMENT VERIFIED */}
              <div className="flex items-center md:flex-col gap-3 md:gap-2.5 relative z-10 text-left md:text-center w-full md:w-1/4">
                <div className={`w-5 h-5 rounded-full border flex items-center justify-center font-bold text-[10px] shrink-0 ${
                  project.status !== "OPEN" ? "border-white bg-white text-black" : "border-zinc-800 bg-zinc-950 text-zinc-650"
                }`}>
                  {project.status !== "OPEN" ? "✓" : "02"}
                </div>
                <div className="space-y-0.5">
                  <div className="text-[10px] font-bold text-white uppercase tracking-wider">Payment Verified</div>
                  <div className="text-[9px] text-zinc-500 font-mono">
                    {project.status !== "OPEN" ? "Verified" : "Pending"}
                  </div>
                </div>
              </div>

              {/* Node 3: HOLDING */}
              <div className="flex items-center md:flex-col gap-3 md:gap-2.5 relative z-10 text-left md:text-center w-full md:w-1/4">
                <div className={`w-5 h-5 rounded-full border flex items-center justify-center font-bold text-[10px] shrink-0 ${
                  project.status !== "OPEN" ? "border-white bg-white text-black" : "border-zinc-800 bg-zinc-950 text-zinc-650"
                }`}>
                  {project.status !== "OPEN" ? "✓" : "03"}
                </div>
                <div className="space-y-0.5">
                  <div className="text-[10px] font-bold text-white uppercase tracking-wider">Holding</div>
                  <div className="text-[9px] text-zinc-500 font-mono">
                    {project.status !== "OPEN" ? "In Vault" : "Awaiting"}
                  </div>
                </div>
              </div>

              {/* Node 4: IN_PROGRESS */}
              <div className="flex items-center md:flex-col gap-3 md:gap-2.5 relative z-10 text-left md:text-center w-full md:w-1/4">
                <div className={`w-5 h-5 rounded-full border flex items-center justify-center font-bold text-[10px] shrink-0 ${
                  ["IN_PROGRESS", "UNDER_REVIEW", "COMPLETED"].includes(project.status)
                    ? "border-white bg-white text-black"
                    : project.status === "ASSIGNED"
                    ? "border-white bg-zinc-950 text-white ring-4 ring-zinc-800"
                    : "border-zinc-800 bg-zinc-950 text-zinc-650"
                }`}>
                  {project.status === "COMPLETED" ? "✓" : "04"}
                </div>
                <div className="space-y-0.5">
                  <div className="text-[10px] font-bold text-white uppercase tracking-wider">In Progress</div>
                  <div className="text-[9px] text-zinc-500 font-mono">
                    {project.status === "COMPLETED" ? "Released" : ["ASSIGNED", "IN_PROGRESS", "UNDER_REVIEW"].includes(project.status) ? "Active Phase" : "Awaiting"}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Main Grid: Left Column Specification / Right Column Meta Details & History */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            <div className="lg:col-span-2 space-y-8">
              {/* Card 1: Project Specification */}
              <div className="border border-zinc-850 bg-black rounded-lg p-6 sm:p-8 space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-zinc-900">
                  <h2 className="text-sm font-bold uppercase tracking-wider text-white">Project Specification</h2>
                  <span className="text-[9px] font-mono font-bold text-zinc-550 border border-zinc-850 px-2 py-0.5 rounded bg-zinc-950">
                    V.1.0.4
                  </span>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed font-light whitespace-pre-wrap">
                  {project.description}
                </p>

                {project.skills && project.skills.length > 0 && (
                  <div className="pt-4 border-t border-zinc-900 space-y-2">
                    <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-500">Skills Matrix Required</span>
                    <div className="flex flex-wrap gap-1.5">
                      {project.skills.map((skill) => (
                        <span key={skill} className="text-[9px] font-mono text-zinc-400 bg-zinc-950 border border-zinc-900 px-2 py-0.5 rounded">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Card 2: Deliverables Schedule */}
              <div className="border border-zinc-850 bg-black rounded-lg p-6 sm:p-8 space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-zinc-900">
                  <h2 className="text-sm font-bold uppercase tracking-wider text-white">Deliverables Schedule</h2>
                  <span className="text-[9px] font-mono text-zinc-500">Total: ₹{(project.agreedAmount || project.budget).toLocaleString()}</span>
                </div>

                <div className="space-y-3">
                  {/* Phase 1 Deliverable */}
                  <div className="border border-zinc-900 rounded p-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded-full border border-white bg-white text-black flex items-center justify-center text-[8px] font-black">
                        ✓
                      </div>
                      <span className="text-xs font-bold text-white uppercase tracking-wider">Phase 1: Architecture Review & Security Audit</span>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xs font-mono font-bold text-white">₹{Math.floor((project.agreedAmount || project.budget) * 0.2).toLocaleString()}</div>
                      <div className="text-[8px] font-mono font-bold text-zinc-500 uppercase tracking-widest mt-0.5">Released</div>
                    </div>
                  </div>

                  {/* Phase 2 Deliverable */}
                  <div className={`border rounded p-4 flex items-center justify-between gap-4 ${
                    ["ASSIGNED", "IN_PROGRESS", "UNDER_REVIEW"].includes(project.status) ? "border-white" : "border-zinc-900"
                  }`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center text-[8px] font-black ${
                        project.status === "COMPLETED" ? "border-white bg-white text-black" : "border-zinc-650"
                      }`}>
                        {project.status === "COMPLETED" ? "✓" : ""}
                      </div>
                      <span className="text-xs font-bold text-white uppercase tracking-wider">Phase 2: Core Module Implementation</span>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xs font-mono font-bold text-white">₹{Math.floor((project.agreedAmount || project.budget) * 0.5).toLocaleString()}</div>
                      <div className="text-[8px] font-mono font-bold text-zinc-500 uppercase tracking-widest mt-0.5">
                        {project.status === "COMPLETED" ? "Released" : "In Escrow"}
                      </div>
                    </div>
                  </div>

                  {/* Phase 3 Deliverable */}
                  <div className="border border-zinc-900 rounded p-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center text-[8px] font-black ${
                        project.status === "COMPLETED" ? "border-white bg-white text-black" : "border-zinc-650"
                      }`}>
                        {project.status === "COMPLETED" ? "✓" : ""}
                      </div>
                      <span className="text-xs font-bold text-white uppercase tracking-wider">Phase 3: Final Deployment & Handover</span>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xs font-mono font-bold text-white">₹{Math.floor((project.agreedAmount || project.budget) * 0.3).toLocaleString()}</div>
                      <div className="text-[8px] font-mono font-bold text-zinc-500 uppercase tracking-widest mt-0.5">
                        {project.status === "COMPLETED" ? "Released" : "In Escrow"}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Client Proposal Review Panel */}
              {isOwner && (
                <div className="border border-zinc-850 bg-black rounded-lg p-6 sm:p-8 space-y-4">
                  <div className="flex justify-between items-center pb-2 border-b border-zinc-900">
                    <h2 className="text-sm font-bold uppercase tracking-wider text-white">Proposals Bids Pool</h2>
                    <span className="text-[9px] font-mono text-zinc-550 border border-zinc-850 px-2 py-0.5 rounded bg-zinc-950">
                      {proposals.length} Counter-offers
                    </span>
                  </div>

                  {proposals.length === 0 ? (
                    <p className="text-xs text-zinc-600 italic text-center py-6">No proposals counter-offers received yet.</p>
                  ) : (
                    <div className="space-y-4">
                      {proposals.map((prop) => (
                        <div key={prop.id} className="border border-zinc-900 rounded p-5 space-y-4 bg-zinc-950/20 text-left">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-zinc-900">
                            <div>
                              <span className="font-bold text-white text-xs block">{prop.freelancer?.name || "Freelancer"}</span>
                              <span className="text-[10px] text-zinc-500 font-mono block mt-0.5">{prop.freelancer?.email}</span>
                            </div>
                            <div className="flex flex-wrap items-center gap-4 text-xs font-mono">
                              <div>
                                <span className="text-[8px] text-zinc-500 uppercase block">Bid Amount</span>
                                <span className="font-bold text-white">
                                  ₹{prop.price.toLocaleString()}
                                  {prop.price !== project.budget && (
                                    <span className="text-[7px] font-bold text-black bg-white px-1.5 py-0.2 rounded-full ml-1 uppercase">
                                      Counter
                                    </span>
                                  )}
                                </span>
                              </div>
                              <div className="border-l border-zinc-900 pl-4">
                                <span className="text-[8px] text-zinc-500 uppercase block">Timeframe</span>
                                <span className="font-bold text-white">{prop.estimatedDays} days</span>
                              </div>
                              <div className="border-l border-zinc-900 pl-4">
                                <span className="text-[8px] text-zinc-500 uppercase block">Bid Status</span>
                                <span className="font-bold text-zinc-400">{prop.status}</span>
                              </div>
                            </div>
                          </div>

                          <p className="text-xs text-zinc-400 leading-relaxed font-light">{prop.message}</p>

                          {isOpen && prop.status === ProposalStatus.PENDING && (
                            <div className="flex justify-end">
                              <button
                                onClick={() => handleSelectFreelancer(prop.freelancerId, prop.freelancer?.name || "")}
                                disabled={selectLoading}
                                className="bg-white hover:bg-zinc-200 text-black font-bold text-[10px] uppercase tracking-widest px-4 py-2 rounded transition-colors cursor-pointer disabled:opacity-50"
                              >
                                Hire & Assign Project
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
                <div className="border border-zinc-850 bg-black rounded-lg p-6 sm:p-8 space-y-4">
                  {myProposal ? (
                    // Freelancer Has Already Applied
                    <div className="space-y-6">
                      <div className="flex justify-between items-center pb-2 border-b border-zinc-900">
                        <h2 className="text-sm font-bold uppercase tracking-wider text-white">Your Submitted Bid</h2>
                        <span className="text-[9px] font-mono text-zinc-400 bg-zinc-900 px-2 py-0.5 rounded">
                          {myProposal.status}
                        </span>
                      </div>

                      {editProposalMode ? (
                        <form onSubmit={handleEditProposal} className="space-y-4 text-left">
                          {errorMsg && (
                            <p className="text-xs text-red-400 font-semibold">{errorMsg}</p>
                          )}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Bid Price (INR)</label>
                              <input
                                type="number"
                                required
                                min="1"
                                value={editProposalPrice}
                                onChange={(e) => setEditProposalPrice(e.target.value)}
                                className="w-full px-3 py-2 bg-black border border-zinc-800 rounded text-xs text-white focus:outline-none"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Estimated Days</label>
                              <input
                                type="number"
                                required
                                min="1"
                                value={editProposalDays}
                                onChange={(e) => setEditProposalDays(e.target.value)}
                                className="w-full px-3 py-2 bg-black border border-zinc-800 rounded text-xs text-white focus:outline-none"
                              />
                            </div>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Message Details</label>
                            <textarea
                              required
                              rows={4}
                              value={editProposalMessage}
                              onChange={(e) => setEditProposalMessage(e.target.value)}
                              className="w-full px-3 py-2 bg-black border border-zinc-800 rounded text-xs text-white focus:outline-none leading-relaxed resize-none"
                            />
                          </div>
                          <div className="flex justify-end gap-2.5 pt-2">
                            <button
                              type="button"
                              onClick={() => setEditProposalMode(false)}
                              className="border border-zinc-800 hover:border-zinc-750 text-white font-bold text-[10px] uppercase tracking-widest px-4 py-2 rounded transition-colors"
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              disabled={proposalActionLoading}
                              className="bg-white hover:bg-zinc-200 text-black font-bold text-[10px] uppercase tracking-widest px-4 py-2 rounded transition-colors disabled:opacity-50"
                            >
                              {proposalActionLoading ? "Saving..." : "Save Bid"}
                            </button>
                          </div>
                        </form>
                      ) : (
                        <div className="space-y-4 text-left font-mono">
                          <div className="flex gap-4 bg-zinc-950 p-4 rounded border border-zinc-900 text-xs">
                            <div>
                              <span className="text-[8px] text-zinc-500 uppercase block font-sans">Counter Offer Price</span>
                              <span className="font-bold text-white">₹{myProposal.price.toLocaleString()}</span>
                            </div>
                            <div className="border-l border-zinc-900 pl-4">
                              <span className="text-[8px] text-zinc-500 uppercase block font-sans">Est. Days</span>
                              <span className="font-bold text-white">{myProposal.estimatedDays} days</span>
                            </div>
                          </div>
                          <div className="space-y-1.5">
                            <span className="text-[8px] text-zinc-500 uppercase block font-sans">Cover Message Details</span>
                            <p className="text-xs text-zinc-400 bg-zinc-950 border border-zinc-900 rounded p-4 font-sans font-light leading-relaxed">
                              {myProposal.message}
                            </p>
                          </div>

                          {isOpen && myProposal.status === ProposalStatus.PENDING && (
                            <div className="flex gap-2 pt-2">
                              <button
                                onClick={() => setEditProposalMode(true)}
                                className="border border-zinc-800 hover:border-zinc-700 text-white font-bold text-[10px] uppercase tracking-widest px-4 py-2 rounded transition-colors"
                              >
                                Edit Bid
                              </button>
                              <button
                                onClick={handleWithdrawProposal}
                                disabled={proposalActionLoading}
                                className="border border-zinc-800 hover:border-red-900 hover:text-red-400 text-zinc-500 font-bold text-[10px] uppercase tracking-widest px-4 py-2 rounded transition-colors disabled:opacity-50"
                              >
                                Withdraw
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : isOpen ? (
                    // Submit New Proposal
                    <div className="space-y-6">
                      <div className="pb-2 border-b border-zinc-900 text-left">
                        <h2 className="text-sm font-bold uppercase tracking-wider text-white">Submit a Bid Proposal</h2>
                        <p className="text-[10px] text-zinc-500 mt-1 font-light">Introduce your skills and counter-offer a pricing timeframe schedule.</p>
                      </div>
                      {errorMsg && (
                        <div className="bg-red-950/20 border border-red-900/50 p-4 rounded text-xs text-red-400">
                          <p className="font-semibold">{errorMsg}</p>
                        </div>
                      )}
                      <form onSubmit={handleApply} className="space-y-4 text-left">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Counter-Offer Bid Price (INR)</label>
                            <input
                              type="number"
                              min="1"
                              value={proposalPrice}
                              onChange={(e) => setProposalPrice(e.target.value)}
                              placeholder={project.budget.toString()}
                              className="w-full px-3 py-2 bg-black border border-zinc-800 rounded text-xs text-white focus:outline-none"
                            />
                            {proposalValidationErrors.price && (
                              <p className="text-[9px] text-red-400 font-semibold">{proposalValidationErrors.price[0]}</p>
                            )}
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Estimated Days</label>
                            <input
                              type="number"
                              required
                              min="1"
                              value={proposalDays}
                              onChange={(e) => setProposalDays(e.target.value)}
                              placeholder="e.g. 10"
                              className="w-full px-3 py-2 bg-black border border-zinc-800 rounded text-xs text-white focus:outline-none"
                            />
                            {proposalValidationErrors.estimatedDays && (
                              <p className="text-[9px] text-red-400 font-semibold">{proposalValidationErrors.estimatedDays[0]}</p>
                            )}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Cover message details (min 10 chars)</label>
                          <textarea
                            required
                            rows={4}
                            value={proposalMessage}
                            onChange={(e) => setProposalMessage(e.target.value)}
                            placeholder="Explain how you will fulfill this contract details..."
                            className="w-full px-3 py-2 bg-black border border-zinc-800 rounded text-xs text-white focus:outline-none leading-relaxed resize-none"
                          />
                          {proposalValidationErrors.message && (
                            <p className="text-[9px] text-red-400 font-semibold">{proposalValidationErrors.message[0]}</p>
                          )}
                        </div>
                        <div className="flex justify-end pt-2">
                          <button
                            type="submit"
                            disabled={proposalActionLoading}
                            className="bg-white hover:bg-zinc-200 text-black font-bold text-[10px] uppercase tracking-widest px-4 py-2 rounded transition-colors disabled:opacity-50"
                          >
                            Submit Proposal
                          </button>
                        </div>
                      </form>
                    </div>
                  ) : (
                    <div className="border border-zinc-900 rounded p-6 text-center text-zinc-600 font-mono text-xs">
                      Closed for new applications.
                    </div>
                  )}
                </div>
              )}

              {/* Client Review Decision Interface */}
              {isOwner && project.status === ProjectStatus.UNDER_REVIEW && (
                <div className="border border-zinc-850 bg-black rounded-lg p-6 sm:p-8 space-y-4">
                  <div className="pb-2 border-b border-zinc-900 text-left">
                    <h2 className="text-sm font-bold uppercase tracking-wider text-white">Project Adjudication & Approval</h2>
                    <p className="text-[10px] text-zinc-500 mt-1">Review work submission notes below, and release locked escrow assets or request changes.</p>
                  </div>

                  {reviewActionError && (
                    <div className="bg-red-950/20 border border-red-900/50 p-4 rounded text-xs text-red-400">
                      <p className="font-semibold">{reviewActionError}</p>
                    </div>
                  )}

                  {!activeReviewAction && (
                    <div className="flex flex-wrap gap-2 pt-2">
                      <button
                        onClick={handleApprove}
                        disabled={reviewActionLoading}
                        className="bg-white hover:bg-zinc-200 text-black font-bold text-[10px] uppercase tracking-widest px-4 py-2.5 rounded transition-colors cursor-pointer disabled:opacity-50"
                      >
                        Approve & Release Funds
                      </button>
                      <button
                        onClick={() => {
                          setActiveReviewAction("REQUEST_CHANGES");
                          setReviewActionError(null);
                        }}
                        disabled={reviewActionLoading}
                        className="border border-zinc-800 hover:border-zinc-700 text-white font-bold text-[10px] uppercase tracking-widest px-4 py-2.5 rounded transition-colors cursor-pointer disabled:opacity-50"
                      >
                        Request Changes
                      </button>
                      <button
                        onClick={() => {
                          setActiveReviewAction("DISPUTE");
                          setReviewActionError(null);
                        }}
                        disabled={reviewActionLoading}
                        className="border border-zinc-800 hover:border-red-900 hover:text-red-400 text-zinc-550 font-bold text-[10px] uppercase tracking-widest px-4 py-2.5 rounded transition-colors cursor-pointer disabled:opacity-50"
                      >
                        Raise dispute
                      </button>
                    </div>
                  )}

                  {activeReviewAction === "REQUEST_CHANGES" && (
                    <form onSubmit={handleRequestChanges} className="space-y-4 text-left">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Adjustment Details & feedback</label>
                        <textarea
                          placeholder="Provide clear adjustment requirements..."
                          rows={4}
                          required
                          value={reviewFeedback}
                          onChange={(e) => setReviewFeedback(e.target.value)}
                          className="w-full px-3 py-2 bg-black border border-zinc-800 rounded text-xs text-white focus:outline-none leading-relaxed resize-none"
                        />
                      </div>
                      <div className="flex justify-end gap-2.5">
                        <button
                          type="button"
                          onClick={() => setActiveReviewAction(null)}
                          className="border border-zinc-800 hover:border-zinc-750 text-white font-bold text-[10px] uppercase tracking-widest px-4 py-2 rounded transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={reviewActionLoading}
                          className="bg-white hover:bg-zinc-200 text-black font-bold text-[10px] uppercase tracking-widest px-4 py-2 rounded transition-colors"
                        >
                          {reviewActionLoading ? "Submitting..." : "Send Request"}
                        </button>
                      </div>
                    </form>
                  )}

                  {activeReviewAction === "DISPUTE" && (
                    <form onSubmit={handleRaiseDispute} className="space-y-4 text-left">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Dispute details & reasons</label>
                        <textarea
                          placeholder="Provide the reason for Escalation..."
                          rows={4}
                          required
                          value={disputeReason}
                          onChange={(e) => setDisputeReason(e.target.value)}
                          className="w-full px-3 py-2 bg-black border border-zinc-800 rounded text-xs text-white focus:outline-none leading-relaxed resize-none"
                        />
                      </div>
                      <div className="flex justify-end gap-2.5">
                        <button
                          type="button"
                          onClick={() => setActiveReviewAction(null)}
                          className="border border-zinc-800 hover:border-zinc-750 text-white font-bold text-[10px] uppercase tracking-widest px-4 py-2 rounded transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={reviewActionLoading}
                          className="bg-red-650 hover:bg-red-700 text-white font-bold text-[10px] uppercase tracking-widest px-4 py-2 rounded transition-colors"
                        >
                          {reviewActionLoading ? "Escalating..." : "Raise dispute"}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}

              {/* Freelancer Dispute Trigger */}
              {isFreelancerHired && project.status === ProjectStatus.UNDER_REVIEW && (
                <div className="border border-zinc-850 bg-black rounded-lg p-6 sm:p-8 space-y-4">
                  <div className="text-left">
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">Raise Dispute Escalation</h3>
                    <p className="text-[10px] text-zinc-500 mt-1">If client review is deadlocked, you may escalate this milestone contract to official mediator panel.</p>
                  </div>

                  {reviewActionError && (
                    <div className="bg-red-950/20 border border-red-900/50 p-4 rounded text-xs text-red-400">
                      <p className="font-semibold">{reviewActionError}</p>
                    </div>
                  )}

                  {activeReviewAction !== "DISPUTE" ? (
                    <button
                      onClick={() => {
                        setActiveReviewAction("DISPUTE");
                        setReviewActionError(null);
                      }}
                      className="border border-zinc-800 hover:border-red-900 hover:text-red-400 text-zinc-500 font-bold text-[10px] uppercase tracking-widest px-4 py-2 rounded transition-colors"
                    >
                      Raise Dispute
                    </button>
                  ) : (
                    <form onSubmit={handleRaiseDispute} className="space-y-4 text-left">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Reason for Dispute</label>
                        <textarea
                          placeholder="Describe details for dispute..."
                          rows={4}
                          required
                          value={disputeReason}
                          onChange={(e) => setDisputeReason(e.target.value)}
                          className="w-full px-3 py-2 bg-black border border-zinc-800 rounded text-xs text-white focus:outline-none leading-relaxed resize-none"
                        />
                      </div>
                      <div className="flex justify-end gap-2.5">
                        <button
                          type="button"
                          onClick={() => setActiveReviewAction(null)}
                          className="border border-zinc-800 hover:border-zinc-755 text-white font-bold text-[10px] uppercase tracking-widest px-4 py-2 rounded transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={reviewActionLoading}
                          className="bg-red-650 hover:bg-red-700 text-white font-bold text-[10px] uppercase tracking-widest px-4 py-2 rounded transition-colors"
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
                  <div className="border border-zinc-850 bg-black rounded-lg p-6 sm:p-8 space-y-6 text-left">
                    <div>
                      <h3 className="text-sm font-bold text-white uppercase tracking-wider">Submit Deliverables</h3>
                      <p className="text-[10px] text-zinc-500 mt-1 font-light">Upload ZIP/PDF build documents, or provide repository and live demo links.</p>
                    </div>

                    {submissionError && (
                      <div className="bg-red-950/20 border border-red-900/50 p-4 rounded text-xs text-red-400">
                        <p className="font-semibold">{submissionError}</p>
                      </div>
                    )}

                    {project.payment?.status === "SUCCESS" && !project.escrow && (
                      <div className="bg-zinc-950 border border-zinc-850 p-4 rounded text-xs text-zinc-400">
                        <p className="font-semibold">
                          Payment cleared. Escrow setup is initializing in the background.
                        </p>
                      </div>
                    )}

                    <form onSubmit={handleWorkSubmission} className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Deliverables File (max 50MB)</label>
                        <input
                          type="file"
                          onChange={handleFileChange}
                          className="w-full text-xs text-zinc-400 focus:outline-none cursor-pointer"
                        />
                        {selectedFile && (
                          <p className="text-[10px] text-emerald-400 font-mono mt-1">
                            File selected: {selectedFile.name} ({(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)
                          </p>
                        )}
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">GitHub Repository Link</label>
                        <input
                          type="url"
                          placeholder="https://github.com/... "
                          value={githubLink}
                          onChange={(e) => setGithubLink(e.target.value)}
                          className="w-full px-3 py-2 bg-black border border-zinc-800 rounded text-xs text-white focus:outline-none"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Live Demo Link</label>
                        <input
                          type="url"
                          placeholder="https://... "
                          value={demoLink}
                          onChange={(e) => setDemoLink(e.target.value)}
                          className="w-full px-3 py-2 bg-black border border-zinc-800 rounded text-xs text-white focus:outline-none"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Submission notes details</label>
                        <textarea
                          placeholder="Instructions/notes for review..."
                          rows={4}
                          value={submissionNotes}
                          onChange={(e) => setSubmissionNotes(e.target.value)}
                          className="w-full px-3 py-2 bg-black border border-zinc-800 rounded text-xs text-white focus:outline-none leading-relaxed resize-none"
                        />
                      </div>

                      <div className="flex justify-end pt-2">
                        <button
                          type="submit"
                          disabled={submittingWork || uploadingFile}
                          className="bg-white hover:bg-zinc-200 text-black font-bold text-[10px] uppercase tracking-widest px-4 py-2 rounded transition-colors disabled:opacity-40"
                        >
                          {uploadingFile ? "Uploading File..." : submittingWork ? "Submitting..." : "Submit Deliverables"}
                        </button>
                      </div>
                    </form>
                  </div>
                )}

              {/* Submission History Timeline list */}
              {(isOwner || isFreelancerHired) && submissions.length > 0 && (
                <div className="border border-zinc-850 bg-black rounded-lg p-6 sm:p-8 space-y-6 text-left">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider pb-2 border-b border-zinc-900">Submission History Logs</h3>
                  <div className="relative border-l border-zinc-900 pl-4 space-y-6">
                    {submissions.map((sub, index) => (
                      <div key={sub.id} className="relative space-y-2">
                        {/* Circle node dot */}
                        <div className="absolute -left-[21px] top-1.5 w-2 h-2 rounded-full bg-white ring-4 ring-black" />

                        <div className="flex justify-between items-center text-[10px] font-mono text-zinc-500">
                          <span className="font-bold text-white">Deliverable Round {submissions.length - index}</span>
                          <span>{new Date(sub.createdAt).toLocaleString()}</span>
                        </div>

                        {sub.notes && (
                          <div className="p-3 bg-zinc-950 border border-zinc-900 rounded text-xs text-zinc-400 font-light whitespace-pre-wrap">
                            {sub.notes}
                          </div>
                        )}

                        {sub.feedback && (
                          <div className="p-3 bg-zinc-950 border border-zinc-900 rounded text-xs text-zinc-500 font-mono">
                            <span className="text-[9px] font-bold uppercase tracking-wider block text-zinc-400 mb-1">Feedback requested:</span>
                            {sub.feedback}
                          </div>
                        )}

                        <div className="flex flex-wrap gap-2 text-[9px] font-mono">
                          {sub.fileUrl && (
                            <a href={sub.fileUrl} target="_blank" rel="noopener noreferrer" className="text-white hover:underline">
                              [Download S3 File]
                            </a>
                          )}
                          {sub.githubLink && (
                            <a href={sub.githubLink} target="_blank" rel="noopener noreferrer" className="text-zinc-550 hover:underline">
                              [GitHub Codebase]
                            </a>
                          )}
                          {sub.demoLink && (
                            <a href={sub.demoLink} target="_blank" rel="noopener noreferrer" className="text-zinc-550 hover:underline">
                              [Live Deployment]
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 3. Right Details Sidebar (Mockup 4 style) */}
            <div className="lg:col-span-1 space-y-8">
              {/* Card 1: Ledger Status Overview */}
              <div className="border border-zinc-850 bg-black rounded-lg p-6 space-y-6 text-left">
                <div className="space-y-1 pb-4 border-b border-zinc-900">
                  <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block">
                    {project.agreedAmount ? "Agreed Contract Price" : "Initial Budget"}
                  </span>
                  <span className="text-2xl font-bold tracking-tight text-white block font-mono">
                    ₹{(project.agreedAmount || project.budget).toLocaleString()}
                  </span>
                </div>

                <div className="space-y-4">
                  {/* Escrow Progress Bar */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider">
                      <span className="text-zinc-500">Escrow Secured</span>
                      <span className="text-white">
                        {project.payment?.status === "SUCCESS" || project.escrow ? "100%" : "0%"}
                      </span>
                    </div>
                    <div className="h-1 bg-zinc-900 rounded overflow-hidden">
                      <div
                        className="h-full bg-white transition-all duration-300"
                        style={{ width: project.payment?.status === "SUCCESS" || project.escrow ? "100%" : "0%" }}
                      />
                    </div>
                  </div>

                  <div className="space-y-3 pt-2 text-xs font-mono border-t border-zinc-900">
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-500">Target Deadline</span>
                      <span className="text-white font-bold">{new Date(project.deadline).toLocaleDateString()}</span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-500">Client Partner</span>
                      <span className="text-white font-bold">{project.client.name || "Client"}</span>
                    </div>

                    {project.payment && (
                      <div className="flex justify-between items-center">
                        <span className="text-zinc-500">Payment Status</span>
                        <span className="text-white font-bold uppercase">{project.payment.status}</span>
                      </div>
                    )}

                    {project.escrow && (
                      <div className="flex justify-between items-center">
                        <span className="text-zinc-500">Escrow Vault</span>
                        <span className="text-white font-bold uppercase">{project.escrow.status}</span>
                      </div>
                    )}
                  </div>
                </div>

                {isOwner && isOpen && (
                  <div className="pt-4 border-t border-zinc-900">
                    <button
                      onClick={handleCancelProject}
                      className="w-full border border-zinc-800 hover:border-zinc-700 text-zinc-500 hover:text-red-400 font-bold text-[9px] uppercase tracking-widest py-2 rounded transition-colors"
                    >
                      Cancel Listing
                    </button>
                  </div>
                )}
              </div>

              {/* Card 2: Custom dynamic Audit Log (mimicking Mockup 4) */}
              <div className="border border-zinc-850 bg-black rounded-lg p-6 space-y-6 text-left">
                <div className="flex justify-between items-center pb-2 border-b border-zinc-900">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-white">Audit Log</h3>
                  <Clock className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                </div>

                {/* Audit Items */}
                <div className="relative border-l border-zinc-900 pl-4 space-y-5 text-[11px] leading-relaxed">
                  <div className="relative">
                    <div className="absolute -left-[21px] top-1.5 w-2 h-2 rounded-full bg-white ring-4 ring-black" />
                    <div className="text-zinc-500 font-mono text-[9px]">Today, 14:15 UTC</div>
                    <div className="font-bold text-white mt-0.5">Escrow state changed to {project.status}</div>
                    <div className="text-zinc-600 font-mono text-[8px] mt-0.5">Hash: 0x{project.id.slice(0, 16)}...</div>
                  </div>

                  {project.status !== "OPEN" && (
                    <div className="relative">
                      <div className="absolute -left-[21px] top-1.5 w-2 h-2 rounded-full bg-zinc-800 ring-4 ring-black" />
                      <div className="text-zinc-500 font-mono text-[9px]">Today, 14:10 UTC</div>
                      <div className="font-bold text-white mt-0.5">Funds secured in Vault Contract.</div>
                      <div className="text-zinc-650 font-mono text-[8px] mt-0.5">Amount: ₹{(project.agreedAmount || project.budget).toLocaleString()}</div>
                    </div>
                  )}

                  <div className="relative">
                    <div className="absolute -left-[21px] top-1.5 w-2 h-2 rounded-full bg-zinc-800 ring-4 ring-black" />
                    <div className="text-zinc-500 font-mono text-[9px]">Today, 14:00 UTC</div>
                    <div className="font-bold text-white mt-0.5">Smart Contract instantiated.</div>
                    <div className="text-zinc-650 font-mono text-[8px] mt-0.5">Initiator: {project.client.name || "Client"}</div>
                  </div>
                </div>

                {/* Print button */}
                <button
                  onClick={() => showSuccess("Immutable ledger logs payload report downloading...")}
                  className="w-full text-center text-[10px] font-bold text-zinc-500 uppercase tracking-widest hover:text-white transition-colors mt-4 pt-4 border-t border-zinc-900 cursor-pointer"
                >
                  Download Full Report (CSV)
                </button>
              </div>

              {/* Chat desk Discussion box */}
              {(isOwner || isFreelancerHired) && project.status !== ProjectStatus.OPEN && (
                <div className="border border-zinc-850 bg-black rounded-lg p-6 space-y-4 text-left">
                  <div className="pb-2 border-b border-zinc-900">
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">Discussion Desk</h3>
                    <p className="text-[9px] text-zinc-500 mt-1 font-light">Participant encrypted communication log.</p>
                  </div>

                  {messageError && (
                    <p className="text-[10px] text-red-400 font-semibold">{messageError}</p>
                  )}

                  <div className="border border-zinc-900 rounded p-3 bg-zinc-950/40 max-h-60 overflow-y-auto space-y-4">
                    {messages.length === 0 ? (
                      <p className="text-[10px] text-zinc-600 italic text-center py-4">No workspace messages sent yet.</p>
                    ) : (
                      messages.map((msg) => {
                        const isMe = msg.senderId === session?.user?.id;
                        return (
                          <div key={msg.id} className="space-y-1 text-[11px]">
                            <div className="flex justify-between items-center text-[8px] font-mono text-zinc-500">
                              <span className="font-bold text-white">{msg.sender?.name || "Participant"}</span>
                              <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                            <div className={`p-2 rounded text-xs ${isMe ? "bg-zinc-900 text-white" : "bg-zinc-950 border border-zinc-900 text-zinc-400"}`}>
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
                      placeholder="Type secure message..."
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      disabled={sendingMessage}
                      className="flex-grow px-3 py-2 bg-black border border-zinc-800 rounded text-xs text-white placeholder-zinc-700 focus:outline-none"
                    />
                    <button
                      type="submit"
                      disabled={sendingMessage || !messageInput.trim()}
                      className="bg-white hover:bg-zinc-200 text-black px-3 py-2 rounded text-[10px] font-bold uppercase tracking-widest disabled:opacity-40"
                    >
                      Send
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Admin Audit History Log (Admin Only) */}
      {project && <AuditHistory entityId={project.id} entityType="Project" />}
    </div>
  );
}
