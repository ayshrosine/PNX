'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  CreditCard,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Calendar,
  Building,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { api } from '@/lib/api';
import { formatInr, formatDate } from '@/lib/utils';
import { toast } from 'sonner';

export default function PaymentsListPage() {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const loadPayments = async () => {
    try {
      setLoading(true);
      const res = await api.payments.list();
      if (res?.data) {
        setPayments(res.data);
      }
    } catch (err: any) {
      toast.error('Failed to load payments: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayments();
  }, []);

  const filteredPayments = payments.filter((pay) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      pay.reference?.toLowerCase().includes(q) ||
      pay.client?.name?.toLowerCase().includes(q) ||
      pay.mode?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight">
            Payments & Collections Register
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Audit-ready log of NEFT, RTGS, IMPS, and UPI remittances matched against open invoices.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadPayments}
            className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <Link
            href="/app/payments/new"
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-md shadow-indigo-600/30 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Record Payment</span>
          </Link>
        </div>
      </div>

      {/* Search */}
      <div className="relative w-full md:w-80">
        <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by UTR reference, client..."
          className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>

      {/* Payments Table */}
      <div className="rounded-2xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-md overflow-hidden">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : filteredPayments.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider bg-slate-950/40 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Payment Reference / UTR</th>
                  <th className="py-3 px-4">Client</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Mode</th>
                  <th className="py-3 px-4">Amount Received</th>
                  <th className="py-3 px-4">TDS Deducted</th>
                  <th className="py-3 px-4 text-right">Invoices Allocated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {filteredPayments.map((pay) => (
                  <tr key={pay.id} className="hover:bg-slate-800/30 transition">
                    <td className="py-3.5 px-4 font-mono font-semibold text-emerald-400">
                      {pay.reference || 'REF-NIL'}
                    </td>
                    <td className="py-3.5 px-4">
                      <Link
                        href={`/app/clients/${pay.clientId}`}
                        className="font-semibold text-white hover:text-indigo-400"
                      >
                        {pay.client?.name || 'Client'}
                      </Link>
                    </td>
                    <td className="py-3.5 px-4 text-slate-400">
                      {formatDate(pay.paymentDate)}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-slate-800 text-slate-300 font-mono">
                        {pay.mode}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-emerald-400 text-sm">
                      +{formatInr(pay.amount)}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-400">
                      {pay.tdsDeducted && parseFloat(pay.tdsDeducted) > 0 ? (
                        <span className="text-amber-400 font-semibold">{formatInr(pay.tdsDeducted)}</span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {pay.allocations && pay.allocations.length > 0 ? (
                        <div className="flex items-center justify-end gap-1">
                          {pay.allocations.map((a: any, i: number) => (
                            <Link
                              key={i}
                              href={`/app/invoices/${a.invoiceId}`}
                              className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-400 font-mono text-[10px] hover:underline"
                            >
                              {a.invoice?.number || 'INV'}
                            </Link>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-500 text-[11px]">Unallocated</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center">
            <CreditCard className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <p className="text-sm font-semibold text-white">No payments recorded</p>
            <p className="text-xs text-slate-400 mt-1">
              Record bank transfers or remittances to reconcile client balances.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
