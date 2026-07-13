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
  OPEN: "bg-[var(--status-open-bg)] text-[var(--status-open-text)]",
  ASSIGNED: "bg-[var(--status-progress-bg)] text-[var(--status-progress-text)]",
  IN_PROGRESS: "bg-[var(--status-progress-bg)] text-[var(--status-progress-text)]",
  UNDER_REVIEW: "bg-[var(--status-review-bg)] text-[var(--status-review-text)]",
  COMPLETED: "bg-[var(--status-success-bg)] text-[var(--status-success-text)]",
  CANCELLED: "bg-[var(--status-negative-bg)] text-[var(--status-negative-text)]",
  CLOSED: "bg-[var(--status-neutral-bg)] text-[var(--status-neutral-text)]",
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
    setMaxBudget("");
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

  // ── Filter sidebar content (shared between desktop panel and mobile slide-over) ──
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
        <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">Required Skills</label>
        {/* Active skill pills */}
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
        <div className="bg-[var(--surface)] p-8 rounded-2xl shadow-[var(--card-shadow)]">
          <FolderSearch className="w-12 h-12 text-[var(--accent)] mx-auto mb-4" />
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Client Accounts Do Not Browse Projects</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-2 mb-6">
            To hire freelancers and manage your jobs, please view your current project postings or post a new project.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-3">
            <Link
              href="/client/projects"
              className="px-5 py-2.5 text-sm font-bold rounded-lg bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] transition-colors text-center"
            >
              My Projects
            </Link>
            <Link
              href="/client/projects/new"
              className="px-5 py-2.5 text-sm font-bold rounded-lg border border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--surface-subtle)] transition-colors text-center"
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
          <div className="bg-[var(--surface)] p-5 rounded-2xl shadow-[var(--card-shadow)] sticky top-20">
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
          <div className="bg-[var(--surface)] p-3.5 rounded-xl shadow-[var(--card-shadow)] flex items-center gap-3">
            <Search className="w-4 h-4 text-[var(--text-muted)] flex-shrink-0" />
            <input
              type="text"
              placeholder="Search by keywords (e.g. Design, Frontend, Writing)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-sm focus:outline-none bg-transparent text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
            />
          </div>

          {/* Result count */}
          {!loading && !errorMsg && (
            <p className="text-sm text-[var(--text-muted)] font-medium">
              Showing {filteredProjects.length} result{filteredProjects.length !== 1 ? "s" : ""}
            </p>
          )}

          {errorMsg && (
            <div className="bg-[var(--status-negative-bg)] border border-[var(--status-negative-border)] p-4 rounded-lg">
              <p className="text-sm text-[var(--status-negative-text)] font-medium">{errorMsg}</p>
            </div>
          )}

          {loading ? (
            <div className="bg-[var(--surface)] rounded-2xl shadow-[var(--card-shadow)] p-16 text-center">
              <div className="w-6 h-6 rounded-full border-2 border-[var(--border)] border-t-[var(--accent)] animate-spin mx-auto mb-3" />
              <p className="text-[var(--text-muted)] text-sm">Searching for matching projects...</p>
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="bg-[var(--surface)] rounded-2xl shadow-[var(--card-shadow)] p-16 text-center">
              <div className="w-12 h-12 rounded-xl bg-[var(--surface-subtle)] flex items-center justify-center mx-auto mb-4 border border-[var(--border)]">
                <FolderSearch className="w-6 h-6 text-[var(--text-muted)]" />
              </div>
              <h2 className="text-lg font-bold text-[var(--text-primary)] mb-1">No Projects Match Your Search</h2>
              <p className="text-sm text-[var(--text-secondary)] max-w-sm mx-auto mb-4">
                Try clearing some filters or using different keywords to explore other opportunities.
              </p>
              <button
                onClick={clearFilters}
                className="text-sm font-bold text-[var(--accent)] hover:text-[var(--accent-hover)] cursor-pointer"
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
                    className={`bg-[var(--surface)] rounded-2xl shadow-[var(--card-shadow)] hover:shadow-[var(--card-shadow-hover)] transition-shadow duration-200 border-l-4 ${borderClass} overflow-hidden`}
                  >
                    <div className="p-5 sm:p-6">
                      {/* Top row: Title + Status + Budget */}
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-3">
                        <div className="flex-grow min-w-0">
                          <div className="flex flex-wrap items-center gap-2.5 mb-1.5">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${badgeClass}`}>
                              {project.status.replace("_", " ")}
                            </span>
                          </div>
                          <Link
                            href={`/projects/${project.id}`}
                            className="text-base font-bold text-[var(--text-primary)] hover:text-[var(--accent)] transition-colors block mb-0.5 line-clamp-1"
                          >
                            {project.title}
                          </Link>
                          <span className="text-xs text-[var(--text-muted)] flex items-center gap-1.5">
                            {project.client.name && <>{project.client.name} · </>}
                            <Clock className="w-3 h-3 inline" />
                            Posted {new Date(project.createdAt).toLocaleDateString()}
                          </span>
                        </div>

                        {/* Budget block */}
                        <div className="flex-shrink-0 text-right">
                          <span className="text-[10px] text-[var(--accent)] block uppercase font-bold tracking-wider mb-0.5">Fixed Budget</span>
                          <span className="text-lg font-bold text-[var(--text-primary)]">₹{project.budget.toLocaleString()}</span>
                        </div>
                      </div>

                      {/* Description */}
                      <p className="text-sm text-[var(--text-secondary)] line-clamp-2 mb-4 leading-relaxed">
                        {project.description}
                      </p>

                      {/* Skills + View Details */}
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="flex flex-wrap gap-1.5">
                          {project.skills.map((s) => (
                            <span key={s} className="bg-[var(--surface-subtle)] text-[var(--text-secondary)] text-[10px] px-2.5 py-1 rounded-full font-semibold border border-[var(--border)]">
                              {s}
                            </span>
                          ))}
                        </div>
                        <Link
                          href={`/projects/${project.id}`}
                          className="inline-flex items-center gap-1.5 px-4 py-2 border border-[var(--border)] hover:border-[var(--accent)] text-xs font-bold rounded-lg text-[var(--text-secondary)] hover:text-[var(--accent)] hover:bg-[var(--accent-light)] transition-all duration-150 flex-shrink-0"
                        >
                          View Details
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Pagination controls */}
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
                        <span key={`dots-${idx}`} className="px-1 text-[var(--text-muted)]">…</span>
                      ) : (
                        <button
                          key={item}
                          onClick={() => setPage(item as number)}
                          className={`w-9 h-9 rounded-lg text-sm font-semibold cursor-pointer transition-colors ${
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
    </div>
  );
}
