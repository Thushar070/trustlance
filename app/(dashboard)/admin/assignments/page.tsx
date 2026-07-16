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
          <div className="w-6 h-6 rounded-full border-2 border-[var(--border)] border-t-[var(--accent)] animate-spin" />
          <p className="text-[var(--text-muted)] text-sm">Loading assignments directory...</p>
        </div>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <div className="bg-[var(--status-negative-bg)] border border-[var(--status-negative-border)] p-4 rounded-lg flex items-start gap-3 justify-center">
          <AlertTriangle className="w-4.5 h-4.5 text-[var(--status-negative-text)] flex-shrink-0 mt-0.5" />
          <p className="text-sm text-[var(--status-negative-text)] font-semibold">{errorMsg}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full min-w-0 animate-fadeIn">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <Users className="w-5 h-5 text-[var(--accent)]" />
          <h1 className="text-2xl font-black text-[var(--text-primary)] tracking-tight">Contract Assignments Directory</h1>
        </div>
        <p className="text-sm text-[var(--text-secondary)] mt-1 font-medium">
          Monitor assigned projects, client-freelancer connections, and active dispute reviews.
        </p>
      </div>

      {assignments.length === 0 ? (
        <div className="card p-16 text-center">
          <div className="empty-state">
            <Shield className="empty-state-icon text-[var(--text-muted)]" />
            <h2 className="empty-state-title">No Active Assignments</h2>
            <p className="empty-state-text">
              There are currently no projects with assigned freelancers or active contracts.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Desktop Table View */}
          <div className="card shadow-sm overflow-hidden hidden lg:block">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--surface-subtle)] text-[var(--text-muted)] font-bold uppercase text-[10px] tracking-wider">
                    <th className="py-4 px-6">Client</th>
                    <th className="py-4 px-6">Freelancer</th>
                    <th className="py-4 px-6">Project Title</th>
                    <th className="py-4 px-6">Status</th>
                    <th className="py-4 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)]">
                  {assignments.map((assignment) => (
                    <tr
                      key={assignment.projectId}
                      className="group hover:bg-[var(--surface-subtle)]/50 transition-colors duration-150"
                    >
                      <td className="py-4 px-6">
                        <div className="font-semibold text-[var(--text-primary)]">
                          {assignment.clientName || "Client"}
                        </div>
                        <div className="text-xs text-[var(--text-muted)]">{assignment.clientEmail}</div>
                      </td>
                      <td className="py-4 px-6">
                        {assignment.freelancerEmail ? (
                          <>
                            <div className="font-semibold text-[var(--text-primary)]">
                              {assignment.freelancerName || "Freelancer"}
                            </div>
                            <div className="text-xs text-[var(--text-muted)]">{assignment.freelancerEmail}</div>
                          </>
                        ) : (
                          <span className="text-xs text-[var(--text-muted)]">Unassigned</span>
                        )}
                      </td>
                      <td className="py-4 px-6 font-semibold text-[var(--text-primary)] max-w-xs truncate">
                        {assignment.projectTitle}
                      </td>
                      <td className="py-4 px-6">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadgeClass(assignment.projectStatus)}`}>
                          {assignment.projectStatus}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right">
                        {assignment.disputeId ? (
                          <Link
                            href={`/disputes/${assignment.disputeId}`}
                            className="btn-ghost px-3 py-1.5 hover:bg-[var(--accent)] hover:text-white hover:border-transparent transition-all inline-flex items-center gap-1.5"
                          >
                            Review Case
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                        ) : (
                          <span className="text-xs text-[var(--text-muted)]">No Active Dispute</span>
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
                  className="card p-5 space-y-4 hover:-translate-y-0.5 hover:shadow-[var(--card-shadow-hover)] transition-all duration-200 animate-slideUp"
                >
                <div className="flex justify-between items-start gap-4">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-bold text-[var(--text-primary)] leading-snug break-words">
                      {assignment.projectTitle}
                    </h3>
                    <span className={`mt-2 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${getStatusBadgeClass(assignment.projectStatus)}`}>
                      {assignment.projectStatus}
                    </span>
                  </div>
                  <div className="flex-shrink-0">
                    {assignment.disputeId ? (
                      <Link
                        href={`/disputes/${assignment.disputeId}`}
                        className="btn-primary px-3 py-1.5 text-[11px] hover:bg-[var(--accent-hover)] shrink-0"
                      >
                        <span>Review</span>
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    ) : (
                      <span className="text-[10px] font-semibold text-[var(--text-muted)] bg-[var(--surface-subtle)] px-2.5 py-1 rounded-md border border-[var(--border)]">
                        No Dispute
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-3 border-t border-[var(--border-subtle)] text-xs">
                  <div className="min-w-0">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1">
                      Client
                    </div>
                    <div className="font-semibold text-[var(--text-primary)] truncate">
                      {assignment.clientName || "Client"}
                    </div>
                    <div className="text-[var(--text-muted)] truncate">
                      {assignment.clientEmail}
                    </div>
                  </div>

                  <div className="min-w-0">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1">
                      Freelancer
                    </div>
                    {assignment.freelancerEmail ? (
                      <>
                        <div className="font-semibold text-[var(--text-primary)] truncate">
                          {assignment.freelancerName || "Freelancer"}
                        </div>
                        <div className="text-[var(--text-muted)] truncate">
                          {assignment.freelancerEmail}
                        </div>
                      </>
                    ) : (
                      <span className="text-[var(--text-muted)] italic">Unassigned</span>
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
