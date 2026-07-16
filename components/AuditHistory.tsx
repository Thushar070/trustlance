"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Role } from "@prisma/client";
import { ChevronDown, History, User, Clock, ArrowRight } from "lucide-react";

interface AuditLog {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  actorId: string;
  prevState: string | null;
  newState: string | null;
  createdAt: string;
}

interface AuditHistoryProps {
  entityId: string;
  entityType: "Project" | "Dispute";
}

export default function AuditHistory({ entityId, entityType }: AuditHistoryProps) {
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const isAdmin = session?.user?.role === Role.ADMIN;

  useEffect(() => {
    if (!isAdmin || !isOpen) return;

    const fetchLogs = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/audit-logs/${entityId}?type=${entityType}`);
        if (!res.ok) {
          throw new Error(`Failed to fetch logs: ${res.statusText}`);
        }
        const data = await res.json();
        setLogs(data);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, [entityId, entityType, isOpen, isAdmin]);

  if (!isAdmin) return null;

  return (
    <div className="card mt-8 p-4 bg-[var(--surface-subtle)]">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider hover:text-[var(--text-primary)] transition-colors focus:outline-none cursor-pointer"
        id="toggle-audit-history"
      >
        <span className="flex items-center gap-1.5">
          <History className="w-3.5 h-3.5 text-[var(--text-muted)]" />
          Audit History Log (Admin Only)
        </span>
        <ChevronDown
          className={`w-4 h-4 text-[var(--text-muted)] transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <div className="mt-4 pt-3 border-t border-[var(--border-subtle)]">
          {loading && (
            <p className="text-xs text-[var(--text-muted)] font-mono italic animate-pulse">Loading audit trail...</p>
          )}
          {error && (
            <p className="text-xs text-[var(--status-negative-text)] font-mono">Error: {error}</p>
          )}
          {!loading && !error && logs.length === 0 && (
            <p className="text-xs text-[var(--text-muted)] font-mono italic">No audit log records found for this {entityType.toLowerCase()}.</p>
          )}

          {!loading && !error && logs.length > 0 && (
            <div className="space-y-1.5 font-mono text-[11px] leading-relaxed text-[var(--text-secondary)] max-h-[300px] overflow-y-auto pr-1">
              {logs.map((log) => {
                const dateStr = new Date(log.createdAt).toISOString();
                const isExpanded = expandedLogId === log.id;

                const getActorDisplayName = (actorId: string) => {
                  if (actorId === "SYSTEM_AUTO_RELEASE") {
                    return "Auto-released (no client response)";
                  }
                  if (actorId === "SYSTEM_WEBHOOK") {
                    return "Payment webhook";
                  }
                  return actorId;
                };

                return (
                  <div key={log.id} className="border-b border-[var(--border-subtle)] pb-1 last:border-b-0">
                    <div
                      onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                      className="flex flex-col sm:flex-row sm:items-start gap-1.5 sm:gap-3 py-1.5 sm:py-1 cursor-pointer hover:bg-[var(--surface-elevated)] rounded px-1.5 transition-colors"
                    >
                      <span className="text-[var(--text-muted)] select-none whitespace-nowrap shrink-0 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-[var(--text-muted)]" />
                        {dateStr}
                      </span>
                      <span className="shrink-0 text-[var(--text-secondary)] flex items-center gap-0.5">
                        <User className="w-3 h-3 text-[var(--text-muted)]" />
                        actor: <span className="font-bold text-[var(--text-primary)]">{getActorDisplayName(log.actorId)}</span>
                      </span>
                      <span className="font-semibold text-[var(--text-primary)] shrink-0">{log.action}</span>

                      <span className="text-[var(--text-muted)] overflow-hidden text-ellipsis whitespace-nowrap">
                        {log.prevState !== null || log.newState !== null ? (
                          <span className="flex items-center gap-1">
                            state: <span className="text-[var(--text-secondary)]">{log.prevState ?? "none"}</span>
                            <ArrowRight className="w-2.5 h-2.5 inline text-[var(--text-muted)]" />
                            <span className="text-[var(--text-primary)] font-medium">{log.newState ?? "none"}</span>
                          </span>
                        ) : null}
                      </span>
                    </div>

                    {isExpanded && (
                      <div className="mt-1 ml-4 p-3 bg-[var(--surface-elevated)] rounded-xl text-[10px] text-[var(--text-secondary)] overflow-x-auto border border-[var(--border)]">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 max-w-lg">
                          <div><span className="text-[var(--text-muted)]">Log ID:</span> {log.id}</div>
                          <div><span className="text-[var(--text-muted)]">Entity:</span> {log.entityType} ({log.entityId})</div>
                          <div><span className="text-[var(--text-muted)]">Action:</span> {log.action}</div>
                          <div><span className="text-[var(--text-muted)]">Actor:</span> {getActorDisplayName(log.actorId)}</div>
                          <div><span className="text-[var(--text-muted)]">Prev State:</span> {log.prevState ?? "null"}</div>
                          <div><span className="text-[var(--text-muted)]">New State:</span> {log.newState ?? "null"}</div>
                          <div><span className="text-[var(--text-muted)]">Timestamp:</span> {log.createdAt}</div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
