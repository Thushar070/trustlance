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
      case DisputeStatus.RESOLVED:
        return "bg-zinc-900 text-white border-zinc-800";
      case DisputeStatus.OPEN:
      case DisputeStatus.ADMIN_REVIEW:
        return "bg-yellow-950/20 text-yellow-400 border-yellow-900/50";
      default:
        return "bg-zinc-950 text-zinc-400 border-zinc-850";
    }
  };

  if (loading) {
    return (
      <div className="flex-grow flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 rounded-full border-2 border-zinc-800 border-t-white animate-spin" />
          <p className="text-zinc-550 text-[10px] font-bold uppercase tracking-widest">Loading disputes queue...</p>
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
          <span className="text-zinc-400 font-bold">Disputes Logs</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-white leading-tight">Admin Disputes Queue</h1>
        <p className="text-xs text-zinc-550 font-light mt-1">
          Review evidence files, verify contractual milestones, and resolve active platform disputes.
        </p>
      </div>

      {disputes.length === 0 ? (
        <div className="border border-zinc-800 bg-[#09090b]/40 rounded-lg p-16 text-center">
          <Shield className="w-8 h-8 text-zinc-650 mx-auto mb-4" />
          <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-1">Queue is Empty</h2>
          <p className="text-xs text-zinc-600 font-light max-w-sm mx-auto">
            All disputes have been resolved. Excellent work!
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
                    <th className="py-4 px-6">Project Title</th>
                    <th className="py-4 px-6">Client</th>
                    <th className="py-4 px-6">Freelancer</th>
                    <th className="py-4 px-6 text-right">Amount in Dispute</th>
                    <th className="py-4 px-6">Days Open</th>
                    <th className="py-4 px-6">Status</th>
                    <th className="py-4 px-6 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900 bg-black">
                  {disputes.map((dispute) => {
                    const projectObj = dispute.escrow?.project;
                    const clientName = projectObj?.client?.name || "Client";
                    const freelancerName = projectObj?.freelancer?.name || "Freelancer";
                    const amount = projectObj?.agreedAmount || projectObj?.budget || 0;

                    return (
                      <tr key={dispute.id} className="hover:bg-zinc-950/40 transition-colors">
                        <td className="py-4 px-6 font-medium text-zinc-300 max-w-xs truncate">
                          {projectObj?.title}
                        </td>
                        <td className="py-4 px-6 text-zinc-400">
                          {clientName}
                        </td>
                        <td className="py-4 px-6 text-zinc-400">
                          {freelancerName}
                        </td>
                        <td className="py-4 px-6 text-right font-bold text-white font-mono">
                          ₹{amount.toLocaleString()}
                        </td>
                        <td className="py-4 px-6 text-zinc-400 font-mono">
                          {getDaysOpen(dispute.createdAt)}
                        </td>
                        <td className="py-4 px-6">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded border text-[9px] font-bold uppercase tracking-widest ${getStatusBadge(dispute.status)}`}>
                            {dispute.status.replace("_", " ")}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-right">
                          <Link
                            href={`/disputes/${dispute.id}`}
                            className="border border-zinc-800 hover:border-zinc-700 bg-zinc-950 text-white font-bold text-[10px] uppercase tracking-widest px-3 py-1.5 rounded transition-colors inline-flex items-center gap-1"
                          >
                            Review Case <ArrowRight className="w-3 h-3 text-zinc-400" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile / Tablet Card View */}
          <div className="block lg:hidden space-y-4">
            {disputes.map((dispute) => {
              const projectObj = dispute.escrow?.project;
              const clientName = projectObj?.client?.name || "Client";
              const freelancerName = projectObj?.freelancer?.name || "Freelancer";
              const amount = projectObj?.agreedAmount || projectObj?.budget || 0;

              return (
                <div
                  key={dispute.id}
                  className="border border-zinc-850 bg-black rounded-lg p-5 space-y-4"
                >
                  <div className="flex justify-between items-start gap-4">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-bold text-white break-words">
                        {projectObj?.title}
                      </h3>
                      <span className={`mt-2 inline-flex items-center px-2 py-0.5 rounded border text-[9px] font-bold uppercase tracking-widest ${getStatusBadge(dispute.status)}`}>
                        {dispute.status.replace("_", " ")}
                      </span>
                    </div>
                    <div className="flex-shrink-0">
                      <Link
                        href={`/disputes/${dispute.id}`}
                        className="bg-white hover:bg-zinc-200 text-black font-bold text-[10px] uppercase tracking-widest px-3 py-1.5 rounded transition-colors inline-flex items-center gap-1"
                      >
                        Review
                        <ArrowRight className="w-3 h-3 text-black" />
                      </Link>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-3 border-t border-zinc-900 text-xs">
                    <div className="min-w-0">
                      <div className="text-[9px] font-bold uppercase tracking-wider text-zinc-550 mb-1">
                        Client
                      </div>
                      <div className="font-bold text-white truncate">
                        {clientName}
                      </div>
                      <div className="text-[10px] text-zinc-550 truncate font-mono">
                        {projectObj?.client?.email}
                      </div>
                    </div>

                    <div className="min-w-0">
                      <div className="text-[9px] font-bold uppercase tracking-wider text-zinc-550 mb-1">
                        Freelancer
                      </div>
                      <div className="font-bold text-white truncate">
                        {freelancerName}
                      </div>
                      <div className="text-[10px] text-zinc-550 truncate font-mono">
                        {projectObj?.freelancer?.email || "Unassigned"}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-3 border-t border-zinc-900 text-xs">
                    <div>
                      <div className="text-[9px] font-bold uppercase tracking-wider text-zinc-550 mb-0.5">
                        Amount in Dispute
                      </div>
                      <div className="text-sm font-bold text-white font-mono">
                        ₹{amount.toLocaleString()}
                      </div>
                    </div>

                    <div>
                      <div className="text-[9px] font-bold uppercase tracking-wider text-zinc-550 mb-0.5">
                        Days Open
                      </div>
                      <div className="text-sm font-bold text-white font-mono">
                        {getDaysOpen(dispute.createdAt)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
