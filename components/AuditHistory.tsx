"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Role } from "@prisma/client";

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
    <div className="mt-8 border border-slate-200 rounded-xl bg-slate-50/50 p-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider hover:text-slate-700 transition-colors focus:outline-none"
        id="toggle-audit-history"
      >
        <span>Audit History Log (Admin Only)</span>
        <svg
          className={`w-4 h-4 transform transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="mt-4 pt-3 border-t border-slate-150">
          {loading && (
            <p className="text-xs text-slate-400 font-mono italic animate-pulse">Loading audit trail...</p>
          )}
          {error && (
            <p className="text-xs text-red-500 font-mono">Error: {error}</p>
          )}
          {!loading && !error && logs.length === 0 && (
            <p className="text-xs text-slate-400 font-mono italic">No audit log records found for this {entityType.toLowerCase()}.</p>
          )}

          {!loading && !error && logs.length > 0 && (
            <div className="space-y-1.5 font-mono text-[11px] leading-relaxed text-slate-600 max-h-[300px] overflow-y-auto pr-1">
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
                  <div key={log.id} className="border-b border-slate-100/50 pb-1 last:border-b-0">
                    <div
                      onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                      className="flex items-start gap-3 py-1 cursor-pointer hover:bg-slate-100/70 rounded px-1.5 transition-colors"
                    >
                      <span className="text-slate-400 select-none whitespace-nowrap shrink-0">{dateStr}</span>
                      <span className="shrink-0 text-slate-500">
                        actor: <span className="font-bold text-slate-800">{getActorDisplayName(log.actorId)}</span>
                      </span>
                      <span className="font-semibold text-slate-700 shrink-0">{log.action}</span>
                      
                      <span className="text-slate-400 overflow-hidden text-ellipsis whitespace-nowrap">
                        {log.prevState !== null || log.newState !== null ? (
                          <>
                            state: <span className="text-slate-500">{log.prevState ?? "none"}</span>
                            {" -> "}
                            <span className="text-slate-700 font-medium">{log.newState ?? "none"}</span>
                          </>
                        ) : null}
                      </span>
                    </div>

                    {isExpanded && (
                      <div className="mt-1 ml-4 p-2 bg-slate-100 rounded text-[10px] text-slate-500 overflow-x-auto border border-slate-200">
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 max-w-lg">
                          <div><span className="text-slate-400">Log ID:</span> {log.id}</div>
                          <div><span className="text-slate-400">Entity:</span> {log.entityType} ({log.entityId})</div>
                          <div><span className="text-slate-400">Action:</span> {log.action}</div>
                          <div><span className="text-slate-400">Actor:</span> {getActorDisplayName(log.actorId)}</div>
                          <div><span className="text-slate-400">Prev State:</span> {log.prevState ?? "null"}</div>
                          <div><span className="text-slate-400">New State:</span> {log.newState ?? "null"}</div>
                          <div><span className="text-slate-400">Timestamp:</span> {log.createdAt}</div>
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
