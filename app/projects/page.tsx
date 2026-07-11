"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ProjectStatus } from "@prisma/client";
import { SKILL_GROUPS } from "@/lib/constants/skills";

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

export default function BrowseProjectsPage() {
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filters state
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("OPEN");

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
  }, [statusFilter, selectedSkills, page]);

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

  const getStatusBadgeClass = (status: ProjectStatus) => {
    switch (status) {
      case ProjectStatus.OPEN:
        return "bg-sky-50 text-sky-700 border-sky-200";
      case ProjectStatus.ASSIGNED:
        return "bg-amber-50 text-amber-700 border-amber-200";
      case ProjectStatus.IN_PROGRESS:
        return "bg-violet-50 text-violet-700 border-violet-200";
      case ProjectStatus.UNDER_REVIEW:
        return "bg-indigo-50 text-indigo-700 border-indigo-200";
      case ProjectStatus.COMPLETED:
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case ProjectStatus.CANCELLED:
        return "bg-red-50 text-red-700 border-red-200";
      case ProjectStatus.CLOSED:
        return "bg-slate-100 text-slate-600 border-slate-200";
      default:
        return "bg-slate-100 text-slate-600 border-slate-200";
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Browse Projects</h1>
        <p className="text-sm text-slate-500 mt-1">
          Explore freelance opportunities and apply. Escrow funds will be held securely for each job.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Filters Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm sticky top-20">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Filters</h2>
              <button
                onClick={clearFilters}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer transition-colors"
              >
                Clear All
              </button>
            </div>

            {/* Status Filter */}
            <div className="mb-6">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Project Status</label>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setPage(1);
                  setStatusFilter(e.target.value);
                }}
                className="w-full text-sm px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 bg-white transition-all"
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

            {/* Skills Filter */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Skills</label>
              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1">
                {SKILL_GROUPS.map((group) => (
                  <div key={group.category}>
                    <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">{group.category}</h3>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {group.skills.map((skill) => {
                        const isSelected = selectedSkills.includes(skill);
                        return (
                          <button
                            key={skill}
                            onClick={() => toggleSkill(skill)}
                            className={`text-[10px] px-2 py-1 rounded-md border transition-all duration-150 cursor-pointer ${
                              isSelected
                                ? "bg-indigo-50 border-indigo-400 text-indigo-700 font-bold shadow-sm"
                                : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:border-slate-300"
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
        </div>

        {/* Projects List */}
        <div className="lg:col-span-3 space-y-4">
          {/* Search bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3">
            <svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search by keywords (e.g. Next.js, API, dashboard)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-sm focus:outline-none bg-transparent text-slate-700 placeholder:text-slate-400"
            />
          </div>

          {errorMsg && (
            <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-lg">
              <p className="text-sm text-red-700 font-medium">{errorMsg}</p>
            </div>
          )}

          {loading ? (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-16 text-center">
              <div className="w-6 h-6 rounded-full border-2 border-slate-200 border-t-indigo-500 animate-spin mx-auto mb-3" />
              <p className="text-slate-400 text-sm">Searching for matching projects...</p>
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-16 text-center">
              <span className="text-4xl mb-4 block">🔍</span>
              <h2 className="text-lg font-bold text-slate-900 mb-1">No Projects Match Your Search</h2>
              <p className="text-sm text-slate-500 max-w-sm mx-auto">
                Try clearing some filters or using different keywords to explore other opportunities.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <ul className="divide-y divide-slate-100">
                  {filteredProjects.map((project) => (
                    <li key={project.id} className="group p-6 hover:bg-slate-50/50 transition-colors duration-150">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex-grow min-w-0">
                          <div className="flex flex-wrap items-center gap-2.5 mb-2">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${getStatusBadgeClass(project.status)}`}>
                              {project.status.replace("_", " ")}
                            </span>
                            <span className="text-xs text-slate-400">
                              By {project.client.name || "Client"} • Due {new Date(project.deadline).toLocaleDateString()}
                            </span>
                          </div>
                          <Link
                            href={`/projects/${project.id}`}
                            className="text-base font-bold text-slate-900 hover:text-indigo-600 transition-colors block mb-1.5 truncate"
                          >
                            {project.title}
                          </Link>
                          <p className="text-sm text-slate-500 line-clamp-2 mb-3 max-w-3xl leading-relaxed">
                            {project.description}
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {project.skills.map((s) => (
                              <span key={s} className="bg-slate-100 text-slate-600 text-[10px] px-2 py-0.5 rounded-md font-semibold">
                                {s}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="flex sm:flex-col items-start sm:items-end justify-between sm:justify-center gap-2 border-t sm:border-t-0 border-slate-100 pt-4 sm:pt-0 flex-shrink-0 sm:min-w-[120px]">
                          <div className="text-right sm:mb-3">
                            <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-widest mb-0.5">Fixed Budget</span>
                            <span className="text-lg font-black text-slate-900">₹{project.budget.toLocaleString()}</span>
                          </div>
                          <Link
                            href={`/projects/${project.id}`}
                            className="px-4 py-2 border border-slate-200 hover:border-indigo-500 text-xs font-semibold rounded-xl text-slate-600 hover:text-indigo-600 hover:bg-indigo-50/30 transition-all duration-200 block text-center group-hover:border-indigo-300"
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
                <div className="flex justify-between items-center bg-white px-5 py-3.5 rounded-2xl border border-slate-100 shadow-sm text-sm">
                  <button
                    disabled={page === 1}
                    onClick={() => setPage(page - 1)}
                    className="px-4 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 cursor-pointer font-semibold text-slate-600 transition-colors"
                  >
                    ← Previous
                  </button>
                  <span className="text-slate-400 font-medium">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    disabled={page === totalPages}
                    onClick={() => setPage(page + 1)}
                    className="px-4 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 cursor-pointer font-semibold text-slate-600 transition-colors"
                  >
                    Next →
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
