"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { 
  CreditCard, 
  AlertCircle, 
  ArrowRight,
  Clock,
  CheckCircle2,
  ArrowUpRight,
  ArrowDownLeft,
  FileDown
} from "lucide-react";

interface PaymentHistoryItem {
  id: string;
  projectId: string;
  projectTitle: string;
  amount: number;
  status: string;
  createdAt: string;
}

export default function PaymentsHistoryPage() {
  const { data: session } = useSession();
  const [payments, setPayments] = useState<PaymentHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const fetchPayments = async () => {
      try {
        const response = await fetch("/api/payments/history");
        if (!response.ok) {
          throw new Error("Failed to load payment history.");
        }
        const data = await response.json();
        setPayments(data);
      } catch (err: unknown) {
        setErrorMsg(err instanceof Error ? err.message : "Error loading payment history.");
      } finally {
        setLoading(false);
      }
    };

    fetchPayments();
  }, []);

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "SUCCESS":
        return "bg-[var(--status-success-bg)] text-[var(--status-success-text)] border-[var(--status-success-border)]";
      case "PENDING":
        return "bg-[var(--status-progress-bg)] text-[var(--status-progress-text)] border-[var(--status-progress-border)]";
      case "FAILED":
        return "bg-[var(--status-negative-bg)] text-[var(--status-negative-text)] border-[var(--status-negative-border)]";
      default:
        return "bg-[var(--status-neutral-bg)] text-[var(--status-neutral-text)] border-[var(--status-neutral-border)]";
    }
  };

  const handleExportCSV = (e: React.MouseEvent) => {
    e.preventDefault();
    alert("Export Ledger CSV functionality is not built.");
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col items-center justify-center min-h-[300px]">
          <div className="w-6 h-6 rounded-full border-2 border-[var(--border)] border-t-[var(--accent)] animate-spin" />
        </div>
      </div>
    );
  }

  // Sort payments descending by date (recent first)
  const sortedPayments = [...payments].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const isClient = session?.user?.role === "CLIENT";

  const totalSuccessAmount = payments
    .filter((p) => p.status === "SUCCESS")
    .reduce((sum, p) => sum + p.amount, 0);

  const totalPendingAmount = payments
    .filter((p) => p.status === "PENDING")
    .reduce((sum, p) => sum + p.amount, 0);

  const completedTransactionsCount = payments.filter((p) => p.status === "SUCCESS").length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full min-w-0">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <CreditCard className="w-5 h-5 text-[var(--accent)]" />
            <h1 className="text-2xl font-black text-[var(--text-primary)] tracking-tight">Payment Ledger</h1>
          </div>
          <p className="text-xs font-medium text-[var(--text-secondary)] mt-1">
            Official bank-statement style ledger of completed or pending project escrow transactions.
          </p>
        </div>
        <button
          onClick={handleExportCSV}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold uppercase tracking-wider rounded-lg border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)] cursor-pointer transition-colors"
        >
          <FileDown className="w-4 h-4 text-[var(--text-secondary)]" />
          Export CSV
        </button>
      </div>

      {errorMsg && (
        <div className="mb-6 bg-[var(--status-negative-bg)] border border-[var(--status-negative-border)] p-4 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-[var(--status-negative-text)] mt-0.5 flex-shrink-0" />
          <p className="text-sm text-[var(--status-negative-text)] font-semibold">{errorMsg}</p>
        </div>
      )}

      {/* Metrics Cards Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider block">
              {isClient ? "Available Balance" : "Total Earnings"}
            </span>
            <span className="text-2xl font-black text-[var(--text-primary)] block mt-1">
              ₹{totalSuccessAmount.toLocaleString()}
            </span>
            <span className="text-[10px] font-bold text-emerald-500 block mt-1">✓ Cleared Funds</span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
            {isClient ? <ArrowDownLeft className="w-5 h-5 text-emerald-500" /> : <ArrowUpRight className="w-5 h-5 text-emerald-500" />}
          </div>
        </div>

        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider block">
              Pending Release
            </span>
            <span className="text-2xl font-black text-[var(--text-primary)] block mt-1">
              ₹{totalPendingAmount.toLocaleString()}
            </span>
            <span className="text-[10px] font-bold text-amber-500 block mt-1">🕒 Held in Escrow</span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
            <Clock className="w-5 h-5 text-amber-500" />
          </div>
        </div>

        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider block">
              Completed Transfers
            </span>
            <span className="text-2xl font-black text-[var(--text-primary)] block mt-1">
              {completedTransactionsCount} <span className="text-xs text-[var(--text-muted)] font-bold">payments</span>
            </span>
            <span className="text-[10px] font-bold text-[var(--text-muted)] block mt-1">Verified Audit Logs</span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-[var(--accent-light)] flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5 text-[var(--accent)]" />
          </div>
        </div>
      </div>

      {sortedPayments.length === 0 ? (
        <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] shadow-sm p-16 text-center">
          <div className="w-12 h-12 rounded-xl bg-[var(--surface-subtle)] flex items-center justify-center mx-auto mb-4 border border-[var(--border)]">
            <CreditCard className="w-6 h-6 text-[var(--text-muted)]" />
          </div>
          <h2 className="text-base font-extrabold text-[var(--text-primary)] mb-1">No Ledger Transactions</h2>
          <p className="text-xs text-[var(--text-secondary)] max-w-xs mx-auto font-medium">
            You do not have any payment actions registered yet on TrustLance.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Desktop Table View */}
          <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] shadow-sm overflow-hidden hidden lg:block">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-[var(--border-subtle)] text-sm">
                <thead className="bg-[var(--surface-subtle)] text-[var(--text-muted)] font-bold uppercase tracking-wider text-[10px] text-left">
                  <tr>
                    <th className="px-6 py-4">Transaction ID</th>
                    <th className="px-6 py-4">Project</th>
                    <th className="px-6 py-4">Type</th>
                    <th className="px-6 py-4 text-right">Amount</th>
                    <th className="px-6 py-4 text-center">Status</th>
                    <th className="px-6 py-4">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)] text-[var(--text-secondary)]">
                  {sortedPayments.map((p) => (
                    <tr key={p.id} className="hover:bg-[var(--surface-subtle)]/50 transition-colors font-medium">
                      <td className="px-6 py-4 font-mono text-xs text-[var(--text-secondary)]">
                        {p.id}
                      </td>
                      <td className="px-6 py-4 font-bold text-[var(--text-primary)]">
                        <Link href={`/projects/${p.projectId}`} className="hover:text-[var(--accent)] transition-colors inline-flex items-center gap-1">
                          {p.projectTitle}
                          <ArrowRight className="w-3.5 h-3.5 text-[var(--accent)]" />
                        </Link>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold ${
                          isClient 
                            ? "bg-red-500/10 text-red-500 border border-red-500/20" 
                            : "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                        }`}>
                          {isClient ? "DEBIT" : "CREDIT"}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-bold text-right text-[var(--text-primary)]">
                        <span className={isClient ? "text-red-500" : "text-emerald-500"}>
                          {isClient ? "-" : "+"} ₹{p.amount.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${getStatusBadgeClass(p.status)}`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-[var(--text-muted)] font-semibold text-xs">
                        {new Date(p.createdAt).toLocaleDateString(undefined, {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile / Tablet Card View */}
          <div className="block lg:hidden space-y-4">
            {sortedPayments.map((p) => (
              <div
                key={p.id}
                className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-5 shadow-sm space-y-3"
              >
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-mono text-[var(--text-muted)]">
                    {p.id}
                  </span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider ${getStatusBadgeClass(p.status)}`}>
                    {p.status}
                  </span>
                </div>

                <div className="pt-1">
                  <div className="text-[9px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-0.5">
                    Project
                  </div>
                  <Link
                    href={`/projects/${p.projectId}`}
                    className="text-xs font-bold text-[var(--text-primary)] hover:text-[var(--accent)] transition-colors line-clamp-2"
                  >
                    {p.projectTitle}
                  </Link>
                </div>

                <div className="pt-2 border-t border-[var(--border-subtle)] flex justify-between items-center">
                  <div>
                    <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--text-muted)] block mb-0.5">Type</span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold ${
                      isClient 
                        ? "bg-red-500/10 text-red-500 border border-red-500/20" 
                        : "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                    }`}>
                      {isClient ? "DEBIT" : "CREDIT"}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--text-muted)] block mb-0.5">Signed Amount</span>
                    <span className={`text-xs font-black ${isClient ? "text-red-500" : "text-emerald-500"}`}>
                      {isClient ? "-" : "+"} ₹{p.amount.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
