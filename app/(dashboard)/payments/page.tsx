"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { CreditCard, AlertCircle, ArrowRight } from "lucide-react";

interface PaymentHistoryItem {
  id: string;
  projectId: string;
  projectTitle: string;
  amount: number;
  status: string;
  createdAt: string;
}

export default function PaymentsHistoryPage() {
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

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col items-center justify-center min-h-[300px]">
          <div className="w-6 h-6 rounded-full border-2 border-[var(--border)] border-t-[var(--accent)] animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <CreditCard className="w-5 h-5 text-[var(--accent)]" />
          <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">Payment Ledger</h1>
        </div>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Review your payments ledger on completed or pending project escrow transactions.
        </p>
      </div>

      {errorMsg && (
        <div className="mb-6 bg-[var(--status-negative-bg)] border border-[var(--status-negative-border)] p-4 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-[var(--status-negative-text)] mt-0.5 flex-shrink-0" />
          <p className="text-sm text-[var(--status-negative-text)] font-semibold">{errorMsg}</p>
        </div>
      )}

      {payments.length === 0 ? (
        <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] shadow-sm p-16 text-center">
          <div className="w-12 h-12 rounded-xl bg-[var(--surface-subtle)] flex items-center justify-center mx-auto mb-4">
            <CreditCard className="w-6 h-6 text-[var(--text-muted)]" />
          </div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-1">No Payments Found</h2>
          <p className="text-sm text-[var(--text-secondary)] max-w-sm mx-auto">
            You don&apos;t have any payment transactions registered yet on the platform.
          </p>
        </div>
      ) : (
        <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[var(--border-subtle)] text-sm">
              <thead className="bg-[var(--surface-subtle)] text-[var(--text-muted)] font-bold uppercase tracking-wider text-[10px] text-left">
                <tr>
                  <th className="px-6 py-4">Project</th>
                  <th className="px-6 py-4">Transaction Amount</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)] text-[var(--text-secondary)]">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-[var(--surface-subtle)]/50 transition-colors">
                    <td className="px-6 py-4 font-semibold text-[var(--text-primary)]">
                      <Link href={`/projects/${p.projectId}`} className="hover:text-[var(--accent)] transition-colors inline-flex items-center gap-1">
                        {p.projectTitle}
                        <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </Link>
                    </td>
                    <td className="px-6 py-4 font-bold text-[var(--text-primary)]">
                      ₹{p.amount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${getStatusBadgeClass(p.status)}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-[var(--text-muted)] font-medium">
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
      )}
    </div>
  );
}
