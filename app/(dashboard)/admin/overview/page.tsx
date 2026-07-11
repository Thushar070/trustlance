"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ProjectStatus } from "@prisma/client";

interface OverviewStats {
  projectsByStatus: Record<ProjectStatus, number>;
  openDisputesCount: number;
  totalPaymentVolume: number;
}

export default function AdminOverviewPage() {
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch("/api/admin/overview");
        if (!response.ok) {
          throw new Error("Failed to fetch admin overview statistics.");
        }
        const data = await response.json();
        setStats(data);
      } catch (err: unknown) {
        setErrorMsg(err instanceof Error ? err.message : "Error loading dashboard statistics.");
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "OPEN":
        return "bg-sky-50 text-sky-700 border-sky-200";
      case "ASSIGNED":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "IN_PROGRESS":
        return "bg-violet-50 text-violet-700 border-violet-200";
      case "UNDER_REVIEW":
        return "bg-indigo-50 text-indigo-700 border-indigo-200";
      case "COMPLETED":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "CANCELLED":
        return "bg-red-50 text-red-700 border-red-200";
      case "CLOSED":
        return "bg-slate-100 text-slate-600 border-slate-200";
      default:
        return "bg-slate-100 text-slate-600 border-slate-200";
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 font-mono">
        <div className="text-sm text-slate-400 italic animate-pulse">Loading platform metrics...</div>
      </div>
    );
  }

  if (errorMsg || !stats) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 font-mono">
        <div className="text-sm text-red-600">Error: {errorMsg || "Failed to load stats"}</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 font-mono text-xs text-slate-600">
      <div className="mb-8 pb-4 border-b border-slate-200">
        <h1 className="text-lg font-bold text-slate-900 uppercase tracking-wider">Platform Administration Overview</h1>
        <p className="text-slate-400 mt-1">Operational status logs and platform metrics summary.</p>
      </div>

      {/* Overview Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        {/* Metric 1 */}
        <div className="bg-white p-5 border border-slate-200 rounded-xl shadow-sm">
          <div className="text-slate-400 uppercase font-bold tracking-wider mb-2">Total Financial Volume</div>
          <div className="text-2xl font-black text-slate-900">₹{stats.totalPaymentVolume.toLocaleString()}</div>
          <div className="text-[10px] text-slate-400 mt-1">Sum of all successfully captured payments.</div>
        </div>

        {/* Metric 2 */}
        <div className="bg-white p-5 border border-slate-200 rounded-xl shadow-sm">
          <div className="text-slate-400 uppercase font-bold tracking-wider mb-2">Active Dispute Tickets</div>
          <div className="text-2xl font-black text-red-600">{stats.openDisputesCount}</div>
          <div className="text-[10px] text-slate-400 mt-1">
            <Link href="/admin/disputes" className="text-indigo-600 hover:underline">
              Resolve disputes page →
            </Link>
          </div>
        </div>

        {/* Metric 3: Actions */}
        <div className="bg-white p-5 border border-slate-200 rounded-xl shadow-sm flex flex-col justify-between">
          <div>
            <div className="text-slate-400 uppercase font-bold tracking-wider mb-2">Cron Maintenance</div>
            <div className="text-[10px] text-slate-400">Trigger standard auto-release cron cycles manually.</div>
          </div>
          <button
            onClick={async () => {
              if (confirm("Run auto-release sequence for all pending review projects?")) {
                try {
                  const res = await fetch("/api/admin/run-auto-release", { method: "POST" });
                  if (!res.ok) throw new Error("Error running auto-release");
                  const result = await res.json();
                  alert(`Auto-release run completed.\nReleased: ${result.released} projects\nWarned: ${result.warned} projects`);
                  window.location.reload();
                } catch (err: unknown) {
                  alert(err instanceof Error ? err.message : "Failure executing trigger");
                }
              }
            }}
            className="mt-3 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded font-bold uppercase tracking-wider text-center text-[10px] cursor-pointer transition-colors"
          >
            Trigger Auto-Release
          </button>
        </div>
      </div>

      {/* Projects status distribution */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
        <h2 className="text-sm font-bold text-slate-900 uppercase tracking-widest mb-4">Project Status Distribution</h2>
        <div className="divide-y divide-slate-150">
          {Object.entries(stats.projectsByStatus).map(([status, count]) => (
            <div key={status} className="flex justify-between items-center py-2.5">
              <span className={`inline-flex items-center px-2 py-0.5 rounded border text-[10px] font-bold uppercase tracking-wider ${getStatusBadgeClass(status)}`}>
                {status.replace("_", " ")}
              </span>
              <span className="font-bold text-slate-900 text-sm">{count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
