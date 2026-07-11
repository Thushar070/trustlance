"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ProjectStatus } from "@prisma/client";
import { Shield, IndianRupee, AlertTriangle, Cpu, ArrowRight } from "lucide-react";

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
        return "bg-[var(--status-open-bg)] text-[var(--status-open-text)] border-[var(--status-open-border)]";
      case "ASSIGNED":
      case "IN_PROGRESS":
        return "bg-[var(--status-progress-bg)] text-[var(--status-progress-text)] border-[var(--status-progress-border)]";
      case "UNDER_REVIEW":
        return "bg-[var(--status-review-bg)] text-[var(--status-review-text)] border-[var(--status-review-border)]";
      case "COMPLETED":
        return "bg-[var(--status-success-bg)] text-[var(--status-success-text)] border-[var(--status-success-border)]";
      case "CANCELLED":
        return "bg-[var(--status-negative-bg)] text-[var(--status-negative-text)] border-[var(--status-negative-border)]";
      case "CLOSED":
        return "bg-[var(--status-neutral-bg)] text-[var(--status-neutral-text)] border-[var(--status-neutral-border)]";
      default:
        return "bg-[var(--status-neutral-bg)] text-[var(--status-neutral-text)] border-[var(--status-neutral-border)]";
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col items-center justify-center min-h-[300px] gap-3">
          <div className="w-6 h-6 rounded-full border-2 border-slate-200 border-t-[var(--accent)] animate-spin" />
          <p className="text-slate-400 text-sm font-medium">Loading platform metrics...</p>
        </div>
      </div>
    );
  }

  if (errorMsg || !stats) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="bg-[var(--status-negative-bg)] border border-[var(--status-negative-border)] p-4 rounded-lg flex items-start gap-3">
          <AlertTriangle className="w-4.5 h-4.5 text-[var(--status-negative-text)] flex-shrink-0 mt-0.5" />
          <p className="text-sm text-[var(--status-negative-text)] font-semibold">Error: {errorMsg || "Failed to load stats"}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8 border-b border-[var(--border)] pb-4">
        <div className="flex items-center gap-2 mb-1">
          <Shield className="w-5 h-5 text-[var(--accent)]" />
          <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">Platform Administration</h1>
        </div>
        <p className="text-sm text-[var(--text-secondary)] mt-1">Operational status logs and platform metrics summary.</p>
      </div>

      {/* Overview Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Metric 1 */}
        <div className="bg-white p-6 border border-[var(--border)] rounded-xl shadow-sm flex flex-col justify-between">
          <div>
            <div className="text-[var(--text-muted)] uppercase text-[10px] font-bold tracking-wider mb-2 flex items-center gap-1.5">
              <IndianRupee className="w-3.5 h-3.5 text-slate-400" />
              Total Financial Volume
            </div>
            <div className="text-2xl font-bold text-[var(--text-primary)]">₹{stats.totalPaymentVolume.toLocaleString()}</div>
          </div>
          <div className="text-[11px] text-[var(--text-muted)] mt-4 font-medium">Sum of all successfully captured payments.</div>
        </div>

        {/* Metric 2 */}
        <div className="bg-white p-6 border border-[var(--border)] rounded-xl shadow-sm flex flex-col justify-between">
          <div>
            <div className="text-[var(--text-muted)] uppercase text-[10px] font-bold tracking-wider mb-2 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-slate-400" />
              Active Dispute Tickets
            </div>
            <div className="text-2xl font-bold text-[var(--status-negative-text)]">{stats.openDisputesCount}</div>
          </div>
          <div className="text-[11px] text-[var(--text-muted)] mt-4 font-medium">
            <Link href="/admin/disputes" className="text-[var(--accent)] hover:text-[var(--accent-hover)] font-semibold flex items-center gap-1">
              Resolve disputes page <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Metric 3: Actions */}
        <div className="bg-white p-6 border border-[var(--border)] rounded-xl shadow-sm flex flex-col justify-between">
          <div>
            <div className="text-[var(--text-muted)] uppercase text-[10px] font-bold tracking-wider mb-2 flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-slate-400" />
              Cron Maintenance
            </div>
            <p className="text-[11px] text-[var(--text-muted)] font-medium leading-relaxed">Trigger standard auto-release cron cycles manually.</p>
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
            className="mt-4 w-full inline-flex justify-center items-center py-2 px-3 border border-[var(--border)] rounded-lg text-xs font-semibold text-[var(--text-primary)] bg-white hover:bg-slate-50 hover:border-slate-300 transition-colors cursor-pointer"
          >
            Trigger Auto-Release
          </button>
        </div>
      </div>

      {/* Projects status distribution */}
      <div className="bg-white border border-[var(--border)] rounded-xl shadow-sm p-6 max-w-2xl">
        <h2 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-4">Project Status Distribution</h2>
        <div className="divide-y divide-[var(--border-subtle)] text-sm">
          {Object.entries(stats.projectsByStatus).map(([status, count]) => (
            <div key={status} className="flex justify-between items-center py-3">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wider ${getStatusBadgeClass(status)}`}>
                {status.replace("_", " ")}
              </span>
              <span className="font-bold text-[var(--text-primary)]">{count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
