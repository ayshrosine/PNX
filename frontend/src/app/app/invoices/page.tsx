'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  FileText,
  Plus,
  Search,
  Filter,
  Download,
  ExternalLink,
  MoreVertical,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowUpDown,
  RefreshCw,
  Send,
} from 'lucide-react';
import { api } from '@/lib/api';
import { formatInr, formatDate } from '@/lib/utils';
import { toast } from 'sonner';

const STATUS_TABS = [
  { id: 'ALL', label: 'All Invoices' },
  { id: 'SENT', label: 'Open / Sent' },
  { id: 'OVERDUE', label: 'Overdue' },
  { id: 'PAID', label: 'Paid' },
  { id: 'DRAFT', label: 'Drafts' },
];

export default function InvoicesListPage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedInvoices, setSelectedInvoices] = useState<string[]>([]);

  const loadInvoices = async () => {
    try {
      setLoading(true);
      const res = await api.invoices.list();
      if (res?.data) {
        setInvoices(res.data);
      }
    } catch (err: any) {
      toast.error('Failed to load invoices: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvoices();
  }, []);

  const filteredInvoices = invoices.filter((inv) => {
    // Tab filter
    if (activeTab === 'SENT') {
      if (!['SENT', 'PART_PAID'].includes(inv.status) || inv.derived?.isOverdue) return false;
    } else if (activeTab === 'OVERDUE') {
      if (!inv.derived?.isOverdue) return false;
    } else if (activeTab === 'PAID') {
      if (inv.status !== 'PAID') return false;
    } else if (activeTab === 'DRAFT') {
      if (inv.status !== 'DRAFT') return false;
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchNum = inv.number?.toLowerCase().includes(q);
      const matchClient = inv.client?.name?.toLowerCase().includes(q);
      if (!matchNum && !matchClient) return false;
    }

    return true;
  });

  const getStatusBadge = (inv: any) => {
    if (inv.status === 'PAID') {
      return (
        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
          PAID
        </span>
      );
    }
    if (inv.derived?.isOverdue) {
      return (
        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" />
          <span>OVERDUE ({inv.derived.daysOverdue}d)</span>
        </span>
      );
    }
    if (inv.status === 'PART_PAID') {
      return (
        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30">
          PART PAID
        </span>
      );
    }
    if (inv.status === 'SENT') {
      return (
        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
          SENT / OPEN
        </span>
      );
    }
    if (inv.status === 'DRAFT') {
      return (
        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
          DRAFT
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-800 text-slate-400">
        {inv.status}
      </span>
    );
  };

  const downloadPdf = (id: string, number: string) => {
    const url = api.invoices.getPdfBlobUrl(id);
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight">
            GST Tax Invoices
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Manage tax compliant invoices, automated dispatch status, and collections tracking.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadInvoices}
            className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition"
            title="Refresh list"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <Link
            href="/app/invoices/new"
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-md shadow-indigo-600/30 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Create Invoice</span>
          </Link>
        </div>
      </div>

      {/* Tabs and Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Tabs */}
        <div className="flex items-center gap-1 bg-slate-900/60 p-1 rounded-xl border border-slate-800/80 overflow-x-auto">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search invoice # or client..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Invoices Table */}
      <div className="rounded-2xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-md overflow-hidden">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : filteredInvoices.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider bg-slate-950/40 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-4">Client</th>
                  <th className="py-3 px-4">Dates</th>
                  <th className="py-3 px-4">Total Amount</th>
                  <th className="py-3 px-4">Balance Due</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {filteredInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-800/30 transition group">
                    <td className="py-3.5 px-4 font-mono font-semibold text-indigo-400">
                      <Link href={`/app/invoices/${inv.id}`} className="hover:underline flex items-center gap-1">
                        {inv.number}
                        <ExternalLink className="w-3 h-3 opacity-50 group-hover:opacity-100" />
                      </Link>
                    </td>
                    <td className="py-3.5 px-4">
                      <Link
                        href={`/app/clients/${inv.clientId}`}
                        className="font-semibold text-white hover:text-indigo-400"
                      >
                        {inv.client?.name || 'Client'}
                      </Link>
                      <div className="text-[11px] text-slate-400">
                        {inv.client?.gstin ? `GSTIN: ${inv.client.gstin}` : 'Unregistered'}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-400">
                      <div>Issued: {formatDate(inv.issueDate)}</div>
                      <div className="text-[10px] text-slate-500">Due: {formatDate(inv.dueDate)}</div>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-semibold text-white">
                      {formatInr(inv.total)}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold">
                      {inv.balanceDue > 0 ? (
                        <span className="text-amber-400">{formatInr(inv.balanceDue)}</span>
                      ) : (
                        <span className="text-slate-400 font-normal">₹0.00</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">{getStatusBadge(inv)}</td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => downloadPdf(inv.id, inv.number)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                          title="Download PDF"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <Link
                          href={`/app/invoices/${inv.id}`}
                          className="px-2.5 py-1 text-xs rounded bg-slate-800 hover:bg-slate-700 text-slate-200 transition font-medium"
                        >
                          View
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center">
            <FileText className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <p className="text-sm font-semibold text-white">No invoices found</p>
            <p className="text-xs text-slate-400 mt-1">
              {searchQuery ? 'Try matching another query' : 'Create your first invoice to begin.'}
            </p>
            <Link
              href="/app/invoices/new"
              className="inline-flex items-center gap-2 mt-4 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Invoice</span>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
