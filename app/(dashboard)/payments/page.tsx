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
        return "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20";
      case "PENDING":
        return "bg-amber-500/10 text-amber-500 border border-amber-500/20";
      case "FAILED":
        return "bg-red-500/10 text-red-500 border border-red-500/20";
      default:
        return "bg-gray-500/10 text-gray-500 border border-gray-500/20";
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
    <div className="space-y-8 w-full min-w-0 animate-fadeIn">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">
            <span>Enterprise</span>
            <span>&gt;</span>
            <span className="text-zinc-400">Payments Ledger</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white leading-tight">Payment Ledger</h1>
          <p className="text-xs text-zinc-550 font-light mt-1">
            Official bank-statement style ledger of completed or pending project escrow transactions.
          </p>
        </div>
        <button
          onClick={handleExportCSV}
          className="border border-zinc-800 hover:border-zinc-700 bg-zinc-950 text-white font-bold text-[10px] uppercase tracking-widest px-4 py-2.5 rounded transition-colors cursor-pointer"
        >
          Export CSV
        </button>
      </div>

      {errorMsg && (
        <div className="bg-red-950/20 border border-red-900/50 p-4 rounded text-xs text-red-400 flex items-start gap-3 animate-fadeIn">
          <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
          <p className="font-semibold">{errorMsg}</p>
        </div>
      )}

      {/* Metrics Cards Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="border border-zinc-800 bg-[#09090b]/40 rounded-lg p-6 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider block">
              {isClient ? "Available Balance" : "Total Earnings"}
            </span>
            <span className="text-2xl font-bold text-white block mt-1 font-mono">
              ₹{totalSuccessAmount.toLocaleString()}
            </span>
            <span className="text-[9px] font-bold text-emerald-400 block mt-1 uppercase">✓ Cleared Funds</span>
          </div>
          <div className="w-10 h-10 rounded border border-emerald-950 bg-emerald-950/20 flex items-center justify-center">
            {isClient ? <ArrowDownLeft className="w-5 h-5 text-emerald-400" /> : <ArrowUpRight className="w-5 h-5 text-emerald-400" />}
          </div>
        </div>

        <div className="border border-zinc-800 bg-[#09090b]/40 rounded-lg p-6 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider block">
              Pending Release
            </span>
            <span className="text-2xl font-bold text-white block mt-1 font-mono">
              ₹{totalPendingAmount.toLocaleString()}
            </span>
            <span className="text-[9px] font-bold text-yellow-400 block mt-1 uppercase">🕒 Held in Escrow</span>
          </div>
          <div className="w-10 h-10 rounded border border-yellow-905 bg-yellow-950/20 flex items-center justify-center">
            <Clock className="w-5 h-5 text-yellow-400" />
          </div>
        </div>

        <div className="border border-zinc-800 bg-[#09090b]/40 rounded-lg p-6 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider block">
              Completed Transfers
            </span>
            <span className="text-2xl font-bold text-white block mt-1 font-mono text-zinc-300">
              {completedTransactionsCount} <span className="text-xs font-sans text-zinc-550 font-normal">payments</span>
            </span>
            <span className="text-[9px] font-bold text-zinc-500 block mt-1 uppercase">Verified Audit Logs</span>
          </div>
          <div className="w-10 h-10 rounded border border-zinc-800 bg-zinc-950 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5 text-white" />
          </div>
        </div>
      </div>

      {sortedPayments.length === 0 ? (
        <div className="border border-zinc-800 bg-[#09090b]/40 rounded-lg p-16 text-center">
          <CreditCard className="w-8 h-8 text-zinc-650 mx-auto mb-4" />
          <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-1">No Ledger Transactions</h2>
          <p className="text-xs text-zinc-600 font-light max-w-sm mx-auto">
            You do not have any payment actions registered yet on TrustLance.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Desktop Table View */}
          <div className="border border-zinc-800 bg-black rounded-lg overflow-hidden hidden lg:block">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-zinc-900 text-xs">
                <thead className="bg-zinc-950 text-zinc-550 font-bold uppercase tracking-wider text-[9px] text-left">
                  <tr>
                    <th className="px-6 py-4">Transaction ID</th>
                    <th className="px-6 py-4">Project</th>
                    <th className="px-6 py-4">Type</th>
                    <th className="px-6 py-4 text-right">Amount</th>
                    <th className="px-6 py-4 text-center">Status</th>
                    <th className="px-6 py-4">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900 text-zinc-400">
                  {sortedPayments.map((p) => {
                    const isSuccess = p.status === "SUCCESS";
                    const isPending = p.status === "PENDING";
                    const isFailed = p.status === "FAILED";

                    return (
                      <tr key={p.id} className="hover:bg-zinc-900/30 transition-colors font-medium">
                        <td className="px-6 py-4 font-mono text-[10px] text-zinc-550">
                          {p.id}
                        </td>
                        <td className="px-6 py-4 font-bold text-white">
                          <Link href={`/projects/${p.projectId}`} className="hover:underline inline-flex items-center gap-1">
                            {p.projectTitle}
                            <ArrowRight className="w-3 h-3 text-zinc-550" />
                          </Link>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[8px] font-bold border ${
                            isClient 
                              ? "bg-red-950/20 text-red-400 border-red-900/50" 
                              : "bg-emerald-950/20 text-emerald-400 border-emerald-900/50"
                          }`}>
                            {isClient ? "DEBIT" : "CREDIT"}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-bold text-right font-mono">
                          <span className={isClient ? "text-red-400" : "text-emerald-400"}>
                            {isClient ? "-" : "+"} ₹{p.amount.toLocaleString()}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider border ${
                            isSuccess 
                              ? "bg-emerald-950/20 text-emerald-400 border-emerald-900/50"
                              : isPending
                              ? "bg-yellow-950/20 text-yellow-400 border-yellow-900/50"
                              : "bg-red-950/20 text-red-400 border-red-900/50"
                          }`}>
                            {p.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-zinc-500 font-mono text-[10px]">
                          {new Date(p.createdAt).toLocaleDateString(undefined, {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile / Tablet Card View */}
          <div className="block lg:hidden space-y-4">
            {sortedPayments.map((p) => {
              const isSuccess = p.status === "SUCCESS";
              const isPending = p.status === "PENDING";

              return (
                <div
                  key={p.id}
                  className="border border-zinc-800 bg-[#09090b]/40 rounded-lg p-5 space-y-3"
                >
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-mono text-zinc-550">
                      {p.id}
                    </span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider border ${
                      isSuccess 
                        ? "bg-emerald-950/20 text-emerald-400 border-emerald-900/50"
                        : isPending
                        ? "bg-yellow-950/20 text-yellow-400 border-yellow-900/50"
                        : "bg-red-950/20 text-red-400 border-red-900/50"
                    }`}>
                      {p.status}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <div className="text-[8px] font-bold uppercase tracking-wider text-zinc-500">
                      Project
                    </div>
                    <Link
                      href={`/projects/${p.projectId}`}
                      className="text-xs font-bold text-white hover:underline line-clamp-2"
                    >
                      {p.projectTitle}
                    </Link>
                  </div>

                  <div className="pt-2 border-t border-zinc-900 flex justify-between items-center">
                    <div>
                      <span className="text-[8px] font-bold uppercase tracking-wider text-zinc-500 block">Type</span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[8px] font-bold border ${
                        isClient 
                          ? "bg-red-950/20 text-red-400 border-red-900/50" 
                          : "bg-emerald-950/20 text-emerald-400 border-emerald-900/50"
                      }`}>
                        {isClient ? "DEBIT" : "CREDIT"}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[8px] font-bold uppercase tracking-wider text-zinc-500 block">Signed Amount</span>
                      <span className={`text-xs font-bold font-mono ${isClient ? "text-red-400" : "text-emerald-400"}`}>
                        {isClient ? "-" : "+"} ₹{p.amount.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
