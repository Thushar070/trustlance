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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full min-w-0 animate-fadeIn">
      
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-black text-[var(--text-primary)] tracking-tight mb-1 flex items-center gap-2">
          <ShieldAlert className="w-6.5 h-6.5 text-[var(--status-negative-text)]" />
          Profile Flag Reports
        </h1>
        <p className="text-sm text-[var(--text-secondary)] font-medium">
          Audit flagged user accounts and review reasons submitted by other marketplace participants.
        </p>
      </div>

      {errorMsg && (
        <div className="mb-6 bg-[var(--status-negative-bg)] border border-[var(--status-negative-border)] p-4 rounded-xl flex items-start gap-3 animate-fadeIn">
          <AlertTriangle className="w-4.5 h-4.5 text-[var(--status-negative-text)] mt-0.5 flex-shrink-0" />
          <p className="text-sm text-[var(--status-negative-text)] font-semibold">{errorMsg}</p>
        </div>
      )}

      {reports.length === 0 ? (
        <div className="card p-16 text-center">
          <div className="empty-state">
            <Info className="empty-state-icon" />
            <h3 className="empty-state-title">No Profile Reports</h3>
            <p className="empty-state-text">
              Excellent! There are no flagged user profile reports currently pending administrator review.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => (
            <div
              key={report.id}
              className="card p-5 space-y-4 hover:-translate-y-0.5 hover:shadow-[var(--card-shadow-hover)] transition-all duration-200 animate-slideUp"
            >
              {/* Conflict Parties info */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[var(--surface-subtle)] p-4 rounded-xl border border-[var(--border-subtle)]">
                <div className="flex flex-wrap items-center gap-3">
                  <div>
                    <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider block">
                      Reporter
                    </span>
                    <Link
                      href={`/profiles/${report.reporterId}`}
                      className="text-xs font-bold text-[var(--text-primary)] hover:text-[var(--accent)] transition-colors flex items-center gap-1"
                    >
                      {report.reporterName}
                      <span className="px-1.5 py-0.2 rounded border bg-[var(--border-subtle)] text-[9px] uppercase font-bold text-[var(--text-secondary)]">
                        {report.reporterRole}
                      </span>
                    </Link>
                  </div>

                  <span className="text-xs font-semibold text-[var(--text-muted)] mt-4 sm:mt-0">➔ Flagged User:</span>

                  <div>
                    <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider block">
                      Reported Profile
                    </span>
                    <Link
                      href={`/profiles/${report.reportedUserId}`}
                      className="text-xs font-bold text-[var(--text-primary)] hover:underline transition-colors flex items-center gap-1"
                    >
                      {report.reportedName}
                      <span className="px-1.5 py-0.2 rounded border bg-[var(--border-subtle)] text-[9px] uppercase font-bold text-[var(--text-secondary)]">
                        {report.reportedRole}
                      </span>
                    </Link>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] font-medium shrink-0 self-end sm:self-auto">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{new Date(report.createdAt).toLocaleString()}</span>
                </div>
              </div>

              {/* Reported details */}
              <div className="space-y-1.5">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  Reason for Flag
                </h4>
                <div className="bg-[var(--input-bg)] border border-[var(--input-border)] rounded-xl p-4 text-xs text-[var(--text-primary)] leading-relaxed whitespace-pre-wrap select-text">
                  {report.reason}
                </div>
              </div>

              {/* Profile links */}
              <div className="flex justify-end gap-3 pt-2">
                <Link
                  href={`/profiles/${report.reportedUserId}`}
                  className="btn-ghost px-3 py-1.5 hover:bg-[var(--accent)] hover:text-white hover:border-transparent transition-all"
                >
                  Inspect Flagged Profile
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
