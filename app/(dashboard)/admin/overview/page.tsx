"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ProjectStatus } from "@prisma/client";
import { Shield, IndianRupee, AlertTriangle, Cpu, ArrowRight, Layers } from "lucide-react";

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
      case "COMPLETED":
        return "bg-zinc-900 text-white border-zinc-800";
      case "CANCELLED":
      case "CLOSED":
        return "bg-zinc-950 text-zinc-550 border-zinc-900";
      default:
        return "bg-zinc-950 text-zinc-400 border-zinc-850";
    }
  };

  const getStatusColorClass = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return "bg-white";
      case "CANCELLED":
      case "CLOSED":
        return "bg-zinc-800";
      default:
        return "bg-zinc-500";
    }
  };

  if (loading) {
    return (
      <div className="flex-grow flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 rounded-full border-2 border-zinc-800 border-t-white animate-spin" />
          <p className="text-zinc-550 text-[10px] font-bold uppercase tracking-widest">Loading platform metrics...</p>
        </div>
      </div>
    );
  }

  if (errorMsg || !stats) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center animate-fadeIn">
        <div className="bg-red-950/20 border border-red-900/50 p-6 rounded">
          <p className="text-xs font-semibold text-red-400 mb-3">Error: {errorMsg || "Failed to load stats"}</p>
        </div>
      </div>
    );
  }

  const totalProjects = Object.values(stats.projectsByStatus).reduce((sum, count) => sum + count, 0);

  return (
    <div className="space-y-8 w-full min-w-0 animate-fadeIn text-left text-zinc-300">
      
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">
          <span>Platform</span>
          <span>&gt;</span>
          <span className="text-zinc-400 font-bold">Administrative Dashboard</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-white leading-tight">Administrative Control</h1>
        <p className="text-xs text-zinc-550 font-light mt-1">
          Operational status logs and platform metrics summary.
        </p>
      </div>

      {/* Overview Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Metric 1 */}
        <div className="border border-zinc-800 bg-[#09090b]/40 rounded-lg p-5 flex flex-col justify-between">
          <div>
            <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">
              Total Financial Volume
            </div>
            <div className="text-2xl font-bold text-white font-mono">₹{stats.totalPaymentVolume.toLocaleString()}</div>
          </div>
          <div className="text-[9px] text-zinc-600 mt-4 font-mono uppercase tracking-wider">Sum of captured payments.</div>
        </div>

        {/* Metric 2 */}
        <div className="border border-zinc-800 bg-[#09090b]/40 rounded-lg p-5 flex flex-col justify-between">
          <div>
            <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">
              Active Dispute Tickets
            </div>
            <div className="text-2xl font-bold text-red-400 font-mono">{stats.openDisputesCount}</div>
          </div>
          <div className="text-[9px] mt-4 font-bold uppercase tracking-wider">
            <Link href="/admin/disputes" className="text-white hover:underline flex items-center gap-1">
              Resolve disputes &gt;
            </Link>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="border border-[var(--border)] bg-[var(--surface)] rounded-lg p-5 flex flex-col justify-between shadow-sm">
          <div>
            <div className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
              Total Projects Count
            </div>
            <div className="text-2xl font-bold text-[var(--text-primary)] font-mono">{totalProjects}</div>
          </div>
          <div className="text-[9px] text-[var(--text-muted)] mt-4 font-mono uppercase tracking-wider">Active project listings.</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Projects status distribution */}
        <div className="border border-[var(--border)] bg-[var(--surface)] rounded-lg p-6 lg:col-span-2 space-y-4 shadow-sm">
          <h2 className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider pb-2 border-b border-[var(--border)]">Project Status Distribution</h2>
          <div className="divide-y divide-[var(--border-subtle)] text-xs">
            {Object.entries(stats.projectsByStatus).map(([status, count]) => {
              const pct = totalProjects > 0 ? (count / totalProjects) * 100 : 0;
              return (
                <div key={status} className="flex flex-col sm:flex-row sm:items-center justify-between py-3.5 gap-2">
                  <div className="flex-shrink-0 w-36">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded border text-[9px] font-bold uppercase tracking-widest ${getStatusBadgeClass(status)}`}>
                      {status.replace("_", " ")}
                    </span>
                  </div>
                  
                  {/* Visual weight bar indicator */}
                  <div className="flex-grow h-1.5 bg-[var(--surface-subtle)] border border-[var(--border)] rounded overflow-hidden mx-0 sm:mx-4">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${getStatusColorClass(status)}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  
                  <div className="flex-shrink-0 text-right font-bold text-[var(--text-primary)] flex items-center gap-1.5 font-mono text-[10px]">
                    <span>{count}</span>
                    <span className="text-[9px] text-[var(--text-muted)] font-normal font-sans">({pct.toFixed(0)}%)</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Maintenance card */}
        <div className="border border-[var(--border)] bg-[var(--surface)] rounded-lg p-6 flex flex-col justify-between h-full min-h-[300px] shadow-sm">
          <div>
            <div className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
              Cron Maintenance
            </div>
            <h3 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider mb-1">Platform Orchestration</h3>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed mb-4 font-light">
              Trigger standard auto-release cron cycles manually to release escrow milestone holds for assignments completed past deadline.
            </p>
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
            className="border border-[var(--border)] hover:border-[var(--text-primary)] bg-[var(--surface-subtle)] text-[var(--text-primary)] font-bold text-[10px] uppercase tracking-widest py-2.5 rounded transition-colors text-center w-full block cursor-pointer"
          >
            Trigger Auto-Release
          </button>
        </div>
      </div>
    </div>
  );
}
