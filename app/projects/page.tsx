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

export default function BrowseProjectsPage() {
  const { data: session } = useSession();
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

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

  useEffect(() => {
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
  }, [statusFilter, selectedSkills, page, minBudget, maxBudget, deadlineBefore, deadlineAfter]);

  const toggleSkill = (skill: string) => {
    setPage(1); // Reset page on filter change
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
    setMaxBudget("");
    setDeadlineBefore("");
    setDeadlineAfter("");
    setPage(1);
  };

  // Client-side text search filter
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

  // Shared filter sidebar content (used for both desktop and mobile slide-over)
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
        <label className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-2">Project Status</label>
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
        <label className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-2">
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
            className="w-1/2 text-sm px-3 py-2 border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 focus:border-[var(--accent)] bg-[var(--input-bg)] transition-all"
          />
          <input
            type="number"
            placeholder="Max"
            value={maxBudget}
            onChange={(e) => {
              setPage(1);
              setMaxBudget(e.target.value);
            }}
            className="w-1/2 text-sm px-3 py-2 border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 focus:border-[var(--accent)] bg-[var(--input-bg)] transition-all"
          />
        </div>
      </div>

      {/* Deadline filter */}
      <div className="mb-5">
        <label className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-2">
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
              className="w-full text-sm px-3 py-2 border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 focus:border-[var(--accent)] bg-[var(--input-bg)] transition-all"
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
              className="w-full text-sm px-3 py-2 border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 focus:border-[var(--accent)] bg-[var(--input-bg)] transition-all"
            />
          </div>
        </div>
      </div>

      {/* Skills Filter */}
      <div>
        <label className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-2">Skills</label>
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
        <div className="bg-[var(--surface)] p-8 rounded-2xl border border-[var(--border)] shadow-sm">
          <FolderSearch className="w-12 h-12 text-[var(--accent)] mx-auto mb-4" />
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Client Accounts Do Not Browse Projects</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-2 mb-6">
            To hire freelancers and manage your jobs, please view your current project postings or post a new project.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-3">
            <Link
              href="/client/projects"
              className="px-5 py-2.5 text-sm font-semibold rounded-lg bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] transition-colors text-center"
            >
              My Projects
            </Link>
            <Link
              href="/client/projects/new"
              className="px-5 py-2.5 text-sm font-semibold rounded-lg border border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--surface-subtle)] transition-colors text-center"
            >
              Post a Project
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">Browse Projects</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Explore freelance opportunities and apply. Escrow funds will be held securely for each job.
          </p>
        </div>
        {/* Mobile filter toggle */}
        <button
          onClick={() => setMobileFiltersOpen(true)}
          className="lg:hidden inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold rounded-lg border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)] cursor-pointer transition-colors self-start"
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          Filters
          {activeFilterCount > 0 && (
            <span className="bg-[var(--accent)] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

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

        {/* Projects List */}
        <div className="lg:col-span-3 space-y-4">
          {/* Search bar */}
          <div className="bg-[var(--surface)] p-3.5 rounded-xl border border-[var(--border)] shadow-sm flex items-center gap-3">
            <Search className="w-4 h-4 text-[var(--text-muted)] flex-shrink-0" />
            <input
              type="text"
              placeholder="Search by keywords (e.g. Design, Frontend, Writing)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-sm focus:outline-none bg-transparent text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
            />
          </div>

          {errorMsg && (
            <div className="bg-[var(--status-negative-bg)] border border-[var(--status-negative-border)] p-4 rounded-lg">
              <p className="text-sm text-[var(--status-negative-text)] font-medium">{errorMsg}</p>
            </div>
          )}

          {loading ? (
            <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] shadow-sm p-16 text-center">
              <div className="w-6 h-6 rounded-full border-2 border-[var(--border)] border-t-[var(--accent)] animate-spin mx-auto mb-3" />
              <p className="text-[var(--text-muted)] text-sm">Searching for matching projects...</p>
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] shadow-sm p-16 text-center">
              <div className="w-12 h-12 rounded-xl bg-[var(--surface-subtle)] flex items-center justify-center mx-auto mb-4">
                <FolderSearch className="w-6 h-6 text-[var(--text-muted)]" />
              </div>
              <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-1">No Projects Match Your Search</h2>
              <p className="text-sm text-[var(--text-secondary)] max-w-sm mx-auto mb-4">
                Try clearing some filters or using different keywords to explore other opportunities.
              </p>
              <button
                onClick={clearFilters}
                className="text-sm font-semibold text-[var(--accent)] hover:text-[var(--accent-hover)] cursor-pointer"
              >
                Clear all filters
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] shadow-sm overflow-hidden">
                <ul className="divide-y divide-[var(--border-subtle)]">
                  {filteredProjects.map((project) => (
                    <li key={project.id} className="group p-5 hover:bg-[var(--surface-subtle)]/50 transition-colors duration-150">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex-grow min-w-0">
                          <div className="flex flex-wrap items-center gap-2.5 mb-2">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${getStatusBadgeClass(project.status)}`}>
                              {project.status.replace("_", " ")}
                            </span>
                            <span className="text-xs text-[var(--text-muted)] flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              Due {new Date(project.deadline).toLocaleDateString()}
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
                              <span key={s} className="bg-[var(--surface-subtle)] text-[var(--text-secondary)] text-[10px] px-2 py-0.5 rounded-md font-medium border border-[var(--border-subtle)]">
                                {s}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="flex sm:flex-col items-start sm:items-end justify-between sm:justify-center gap-2 border-t sm:border-t-0 border-[var(--border-subtle)] pt-4 sm:pt-0 flex-shrink-0 sm:min-w-[120px]">
                          <div className="text-right sm:mb-3">
                            <span className="text-[10px] text-[var(--text-muted)] block uppercase font-medium tracking-wider mb-0.5">Fixed Budget</span>
                            <span className="text-lg font-bold text-[var(--text-primary)]">₹{project.budget.toLocaleString()}</span>
                          </div>
                          <Link
                            href={`/projects/${project.id}`}
                            className="px-4 py-2 border border-[var(--border)] hover:border-[var(--accent)] text-xs font-semibold rounded-lg text-[var(--text-secondary)] hover:text-[var(--accent)] hover:bg-[var(--accent-light)] transition-all duration-150 block text-center"
                          >
                            View Details →
                          </Link>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Pagination controls */}
              {totalPages > 1 && (
                <div className="flex justify-between items-center bg-[var(--surface)] px-5 py-3.5 rounded-xl border border-[var(--border)] shadow-sm text-sm">
                  <button
                    disabled={page === 1}
                    onClick={() => setPage(page - 1)}
                    className="px-3.5 py-1.5 border border-[var(--border)] rounded-lg hover:bg-[var(--surface-subtle)] disabled:opacity-40 cursor-pointer font-semibold text-[var(--text-secondary)] transition-colors flex items-center gap-1.5"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Previous
                  </button>
                  <span className="text-[var(--text-muted)] font-medium">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    disabled={page === totalPages}
                    onClick={() => setPage(page + 1)}
                    className="px-3.5 py-1.5 border border-[var(--border)] rounded-lg hover:bg-[var(--surface-subtle)] disabled:opacity-40 cursor-pointer font-semibold text-[var(--text-secondary)] transition-colors flex items-center gap-1.5"
                  >
                    Next
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
