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
  Clock,
  Briefcase,
  ShieldCheck,
  DollarSign,
  ChevronRight,
  Filter,
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
  _count?: {
    proposals: number;
  };
}

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
        if (searchTerm) queryParams.set("search", searchTerm);
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
  }, [currentTab, statusFilter, selectedSkills, page, minBudget, maxBudget, deadlineBefore, deadlineAfter, searchTerm]);

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
        setErrorMsg("Error loading dashboard data.");
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
    setPage(1);
    setStatusFilter("OPEN");
    setSelectedSkills([]);
    setMinBudget("");
    setMaxBudget("");
    setDeadlineBefore("");
    setDeadlineAfter("");
    setSearchTerm("");
  };

  const activeFilterCount =
    (statusFilter && statusFilter !== "OPEN" ? 1 : 0) +
    selectedSkills.length +
    (minBudget ? 1 : 0) +
    (maxBudget ? 1 : 0) +
    (deadlineBefore ? 1 : 0) +
    (deadlineAfter ? 1 : 0) +
    (searchTerm ? 1 : 0);

  const getStatusBadge = (status: ProjectStatus) => {
    switch (status) {
      case "OPEN":
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-transparent border border-zinc-800 text-[9px] font-bold text-zinc-400 uppercase tracking-wider">
            ● Open
          </span>
        );
      case "UNDER_REVIEW":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white text-[9px] font-bold text-black border border-white uppercase tracking-wider">
            Review
          </span>
        );
      case "ASSIGNED":
      case "IN_PROGRESS":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-[9px] font-bold text-white uppercase tracking-wider">
            <span className="w-1 h-1 rounded-full bg-white" />
            Active
          </span>
        );
      case "COMPLETED":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-900 border border-zinc-850 text-[9px] font-bold text-zinc-500 uppercase tracking-wider">
            Released
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-950 border border-zinc-900 text-[9px] font-bold text-zinc-500 uppercase tracking-wider">
            Closed
          </span>
        );
    }
  };

  // Compute Metrics dynamically
  const browseEscrowTotal = projects.reduce((sum, p) => sum + p.budget, 0);
  
  const dashboardContracts = hiredProjects.filter((p) => ["ASSIGNED", "IN_PROGRESS", "UNDER_REVIEW"].includes(p.status));
  const activeContractsCount = dashboardContracts.length;
  const earningsYTD = hiredProjects.filter((p) => p.status === "COMPLETED").reduce((sum, p) => sum + (p.agreedAmount || p.budget), 0);
  const pendingMilestonesCount = hiredProjects.filter((p) => p.status === "UNDER_REVIEW").length;

  const filterContent = (
    <div className="space-y-6 text-left">
      <div className="flex justify-between items-center pb-2 border-b border-zinc-900">
        <div className="flex items-center gap-1.5">
          <SlidersHorizontal className="w-3.5 h-3.5 text-zinc-500" />
          <h2 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Filter Matrix</h2>
        </div>
        {activeFilterCount > 0 && (
          <button
            onClick={clearFilters}
            className="text-[9px] text-white hover:underline font-bold uppercase tracking-wider cursor-pointer"
          >
            Clear All
          </button>
        )}
      </div>

      {/* Status Filter */}
      <div className="space-y-1.5">
        <label className="block text-[9px] font-bold text-zinc-500 uppercase tracking-wider">Status</label>
        <select
          value={statusFilter}
          onChange={(e) => {
            setPage(1);
            setStatusFilter(e.target.value);
          }}
          className="w-full text-xs px-2.5 py-2 bg-black border border-zinc-800 rounded text-white focus:outline-none"
        >
          <option value="">All Statuses</option>
          <option value="OPEN">Open Opportunities</option>
          <option value="ASSIGNED">Assigned</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="UNDER_REVIEW">Under Review</option>
          <option value="COMPLETED">Completed</option>
        </select>
      </div>

      {/* Budget range filter */}
      <div className="space-y-1.5">
        <label className="block text-[9px] font-bold text-zinc-500 uppercase tracking-wider">Budget Bounds (INR)</label>
        <div className="flex gap-2">
          <input
            type="number"
            placeholder="Min"
            value={minBudget}
            onChange={(e) => {
              setPage(1);
              setMinBudget(e.target.value);
            }}
            className="w-1/2 text-xs px-2.5 py-2 bg-black border border-zinc-800 rounded text-white placeholder-zinc-700 focus:outline-none"
          />
          <input
            type="number"
            placeholder="Max"
            value={maxBudget}
            onChange={(e) => {
              setPage(1);
              setMaxBudget(e.target.value);
            }}
            className="w-1/2 text-xs px-2.5 py-2 bg-black border border-zinc-800 rounded text-white placeholder-zinc-700 focus:outline-none"
          />
        </div>
      </div>

      {/* Deadline filter */}
      <div className="space-y-1.5">
        <label className="block text-[9px] font-bold text-zinc-500 uppercase tracking-wider">Timeline Bounds</label>
        <div className="space-y-2">
          <div>
            <span className="text-[8px] text-zinc-600 block uppercase font-bold">After</span>
            <input
              type="date"
              value={deadlineAfter}
              onChange={(e) => {
                setPage(1);
                setDeadlineAfter(e.target.value);
              }}
              className="w-full text-xs px-2.5 py-1.5 bg-black border border-zinc-800 rounded text-white focus:outline-none"
            />
          </div>
          <div>
            <span className="text-[8px] text-zinc-600 block uppercase font-bold">Before</span>
            <input
              type="date"
              value={deadlineBefore}
              onChange={(e) => {
                setPage(1);
                setDeadlineBefore(e.target.value);
              }}
              className="w-full text-xs px-2.5 py-1.5 bg-black border border-zinc-800 rounded text-white focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Skills Filter */}
      <div className="space-y-3">
        <label className="block text-[9px] font-bold text-zinc-500 uppercase tracking-wider">Required Skills</label>
        {selectedSkills.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {selectedSkills.map((skill) => (
              <button
                key={skill}
                onClick={() => toggleSkill(skill)}
                className="inline-flex items-center gap-1 text-[9px] px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-white font-bold cursor-pointer hover:bg-zinc-850"
              >
                {skill}
                <X className="w-2.5 h-2.5" />
              </button>
            ))}
          </div>
        )}
        <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
          {SKILL_GROUPS.map((group) => (
            <div key={group.category} className="space-y-1">
              <h3 className="text-[8px] font-bold text-zinc-600 uppercase tracking-widest">{group.category}</h3>
              <div className="flex flex-wrap gap-1">
                {group.skills.map((skill) => {
                  const isSelected = selectedSkills.includes(skill);
                  return (
                    <button
                      key={skill}
                      onClick={() => toggleSkill(skill)}
                      className={`text-[9px] px-2 py-0.5 rounded transition-colors duration-150 cursor-pointer ${
                        isSelected
                          ? "bg-white text-black border border-white font-bold"
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
      </div>
    </div>
  );

  if (session && session.user && session.user.role === "CLIENT") {
    return (
      <div className="max-w-xl mx-auto py-16 text-center">
        <div className="border border-zinc-800 bg-[#09090b] p-8 rounded-lg space-y-6">
          <FolderSearch className="w-12 h-12 text-zinc-500 mx-auto" />
          <h1 className="text-sm font-bold text-white uppercase tracking-wider">Client Accounts Workspace</h1>
          <p className="text-xs text-zinc-400 max-w-sm mx-auto font-light">
            You are logged in as a Client. To hire specialists, search the directory, or manage contract milestones, please use the client portal.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-3">
            <Link
              href="/client/projects"
              className="bg-white hover:bg-zinc-200 text-black font-bold text-xs uppercase tracking-widest px-5 py-3 rounded text-center transition-colors"
            >
              My Projects
            </Link>
            <Link
              href="/client/projects/new"
              className="border border-zinc-800 hover:border-zinc-700 text-white font-bold text-xs uppercase tracking-widest px-5 py-3 rounded text-center transition-colors"
            >
              Post Project
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10 w-full min-w-0">
      {/* Upper Tab Navigation & Headers Row */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[var(--border-subtle)] pb-6">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">
            {currentTab === "BROWSE" ? "Find Project Contracts" : "Freelancer Workspace"}
          </h1>
          <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
            {currentTab === "BROWSE"
              ? "Browse verified enterprise listings, verify client escrows, and bid on deliverables."
              : "Track active milestones, submit codebase builds, and release locked escrow assets."}
          </p>
        </div>

        {/* Tab switcher */}
        <div className="bg-[var(--surface-subtle)] p-0.5 border border-[var(--border-subtle)] rounded-lg flex items-center gap-1 shrink-0">
          <button
            onClick={() => {
              setCurrentTab("BROWSE");
              setErrorMsg(null);
            }}
            className={`px-3 py-1.5 rounded text-[9px] font-bold uppercase tracking-wider transition-colors cursor-pointer ${
              currentTab === "BROWSE"
                ? "bg-[var(--surface-elevated)] text-[var(--text-primary)] border border-[var(--border-subtle)]"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            }`}
          >
            Find Opportunities
          </button>
          <button
            onClick={() => {
              setCurrentTab("DASHBOARD");
              setErrorMsg(null);
            }}
            className={`px-3 py-1.5 rounded text-[9px] font-bold uppercase tracking-wider transition-colors cursor-pointer ${
              currentTab === "DASHBOARD"
                ? "bg-[var(--surface-elevated)] text-[var(--text-primary)] border border-[var(--border-subtle)]"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            }`}
          >
            My Active Contracts
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="bg-red-950/20 border border-red-900/50 p-4 rounded text-xs flex items-start gap-2.5 text-red-400">
          <p className="font-semibold">{errorMsg}</p>
        </div>
      )}

      {/* Dynamic Tab Rendering */}
      {currentTab === "DASHBOARD" ? (
        /* ── Freelancer Dashboard ── */
        loadingDashboard ? (
          <div className="flex items-center justify-center min-h-[300px]">
            <div className="w-5 h-5 rounded-full border-2 border-zinc-800 border-t-white animate-spin" />
          </div>
        ) : (
          <div className="space-y-8 animate-fadeIn">
            {/* Hired Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="border border-[var(--border)] bg-[var(--surface-elevated)] p-6 rounded-lg flex flex-col justify-between h-32">
                <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">
                  Active Hired Contracts
                </div>
                <div className="text-3xl font-bold tracking-tight text-[var(--text-primary)]">{activeContractsCount}</div>
              </div>

              <div className="border border-[var(--border)] bg-[var(--surface-elevated)] p-6 rounded-lg flex flex-col justify-between h-32">
                <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">
                  Total Earned (YTD)
                </div>
                <div className="text-3xl font-bold tracking-tight text-[var(--text-primary)]">
                  ₹{earningsYTD.toLocaleString()}
                </div>
              </div>

              <div className="border border-[var(--border)] bg-[var(--surface-elevated)] p-6 rounded-lg flex flex-col justify-between h-32">
                <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">
                  Pending Milestones
                </div>
                <div className="text-3xl font-bold tracking-tight text-[var(--text-primary)] flex items-center gap-1.5">
                  <span>{pendingMilestonesCount}</span>
                  {pendingMilestonesCount > 0 && <span className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" />}
                </div>
              </div>
            </div>

            {/* Active Contracts Table View */}
            <div className="space-y-4">
              <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">Contract Deliverables Checklist</h2>

              {hiredProjects.length === 0 ? (
                <div className="border border-zinc-900 rounded-lg p-16 text-center">
                  <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">No active contract assignments found</p>
                </div>
              ) : (
                <div className="border border-[var(--border)] bg-[var(--surface)] rounded-lg overflow-hidden">
                  <table className="w-full text-left border-collapse text-[11px]">
                    <thead>
                      <tr className="border-b border-[var(--border)] bg-[var(--surface-subtle)] text-[var(--text-muted)] font-mono uppercase tracking-widest">
                        <th className="py-3.5 px-4 font-medium">Project Name</th>
                        <th className="py-3.5 px-4 font-medium">Client</th>
                        <th className="py-3.5 px-4 font-medium">Status</th>
                        <th className="py-3.5 px-4 font-medium">Budget</th>
                        <th className="py-3.5 px-4 font-medium text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-subtle)] text-[var(--text-secondary)] font-medium">
                      {hiredProjects.map((project) => (
                        <tr key={project.id} className="hover:bg-[var(--surface-subtle)] transition-colors">
                          <td className="py-4 px-4 font-bold text-[var(--text-primary)]">
                            <Link href={`/projects/${project.id}`} className="hover:underline flex items-center gap-1.5">
                              {project.title}
                              <ChevronRight className="w-3 h-3 text-[var(--text-muted)]" />
                            </Link>
                          </td>
                          <td className="py-4 px-4 font-mono">
                            {project.client.name || "Enterprise Client"}
                          </td>
                          <td className="py-4 px-4">
                            {getStatusBadge(project.status)}
                          </td>
                          <td className="py-4 px-4 font-mono font-bold text-[var(--text-primary)]">
                            ₹{(project.agreedAmount || project.budget).toLocaleString()}
                          </td>
                          <td className="py-4 px-4 text-right">
                            <Link
                              href={`/projects/${project.id}`}
                              className="inline-flex items-center gap-1 border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] hover:border-white px-2.5 py-1.5 rounded text-[9px] font-bold uppercase tracking-wider cursor-pointer"
                            >
                              Work Desk
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )
      ) : (
        /* ── Browse Opportunities (Browse/Search) ── */
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start animate-fadeIn">
          {/* Filters Sidebar */}
          <div className="hidden lg:block lg:col-span-1 border border-[var(--border)] bg-[var(--surface)] p-6 rounded-lg sticky top-20">
            {filterContent}
          </div>

          {/* Search Table Column */}
          <div className="lg:col-span-3 space-y-6">
            {/* Search Input Box */}
            <div className="flex items-center gap-2 p-1 bg-[var(--surface)] border border-[var(--border)] rounded-lg">
              <div className="flex items-center gap-2 flex-grow pl-3">
                <Search className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
                <input
                  type="text"
                  placeholder="Filter opportunities by keyword search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-transparent text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none py-2"
                />
              </div>
              {searchTerm && (
                <button onClick={() => setSearchTerm("")} className="p-1 rounded text-[var(--text-muted)] hover:text-white shrink-0 mr-1">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Opportunities table list */}
            {loading ? (
              <div className="flex items-center justify-center min-h-[250px]">
                <div className="w-5 h-5 rounded-full border-2 border-zinc-800 border-t-white animate-spin" />
              </div>
            ) : projects.length === 0 ? (
              <div className="border border-zinc-900 rounded-lg p-16 text-center">
                <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">No available project proposals match filters</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-between items-center text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest px-1">
                  <span>Available Listings</span>
                  <span>Page {page} of {totalPages}</span>
                </div>

                <div className="border border-[var(--border)] bg-[var(--surface)] rounded-lg overflow-hidden">
                  <table className="w-full text-left border-collapse text-[11px]">
                    <thead>
                      <tr className="border-b border-[var(--border)] bg-[var(--surface-subtle)] text-[var(--text-muted)] font-mono uppercase tracking-widest">
                        <th className="py-3.5 px-4 font-medium">Opportunities</th>
                        <th className="py-3.5 px-4 font-medium">Enterprise Client</th>
                        <th className="py-3.5 px-4 font-medium">Initial Budget</th>
                        <th className="py-3.5 px-4 font-medium">Deadline</th>
                        <th className="py-3.5 px-4 font-medium text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-subtle)] text-[var(--text-secondary)] font-medium">
                      {projects.map((project) => (
                        <tr key={project.id} className="hover:bg-[var(--surface-subtle)] transition-colors">
                          <td className="py-4 px-4 font-bold text-[var(--text-primary)]">
                            <Link href={`/projects/${project.id}`} className="hover:underline flex items-center gap-1.5">
                              {project.title}
                              <ChevronRight className="w-3 h-3 text-[var(--text-muted)]" />
                            </Link>
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {project.skills.slice(0, 3).map((skill) => (
                                <span key={skill} className="text-[8px] font-mono text-[var(--text-muted)] border border-[var(--border-subtle)] px-1 py-0.2 rounded">
                                  {skill}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="py-4 px-4 font-mono text-[var(--text-secondary)]">
                            {project.client.name || "Enterprise"}
                          </td>
                          <td className="py-4 px-4 font-mono font-bold text-[var(--text-primary)]">
                            ₹{project.budget.toLocaleString()}
                          </td>
                          <td className="py-4 px-4 font-mono">
                            {new Date(project.deadline).toLocaleDateString()}
                          </td>
                          <td className="py-4 px-4 text-right">
                            <Link
                              href={`/projects/${project.id}`}
                              className="inline-flex items-center gap-1 border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] hover:border-white px-2.5 py-1.5 rounded text-[9px] font-bold uppercase tracking-wider cursor-pointer"
                            >
                              View Scope
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex justify-between items-center pt-2">
                    <button
                      onClick={() => setPage((p) => Math.max(p - 1, 1))}
                      disabled={page === 1}
                      className="border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] disabled:opacity-40 disabled:cursor-not-allowed hover:border-white px-3 py-1.5 rounded text-[9px] font-bold uppercase tracking-wider cursor-pointer"
                    >
                      Previous
                    </button>
                    <span className="text-[10px] text-[var(--text-muted)] font-mono">
                      {page} / {totalPages}
                    </span>
                    <button
                      onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                      disabled={page === totalPages}
                      className="border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] disabled:opacity-40 disabled:cursor-not-allowed hover:border-white px-3 py-1.5 rounded text-[9px] font-bold uppercase tracking-wider cursor-pointer"
                    >
                      Next
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
