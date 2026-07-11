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
        return "bg-blue-50 text-blue-700 border-blue-200";
      case ProjectStatus.ASSIGNED:
        return "bg-yellow-50 text-yellow-700 border-yellow-200";
      case ProjectStatus.IN_PROGRESS:
        return "bg-purple-50 text-purple-700 border-purple-200";
      case ProjectStatus.UNDER_REVIEW:
        return "bg-indigo-50 text-indigo-700 border-indigo-200";
      case ProjectStatus.COMPLETED:
        return "bg-green-50 text-green-700 border-green-200";
      case ProjectStatus.CANCELLED:
        return "bg-red-50 text-red-700 border-red-200";
      case ProjectStatus.CLOSED:
        return "bg-gray-50 text-gray-700 border-gray-200";
      default:
        return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Browse Projects</h1>
        <p className="text-sm text-gray-500 mt-1">
          Explore freelance opportunities and apply. Escrow funds will be held securely for each job.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Filters Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Filters</h2>
              <button
                onClick={clearFilters}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer"
              >
                Clear All
              </button>
            </div>

            {/* Status Filter */}
            <div className="mb-6">
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Project Status</label>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setPage(1);
                  setStatusFilter(e.target.value);
                }}
                className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
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
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Skills</label>
              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1">
                {SKILL_GROUPS.map((group) => (
                  <div key={group.category}>
                    <h3 className="text-xs font-semibold text-gray-500 mb-1">{group.category}</h3>
                    <div className="flex flex-wrap gap-1 mb-2">
                      {group.skills.map((skill) => {
                        const isSelected = selectedSkills.includes(skill);
                        return (
                          <button
                            key={skill}
                            onClick={() => toggleSkill(skill)}
                            className={`text-[10px] px-2 py-1 rounded border transition-all cursor-pointer ${
                              isSelected
                                ? "bg-indigo-50 border-indigo-500 text-indigo-700 font-semibold"
                                : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
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
          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center">
            <input
              type="text"
              placeholder="Search by keywords (e.g. Next.js, API, dashboard)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-sm focus:outline-none bg-transparent"
            />
          </div>

          {errorMsg && (
            <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-md">
              <p className="text-sm text-red-700">{errorMsg}</p>
            </div>
          )}

          {loading ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
              <p className="text-gray-500 text-sm">Searching for matching projects...</p>
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
              <span className="text-4xl mb-4 block">🔍</span>
              <h2 className="text-lg font-bold text-gray-900 mb-1">No Projects Match Your Search</h2>
              <p className="text-sm text-gray-500 max-w-sm mx-auto">
                Try clearing some filters or using different keywords to explore other opportunities.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <ul className="divide-y divide-gray-100">
                  {filteredProjects.map((project) => (
                    <li key={project.id} className="p-6 hover:bg-gray-50 transition-colors">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex-grow">
                          <div className="flex flex-wrap items-center gap-3 mb-2">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getStatusBadgeClass(project.status)}`}>
                              {project.status}
                            </span>
                            <span className="text-xs text-gray-400">
                              By {project.client.name || "Client"} • Deadline {new Date(project.deadline).toLocaleDateString()}
                            </span>
                          </div>
                          <Link
                            href={`/projects/${project.id}`}
                            className="text-lg font-bold text-gray-950 hover:text-indigo-600 transition-colors block mb-1"
                          >
                            {project.title}
                          </Link>
                          <p className="text-sm text-gray-500 line-clamp-2 mb-3 max-w-3xl">
                            {project.description}
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {project.skills.map((s) => (
                              <span key={s} className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded font-medium">
                                {s}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="flex sm:flex-col items-start sm:items-end justify-between sm:justify-center gap-2 border-t sm:border-t-0 border-gray-100 pt-4 sm:pt-0">
                          <div className="text-right sm:mb-2">
                            <span className="text-xs text-gray-400 block uppercase font-bold tracking-wider">Fixed Budget</span>
                            <span className="text-lg font-black text-gray-950">₹{project.budget.toLocaleString()}</span>
                          </div>
                          <Link
                            href={`/projects/${project.id}`}
                            className="px-4 py-2 border border-gray-200 hover:border-indigo-600 text-xs font-semibold rounded-lg text-gray-700 hover:text-indigo-600 hover:bg-indigo-50/20 transition-all block text-center"
                          >
                            View Details
                          </Link>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Pagination controls */}
              {totalPages > 1 && (
                <div className="flex justify-between items-center bg-white px-4 py-3 rounded-2xl border border-gray-100 shadow-sm text-sm">
                  <button
                    disabled={page === 1}
                    onClick={() => setPage(page - 1)}
                    className="px-3 py-1 border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-40 cursor-pointer font-medium"
                  >
                    Previous
                  </button>
                  <span className="text-gray-500">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    disabled={page === totalPages}
                    onClick={() => setPage(page + 1)}
                    className="px-3 py-1 border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-40 cursor-pointer font-medium"
                  >
                    Next
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
