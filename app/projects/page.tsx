"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { ProjectStatus } from "@prisma/client";
import { SKILL_GROUPS } from "@/lib/constants/skills";
import {
  Search,
  FolderSearch,
  ArrowLeft,
  ArrowRight,
  SlidersHorizontal,
  X,
  Calendar,
  IndianRupee,
  Clock,
  Briefcase,
  ShieldCheck,
  DollarSign,
  Activity
} from "lucide-react";

interface ProjectItem {
  id: string;
  title: string;
  description: string;
  budget: number;
  deadline: string;
  status: ProjectStatus;
  skills: string[];
  createdAt: string;
  client: {
    name: string | null;
  };
  freelancer?: {
    name: string | null;
  } | null;
  agreedAmount?: number | null;
}

const STATUS_CARD_BORDER: Record<string, string> = {
  OPEN: "border-l-[var(--status-open-text)]",
  ASSIGNED: "border-l-[var(--status-progress-text)]",
  IN_PROGRESS: "border-l-[var(--status-progress-text)]",
  UNDER_REVIEW: "border-l-[var(--status-review-text)]",
  COMPLETED: "border-l-[var(--status-success-text)]",
  CANCELLED: "border-l-[var(--status-negative-text)]",
  CLOSED: "border-l-[var(--status-neutral-text)]",
};

const STATUS_BADGE: Record<string, string> = {
  OPEN: "bg-[var(--status-open-bg)] text-[var(--status-open-text)] border border-[var(--status-open-border)]",
  ASSIGNED: "bg-[var(--status-progress-bg)] text-[var(--status-progress-text)] border border-[var(--status-progress-border)]",
  IN_PROGRESS: "bg-[var(--status-progress-bg)] text-[var(--status-progress-text)] border border-[var(--status-progress-border)]",
  UNDER_REVIEW: "bg-[var(--status-review-bg)] text-[var(--status-review-text)] border border-[var(--status-review-border)]",
  COMPLETED: "bg-[var(--status-success-bg)] text-[var(--status-success-text)] border border-[var(--status-success-border)]",
  CANCELLED: "bg-[var(--status-negative-bg)] text-[var(--status-negative-text)] border border-[var(--status-negative-border)]",
  CLOSED: "bg-[var(--status-neutral-bg)] text-[var(--status-neutral-text)] border border-[var(--status-neutral-border)]",
};

export default function BrowseProjectsPage() {
  const { data: session } = useSession();
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // Tab navigation for Freelancer (Browse vs Dashboard)
  const [currentTab, setCurrentTab] = useState<"BROWSE" | "DASHBOARD">("BROWSE");

  // Hired projects states for Dashboard
  const [hiredProjects, setHiredProjects] = useState<ProjectItem[]>([]);
  const [loadingDashboard, setLoadingDashboard] = useState(false);

  // Filters state
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("OPEN");
  const [minBudget, setMinBudget] = useState<string>("");
  const [maxBudget, setMaxBudget] = useState<string>("");
  const [deadlineBefore, setDeadlineBefore] = useState<string>("");
  const [deadlineAfter, setDeadlineAfter] = useState<string>("");

  // Pagination state
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Fetch Public/Browse Projects
  useEffect(() => {
    if (currentTab !== "BROWSE") return;
    const fetchProjects = async () => {
      setLoading(true);
      try {
        const queryParams = new URLSearchParams();
        if (statusFilter) queryParams.set("status", statusFilter);
        if (selectedSkills.length > 0) queryParams.set("skills", selectedSkills.join(","));
        if (minBudget) queryParams.set("minBudget", minBudget);
        if (maxBudget) queryParams.set("maxBudget", maxBudget);
        if (deadlineBefore) queryParams.set("deadlineBefore", deadlineBefore);
        if (deadlineAfter) queryParams.set("deadlineAfter", deadlineAfter);
        queryParams.set("page", page.toString());
        queryParams.set("limit", "10");

        const response = await fetch(`/api/projects?${queryParams.toString()}`);
        if (!response.ok) throw new Error("Failed to load projects");
        
        const data = await response.json();
        setProjects(data.items || []);
        setTotalPages(data.totalPages || 1);
      } catch {
        setErrorMsg("Error loading projects. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, [currentTab, statusFilter, selectedSkills, page, minBudget, maxBudget, deadlineBefore, deadlineAfter]);

  // Fetch Hired/Dashboard Projects for Freelancer using parallel fetches per status
  useEffect(() => {
    if (currentTab !== "DASHBOARD") return;
    const fetchDashboardData = async () => {
      setLoadingDashboard(true);
      try {
        const statuses = ["ASSIGNED", "IN_PROGRESS", "UNDER_REVIEW", "COMPLETED"];
        const responses = await Promise.all(
          statuses.map((s) =>
            fetch(`/api/projects?status=${s}`).then((r) => {
              if (!r.ok) throw new Error();
              return r.json();
            })
          )
        );
        const allHired = responses.flatMap((r) => r.items || []);
        setHiredProjects(allHired);
      } catch {
        setErrorMsg("Error loading your dashboard details.");
      } finally {
        setLoadingDashboard(false);
      }
    };

    fetchDashboardData();
  }, [currentTab]);

  const toggleSkill = (skill: string) => {
    setPage(1);
    if (selectedSkills.includes(skill)) {
      setSelectedSkills(selectedSkills.filter((s) => s !== skill));
    } else {
      setSelectedSkills([...selectedSkills, skill]);
    }
  };

  const clearFilters = () => {
    setSelectedSkills([]);
    setStatusFilter("OPEN");
    setSearchTerm("");
    setMinBudget("");
    if (maxBudget) setMaxBudget("");
    setDeadlineBefore("");
    setDeadlineAfter("");
    setPage(1);
  };

  const filteredProjects = projects.filter((project) => {
    const term = searchTerm.toLowerCase();
    return (
      project.title.toLowerCase().includes(term) ||
      project.description.toLowerCase().includes(term)
    );
  });

  const activeFilterCount = [
    statusFilter !== "OPEN" ? statusFilter : null,
    ...selectedSkills,
    minBudget,
    maxBudget,
    deadlineBefore,
    deadlineAfter,
  ].filter(Boolean).length;

  // Compute Freelancer Metrics
  const activeContracts = hiredProjects.filter((p) => ["ASSIGNED", "IN_PROGRESS", "UNDER_REVIEW"].includes(p.status));
  const activeContractsCount = activeContracts.length;
  const escrowSecured = activeContracts.reduce((sum, p) => sum + (p.agreedAmount || p.budget), 0);
  const totalEarnedYTD = hiredProjects.filter((p) => p.status === "COMPLETED").reduce((sum, p) => sum + (p.agreedAmount || p.budget), 0);

  // Build Recent Activity dynamically for freelancer
  const recentActivities = hiredProjects
    .flatMap((p) => {
      const acts = [];
      if (p.status !== "OPEN") {
        acts.push({
          id: `hired-${p.id}`,
          title: "Contract Started",
          detail: `Hired by ${p.client.name || "Client"} for ${p.title}`,
          time: new Date(p.createdAt),
          icon: Briefcase,
          iconClass: "bg-blue-500/10 text-blue-500",
        });
      }
      if (p.status === "COMPLETED") {
        acts.push({
          id: `released-${p.id}`,
          title: "Payment Earned",
          detail: `₹${(p.agreedAmount || p.budget).toLocaleString()} released for ${p.title}`,
          time: new Date(p.deadline),
          icon: DollarSign,
          iconClass: "bg-emerald-500/10 text-emerald-500",
        });
      }
      return acts;
    })
    .sort((a, b) => b.time.getTime() - a.time.getTime())
    .slice(0, 5);

  const renderStepper = (status: ProjectStatus) => {
    if (status === "OPEN" || status === "CANCELLED" || status === "CLOSED") return null;

    const steps = [
      { id: "funded", label: "Funded", done: ["ASSIGNED", "IN_PROGRESS", "UNDER_REVIEW", "COMPLETED"].includes(status) },
      { id: "work", label: "Work", done: ["IN_PROGRESS", "UNDER_REVIEW", "COMPLETED"].includes(status) },
      { id: "review", label: "Review", done: ["UNDER_REVIEW", "COMPLETED"].includes(status) },
      { id: "released", label: "Released", done: status === "COMPLETED" },
    ];

    return (
      <div className="flex items-center w-full gap-2 mt-4 px-2">
        {steps.map((step, idx) => (
          <React.Fragment key={step.id}>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                step.done 
                  ? "bg-[var(--status-success-bg)] text-[var(--status-success-text)] border border-[var(--status-success-border)]"
                  : "bg-[var(--surface-subtle)] text-[var(--text-muted)] border border-[var(--border)]"
              }`}>
                {step.done ? "✓" : idx + 1}
              </div>
              <span className={`text-[10px] font-bold tracking-tight ${step.done ? "text-[var(--text-primary)]" : "text-[var(--text-muted)]"}`}>{step.label}</span>
            </div>
            {idx < steps.length - 1 && (
              <div className={`flex-grow h-0.5 border-t-2 border-dashed ${
                steps[idx + 1].done ? "border-[var(--status-success-text)]" : "border-[var(--border)]"
              }`} />
            )}
          </React.Fragment>
        ))}
      </div>
    );
  };

  // ── Filter sidebar content ──
  const filterContent = (
    <>
      <div className="flex justify-between items-center mb-5">
        <div className="flex items-center gap-1.5">
          <SlidersHorizontal className="w-3.5 h-3.5 text-[var(--text-muted)]" />
          <h2 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Filters</h2>
        </div>
        <div className="flex items-center gap-2">
          {activeFilterCount > 0 && (
            <button
              onClick={clearFilters}
              className="text-xs text-[var(--accent)] hover:text-[var(--accent-hover)] font-semibold cursor-pointer transition-colors flex items-center gap-1"
            >
              <X className="w-3 h-3" />
              Clear All
            </button>
          )}
          <button
            onClick={() => setMobileFiltersOpen(false)}
            className="lg:hidden p-1.5 rounded-lg text-[var(--text-muted)] hover:bg-[var(--surface-subtle)] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Status Filter */}
      <div className="mb-5">
        <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">Project Status</label>
        <select
          value={statusFilter}
          onChange={(e) => {
            setPage(1);
            setStatusFilter(e.target.value);
          }}
          className="w-full text-sm px-3 py-2.5 border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 focus:border-[var(--accent)] bg-[var(--input-bg)] text-[var(--text-primary)] transition-all"
        >
          <option value="">All Statuses</option>
          <option value="OPEN">Open (Accepting Proposals)</option>
          <option value="ASSIGNED">Assigned</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="UNDER_REVIEW">Under Review</option>
          <option value="COMPLETED">Completed</option>
          <option value="CANCELLED">Cancelled</option>
          <option value="CLOSED">Closed</option>
        </select>
      </div>

      {/* Budget range filter */}
      <div className="mb-5">
        <label className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
          <IndianRupee className="w-3 h-3" />
          Budget Range
        </label>
        <div className="flex gap-2">
          <input
            type="number"
            placeholder="Min"
            value={minBudget}
            onChange={(e) => {
              setPage(1);
              setMinBudget(e.target.value);
            }}
            className="w-1/2 text-sm px-3 py-2 border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 focus:border-[var(--accent)] bg-[var(--input-bg)] text-[var(--text-primary)] transition-all"
          />
          <input
            type="number"
            placeholder="Max"
            value={maxBudget}
            onChange={(e) => {
              setPage(1);
              setMaxBudget(e.target.value);
            }}
            className="w-1/2 text-sm px-3 py-2 border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 focus:border-[var(--accent)] bg-[var(--input-bg)] text-[var(--text-primary)] transition-all"
          />
        </div>
      </div>

      {/* Deadline filter */}
      <div className="mb-5">
        <label className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
          <Calendar className="w-3 h-3" />
          Deadline
        </label>
        <div className="space-y-2">
          <div>
            <span className="text-[10px] text-[var(--text-muted)] block font-medium mb-1">Due After</span>
            <input
              type="date"
              value={deadlineAfter}
              onChange={(e) => {
                setPage(1);
                setDeadlineAfter(e.target.value);
              }}
              className="w-full text-sm px-3 py-2 border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 focus:border-[var(--accent)] bg-[var(--input-bg)] text-[var(--text-primary)] transition-all"
            />
          </div>
          <div>
            <span className="text-[10px] text-[var(--text-muted)] block font-medium mb-1">Due Before</span>
            <input
              type="date"
              value={deadlineBefore}
              onChange={(e) => {
                setPage(1);
                setDeadlineBefore(e.target.value);
              }}
              className="w-full text-sm px-3 py-2 border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 focus:border-[var(--accent)] bg-[var(--input-bg)] text-[var(--text-primary)] transition-all"
            />
          </div>
        </div>
      </div>

      {/* Skills Filter */}
      <div>
        <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">Required Skills</label>
        {selectedSkills.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {selectedSkills.map((skill) => (
              <button
                key={skill}
                onClick={() => toggleSkill(skill)}
                className="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-full bg-[var(--accent-light)] text-[var(--accent)] font-bold cursor-pointer border border-[var(--accent)]/30 hover:bg-[var(--accent)]/20 transition-colors"
              >
                {skill}
                <X className="w-2.5 h-2.5" />
              </button>
            ))}
          </div>
        )}
        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
          {SKILL_GROUPS.map((group) => (
            <div key={group.category}>
              <h3 className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-1.5">{group.category}</h3>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {group.skills.map((skill) => {
                  const isSelected = selectedSkills.includes(skill);
                  return (
                    <button
                      key={skill}
                      onClick={() => toggleSkill(skill)}
                      className={`text-[10px] px-2 py-1 rounded-md border transition-colors duration-150 cursor-pointer ${
                        isSelected
                          ? "bg-[var(--accent-light)] border-[var(--accent)] text-[var(--accent)] font-bold"
                          : "bg-[var(--surface)] border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--surface-subtle)] hover:border-[var(--text-muted)]"
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
    </>
  );

  if (session && session.user && session.user.role === "CLIENT") {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <div className="bg-[var(--surface)] border border-[var(--border)] p-8 rounded-2xl shadow-sm">
          <FolderSearch className="w-12 h-12 text-[var(--accent)] mx-auto mb-4" />
          <h1 className="text-xl font-black text-[var(--text-primary)]">Client Accounts Do Not Browse Projects</h1>
          <p className="text-xs text-[var(--text-secondary)] mt-2 mb-6 font-medium">
            To hire freelancers and manage your jobs, please view your current project postings or post a new project.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-3">
            <Link
              href="/client/projects"
              className="px-5 py-3 text-xs font-bold uppercase tracking-wider rounded-lg bg-[var(--brand-primary)] text-white hover:bg-[var(--accent-hover)] transition-colors text-center shadow-sm"
            >
              My Projects
            </Link>
            <Link
              href="/client/projects/new"
              className="px-5 py-3 text-xs font-bold uppercase tracking-wider rounded-lg border border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--surface-subtle)] transition-colors text-center"
            >
              Post a Project
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full min-w-0">
      {/* Tab Navigation header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-[var(--border)] pb-4 mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-black text-[var(--text-primary)] tracking-tight">
            {currentTab === "BROWSE" ? "Browse Opportunities" : "Freelancer Workspace"}
          </h1>
          <p className="text-xs font-medium text-[var(--text-secondary)] mt-1">
            {currentTab === "BROWSE" 
              ? "Find professional enterprise contracts and submit proposals securely." 
              : "Track your active contract delivery states and escrow milestones."}
          </p>
        </div>

        {/* Tab switcher */}
        <div className="bg-[var(--surface-subtle)] p-1 rounded-xl border border-[var(--border)] flex items-center gap-1 self-start">
          <button
            onClick={() => {
              setCurrentTab("BROWSE");
              setErrorMsg(null);
            }}
            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
              currentTab === "BROWSE"
                ? "bg-[var(--surface)] text-[var(--text-primary)] shadow-sm border border-[var(--border)]"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            }`}
          >
            Find Work
          </button>
          <button
            onClick={() => {
              setCurrentTab("DASHBOARD");
              setErrorMsg(null);
            }}
            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
              currentTab === "DASHBOARD"
                ? "bg-[var(--surface)] text-[var(--text-primary)] shadow-sm border border-[var(--border)]"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            }`}
          >
            My Active Contracts
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="mb-6 bg-[var(--status-negative-bg)] border border-[var(--status-negative-border)] p-4 rounded-lg">
          <p className="text-sm text-[var(--status-negative-text)] font-semibold">{errorMsg}</p>
        </div>
      )}

      {currentTab === "DASHBOARD" ? (
        /* ── Freelancer Dashboard Tab ── */
        loadingDashboard ? (
          <div className="flex flex-col items-center justify-center min-h-[300px] gap-2">
            <div className="w-6 h-6 rounded-full border-2 border-[var(--border)] border-t-[var(--accent)] animate-spin" />
            <p className="text-[var(--text-muted)] text-xs font-bold uppercase">Loading Dashboard...</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Dashboard metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider block">Active Contracts</span>
                  <span className="text-2xl font-black text-[var(--text-primary)] block mt-1">{activeContractsCount}</span>
                  <span className="text-[10px] font-bold text-emerald-500 block mt-1">✓ Live Engagements</span>
                </div>
                <div className="w-10 h-10 rounded-lg bg-[var(--accent-light)] flex items-center justify-center">
                  <Briefcase className="w-5 h-5 text-[var(--accent)]" />
                </div>
              </div>

              <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5 shadow-sm flex flex-col justify-between">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider block">Escrow Secured</span>
                    <span className="text-2xl font-black text-[var(--text-primary)] block mt-1">₹{escrowSecured.toLocaleString()}</span>
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                    <ShieldCheck className="w-5 h-5 text-amber-500" />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="w-full bg-[var(--border)] h-1.5 rounded-full overflow-hidden">
                    <div className="bg-amber-500 h-full rounded-full" style={{ width: "100%" }} />
                  </div>
                  <span className="text-[9px] font-bold text-[var(--text-muted)] block mt-1">100% FUNDED IN ESCROW</span>
                </div>
              </div>

              <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider block">Total Earned YTD</span>
                  <span className="text-2xl font-black text-[var(--text-primary)] block mt-1">₹{totalEarnedYTD.toLocaleString()}</span>
                  <span className="text-[10px] font-bold text-[var(--text-muted)] block mt-1">Cleared Earnings Ledger</span>
                </div>
                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-emerald-500" />
                </div>
              </div>
            </div>

            {/* Dashboard Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-10 gap-8">
              <div className="lg:col-span-7">
                <h3 className="text-xs font-extrabold uppercase tracking-widest text-[var(--text-muted)] mb-4">My Hired Contracts</h3>
                {hiredProjects.length === 0 ? (
                  <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-16 text-center shadow-sm">
                    <Briefcase className="w-10 h-10 text-[var(--text-muted)] mx-auto mb-4" />
                    <h2 className="text-base font-extrabold text-[var(--text-primary)] mb-1">No Active Contracts</h2>
                    <p className="text-xs text-[var(--text-secondary)] max-w-sm mx-auto mb-6 font-medium">
                      You are not currently hired on any active projects. Switch to the &quot;Find Work&quot; tab to search and submit proposals.
                    </p>
                    <button
                      onClick={() => setCurrentTab("BROWSE")}
                      className="px-5 py-3 text-xs font-bold uppercase tracking-wider rounded-lg text-white bg-[var(--accent)] hover:bg-[var(--accent-hover)] shadow-sm transition-all"
                    >
                      Browse Job Opportunities
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    {hiredProjects.map((project) => {
                      const cfg = STATUS_BADGE[project.status] || STATUS_BADGE.CLOSED;
                      const borderClass = STATUS_CARD_BORDER[project.status] || STATUS_CARD_BORDER.CLOSED;

                      return (
                        <Link
                          key={project.id}
                          href={`/projects/${project.id}`}
                          className={`block bg-[var(--surface)] border border-[var(--border)] border-l-4 ${borderClass} rounded-xl p-5 hover:shadow-md transition-all duration-150`}
                        >
                          <div>
                            <div className="flex justify-between items-start mb-3">
                              <h4 className="text-sm font-extrabold text-[var(--text-primary)] line-clamp-1">{project.title}</h4>
                              <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${cfg}`}>
                                {project.status.replace("_", " ")}
                              </span>
                            </div>

                            <p className="text-xs text-[var(--text-secondary)] mb-4 line-clamp-2 leading-relaxed">{project.description}</p>
                            
                            {renderStepper(project.status)}

                            <div className="bg-[var(--surface-subtle)] border border-[var(--border)] rounded-lg p-3 mt-4 flex items-center justify-between">
                              <div>
                                <span className="block text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Contract Budget</span>
                                <span className="text-xs font-black text-[var(--text-primary)]">₹{(project.agreedAmount || project.budget).toLocaleString()}</span>
                              </div>
                              <div>
                                <span className="block text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Client Corporate</span>
                                <span className="text-xs font-bold text-[var(--text-primary)]">{project.client.name || "Enterprise"}</span>
                              </div>
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Sidebar Activity Feed */}
              <div className="lg:col-span-3">
                <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5 shadow-sm">
                  <h3 className="text-xs font-extrabold uppercase tracking-widest text-[var(--brand-primary)] mb-4 flex items-center gap-1.5">
                    <Activity className="w-4 h-4 text-[var(--accent)] animate-pulse" />
                    <span>Recent activity</span>
                  </h3>

                  {recentActivities.length === 0 ? (
                    <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider py-8 text-center">No recent activity</p>
                  ) : (
                    <div className="flex flex-col gap-4">
                      {recentActivities.map((act) => {
                        const Icon = act.icon;
                        return (
                          <div key={act.id} className="flex gap-3 items-start">
                            <div className={`w-7 h-7 rounded-lg ${act.iconClass} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                              <Icon className="w-3.5 h-3.5" />
                            </div>
                            <div className="min-w-0">
                              <span className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--text-muted)] block leading-tight">{act.title}</span>
                              <span className="text-xs font-bold text-[var(--text-primary)] block line-clamp-2 mt-0.5">{act.detail}</span>
                              <span className="text-[9px] text-[var(--text-muted)] font-medium mt-1 block">
                                {act.time.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )
      ) : (
        /* ── Browse Opportunities Tab ── */
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Desktop Filters Sidebar */}
          <div className="hidden lg:block lg:col-span-1">
            <div className="bg-[var(--surface)] p-5 rounded-xl border border-[var(--border)] shadow-sm sticky top-20">
              {filterContent}
            </div>
          </div>

          {/* Mobile Filters Slide-over */}
          {mobileFiltersOpen && (
            <>
              <div
                className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm lg:hidden"
                onClick={() => setMobileFiltersOpen(false)}
              />
              <div className="fixed inset-y-0 left-0 z-50 w-[85%] max-w-sm bg-[var(--surface)] border-r border-[var(--border)] shadow-xl overflow-y-auto p-5 lg:hidden">
                {filterContent}
              </div>
            </>
          )}

          {/* Projects List Column */}
          <div className="lg:col-span-3 space-y-4">
            {/* Search Input Box */}
            <div className="bg-[var(--surface)] p-3 rounded-xl border border-[var(--border)] shadow-sm flex items-center gap-3">
              <Search className="w-4 h-4 text-[var(--text-muted)] flex-shrink-0" />
              <input
                type="text"
                placeholder="Search by keywords (e.g. Design, Frontend, Writing)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full text-xs font-semibold focus:outline-none bg-transparent text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
              />
            </div>

            {/* Header info */}
            <div className="flex justify-between items-center">
              {!loading && !errorMsg && (
                <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
                  Found {filteredProjects.length} open project{filteredProjects.length !== 1 ? "s" : ""}
                </p>
              )}
              {/* Mobile Filter toggle button */}
              <button
                onClick={() => setMobileFiltersOpen(true)}
                className="lg:hidden inline-flex items-center gap-1.5 px-3 py-2 text-[10px] font-bold uppercase tracking-wider rounded-lg border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)] cursor-pointer"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                Filters
                {activeFilterCount > 0 && (
                  <span className="bg-[var(--accent)] text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full min-w-[15px] text-center ml-1">
                    {activeFilterCount}
                  </span>
                )}
              </button>
            </div>

            {loading ? (
              <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-16 text-center shadow-sm">
                <div className="w-6 h-6 rounded-full border-2 border-[var(--border)] border-t-[var(--accent)] animate-spin mx-auto mb-3" />
                <p className="text-[var(--text-muted)] text-xs font-bold uppercase tracking-wider">Scanning marketplace...</p>
              </div>
            ) : filteredProjects.length === 0 ? (
              <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-16 text-center shadow-sm">
                <div className="w-12 h-12 rounded-xl bg-[var(--surface-subtle)] flex items-center justify-center mx-auto mb-4 border border-[var(--border)]">
                  <FolderSearch className="w-6 h-6 text-[var(--text-muted)]" />
                </div>
                <h2 className="text-base font-extrabold text-[var(--text-primary)] mb-1">No Projects Match Your Search</h2>
                <p className="text-xs text-[var(--text-secondary)] max-w-sm mx-auto mb-4 font-medium">
                  Try clearing some filters or using different keywords to explore other opportunities.
                </p>
                <button
                  onClick={clearFilters}
                  className="text-xs font-bold uppercase tracking-wider text-[var(--accent)] hover:text-[var(--accent-hover)] cursor-pointer"
                >
                  Clear all filters
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredProjects.map((project) => {
                  const borderClass = STATUS_CARD_BORDER[project.status] || STATUS_CARD_BORDER.CLOSED;
                  const badgeClass = STATUS_BADGE[project.status] || STATUS_BADGE.CLOSED;

                  return (
                    <div
                      key={project.id}
                      className={`bg-[var(--surface)] border border-[var(--border)] rounded-xl border-l-4 ${borderClass} shadow-sm hover:shadow-md transition-all duration-150 overflow-hidden`}
                    >
                      <div className="p-5 sm:p-6">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-3">
                          <div className="flex-grow min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-1.5">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${badgeClass}`}>
                                {project.status.replace("_", " ")}
                              </span>
                            </div>
                            <Link
                              href={`/projects/${project.id}`}
                              className="text-sm font-extrabold text-[var(--text-primary)] hover:text-[var(--accent)] transition-colors block mb-0.5 line-clamp-1"
                            >
                              {project.title}
                            </Link>
                            <span className="text-[10px] font-semibold text-[var(--text-muted)] flex items-center gap-1.5">
                              {project.client.name && <>{project.client.name} · </>}
                              <Clock className="w-3.5 h-3.5 inline text-[var(--text-muted)]" />
                              Posted {new Date(project.createdAt).toLocaleDateString()}
                            </span>
                          </div>

                          <div className="flex-shrink-0 text-left sm:text-right">
                            <span className="text-[9px] text-[var(--accent)] block uppercase font-bold tracking-wider mb-0.5">Fixed Budget</span>
                            <span className="text-sm font-black text-[var(--text-primary)]">₹{project.budget.toLocaleString()}</span>
                          </div>
                        </div>

                        <p className="text-xs text-[var(--text-secondary)] line-clamp-2 mb-4 leading-relaxed font-medium">
                          {project.description}
                        </p>

                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-3 border-t border-[var(--border-subtle)]">
                          <div className="flex flex-wrap gap-1.5">
                            {project.skills.map((s) => (
                              <span key={s} className="bg-[var(--surface-subtle)] text-[var(--text-secondary)] text-[9px] px-2.5 py-1 rounded font-bold border border-[var(--border)] uppercase tracking-wide">
                                {s}
                              </span>
                            ))}
                          </div>
                          <Link
                            href={`/projects/${project.id}`}
                            className="inline-flex items-center gap-1.5 px-4 py-2 border border-[var(--border)] hover:border-[var(--accent)] text-[10px] font-bold uppercase tracking-wider rounded-lg text-[var(--text-secondary)] hover:text-[var(--accent)] hover:bg-[var(--accent-light)] transition-all flex-shrink-0"
                          >
                            <span>View Details</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex justify-center items-center gap-2 pt-4">
                    <button
                      disabled={page === 1}
                      onClick={() => setPage(page - 1)}
                      className="w-9 h-9 rounded-lg border border-[var(--border)] hover:bg-[var(--surface-subtle)] disabled:opacity-40 cursor-pointer flex items-center justify-center text-[var(--text-secondary)] transition-colors"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                      .reduce<(number | string)[]>((acc, p, i, arr) => {
                        if (i > 0 && typeof arr[i - 1] === "number" && (p as number) - (arr[i - 1] as number) > 1) {
                          acc.push("...");
                        }
                        acc.push(p);
                        return acc;
                      }, [])
                      .map((item, idx) =>
                        item === "..." ? (
                          <span key={`dots-${idx}`} className="px-1 text-[var(--text-muted)] font-bold">…</span>
                        ) : (
                          <button
                            key={item}
                            onClick={() => setPage(item as number)}
                            className={`w-9 h-9 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                              page === item
                                ? "bg-[var(--accent)] text-white shadow-sm"
                                : "border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)]"
                            }`}
                          >
                            {item}
                          </button>
                        )
                      )}
                    <button
                      disabled={page === totalPages}
                      onClick={() => setPage(page + 1)}
                      className="w-9 h-9 rounded-lg border border-[var(--border)] hover:bg-[var(--surface-subtle)] disabled:opacity-40 cursor-pointer flex items-center justify-center text-[var(--text-secondary)] transition-colors"
                    >
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
