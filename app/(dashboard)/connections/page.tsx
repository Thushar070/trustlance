"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useNotification } from "@/components/NotificationProvider";
import { 
  Users, 
  UserCheck, 
  Clock, 
  MapPin, 
  Check, 
  X, 
  ExternalLink,
  AlertCircle
} from "lucide-react";

interface ConnectedUser {
  id: string;
  name: string | null;
  role: string;
  businessName: string | null;
  location: string | null;
  bio: string | null;
}

interface ConnectionItem {
  connectionId: string;
  connectedAt: string;
  user: ConnectedUser;
}

interface PendingItem {
  connectionId: string;
  createdAt: string;
  requester: ConnectedUser;
}

export default function ConnectionsPage() {
  const { data: session, status } = useSession();
  const { showSuccess, showError, showInfo } = useNotification();
  const [activeTab, setActiveTab] = useState<"connections" | "pending">("connections");
  
  const [connections, setConnections] = useState<ConnectionItem[]>([]);
  const [pending, setPending] = useState<PendingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchConnections = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/connections");
      if (!res.ok) {
        throw new Error("Failed to load connections.");
      }
      const data = await res.json();
      setConnections(data.accepted || []);
      setPending(data.pending || []);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "An error occurred.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session?.user) {
      Promise.resolve().then(() => {
        fetchConnections();
      });
    }
  }, [session]);

  const handleRespond = async (connectionId: string, response: "ACCEPTED" | "DECLINED") => {
    setProcessingId(connectionId);
    try {
      const res = await fetch(`/api/connections/${connectionId}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ response }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to submit response.");
      }
      
      // Update UI state locally
      if (response === "ACCEPTED") {
        showSuccess("Connection request accepted!");
        // Re-fetch to load full profile/contact details
        await fetchConnections();
      } else {
        showInfo("Connection request declined.");
        setPending(prev => prev.filter(p => p.connectionId !== connectionId));
      }
    } catch (err: unknown) {
      showError(err instanceof Error ? err.message : "Error processing request.");
    } finally {
      setProcessingId(null);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="flex-grow flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 rounded-full border-2 border-[var(--border)] border-t-[var(--accent)] animate-spin" />
          <p className="text-[var(--text-muted)] text-sm">Loading connections panel...</p>
        </div>
      </div>
    );
  }

  if (!session?.user) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <div className="bg-[var(--status-negative-bg)] border border-[var(--status-negative-border)] p-4 rounded-lg flex items-start gap-3 justify-center">
          <AlertCircle className="w-4.5 h-4.5 text-[var(--status-negative-text)] mt-0.5 flex-shrink-0" />
          <p className="text-sm text-[var(--status-negative-text)] font-semibold">
            Access Forbidden: Please log in to manage connections.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 w-full min-w-0 animate-fadeIn">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-1">
          <span>Enterprise</span>
          <span>&gt;</span>
          <span className="text-[var(--text-muted)] font-bold">Connections Network</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)] leading-tight">Connections Network</h1>
        <p className="text-xs text-[var(--text-secondary)] font-light mt-1">
          Manage your accepted connection network and respond to incoming requests.
        </p>
      </div>

      {errorMsg && (
        <div className="bg-[var(--status-negative-bg)] border border-[var(--status-negative-border)] p-4 rounded text-xs text-[var(--status-negative-text)] flex items-start gap-3 animate-fadeIn">
          <AlertCircle className="w-4 h-4 text-[var(--status-negative-text)] mt-0.5 flex-shrink-0" />
          <p className="font-semibold">{errorMsg}</p>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex border-b border-[var(--border)] gap-6">
        <button
          onClick={() => setActiveTab("connections")}
          className={`pb-3 text-[10px] font-bold uppercase tracking-widest border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === "connections"
              ? "border-[var(--text-primary)] text-[var(--text-primary)]"
              : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          }`}
        >
          <UserCheck className="w-3.5 h-3.5" />
          My Network ({connections.length})
        </button>
        <button
          onClick={() => setActiveTab("pending")}
          className={`pb-3 text-[10px] font-bold uppercase tracking-widest border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === "pending"
              ? "border-[var(--text-primary)] text-[var(--text-primary)]"
              : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          Pending Invites ({pending.length})
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === "connections" ? (
        connections.length === 0 ? (
          <div className="border border-[var(--border)] bg-[var(--surface-subtle)] rounded-lg p-16 text-center shadow-sm">
            <Users className="w-8 h-8 text-[var(--text-muted)] mx-auto mb-4" />
            <h3 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider mb-1">No Connections Yet</h3>
            <p className="text-xs text-[var(--text-secondary)] font-light max-w-sm mx-auto mb-6">
              You haven't connected with any talent or client yet. Explore the directory to build your professional network.
            </p>
            <Link
              href="/search"
              className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--btn-primary-text)] font-bold text-[10px] uppercase tracking-widest px-4 py-2.5 rounded transition-colors"
            >
              Search Directory
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {connections.map((item) => (
              <div
                key={item.connectionId}
                className="border border-[var(--border)] bg-[var(--surface)] rounded-lg p-5 flex flex-col justify-between shadow-sm"
              >
                <div>
                  {/* Header */}
                  <div className="flex justify-between items-start gap-4 mb-3">
                    <div>
                      <h3 className="text-sm font-bold text-[var(--text-primary)] truncate">
                        {item.user.name}
                      </h3>
                      {item.user.businessName && (
                        <p className="text-[11px] text-[var(--text-secondary)] font-medium truncate mt-0.5">
                          {item.user.businessName}
                        </p>
                      )}
                    </div>
                    <span className="px-2 py-0.5 rounded text-[8px] font-bold border uppercase bg-[var(--surface-subtle)] text-[var(--text-secondary)] border-[var(--border)]">
                      {item.user.role}
                    </span>
                  </div>

                  {/* Bio */}
                  {item.user.bio && (
                    <p className="text-xs text-[var(--text-secondary)] line-clamp-2 mb-4 leading-relaxed font-light">
                      {item.user.bio}
                    </p>
                  )}

                  {/* Location */}
                  {item.user.location && (
                    <div className="flex items-center gap-1.5 text-[10px] text-[var(--text-muted)] mb-4 font-mono">
                      <MapPin className="w-3 h-3" />
                      <span>{item.user.location}</span>
                    </div>
                  )}
                </div>

                {/* Footer Link & Profile */}
                <div className="border-t border-[var(--border)] pt-4 flex flex-col sm:flex-row justify-between gap-3 items-stretch sm:items-center">
                  <div className="text-[9px] text-[var(--text-secondary)] font-bold uppercase tracking-wider">
                    Connected: {new Date(item.connectedAt).toLocaleDateString()}
                  </div>
                  <Link
                    href={`/profiles/${item.user.id}`}
                    className="border border-[var(--border)] hover:border-[var(--text-primary)] bg-[var(--surface-subtle)] text-[var(--text-primary)] font-bold text-[10px] uppercase tracking-widest px-3 py-1.5 rounded transition-colors inline-flex items-center justify-center gap-1"
                  >
                    View Profile
                    <ExternalLink className="w-3 h-3 text-[var(--text-muted)]" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        pending.length === 0 ? (
          <div className="border border-[var(--border)] bg-[var(--surface)] rounded-lg p-16 text-center shadow-sm">
            <Clock className="w-8 h-8 text-[var(--text-muted)] mx-auto mb-4" />
            <h3 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider mb-1">No Pending Invites</h3>
            <p className="text-xs text-[var(--text-secondary)] font-light max-w-sm mx-auto">
              Your network inbox is clean! You don't have any pending incoming connection requests.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {pending.map((item) => (
              <div
                key={item.connectionId}
                className="border border-[var(--border)] bg-[var(--surface)] rounded-lg p-5 flex flex-col sm:flex-row justify-between sm:items-center gap-4 text-left shadow-sm"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-[var(--text-primary)] truncate">
                      {item.requester.name}
                    </h3>
                    <span className="px-2 py-0.5 rounded text-[8px] font-bold border uppercase bg-[var(--surface-subtle)] text-[var(--text-secondary)] border-[var(--border)]">
                      {item.requester.role}
                    </span>
                  </div>
                  {item.requester.businessName && (
                    <p className="text-[11px] text-[var(--text-secondary)] font-medium mt-0.5 truncate">
                      {item.requester.businessName}
                    </p>
                  )}
                  <p className="text-[9px] text-[var(--text-muted)] mt-1 font-mono">
                    Received: {new Date(item.createdAt).toLocaleDateString()} at {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                  <Link
                    href={`/profiles/${item.requester.id}`}
                    className="border border-[var(--border)] hover:border-[var(--text-primary)] bg-[var(--surface-subtle)] text-[var(--text-primary)] font-bold text-[10px] uppercase tracking-widest px-3 py-1.5 rounded transition-colors"
                  >
                    Details
                  </Link>
                  <button
                    onClick={() => handleRespond(item.connectionId, "ACCEPTED")}
                    disabled={processingId === item.connectionId}
                    className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 dark:hover:bg-emerald-950/40 text-[10px] font-bold uppercase tracking-widest px-4 py-1.5 rounded transition-colors cursor-pointer disabled:opacity-50 inline-flex items-center gap-1"
                  >
                    <Check className="w-3 h-3" />
                    Accept
                  </button>
                  <button
                    onClick={() => handleRespond(item.connectionId, "DECLINED")}
                    disabled={processingId === item.connectionId}
                    className="bg-red-500/10 text-red-650 dark:text-red-400 border border-red-500/20 hover:bg-red-500/20 dark:hover:bg-red-950/40 text-[10px] font-bold uppercase tracking-widest px-4 py-1.5 rounded transition-colors cursor-pointer disabled:opacity-50 inline-flex items-center gap-1"
                  >
                    <X className="w-3 h-3" />
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
