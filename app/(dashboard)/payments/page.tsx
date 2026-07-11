"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";

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
        return "bg-emerald-50 text-emerald-700 border-emerald-250";
      case "PENDING":
        return "bg-amber-50 text-amber-700 border-amber-250";
      case "FAILED":
        return "bg-red-50 text-red-700 border-red-250";
      default:
        return "bg-slate-50 text-slate-700 border-slate-200";
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="w-6 h-6 rounded-full border-2 border-slate-200 border-t-indigo-500 animate-spin mx-auto" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Payment History</h1>
        <p className="text-sm text-slate-500 mt-1">
          Review your payments ledger on completed or pending project escrow transactions.
        </p>
      </div>

      {errorMsg && (
        <div className="mb-6 bg-red-50 border-l-4 border-red-400 p-4 rounded-lg">
          <p className="text-sm text-red-700 font-medium">{errorMsg}</p>
        </div>
      )}

      {payments.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-16 text-center">
          <span className="text-4xl mb-4 block">💳</span>
          <h2 className="text-lg font-bold text-slate-900 mb-1">No Payments Found</h2>
          <p className="text-sm text-slate-500 max-w-sm mx-auto">
            You don&apos;t have any payment transactions registered yet on the platform.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead className="bg-slate-50 text-slate-400 font-bold uppercase tracking-wider text-[10px] text-left">
                <tr>
                  <th className="px-6 py-4">Project</th>
                  <th className="px-6 py-4">Transaction Amount</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-semibold text-slate-900">
                      <Link href={`/projects/${p.projectId}`} className="hover:text-indigo-600 transition-colors font-bold">
                        {p.projectTitle}
                      </Link>
                    </td>
                    <td className="px-6 py-4 font-black text-slate-900">
                      ₹{p.amount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${getStatusBadgeClass(p.status)}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-400">
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
