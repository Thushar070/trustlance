"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ProjectStatus } from "@prisma/client";
import { Shield, Users, ArrowRight, AlertTriangle } from "lucide-react";

interface AssignmentItem {
  projectId: string;
  projectTitle: string;
  projectStatus: ProjectStatus;
  clientName: string | null;
  clientEmail: string;
  freelancerName: string | null;
  freelancerEmail: string | null;
  disputeId: string | null;
}

const getStatusBadgeClass = (status: ProjectStatus) => {
  switch (status) {
    case ProjectStatus.COMPLETED:
      return "bg-zinc-900 text-white border-zinc-800";
    case ProjectStatus.CANCELLED:
    case ProjectStatus.CLOSED:
      return "bg-zinc-950 text-zinc-550 border-zinc-900";
    default:
      return "bg-zinc-950 text-zinc-400 border-zinc-850";
  }
};

export default function AdminAssignmentsPage() {
  const [assignments, setAssignments] = useState<AssignmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const fetchAssignments = async () => {
      try {
        const res = await fetch("/api/admin/assignments");
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Failed to load assignments directory");
        }
        const data = await res.json();
        setAssignments(data);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "An error occurred.";
        setErrorMsg(msg);
      } finally {
        setLoading(false);
      }
    };

    fetchAssignments();
  }, []);

  if (loading) {
    return (
      <div className="flex-grow flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 rounded-full border-2 border-zinc-800 border-t-white animate-spin" />
          <p className="text-zinc-550 text-[10px] font-bold uppercase tracking-widest">Loading assignments directory...</p>
        </div>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center animate-fadeIn">
        <div className="bg-red-950/20 border border-red-900/50 p-6 rounded">
          <p className="text-xs font-semibold text-red-400">{errorMsg}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 w-full min-w-0 animate-fadeIn text-left text-zinc-300">
      
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">
          <span>Platform</span>
          <span>&gt;</span>
          <span className="text-zinc-400 font-bold">Assignments Logs</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-white leading-tight">Contract Assignments</h1>
        <p className="text-xs text-zinc-550 font-light mt-1">
          Monitor assigned projects, client-freelancer connections, and active dispute reviews.
        </p>
      </div>

      {assignments.length === 0 ? (
        <div className="border border-zinc-800 bg-[#09090b]/40 rounded-lg p-16 text-center">
          <Shield className="w-8 h-8 text-zinc-650 mx-auto mb-4" />
          <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-1">No Active Assignments</h2>
          <p className="text-xs text-zinc-600 font-light max-w-sm mx-auto">
            There are currently no projects with assigned freelancers or active contracts.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Desktop Table View */}
          <div className="border border-zinc-800 bg-[#09090b]/40 rounded-lg overflow-hidden hidden lg:block">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-zinc-850 bg-zinc-950 text-zinc-500 font-bold uppercase text-[9px] tracking-widest">
                    <th className="py-4 px-6">Client</th>
                    <th className="py-4 px-6">Freelancer</th>
                    <th className="py-4 px-6">Project Title</th>
                    <th className="py-4 px-6">Status</th>
                    <th className="py-4 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900 bg-black">
                  {assignments.map((assignment) => (
                    <tr
                      key={assignment.projectId}
                      className="hover:bg-zinc-950/40 transition-colors"
                    >
                      <td className="py-4 px-6">
                        <div className="font-bold text-white">
                          {assignment.clientName || "Client"}
                        </div>
                        <div className="text-[10px] text-zinc-500 font-mono mt-0.5">{assignment.clientEmail}</div>
                      </td>
                      <td className="py-4 px-6">
                        {assignment.freelancerEmail ? (
                          <>
                            <div className="font-bold text-white">
                              {assignment.freelancerName || "Freelancer"}
                            </div>
                            <div className="text-[10px] text-zinc-500 font-mono mt-0.5">{assignment.freelancerEmail}</div>
                          </>
                        ) : (
                          <span className="text-zinc-650 italic">Unassigned</span>
                        )}
                      </td>
                      <td className="py-4 px-6 font-medium text-zinc-300 max-w-xs truncate">
                        {assignment.projectTitle}
                      </td>
                      <td className="py-4 px-6">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded border text-[9px] font-bold uppercase tracking-widest ${getStatusBadgeClass(assignment.projectStatus)}`}>
                          {assignment.projectStatus.replace("_", " ")}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right">
                        {assignment.disputeId ? (
                          <Link
                            href={`/disputes/${assignment.disputeId}`}
                            className="border border-zinc-800 hover:border-zinc-700 bg-zinc-950 text-white font-bold text-[10px] uppercase tracking-widest px-3 py-1.5 rounded transition-colors inline-flex items-center gap-1"
                          >
                            Review Case
                            <ArrowRight className="w-3 h-3 text-zinc-400" />
                          </Link>
                        ) : (
                          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-650">No Active Dispute</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile / Tablet Card View */}
          <div className="block lg:hidden space-y-4">
            {assignments.map((assignment) => (
              <div
                key={assignment.projectId}
                className="border border-zinc-850 bg-black rounded-lg p-5 space-y-4"
              >
                <div className="flex justify-between items-start gap-4">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-bold text-white break-words">
                      {assignment.projectTitle}
                    </h3>
                    <span className={`mt-2 inline-flex items-center px-2 py-0.5 rounded border text-[9px] font-bold uppercase tracking-widest ${getStatusBadgeClass(assignment.projectStatus)}`}>
                      {assignment.projectStatus.replace("_", " ")}
                    </span>
                  </div>
                  <div className="flex-shrink-0">
                    {assignment.disputeId ? (
                      <Link
                        href={`/disputes/${assignment.disputeId}`}
                        className="bg-white hover:bg-zinc-200 text-black font-bold text-[10px] uppercase tracking-widest px-3 py-1.5 rounded transition-colors inline-flex items-center gap-1"
                      >
                        Review
                        <ArrowRight className="w-3 h-3 text-black" />
                      </Link>
                    ) : (
                      <span className="text-[9px] font-bold text-zinc-550 bg-zinc-950 px-2 py-1 rounded border border-zinc-850">
                        No Dispute
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-3 border-t border-zinc-900 text-xs">
                  <div className="min-w-0">
                    <div className="text-[9px] font-bold uppercase tracking-wider text-zinc-500 mb-1">
                      Client
                    </div>
                    <div className="font-bold text-white truncate">
                      {assignment.clientName || "Client"}
                    </div>
                    <div className="text-[10px] text-zinc-550 truncate font-mono">
                      {assignment.clientEmail}
                    </div>
                  </div>

                  <div className="min-w-0">
                    <div className="text-[9px] font-bold uppercase tracking-wider text-zinc-500 mb-1">
                      Freelancer
                    </div>
                    {assignment.freelancerEmail ? (
                      <>
                        <div className="font-bold text-white truncate">
                          {assignment.freelancerName || "Freelancer"}
                        </div>
                        <div className="text-[10px] text-zinc-550 truncate font-mono">
                          {assignment.freelancerEmail}
                        </div>
                      </>
                    ) : (
                      <span className="text-zinc-650 italic">Unassigned</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
