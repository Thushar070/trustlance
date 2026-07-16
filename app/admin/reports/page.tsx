"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { 
  ShieldAlert, 
  Calendar, 
  ExternalLink, 
  AlertTriangle,
  Info
} from "lucide-react";

interface ReportItem {
  id: string;
  reason: string;
  createdAt: string;
  reporterId: string;
  reporterName: string;
  reporterRole: string;
  reportedUserId: string;
  reportedName: string;
  reportedRole: string;
}

export default function AdminReportsPage() {
  const { data: session, status } = useSession();
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/admin/reports");
        if (!res.ok) {
          if (res.status === 403) {
            throw new Error("Forbidden: Admin privileges are required.");
          }
          throw new Error("Failed to load reports.");
        }
        const data = await res.json();
        setReports(data || []);
      } catch (err: unknown) {
        setErrorMsg(err instanceof Error ? err.message : "An error occurred.");
      } finally {
        setLoading(false);
      }
    };

    if (session?.user) {
      fetchReports();
    }
  }, [session]);

  if (status === "loading" || loading) {
    return (
      <div className="flex-grow flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 rounded-full border-2 border-[var(--border)] border-t-[var(--accent)] animate-spin" />
          <p className="text-[var(--text-muted)] text-sm">Loading reports logs...</p>
        </div>
      </div>
    );
  }

  if (!session?.user || session.user.role !== "ADMIN") {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="bg-[var(--status-negative-bg)] border border-[var(--status-negative-border)] p-5 rounded-xl flex items-start gap-3 justify-center text-center max-w-md mx-auto">
          <AlertTriangle className="w-5 h-5 text-[var(--status-negative-text)] mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-bold text-[var(--status-negative-text)] mb-1">Access Restricted</h3>
            <p className="text-xs text-[var(--status-negative-text)] opacity-90">
              Only authenticated administrators are authorized to access this dashboard.
            </p>
          </div>
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
          <span className="text-zinc-400 font-bold">Flag Reports Log</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-white leading-tight">Profile Flag Reports</h1>
        <p className="text-xs text-zinc-550 font-light mt-1">
          Audit flagged user accounts and review reasons submitted by other marketplace participants.
        </p>
      </div>

      {errorMsg && (
        <div className="bg-red-950/20 border border-red-900/50 p-4 rounded text-xs text-red-400">
          <p className="font-semibold">{errorMsg}</p>
        </div>
      )}

      {reports.length === 0 ? (
        <div className="border border-zinc-800 bg-[#09090b]/40 rounded-lg p-16 text-center">
          <Info className="w-8 h-8 text-zinc-650 mx-auto mb-4" />
          <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-1">No Profile Reports</h3>
          <p className="text-xs text-zinc-600 font-light max-w-sm mx-auto">
            Excellent! There are no flagged user profile reports currently pending administrator review.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => (
            <div
              key={report.id}
              className="border border-zinc-850 bg-black rounded-lg p-5 space-y-4 text-left"
            >
              {/* Conflict Parties info */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-zinc-950 p-4 rounded border border-zinc-900">
                <div className="flex flex-wrap items-center gap-3">
                  <div>
                    <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest block mb-0.5">
                      Reporter
                    </span>
                    <Link
                      href={`/profiles/${report.reporterId}`}
                      className="text-xs font-bold text-white hover:underline flex items-center gap-1.5"
                    >
                      {report.reporterName}
                      <span className="px-1.5 py-0.2 rounded border border-zinc-800 bg-zinc-950 text-[8px] uppercase font-bold text-zinc-400">
                        {report.reporterRole}
                      </span>
                    </Link>
                  </div>

                  <span className="text-[10px] font-bold text-zinc-550 mt-4 sm:mt-0 font-mono">➔</span>

                  <div>
                    <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest block mb-0.5">
                      Reported Profile
                    </span>
                    <Link
                      href={`/profiles/${report.reportedUserId}`}
                      className="text-xs font-bold text-white hover:underline flex items-center gap-1.5"
                    >
                      {report.reportedName}
                      <span className="px-1.5 py-0.2 rounded border border-zinc-800 bg-zinc-950 text-[8px] uppercase font-bold text-zinc-400">
                        {report.reportedRole}
                      </span>
                    </Link>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-[9px] text-zinc-500 font-mono shrink-0 self-end sm:self-auto">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{new Date(report.createdAt).toLocaleString()}</span>
                </div>
              </div>

              {/* Reported details */}
              <div className="space-y-1.5">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                  Reason for Flag
                </h4>
                <div className="bg-zinc-950 border border-zinc-900 rounded p-4 text-xs text-zinc-300 leading-relaxed font-light whitespace-pre-wrap select-text italic">
                  "{report.reason}"
                </div>
              </div>

              {/* Profile links */}
              <div className="flex justify-end gap-3 pt-2">
                <Link
                  href={`/profiles/${report.reportedUserId}`}
                  className="border border-zinc-800 hover:border-zinc-700 bg-zinc-950 text-white font-bold text-[10px] uppercase tracking-widest px-3 py-1.5 rounded transition-colors inline-flex items-center justify-center gap-1"
                >
                  Inspect Flagged Profile
                  <ExternalLink className="w-3 h-3 text-zinc-400" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
