"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { ProjectStatus } from "@prisma/client";
import { Plus, Briefcase, Calendar, AlertCircle, Clock } from "lucide-react";

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
    badgeClass: "bg-[var(--status-open-bg)] text-[var(--status-open-text)]",
    borderColor: "border-l-[var(--status-open-text)]",
  },
  ASSIGNED: {
    label: "ACTIVE",
    badgeClass: "bg-[var(--status-progress-bg)] text-[var(--status-progress-text)]",
    borderColor: "border-l-[var(--status-progress-text)]",
  },
  IN_PROGRESS: {
    label: "IN PROGRESS",
    badgeClass: "bg-[var(--status-progress-bg)] text-[var(--status-progress-text)]",
    borderColor: "border-l-[var(--status-progress-text)]",
  },
  UNDER_REVIEW: {
    label: "UNDER REVIEW",
    badgeClass: "bg-[var(--status-review-bg)] text-[var(--status-review-text)]",
    borderColor: "border-l-[var(--status-review-text)]",
  },
  COMPLETED: {
    label: "COMPLETED",
    badgeClass: "bg-[var(--status-success-bg)] text-[var(--status-success-text)]",
    borderColor: "border-l-[var(--status-success-text)]",
  },
  CANCELLED: {
    label: "CANCELLED",
    badgeClass: "bg-[var(--status-negative-bg)] text-[var(--status-negative-text)]",
    borderColor: "border-l-[var(--status-negative-text)]",
  },
  CLOSED: {
    label: "CLOSED",
    badgeClass: "bg-[var(--status-neutral-bg)] text-[var(--status-neutral-text)]",
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

  if (loading) {
    return (
      <div className="flex-grow flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 rounded-full border-2 border-[var(--border)] border-t-[var(--accent)] animate-spin" />
          <p className="text-[var(--text-muted)] text-sm">Loading your projects...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">My Projects</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">Manage and track your active freelance engagements.</p>
        </div>
        <Link
          href="/client/projects/new"
          className="inline-flex items-center gap-1.5 px-5 py-2.5 text-sm font-bold rounded-lg text-white bg-[var(--accent)] hover:bg-[var(--accent-hover)] shadow-sm cursor-pointer transition-colors"
        >
          <Plus className="w-4 h-4" />
          Post New Project
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-6 border-b border-[var(--border)]">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2.5 text-sm font-semibold transition-colors cursor-pointer border-b-2 -mb-px ${
              activeTab === tab.key
                ? "border-[var(--accent)] text-[var(--accent)]"
                : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {errorMsg && (
        <div className="mb-6 bg-[var(--status-negative-bg)] border border-[var(--status-negative-border)] p-4 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-[var(--status-negative-text)] mt-0.5 flex-shrink-0" />
          <p className="text-sm text-[var(--status-negative-text)] font-medium">{errorMsg}</p>
        </div>
      )}

      {filteredProjects.length === 0 ? (
        <div className="bg-[var(--surface)] rounded-2xl shadow-[var(--card-shadow)] p-16 text-center">
          <div className="w-12 h-12 rounded-xl bg-[var(--surface-subtle)] flex items-center justify-center mx-auto mb-4 border border-[var(--border)]">
            <Briefcase className="w-6 h-6 text-[var(--text-muted)]" />
          </div>
          <h2 className="text-lg font-bold text-[var(--text-primary)] mb-1">No Projects Found</h2>
          <p className="text-sm text-[var(--text-secondary)] max-w-sm mx-auto mb-6">
            {activeTab === "ALL"
              ? "You haven't posted any freelance project listings yet. Click below to create your first."
              : `No projects match the "${TABS.find((t) => t.key === activeTab)?.label}" filter.`}
          </p>
          {activeTab === "ALL" && (
            <Link
              href="/client/projects/new"
              className="inline-flex items-center gap-1.5 px-5 py-2.5 text-sm font-bold rounded-lg text-white bg-[var(--accent)] hover:bg-[var(--accent-hover)] shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              Post Your First Project
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {filteredProjects.map((project) => {
            const cfg = STATUS_CONFIG[project.status] || STATUS_CONFIG.CLOSED;
            const terminal = isTerminal(project.status);
            const proposalCount = project._count?.proposals ?? 0;

            return (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className={`block bg-[var(--surface)] rounded-2xl shadow-[var(--card-shadow)] hover:shadow-[var(--card-shadow-hover)] transition-shadow duration-200 border-l-4 ${cfg.borderColor} overflow-hidden`}
              >
                <div className="p-5 sm:p-6">
                  {/* Title + Badge */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <h3 className="text-base font-bold text-[var(--text-primary)] leading-snug line-clamp-2 flex-grow">
                      {project.title}
                    </h3>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex-shrink-0 ${cfg.badgeClass}`}>
                      {cfg.label}
                    </span>
                  </div>

                  {/* Description */}
                  <p className="text-sm text-[var(--text-secondary)] line-clamp-2 mb-4 leading-relaxed">
                    {project.description}
                  </p>

                  {/* Stat Block Row */}
                  <div className="bg-[var(--surface-subtle)] rounded-xl p-3.5 flex items-center gap-6 mb-4 border border-[var(--border)]">
                    {terminal ? (
                      <>
                        <div>
                          <span className="block text-[10px] text-[var(--text-muted)] uppercase font-semibold tracking-wider mb-0.5">Paid</span>
                          <span className="text-base font-bold text-[var(--text-primary)]">₹{(project.agreedAmount || project.budget).toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="block text-[10px] text-[var(--text-muted)] uppercase font-semibold tracking-wider mb-0.5">Completed On</span>
                          <span className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-[var(--text-muted)]" />
                            {new Date(project.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          </span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
                          <span className="block text-[10px] text-[var(--text-muted)] uppercase font-semibold tracking-wider mb-0.5">Budget</span>
                          <span className="text-base font-bold text-[var(--text-primary)]">₹{project.budget.toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="block text-[10px] text-[var(--text-muted)] uppercase font-semibold tracking-wider mb-0.5">Proposals</span>
                          <span className="text-sm font-bold text-[var(--text-primary)]">{proposalCount}</span>
                        </div>
                        <div>
                          <span className="block text-[10px] text-[var(--text-muted)] uppercase font-semibold tracking-wider mb-0.5">Deadline</span>
                          <span className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-[var(--text-muted)]" />
                            {new Date(project.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          </span>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between">
                    {project.freelancer?.name ? (
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-[var(--accent-light)] flex items-center justify-center text-[var(--accent)] text-xs font-bold">
                          {project.freelancer.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <span className="text-xs font-semibold text-[var(--text-primary)] block leading-tight">{project.freelancer.name}</span>
                          <span className="text-[10px] text-[var(--text-muted)]">Assigned Freelancer</span>
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs text-[var(--text-muted)] flex items-center gap-1">
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
                        className="px-3 py-1.5 border border-[var(--border)] hover:border-[var(--status-negative-text)] text-xs font-semibold rounded-lg text-[var(--text-muted)] hover:text-[var(--status-negative-text)] hover:bg-[var(--status-negative-bg)] transition-colors cursor-pointer"
                      >
                        Cancel
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
  );
}
