"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { DisputeStatus } from "@prisma/client";
import { AlertTriangle, Shield, ArrowRight } from "lucide-react";

interface DisputeItem {
  id: string;
  raisedBy: string;
  reason: string;
  status: DisputeStatus;
  createdAt: string;
  escrow: {
    id: string;
    project: {
      id: string;
      title: string;
      budget: number;
      agreedAmount: number | null;
      client: {
        name: string | null;
        email: string;
      };
      freelancer?: {
        name: string | null;
        email: string;
      } | null;
    };
  };
}

export default function AdminDisputesPage() {
  const [disputes, setDisputes] = useState<DisputeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const fetchDisputes = async () => {
      try {
        const res = await fetch("/api/disputes");
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Failed to load disputes queue");
        }
        const data = await res.json();
        setDisputes(data);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "An error occurred.";
        setErrorMsg(msg);
      } finally {
        setLoading(false);
      }
    };

    fetchDisputes();
  }, []);

  const getDaysOpen = (dateStr: string) => {
    const diffTime = Math.abs(new Date().getTime() - new Date(dateStr).getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays === 1 ? "1 day" : `${diffDays} days`;
  };

  const getStatusBadge = (status: DisputeStatus) => {
    switch (status) {
      case DisputeStatus.OPEN:
        return "bg-[var(--status-open-bg)] text-[var(--status-open-text)] border-[var(--status-open-border)]";
      case DisputeStatus.ADMIN_REVIEW:
        return "bg-[var(--status-review-bg)] text-[var(--status-review-text)] border-[var(--status-review-border)]";
      case DisputeStatus.RESOLVED:
        return "bg-[var(--status-success-bg)] text-[var(--status-success-text)] border-[var(--status-success-border)]";
      default:
        return "bg-[var(--status-neutral-bg)] text-[var(--status-neutral-text)] border-[var(--status-neutral-border)]";
    }
  };

  if (loading) {
    return (
      <div className="flex-grow flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 rounded-full border-2 border-slate-200 border-t-[var(--accent)] animate-spin" />
          <p className="text-slate-400 text-sm">Loading disputes queue...</p>
        </div>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <div className="bg-[var(--status-negative-bg)] border border-[var(--status-negative-border)] p-4 rounded-lg flex items-start gap-3">
          <AlertTriangle className="w-4.5 h-4.5 text-[var(--status-negative-text)] flex-shrink-0 mt-0.5" />
          <p className="text-sm text-[var(--status-negative-text)] font-semibold">{errorMsg}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <Shield className="w-5 h-5 text-[var(--accent)]" />
          <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">Admin Disputes Queue</h1>
        </div>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Review evidence files, verify contractual milestones, and resolve active platform disputes.
        </p>
      </div>

      {disputes.length === 0 ? (
        <div className="bg-white rounded-xl border border-[var(--border)] shadow-sm p-16 text-center">
          <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <Shield className="w-6 h-6 text-[var(--status-success-text)]" />
          </div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-1">Queue is Empty</h2>
          <p className="text-sm text-[var(--text-secondary)] max-w-sm mx-auto">
            All disputes have been resolved. Excellent work!
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-[var(--border)] shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] bg-slate-50/50 text-[var(--text-muted)] font-bold uppercase text-[10px] tracking-wider">
                  <th className="py-4 px-6">Project Title</th>
                  <th className="py-4 px-6">Client</th>
                  <th className="py-4 px-6">Freelancer</th>
                  <th className="py-4 px-6 text-right">Amount in Dispute</th>
                  <th className="py-4 px-6">Days Open</th>
                  <th className="py-4 px-6">Status</th>
                  <th className="py-4 px-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {disputes.map((dispute) => {
                  const projectObj = dispute.escrow?.project;
                  const clientName = projectObj?.client?.name || "Client";
                  const freelancerName = projectObj?.freelancer?.name || "Freelancer";
                  const amount = projectObj?.agreedAmount || projectObj?.budget || 0;

                  return (
                    <tr key={dispute.id} className="group hover:bg-slate-50/50 transition-colors duration-150">
                      <td className="py-4 px-6 font-semibold text-[var(--text-primary)] max-w-xs truncate">
                        {projectObj?.title}
                      </td>
                      <td className="py-4 px-6 text-[var(--text-secondary)]">
                        {clientName}
                      </td>
                      <td className="py-4 px-6 text-[var(--text-secondary)]">
                        {freelancerName}
                      </td>
                      <td className="py-4 px-6 text-right font-bold text-[var(--text-primary)]">
                        ₹{amount.toLocaleString()}
                      </td>
                      <td className="py-4 px-6 text-[var(--text-secondary)] font-medium">
                        {getDaysOpen(dispute.createdAt)}
                      </td>
                      <td className="py-4 px-6">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${getStatusBadge(dispute.status)}`}>
                          {dispute.status}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <Link
                          href={`/disputes/${dispute.id}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 border border-[var(--border)] hover:border-[var(--accent)] text-xs font-semibold rounded-lg text-slate-650 hover:text-[var(--accent)] hover:bg-[var(--accent-light)] transition-colors"
                        >
                          Review Case <ArrowRight className="w-3 h-3" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
