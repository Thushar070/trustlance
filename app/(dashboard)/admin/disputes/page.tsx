"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { DisputeStatus } from "@prisma/client";

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
        return "bg-amber-50 text-amber-700 border-amber-200";
      case DisputeStatus.ADMIN_REVIEW:
        return "bg-slate-100 text-slate-600 border-slate-200";
      case DisputeStatus.RESOLVED:
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      default:
        return "bg-slate-150 text-slate-600 border-slate-200";
    }
  };

  if (loading) {
    return (
      <div className="flex-grow flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 rounded-full border-2 border-slate-200 border-t-indigo-500 animate-spin" />
          <p className="text-slate-400 text-sm">Loading disputes queue...</p>
        </div>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-lg">
          <p className="text-sm text-red-700 font-semibold mb-2">{errorMsg}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Admin Disputes Queue</h1>
        <p className="text-sm text-slate-500 mt-1">
          Review evidence files, verify contractual milestones, and resolve active platform disputes.
        </p>
      </div>

      {disputes.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-lg shadow-slate-200/40 p-16 text-center">
          <span className="text-4xl mb-4 block">🛡️</span>
          <h2 className="text-lg font-bold text-slate-900 mb-1">Queue is Empty</h2>
          <p className="text-sm text-slate-500 max-w-sm mx-auto">
            All disputes have been resolved. Excellent work!
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-lg shadow-slate-200/40 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50 text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
                  <th className="py-4 px-6">Project Title</th>
                  <th className="py-4 px-6">Parties Involved</th>
                  <th className="py-4 px-6">Days Open</th>
                  <th className="py-4 px-6">Status</th>
                  <th className="py-4 px-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {disputes.map((dispute) => {
                  const clientName = dispute.escrow?.project?.client?.name || "Client";
                  const freelancerName = dispute.escrow?.project?.freelancer?.name || "Freelancer";
                  
                  return (
                    <tr key={dispute.id} className="group hover:bg-slate-50/50 transition-colors duration-150">
                      <td className="py-4 px-6 font-semibold text-slate-900 max-w-xs truncate">
                        {dispute.escrow?.project?.title}
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex flex-col">
                          <span className="text-xs text-slate-700">Client: <span className="font-semibold">{clientName}</span></span>
                          <span className="text-xs text-slate-500 mt-0.5">Freelancer: <span className="font-semibold">{freelancerName}</span></span>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-slate-650 font-medium">
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
                          className="inline-flex items-center px-3.5 py-1.5 border border-slate-200 hover:border-indigo-500 text-xs font-semibold rounded-lg text-slate-600 hover:text-indigo-600 hover:bg-indigo-50/30 transition-all duration-200 group-hover:border-indigo-300"
                        >
                          Review Case →
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
