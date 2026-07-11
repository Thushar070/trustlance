"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { ProjectStatus } from "@prisma/client";

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

  if (loading) {
    return (
      <div className="flex-grow flex items-center justify-center">
        <p className="text-gray-500 text-sm">Loading your projects...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Your Posted Projects</h1>
          <p className="text-sm text-gray-500 mt-1">Manage and track your project escrow lifecycles.</p>
        </div>
        <Link
          href="/client/projects/new"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-semibold rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-colors cursor-pointer"
        >
          Post a Project
        </Link>
      </div>

      {errorMsg && (
        <div className="mb-6 bg-red-50 border-l-4 border-red-400 p-4 rounded-md">
          <p className="text-sm text-red-700">{errorMsg}</p>
        </div>
      )}

      {projects.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
          <span className="text-4xl mb-4 block">💼</span>
          <h2 className="text-lg font-bold text-gray-900 mb-1">No Projects Found</h2>
          <p className="text-sm text-gray-500 max-w-sm mx-auto mb-6">
            You haven&apos;t posted any freelance project listings yet. Click below to create your first.
          </p>
          <Link
            href="/client/projects/new"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-semibold rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-colors"
          >
            Post Your First Project
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <ul className="divide-y divide-gray-100">
            {projects.map((project) => (
              <li key={project.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex-grow">
                    <div className="flex flex-wrap items-center gap-3 mb-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getStatusBadgeClass(project.status)}`}>
                        {project.status}
                      </span>
                      <span className="text-xs text-gray-400">
                        Posted {new Date(project.createdAt).toLocaleDateString()}
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
                        <span key={s} className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-start sm:items-end justify-between sm:justify-center gap-2 border-t sm:border-t-0 border-gray-100 pt-4 sm:pt-0">
                    <div className="text-right sm:mb-2">
                      <span className="text-xs text-gray-400 block uppercase font-bold tracking-wider">Budget</span>
                      <span className="text-lg font-black text-gray-900">₹{project.budget.toLocaleString()}</span>
                    </div>
                    <div className="flex gap-2">
                      <Link
                        href={`/projects/${project.id}`}
                        className="px-3 py-1.5 border border-gray-200 hover:border-gray-300 text-xs font-semibold rounded-lg text-gray-600 hover:bg-gray-50 transition-all"
                      >
                        View Details
                      </Link>
                      {project.status === ProjectStatus.OPEN && (
                        <button
                          onClick={() => handleCancelProject(project.id)}
                          className="px-3 py-1.5 border border-red-200 hover:border-red-300 text-xs font-semibold rounded-lg text-red-600 hover:bg-red-50 transition-all cursor-pointer"
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
