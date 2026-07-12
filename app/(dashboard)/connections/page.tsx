"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
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
        // Re-fetch to load full profile/contact details
        await fetchConnections();
      } else {
        setPending(prev => prev.filter(p => p.connectionId !== connectionId));
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error processing request.");
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full min-w-0">
      
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight mb-1 flex items-center gap-2">
          <Users className="w-6 h-6 text-[var(--accent)]" />
          Connections Inbox
        </h1>
        <p className="text-sm text-[var(--text-secondary)]">
          Manage your accepted connection network and respond to incoming requests.
        </p>
      </div>

      {errorMsg && (
        <div className="mb-6 bg-[var(--status-negative-bg)] border border-[var(--status-negative-border)] p-4 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-4.5 h-4.5 text-[var(--status-negative-text)] mt-0.5 flex-shrink-0" />
          <p className="text-sm text-[var(--status-negative-text)] font-semibold">{errorMsg}</p>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex border-b border-[var(--border)] mb-6 gap-6">
        <button
          onClick={() => setActiveTab("connections")}
          className={`pb-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === "connections"
              ? "border-[var(--accent)] text-[var(--text-primary)]"
              : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
          }`}
        >
          <UserCheck className="w-4 h-4" />
          My Network ({connections.length})
        </button>
        <button
          onClick={() => setActiveTab("pending")}
          className={`pb-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === "pending"
              ? "border-[var(--accent)] text-[var(--text-primary)]"
              : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
          }`}
        >
          <Clock className="w-4 h-4" />
          Pending Invites ({pending.length})
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === "connections" ? (
        connections.length === 0 ? (
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-16 text-center shadow-sm">
            <div className="w-12 h-12 rounded-xl bg-[var(--surface-subtle)] flex items-center justify-center mx-auto mb-4 border border-[var(--border)]">
              <Users className="w-6 h-6 text-[var(--text-muted)]" />
            </div>
            <h3 className="text-lg font-bold text-[var(--text-primary)] mb-1">No Connections Yet</h3>
            <p className="text-sm text-[var(--text-secondary)] max-w-sm mx-auto mb-6">
              You haven&apos;t connected with any talent or client yet. Explore the directory to build your professional network.
            </p>
            <Link
              href="/search"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-sm font-semibold rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              Search Directory
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {connections.map((item) => (
              <div
                key={item.connectionId}
                className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5 shadow-sm flex flex-col justify-between"
              >
                <div>
                  {/* Header */}
                  <div className="flex justify-between items-start gap-4 mb-3">
                    <div>
                      <h3 className="text-base font-bold text-[var(--text-primary)] truncate">
                        {item.user.name}
                      </h3>
                      {item.user.businessName && (
                        <p className="text-xs text-[var(--text-secondary)] font-semibold truncate mt-0.5">
                          {item.user.businessName}
                        </p>
                      )}
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold border uppercase bg-[var(--accent-light)] text-[var(--accent)] border-[var(--border)]">
                      {item.user.role}
                    </span>
                  </div>

                  {/* Bio */}
                  {item.user.bio && (
                    <p className="text-xs text-[var(--text-secondary)] line-clamp-2 mb-4 leading-relaxed">
                      {item.user.bio}
                    </p>
                  )}

                  {/* Location */}
                  {item.user.location && (
                    <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] mb-4">
                      <MapPin className="w-3.5 h-3.5" />
                      <span>{item.user.location}</span>
                    </div>
                  )}
                </div>

                {/* Footer Link & Profile */}
                <div className="border-t border-[var(--border-subtle)] pt-4 flex flex-col sm:flex-row justify-between gap-3 items-stretch sm:items-center">
                  <div className="text-[10px] text-[var(--text-muted)] font-medium">
                    Connected on {new Date(item.connectedAt).toLocaleDateString()}
                  </div>
                  <Link
                    href={`/profiles/${item.user.id}`}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-[var(--surface-subtle)] hover:bg-[var(--accent)] hover:text-white border border-[var(--border)] hover:border-transparent rounded-lg text-xs font-bold text-[var(--text-secondary)] transition-all cursor-pointer"
                  >
                    View Profile
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        pending.length === 0 ? (
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-16 text-center shadow-sm">
            <div className="w-12 h-12 rounded-xl bg-[var(--surface-subtle)] flex items-center justify-center mx-auto mb-4 border border-[var(--border)]">
              <Clock className="w-6 h-6 text-[var(--text-muted)]" />
            </div>
            <h3 className="text-lg font-bold text-[var(--text-primary)] mb-1">No Pending Invites</h3>
            <p className="text-sm text-[var(--text-secondary)] max-w-sm mx-auto">
              Your inbox is clean! You don&apos;t have any pending incoming connection requests.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {pending.map((item) => (
              <div
                key={item.connectionId}
                className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5 shadow-sm flex flex-col sm:flex-row justify-between sm:items-center gap-4"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-[var(--text-primary)] truncate">
                      {item.requester.name}
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold border uppercase bg-[var(--accent-light)] text-[var(--accent)] border-[var(--border)]">
                      {item.requester.role}
                    </span>
                  </div>
                  {item.requester.businessName && (
                    <p className="text-xs text-[var(--text-secondary)] font-semibold mt-0.5 truncate">
                      {item.requester.businessName}
                    </p>
                  )}
                  <p className="text-[10px] text-[var(--text-muted)] mt-1 font-medium">
                    Received on {new Date(item.createdAt).toLocaleDateString()} at {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>

                <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-auto">
                  <Link
                    href={`/profiles/${item.requester.id}`}
                    className="px-3 py-1.5 border border-[var(--border)] hover:bg-[var(--surface-subtle)] text-xs font-semibold rounded-lg transition-colors cursor-pointer text-[var(--text-secondary)]"
                  >
                    Details
                  </Link>
                  <button
                    onClick={() => handleRespond(item.connectionId, "ACCEPTED")}
                    disabled={processingId === item.connectionId}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Accept
                  </button>
                  <button
                    onClick={() => handleRespond(item.connectionId, "DECLINED")}
                    disabled={processingId === item.connectionId}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <X className="w-3.5 h-3.5" />
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
