"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { ProjectStatus } from "@prisma/client";
import { Plus, Briefcase, Calendar, AlertCircle, Clock, ShieldCheck, DollarSign, Activity, FileText } from "lucide-react";

interface ProjectItem {
  id: string;
  title: string;
  description: string;
  budget: number;
  deadline: string;
  status: ProjectStatus;
  skills: string[];
  createdAt: string;
  freelancer?: {
    name: string | null;
  } | null;
  agreedAmount?: number | null;
  _count?: {
    proposals: number;
  };
}

const STATUS_CONFIG: Record<string, { label: string; badgeClass: string; borderColor: string }> = {
  OPEN: {
    label: "OPEN",
    badgeClass: "bg-[var(--status-open-bg)] text-[var(--status-open-text)] border border-[var(--status-open-border)]",
    borderColor: "border-l-[var(--status-open-text)]",
  },
  ASSIGNED: {
    label: "ACTIVE",
    badgeClass: "bg-[var(--status-progress-bg)] text-[var(--status-progress-text)] border border-[var(--status-progress-border)]",
    borderColor: "border-l-[var(--status-progress-text)]",
  },
  IN_PROGRESS: {
    label: "IN PROGRESS",
    badgeClass: "bg-[var(--status-progress-bg)] text-[var(--status-progress-text)] border border-[var(--status-progress-border)]",
    borderColor: "border-l-[var(--status-progress-text)]",
  },
  UNDER_REVIEW: {
    label: "UNDER REVIEW",
    badgeClass: "bg-[var(--status-review-bg)] text-[var(--status-review-text)] border border-[var(--status-review-border)]",
    borderColor: "border-l-[var(--status-review-text)]",
  },
  COMPLETED: {
    label: "COMPLETED",
    badgeClass: "bg-[var(--status-success-bg)] text-[var(--status-success-text)] border border-[var(--status-success-border)]",
    borderColor: "border-l-[var(--status-success-text)]",
  },
  CANCELLED: {
    label: "CANCELLED",
    badgeClass: "bg-[var(--status-negative-bg)] text-[var(--status-negative-text)] border border-[var(--status-negative-border)]",
    borderColor: "border-l-[var(--status-negative-text)]",
  },
  CLOSED: {
    label: "CLOSED",
    badgeClass: "bg-[var(--status-neutral-bg)] text-[var(--status-neutral-text)] border border-[var(--status-neutral-border)]",
    borderColor: "border-l-[var(--status-neutral-text)]",
  },
};

const TABS = [
  { key: "ALL", label: "All" },
  { key: "OPEN", label: "Open" },
  { key: "ACTIVE", label: "Active Contracts" },
  { key: "COMPLETED", label: "Completed" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function ClientProjectsPage() {
  const { data: session } = useSession();
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [activeTab, setActiveTab] = useState<TabKey>("ALL");

  useEffect(() => {
    const fetchClientProjects = async () => {
      if (!session?.user?.id) return;
      try {
        const response = await fetch(`/api/projects?clientId=${session.user.id}`);
        if (!response.ok) throw new Error("Failed to fetch projects");
        const data = await response.json();
        setProjects(data.items || []);
      } catch {
        setErrorMsg("Error loading your projects. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    if (session?.user?.id) {
      fetchClientProjects();
    }
  }, [session?.user?.id, refreshTrigger]);

  const handleCancelProject = async (projectId: string) => {
    if (!confirm("Are you sure you want to cancel this project? This action is permanent.")) return;
    try {
      const response = await fetch(`/api/projects/${projectId}`, {
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

  const filteredProjects = projects.filter((p) => {
    if (activeTab === "ALL") return true;
    if (activeTab === "OPEN") return p.status === "OPEN";
    if (activeTab === "ACTIVE") return ["ASSIGNED", "IN_PROGRESS", "UNDER_REVIEW"].includes(p.status);
    if (activeTab === "COMPLETED") return p.status === "COMPLETED";
    return true;
  });

  const isTerminal = (s: ProjectStatus) => ["COMPLETED", "CANCELLED", "CLOSED"].includes(s);

  // Compute Metrics using REAL data
  const activeContracts = projects.filter((p) => ["ASSIGNED", "IN_PROGRESS", "UNDER_REVIEW"].includes(p.status));
  const activeProjectsCount = activeContracts.length;
  
  const fundsInEscrow = activeContracts.reduce((sum, p) => sum + (p.agreedAmount || p.budget), 0);
  const totalSpentYTD = projects.filter((p) => p.status === "COMPLETED").reduce((sum, p) => sum + (p.agreedAmount || p.budget), 0);

  // Build Recent Activity dynamically from projects
  const recentActivities = projects
    .flatMap((p) => {
      const acts = [
        {
          id: `created-${p.id}`,
          title: "Project Posted",
          detail: p.title,
          time: new Date(p.createdAt),
          icon: FileText,
          iconClass: "bg-blue-500/10 text-blue-500",
        },
      ];
      if (p.status !== "OPEN") {
        acts.push({
          id: `assigned-${p.id}`,
          title: "Freelancer Assigned",
          detail: `${p.freelancer?.name || "Freelancer"} hired for ${p.title}`,
          time: new Date(p.createdAt), // Approximate assigned time
          icon: ShieldCheck,
          iconClass: "bg-emerald-500/10 text-emerald-500",
        });
      }
      if (p.status === "COMPLETED") {
        acts.push({
          id: `completed-${p.id}`,
          title: "Funds Released",
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

  if (loading) {
    return (
      <div className="flex-grow flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 rounded-full border-2 border-[var(--border)] border-t-[var(--accent)] animate-spin" />
          <p className="text-[var(--text-muted)] text-sm font-medium">Loading Workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full min-w-0">
      {/* Title & Actions Row */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-black text-[var(--text-primary)] tracking-tight">Client Workspace</h1>
          <p className="text-xs font-medium text-[var(--text-secondary)] mt-1">Manage corporate contracts and milestone payments securely.</p>
        </div>
        <Link
          href="/client/projects/new"
          className="inline-flex items-center gap-1.5 px-5 py-3 text-xs font-bold uppercase tracking-wider rounded-lg text-white bg-[var(--brand-primary)] hover:bg-[var(--accent-hover)] shadow-sm cursor-pointer transition-colors"
        >
          <Plus className="w-4 h-4" />
          Post New Project
        </Link>
      </div>

      {errorMsg && (
        <div className="mb-6 bg-[var(--status-negative-bg)] border border-[var(--status-negative-border)] p-4 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-[var(--status-negative-text)] mt-0.5 flex-shrink-0" />
          <p className="text-sm text-[var(--status-negative-text)] font-semibold">{errorMsg}</p>
        </div>
      )}

      {/* Metrics Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider block">Active Contracts</span>
            <span className="text-2xl font-black text-[var(--text-primary)] block mt-1">{activeProjectsCount}</span>
            <span className="text-[10px] font-bold text-emerald-500 block mt-1">✓ Verified Status</span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-[var(--accent-light)] flex items-center justify-center">
            <Briefcase className="w-5 h-5 text-[var(--accent)]" />
          </div>
        </div>

        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider block">Funds in Escrow</span>
              <span className="text-2xl font-black text-[var(--text-primary)] block mt-1">₹{fundsInEscrow.toLocaleString()}</span>
            </div>
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-amber-500" />
            </div>
          </div>
          <div className="mt-3">
            <div className="w-full bg-[var(--border)] h-1.5 rounded-full overflow-hidden">
              <div className="bg-amber-500 h-full rounded-full" style={{ width: "100%" }} />
            </div>
            <span className="text-[9px] font-bold text-[var(--text-muted)] block mt-1">100% SECURELY ALLOCATED</span>
          </div>
        </div>

        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider block">Total Spent YTD</span>
            <span className="text-2xl font-black text-[var(--text-primary)] block mt-1">₹{totalSpentYTD.toLocaleString()}</span>
            <span className="text-[10px] font-bold text-[var(--text-muted)] block mt-1">Released Milestone Payments</span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
            <DollarSign className="w-5 h-5 text-emerald-500" />
          </div>
        </div>
      </div>

      {/* Main Grid Content */}
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-8">
        {/* Left Column: Projects List */}
        <div className="lg:col-span-7">
          {/* Tabs */}
          <div className="flex items-center gap-1 mb-6 border-b border-[var(--border)]">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer border-b-2 -mb-px ${
                  activeTab === tab.key
                    ? "border-[var(--accent)] text-[var(--accent)]"
                    : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {filteredProjects.length === 0 ? (
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-16 text-center shadow-sm">
              <div className="w-12 h-12 rounded-xl bg-[var(--surface-subtle)] flex items-center justify-center mx-auto mb-4 border border-[var(--border)]">
                <Briefcase className="w-6 h-6 text-[var(--text-muted)]" />
              </div>
              <h2 className="text-base font-extrabold text-[var(--text-primary)] mb-1">No Projects Found</h2>
              <p className="text-xs text-[var(--text-secondary)] max-w-sm mx-auto mb-6">
                {activeTab === "ALL"
                  ? "You haven't posted any freelance project listings yet. Click below to create your first."
                  : `No projects match the "${TABS.find((t) => t.key === activeTab)?.label}" filter.`}
              </p>
              {activeTab === "ALL" && (
                <Link
                  href="/client/projects/new"
                  className="inline-flex items-center gap-1.5 px-5 py-3 text-xs font-bold uppercase tracking-wider rounded-lg text-white bg-[var(--accent)] hover:bg-[var(--accent-hover)] shadow-sm transition-colors"
                >
                  Post Your First Project
                </Link>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {filteredProjects.map((project) => {
                const cfg = STATUS_CONFIG[project.status] || STATUS_CONFIG.CLOSED;
                const terminal = isTerminal(project.status);
                const proposalCount = project._count?.proposals ?? 0;

                return (
                  <Link
                    key={project.id}
                    href={`/projects/${project.id}`}
                    className={`block bg-[var(--surface)] border border-[var(--border)] border-l-4 ${cfg.borderColor} rounded-xl p-5 hover:shadow-md transition-all duration-150`}
                  >
                    <div>
                      {/* Title + Status Badge */}
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <h3 className="text-sm font-extrabold text-[var(--text-primary)] line-clamp-1 flex-grow">
                          {project.title}
                        </h3>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider flex-shrink-0 ${cfg.badgeClass}`}>
                          {cfg.label}
                        </span>
                      </div>

                      {/* Description */}
                      <p className="text-xs text-[var(--text-secondary)] line-clamp-2 mb-4 leading-relaxed">
                        {project.description}
                      </p>

                      {/* Stepper for active contract projects */}
                      {renderStepper(project.status)}

                      {/* Statistics box */}
                      <div className="bg-[var(--surface-subtle)] rounded-lg p-3 flex flex-wrap items-center justify-between gap-4 mt-4 border border-[var(--border)]">
                        {terminal ? (
                          <>
                            <div>
                              <span className="block text-[9px] text-[var(--text-muted)] uppercase font-bold tracking-wider mb-0.5">Paid</span>
                              <span className="text-xs font-black text-[var(--text-primary)]">₹{(project.agreedAmount || project.budget).toLocaleString()}</span>
                            </div>
                            <div>
                              <span className="block text-[9px] text-[var(--text-muted)] uppercase font-bold tracking-wider mb-0.5">Completed Date</span>
                              <span className="text-xs font-semibold text-[var(--text-primary)] flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                                {new Date(project.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                              </span>
                            </div>
                          </>
                        ) : (
                          <>
                            <div>
                              <span className="block text-[9px] text-[var(--text-muted)] uppercase font-bold tracking-wider mb-0.5">Budget</span>
                              <span className="text-xs font-black text-[var(--text-primary)]">₹{project.budget.toLocaleString()}</span>
                            </div>
                            <div>
                              <span className="block text-[9px] text-[var(--text-muted)] uppercase font-bold tracking-wider mb-0.5">Proposals Received</span>
                              <span className="text-xs font-bold text-[var(--text-primary)]">{proposalCount}</span>
                            </div>
                            <div>
                              <span className="block text-[9px] text-[var(--text-muted)] uppercase font-bold tracking-wider mb-0.5">Deadline</span>
                              <span className="text-xs font-semibold text-[var(--text-primary)] flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                                {new Date(project.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                              </span>
                            </div>
                          </>
                        )}
                      </div>

                      {/* Footer Row */}
                      <div className="flex items-center justify-between mt-4 pt-3 border-t border-[var(--border-subtle)]">
                        {project.freelancer?.name ? (
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-[var(--accent-light)] flex items-center justify-center text-[var(--accent)] text-[10px] font-black uppercase">
                              {project.freelancer.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <span className="text-[11px] font-bold text-[var(--text-primary)] block leading-tight">{project.freelancer.name}</span>
                              <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Hired Specialist</span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-[10px] font-semibold text-[var(--text-muted)] flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Posted {new Date(project.createdAt).toLocaleDateString()}
                          </span>
                        )}

                        {project.status === ProjectStatus.OPEN && (
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleCancelProject(project.id);
                            }}
                            className="px-3 py-1.5 border border-[var(--border)] hover:border-[var(--status-negative-text)] text-[10px] font-bold uppercase tracking-wider rounded-lg text-[var(--text-muted)] hover:text-[var(--status-negative-text)] hover:bg-[var(--status-negative-bg)] transition-colors cursor-pointer"
                          >
                            Cancel Project
                          </button>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Activity Feed */}
        <div className="lg:col-span-3">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5 shadow-sm">
            <h3 className="text-xs font-extrabold uppercase tracking-widest text-[var(--brand-primary)] mb-4 flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-[var(--accent)] animate-pulse" />
              <span>Recent activity</span>
            </h3>

            {recentActivities.length === 0 ? (
              <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider py-8 text-center">No recent records</p>
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
  );
}
