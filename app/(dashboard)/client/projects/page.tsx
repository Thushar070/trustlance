"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { ProjectStatus } from "@prisma/client";
import { Plus, Briefcase, Calendar, AlertCircle } from "lucide-react";

interface ProjectItem {
  id: string;
  title: string;
  description: string;
  budget: number;
  deadline: string;
  status: ProjectStatus;
  skills: string[];
  createdAt: string;
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

export default function ClientProjectsPage() {
  const { data: session } = useSession();
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

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

      // Trigger list refresh
      setRefreshTrigger((prev) => prev + 1);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Could not cancel project.";
      alert(msg);
    }
  };

  if (loading) {
    return (
      <div className="flex-grow flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 rounded-full border-2 border-slate-200 border-t-[var(--accent)] animate-spin" />
          <p className="text-slate-400 text-sm">Loading your projects...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">Your Posted Projects</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">Manage and track your project escrow lifecycles.</p>
        </div>
        <Link
          href="/client/projects/new"
          className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold rounded-lg text-white bg-[var(--accent)] hover:bg-[var(--accent-hover)] shadow-sm cursor-pointer transition-colors"
        >
          <Plus className="w-4 h-4" />
          Post a Project
        </Link>
      </div>

      {errorMsg && (
        <div className="mb-6 bg-[var(--status-negative-bg)] border border-[var(--status-negative-border)] p-4 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-[var(--status-negative-text)] mt-0.5 flex-shrink-0" />
          <p className="text-sm text-[var(--status-negative-text)] font-medium">{errorMsg}</p>
        </div>
      )}

      {projects.length === 0 ? (
        <div className="bg-white rounded-xl border border-[var(--border)] shadow-sm p-16 text-center">
          <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <Briefcase className="w-6 h-6 text-slate-400" />
          </div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-1">No Projects Found</h2>
          <p className="text-sm text-[var(--text-secondary)] max-w-sm mx-auto mb-6">
            You haven&apos;t posted any freelance project listings yet. Click below to create your first.
          </p>
          <Link
            href="/client/projects/new"
            className="inline-flex items-center gap-1.5 px-5 py-2.5 text-xs font-semibold rounded-lg text-white bg-[var(--accent)] hover:bg-[var(--accent-hover)] shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            Post Your First Project
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-[var(--border)] shadow-sm overflow-hidden">
          <ul className="divide-y divide-[var(--border-subtle)]">
            {projects.map((project) => (
              <li key={project.id} className="group p-6 hover:bg-slate-50/50 transition-colors duration-150">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex-grow min-w-0">
                    <div className="flex flex-wrap items-center gap-2.5 mb-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${getStatusBadgeClass(project.status)}`}>
                        {project.status.replace("_", " ")}
                      </span>
                      <span className="text-xs text-[var(--text-muted)] font-medium flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        Posted {new Date(project.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <Link
                      href={`/projects/${project.id}`}
                      className="text-base font-semibold text-[var(--text-primary)] hover:text-[var(--accent)] transition-colors block mb-1.5 truncate"
                    >
                      {project.title}
                    </Link>
                    <p className="text-sm text-[var(--text-secondary)] line-clamp-2 mb-3 max-w-3xl leading-relaxed">
                      {project.description}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {project.skills.map((s) => (
                        <span key={s} className="bg-slate-100 text-[var(--text-secondary)] text-[10px] px-2 py-0.5 rounded-md font-semibold">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-start sm:items-end justify-between sm:justify-center gap-2 border-t sm:border-t-0 border-[var(--border-subtle)] pt-4 sm:pt-0 flex-shrink-0 sm:min-w-[120px]">
                    <div className="text-right sm:mb-3">
                      <span className="text-[10px] text-[var(--text-muted)] block uppercase font-medium tracking-wider mb-0.5">Budget</span>
                      <span className="text-lg font-bold text-[var(--text-primary)]">₹{project.budget.toLocaleString()}</span>
                    </div>
                    <div className="flex gap-2">
                      <Link
                        href={`/projects/${project.id}`}
                        className="px-3.5 py-1.5 border border-[var(--border)] hover:border-[var(--accent)] text-xs font-semibold rounded-lg text-[var(--text-secondary)] hover:text-[var(--accent)] hover:bg-[var(--accent-light)] transition-colors"
                      >
                        View Details →
                      </Link>
                      {project.status === ProjectStatus.OPEN && (
                        <button
                          onClick={() => handleCancelProject(project.id)}
                          className="px-3 py-1.5 border border-[var(--border)] hover:border-[var(--status-negative-text)] text-xs font-semibold rounded-lg text-slate-500 hover:text-[var(--status-negative-text)] hover:bg-[var(--status-negative-bg)] transition-colors cursor-pointer"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
