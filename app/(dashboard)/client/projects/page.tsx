"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { ProjectStatus } from "@prisma/client";
import {
  Plus,
  Briefcase,
  AlertCircle,
  Clock,
  Filter,
  DollarSign,
  ChevronRight,
  ShieldCheck,
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
  freelancer?: {
    name: string | null;
  } | null;
  agreedAmount?: number | null;
  _count?: {
    proposals: number;
  };
}

const TABS = [
  { key: "ALL", label: "All Contracts" },
  { key: "OPEN", label: "Open Bids" },
  { key: "ACTIVE", label: "Active" },
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
        setErrorMsg("Error loading projects. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    if (session?.user?.id) {
      fetchClientProjects();
    }
  }, [session?.user?.id, refreshTrigger]);

  const filteredProjects = projects.filter((p) => {
    if (activeTab === "ALL") return true;
    if (activeTab === "OPEN") return p.status === "OPEN";
    if (activeTab === "ACTIVE") return ["ASSIGNED", "IN_PROGRESS", "UNDER_REVIEW"].includes(p.status);
    if (activeTab === "COMPLETED") return p.status === "COMPLETED";
    return true;
  });

  // Calculate high-fidelity Metrics
  const activeContracts = projects.filter((p) => ["ASSIGNED", "IN_PROGRESS", "UNDER_REVIEW"].includes(p.status));
  const activeProjectsCount = activeContracts.length;
  const fundsInEscrow = activeContracts.reduce((sum, p) => sum + (p.agreedAmount || p.budget), 0);
  const pendingSubmissionsCount = projects.filter((p) => p.status === "UNDER_REVIEW").length;

  // Format Escrow funds
  const formatEscrow = (amount: number) => {
    if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)}Cr`;
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)}L`;
    return `₹${amount.toLocaleString()}`;
  };

  const getStatusBadge = (status: ProjectStatus) => {
    switch (status) {
      case "OPEN":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[var(--status-open-bg)] border border-[var(--status-open-border)] text-[10px] font-bold text-[var(--status-open-text)] uppercase tracking-wider">
            ● Open
          </span>
        );
      case "UNDER_REVIEW":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[var(--status-review-bg)] border border-[var(--status-review-border)] text-[10px] font-bold text-[var(--status-review-text)] uppercase tracking-wider">
            Review Pending
          </span>
        );
      case "ASSIGNED":
      case "IN_PROGRESS":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[var(--status-success-bg)] border border-[var(--status-success-border)] text-[10px] font-bold text-[var(--status-success-text)] uppercase tracking-wider">
            On Track
          </span>
        );
      case "COMPLETED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[var(--status-success-bg)] border border-[var(--status-success-border)] text-[10px] font-bold text-[var(--status-success-text)] uppercase tracking-wider">
            Completed
          </span>
        );
      case "CANCELLED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[var(--status-negative-bg)] border border-[var(--status-negative-border)] text-[10px] font-bold text-[var(--status-negative-text)] uppercase tracking-wider">
            Blocked
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[var(--status-neutral-bg)] border border-[var(--status-neutral-border)] text-[10px] font-bold text-[var(--status-neutral-text)] uppercase tracking-wider">
            Closed
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="flex-grow flex items-center justify-center min-h-[350px]">
        <div className="w-5 h-5 rounded-full border-2 border-zinc-800 border-t-white animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-10 w-full min-w-0">
      {/* Upper Dashboard Header Row */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">Enterprise Dashboard</h1>
          <p className="text-[11px] text-[var(--text-muted)] mt-0.5">Corporate contract portfolio oversight and automated clearing systems.</p>
        </div>
        <Link
          href="/client/projects/new"
          className="inline-flex items-center gap-1.5 bg-[var(--text-primary)] hover:bg-[var(--text-muted)] text-[var(--background)] font-bold text-xs uppercase tracking-widest px-4 py-2.5 rounded-full transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Post Project</span>
        </Link>
      </div>

      {errorMsg && (
        <div className="bg-red-950/20 border border-red-900/50 p-4 rounded text-xs flex items-start gap-2.5 text-red-400 animate-fadeIn">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <p className="font-semibold">{errorMsg}</p>
        </div>
      )}

      {/* 3 Metrics Cards (Reference Mockup 3) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Metric 1 */}
        <div className="border border-[var(--border)] bg-[var(--surface-elevated)] p-6 rounded-lg flex flex-col justify-between h-32">
          <div className="flex justify-between items-center text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">
            <span>Total Active Projects</span>
            <Briefcase className="w-4 h-4 text-[var(--text-muted)] opacity-60" />
          </div>
          <div className="space-y-1">
            <div className="text-3xl font-bold tracking-tight text-[var(--text-primary)]">{activeProjectsCount}</div>
            <div className="text-[9px] text-[var(--text-muted)] font-medium">↑ 2 vs last month</div>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="border border-[var(--border)] bg-[var(--surface-elevated)] p-6 rounded-lg flex flex-col justify-between h-32">
          <div className="flex justify-between items-center text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">
            <span>Funds in Escrow</span>
            <span className="text-[var(--text-muted)] font-mono">₹</span>
          </div>
          <div className="space-y-1">
            <div className="text-3xl font-bold tracking-tight text-[var(--text-primary)]">{formatEscrow(fundsInEscrow)}</div>
            <div className="text-[9px] text-[var(--text-muted)] font-medium">Allocated across {activeProjectsCount} vaults</div>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="border border-[var(--border)] bg-[var(--surface-elevated)] p-6 rounded-lg flex flex-col justify-between h-32">
          <div className="flex justify-between items-center text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">
            <span>Pending Submissions</span>
            <Clock className="w-4 h-4 text-[var(--text-muted)] opacity-60" />
          </div>
          <div className="space-y-1">
            <div className="text-3xl font-bold tracking-tight text-[var(--text-primary)] flex items-center gap-1.5">
              <span>{pendingSubmissionsCount}</span>
              {pendingSubmissionsCount > 0 && <span className="w-2.5 h-2.5 rounded-full bg-white" />}
            </div>
            <div className="text-[9px] text-[var(--text-muted)] font-medium">Requires review</div>
          </div>
        </div>
      </div>

      {/* Main Table Segment (Reference Mockup 3 style) */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--text-primary)]">Active Projects</h2>
          
          <div className="flex items-center gap-3">
            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 p-0.5 bg-[var(--surface-subtle)] border border-[var(--border-subtle)] rounded-lg">
              {TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-3 py-1.5 rounded text-[9px] font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                    activeTab === tab.key
                      ? "bg-[var(--surface-elevated)] text-[var(--text-primary)] border border-[var(--border-subtle)]"
                      : "text-[var(--text-muted)] hover:text-[var(--text-primary)] bg-transparent border border-transparent"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <button className="inline-flex items-center gap-1.5 border border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--text-muted)] px-3 py-2 rounded-lg text-[9px] font-bold uppercase tracking-wider cursor-pointer">
              <Filter className="w-3 h-3" />
              <span>Filter</span>
            </button>
          </div>
        </div>

        {/* Dense Table wrapper for Desktop & stacked card wrapper for mobile */}
        {filteredProjects.length === 0 ? (
          <div className="border border-[var(--border)] rounded-lg p-16 text-center">
            <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">No matching contracts found</p>
          </div>
        ) : (
          <>
            {/* Desktop Table view */}
            <div className="hidden sm:block border border-[var(--border)] bg-[var(--surface)] rounded-lg overflow-hidden">
              <table className="w-full text-left border-collapse text-[11px] leading-tight">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--surface-subtle)] text-[var(--text-muted)] font-mono uppercase tracking-widest">
                    <th className="py-3.5 px-4 font-medium">Project Name</th>
                    <th className="py-3.5 px-4 font-medium">Freelancer</th>
                    <th className="py-3.5 px-4 font-medium">Status</th>
                    <th className="py-3.5 px-4 font-medium">Budget</th>
                    <th className="py-3.5 px-4 font-medium">Next Milestone / Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)] text-[var(--text-secondary)] font-medium">
                  {filteredProjects.map((project) => (
                    <tr key={project.id} className="hover:bg-[var(--surface-subtle)] transition-colors">
                      <td className="py-4 px-4 font-bold text-[var(--text-primary)]">
                        <Link href={`/projects/${project.id}`} className="hover:underline flex items-center gap-1.5">
                          {project.title}
                          <ChevronRight className="w-3 h-3 text-[var(--text-muted)]" />
                        </Link>
                      </td>
                      <td className="py-4 px-4 font-mono">
                        {project.freelancer?.name || "Pending Assignment"}
                      </td>
                      <td className="py-4 px-4">
                        {getStatusBadge(project.status)}
                      </td>
                      <td className="py-4 px-4 font-mono font-bold text-[var(--text-primary)]">
                        ₹{(project.agreedAmount || project.budget).toLocaleString()}
                      </td>
                      <td className="py-4 px-4 text-[10px] font-mono text-[var(--text-muted)]">
                        {project.status === "OPEN" && `Review ${project._count?.proposals || 0} Proposals`}
                        {project.status === "IN_PROGRESS" && "Work in Progress"}
                        {project.status === "UNDER_REVIEW" && (
                          <span className="text-[var(--btn-primary-text)] font-bold bg-[var(--accent)] border border-[var(--accent)] px-2 py-0.5 rounded">
                            Review Deliverable
                          </span>
                        )}
                        {project.status === "COMPLETED" && "Archived / Released"}
                        {project.status === "ASSIGNED" && "Contract Instantiated"}
                        {project.status === "CANCELLED" && "Cancelled / Refunded"}
                        {project.status === "CLOSED" && "Closed"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Stacked Card view (Responsive) */}
            <div className="block sm:hidden space-y-4">
              {filteredProjects.map((project) => (
                <div key={project.id} className="border border-[var(--border)] bg-[var(--surface)] p-4 rounded-lg space-y-3">
                  <div className="flex justify-between items-start">
                    <Link href={`/projects/${project.id}`} className="text-xs font-bold text-[var(--text-primary)] hover:underline pr-6">
                      {project.title}
                    </Link>
                    <div className="shrink-0">{getStatusBadge(project.status)}</div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-[10px] border-t border-[var(--border-subtle)] pt-2 font-mono text-[var(--text-secondary)]">
                    <div>
                      <span className="text-[8px] text-[var(--text-muted)] uppercase block font-sans">Freelancer</span>
                      <span className="font-bold">{project.freelancer?.name || "Pending"}</span>
                    </div>
                    <div>
                      <span className="text-[8px] text-[var(--text-muted)] uppercase block font-sans">Budget</span>
                      <span className="font-bold text-[var(--text-primary)]">₹{(project.agreedAmount || project.budget).toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="bg-[var(--surface-subtle)] border border-[var(--border-subtle)] p-2 rounded text-[9px] font-mono text-[var(--text-muted)] flex justify-between items-center">
                    <span>Deliverable Status</span>
                    <span>
                      {project.status === "OPEN" && "Reviewing Proposals"}
                      {project.status === "IN_PROGRESS" && "In Progress"}
                      {project.status === "UNDER_REVIEW" && "Submission Pending Review"}
                      {project.status === "COMPLETED" && "Released"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
