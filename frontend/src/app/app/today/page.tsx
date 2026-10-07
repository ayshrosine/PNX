'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  Send,
  XCircle,
  PhoneCall,
  MessageSquare,
  ArrowRight,
  ShieldAlert,
  Sparkles,
  Calendar,
  Check,
  ChevronRight,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { api } from '@/lib/api';
import { formatInr, formatDate } from '@/lib/utils';
import { toast } from 'sonner';

export default function TodayActionsPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Modals state
  const [activeActionModal, setActiveActionModal] = useState<{
    type: 'CALL' | 'PROMISE' | 'SKIP_REMINDER';
    item: any;
  } | null>(null);

  const [callNotes, setCallNotes] = useState('');
  const [promiseDate, setPromiseDate] = useState('');
  const [promiseAmount, setPromiseAmount] = useState('');
  const [promiseNotes, setPromiseNotes] = useState('');
  const [skipReason, setSkipReason] = useState('');

  const loadData = async () => {
    try {
      setRefreshing(true);
      const res = await api.today.get();
      if (res?.data) {
        setData(res.data);
      }
    } catch (err: any) {
      toast.error('Failed to load collections queue: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Reminder Actions
  const handleApproveReminder = async (id: string) => {
    try {
      await api.reminders.approve(id);
      toast.success('Reminder approved for dispatch');
      loadData();
    } catch (err: any) {
      toast.error('Approval failed: ' + err.message);
    }
  };

  const handleSendNowReminder = async (id: string) => {
    try {
      await api.reminders.sendNow(id);
      toast.success('Reminder sent immediately via WhatsApp/Email');
      loadData();
    } catch (err: any) {
      toast.error('Send failed: ' + err.message);
    }
  };

  const handleSkipReminder = async () => {
    if (!activeActionModal?.item?.id) return;
    try {
      await api.reminders.skip(activeActionModal.item.id, skipReason || 'Skipped from Today screen');
      toast.info('Reminder skipped');
      setActiveActionModal(null);
      setSkipReason('');
      loadData();
    } catch (err: any) {
      toast.error('Skip failed: ' + err.message);
    }
  };

  const handleBulkApprove = async () => {
    if (!data?.approvalsWaiting?.length) return;
    const ids = data.approvalsWaiting.map((r: any) => r.id);
    try {
      await api.reminders.bulk(ids, 'approve');
      toast.success(`Approved all ${ids.length} reminders!`);
      loadData();
    } catch (err: any) {
      toast.error('Bulk approval failed: ' + err.message);
    }
  };

  // Log Call Activity
  const handleLogCall = async () => {
    if (!activeActionModal?.item?.id) return;
    try {
      await api.invoices.addActivity(activeActionModal.item.id, {
        type: 'CALL_LOGGED',
        notes: callNotes || 'Phone call follow-up with client.',
      });
      toast.success('Call logged on invoice activity timeline');
      setActiveActionModal(null);
      setCallNotes('');
      loadData();
    } catch (err: any) {
      toast.error('Failed to log call: ' + err.message);
    }
  };

  // Record Promise to Pay
  const handleRecordPromise = async () => {
    if (!activeActionModal?.item?.id || !promiseDate) {
      toast.error('Please specify a promised payment date');
      return;
    }
    try {
      await api.invoices.addActivity(activeActionModal.item.id, {
        type: 'PROMISE_TO_PAY',
        notes: `Promised ₹${promiseAmount || activeActionModal.item.balanceDue} by ${promiseDate}. ${promiseNotes}`,
        promisedDate: promiseDate,
        amount: promiseAmount ? parseFloat(promiseAmount) : undefined,
      });
      toast.success('Promise to pay recorded! Reminder cadence paused until ' + formatDate(promiseDate));
      setActiveActionModal(null);
      setPromiseDate('');
      setPromiseAmount('');
      setPromiseNotes('');
      loadData();
    } catch (err: any) {
      toast.error('Failed to record promise: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm text-slate-400">Loading your morning action queue...</p>
        </div>
      </div>
    );
  }

  const summary = data?.summary || {
    totalOverdue: '0',
    approvalsCount: 0,
    chaseCount: 0,
    dueSoonCount: 0,
    draftsCount: 0,
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Morning Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <div className="flex items-center gap-2 text-indigo-400 text-xs font-mono uppercase tracking-wider font-semibold mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>30-Second Morning Collections Routine</span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight">
            Today's Action Centre
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Review human-in-the-loop reminders, chase overdue receivables, and preserve customer relationships.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-300 bg-slate-900 border border-slate-800 rounded-lg hover:bg-slate-800 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-indigo-400' : ''}`} />
            <span>Refresh</span>
          </button>
          <Link
            href="/app/invoices/new"
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-md shadow-indigo-600/30 transition"
          >
            Create Invoice
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Overdue */}
        <div className="p-5 rounded-xl bg-slate-900/60 border border-rose-500/20 backdrop-blur-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/10 rounded-full blur-2xl -mr-6 -mt-6"></div>
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Total Overdue Receivables</span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="mt-3 text-2xl lg:text-3xl font-bold font-mono text-white tracking-tight">
            {formatInr(summary.totalOverdue)}
          </div>
          <p className="mt-1 text-xs text-rose-400 flex items-center gap-1">
            <span>{summary.chaseCount} overdue invoices need attention</span>
          </p>
        </div>

        {/* Approvals Waiting */}
        <div className="p-5 rounded-xl bg-slate-900/60 border border-amber-500/20 backdrop-blur-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl -mr-6 -mt-6"></div>
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Reminders to Approve</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-3 text-2xl lg:text-3xl font-bold font-mono text-white tracking-tight">
            {summary.approvalsCount}
          </div>
          <p className="mt-1 text-xs text-amber-400">
            {summary.approvalsCount > 0 ? 'Human-in-the-loop protection active' : 'All clear for today'}
          </p>
        </div>

        {/* Due Next 7 Days */}
        <div className="p-5 rounded-xl bg-slate-900/60 border border-indigo-500/20 backdrop-blur-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl -mr-6 -mt-6"></div>
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Due in Next 7 Days</span>
            <Calendar className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="mt-3 text-2xl lg:text-3xl font-bold font-mono text-white tracking-tight">
            {summary.dueSoonCount}
          </div>
          <p className="mt-1 text-xs text-indigo-400">Pre-due gentle nudges queued</p>
        </div>

        {/* Draft Invoices */}
        <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 backdrop-blur-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Unissued Drafts</span>
            <Sparkles className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-3 text-2xl lg:text-3xl font-bold font-mono text-white tracking-tight">
            {summary.draftsCount}
          </div>
          <p className="mt-1 text-xs text-slate-400">Ready to review and issue</p>
        </div>
      </div>

      {/* SECTION 1: Reminders Waiting For Your Approval */}
      <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-md space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
              <h2 className="text-lg font-bold text-white tracking-tight">
                Reminders Waiting For Your Approval
              </h2>
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 font-mono font-medium">
                {data?.approvalsWaiting?.length || 0}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Never spam a client unintentionally. Review, edit tone, or skip before WhatsApp or Email dispatches.
            </p>
          </div>

          {data?.approvalsWaiting && data.approvalsWaiting.length > 0 && (
            <button
              onClick={handleBulkApprove}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-emerald-300 bg-emerald-500/20 border border-emerald-500/30 rounded-lg hover:bg-emerald-500/30 transition shadow-sm"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Approve All ({data.approvalsWaiting.length})</span>
            </button>
          )}
        </div>

        {data?.approvalsWaiting && data.approvalsWaiting.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-3">Client</th>
                  <th className="py-3 px-3">Invoice</th>
                  <th className="py-3 px-3">Amount Due</th>
                  <th className="py-3 px-3">Channel & Rule</th>
                  <th className="py-3 px-3">Scheduled For</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {data.approvalsWaiting.map((rem: any) => (
                  <tr key={rem.id} className="hover:bg-slate-800/30 transition group">
                    <td className="py-3.5 px-3">
                      <div className="font-semibold text-white">{rem.client?.name || 'Client'}</div>
                      <div className="text-[11px] text-slate-400">{rem.client?.email || rem.client?.phone || 'Primary contact'}</div>
                    </td>
                    <td className="py-3.5 px-3">
                      <Link
                        href={`/app/invoices/${rem.invoiceId}`}
                        className="font-mono text-indigo-400 hover:underline flex items-center gap-1"
                      >
                        {rem.invoice?.number || 'INV'}
                        <ExternalLink className="w-3 h-3 opacity-60" />
                      </Link>
                    </td>
                    <td className="py-3.5 px-3 font-mono font-bold text-white">
                      {formatInr(rem.invoice?.balanceDue || rem.amount || 0)}
                    </td>
                    <td className="py-3.5 px-3">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider border ${
                            rem.channel === 'WHATSAPP'
                              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                              : 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                          }`}
                        >
                          {rem.channel}
                        </span>
                        <span className="text-[11px] text-slate-300">
                          {rem.rule?.name || 'Overdue Follow-up'}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-3 text-slate-400">
                      {formatDate(rem.scheduledFor || new Date().toISOString())}
                    </td>
                    <td className="py-3.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleApproveReminder(rem.id)}
                          className="px-2.5 py-1 text-xs rounded bg-indigo-600/30 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/40 transition font-medium flex items-center gap-1"
                          title="Approve for automatic queue dispatch"
                        >
                          <Check className="w-3 h-3" />
                          <span>Approve</span>
                        </button>
                        <button
                          onClick={() => handleSendNowReminder(rem.id)}
                          className="px-2.5 py-1 text-xs rounded bg-emerald-600/30 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/40 transition font-medium flex items-center gap-1"
                          title="Send immediately right now"
                        >
                          <Send className="w-3 h-3" />
                          <span>Send Now</span>
                        </button>
                        <button
                          onClick={() => setActiveActionModal({ type: 'SKIP_REMINDER', item: rem })}
                          className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
                          title="Skip this reminder"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center rounded-xl bg-slate-950/40 border border-slate-800/50">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2 opacity-80" />
            <p className="text-sm font-semibold text-white">No reminders waiting for approval</p>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              Your automated cadence has evaluated all accounts. Future reminders will pop up here according to your approval policies.
            </p>
          </div>
        )}
      </div>

      {/* SECTION 2: Overdue Invoices Requiring Manual Chase */}
      <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-md space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500"></span>
              <h2 className="text-lg font-bold text-white tracking-tight">
                Priority Overdue Accounts to Chase
              </h2>
              <span className="text-xs px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 font-mono font-medium">
                {data?.chaseNow?.length || 0}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Ranked by balance and age. High-touch accounts where a phone call or direct touchpoint recovers cash fastest.
            </p>
          </div>

          <Link
            href="/app/invoices?status=OVERDUE"
            className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1"
          >
            <span>View all overdue ({data?.chaseNow?.length || 0})</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {data?.chaseNow && data.chaseNow.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-3">Client & Contact</th>
                  <th className="py-3 px-3">Invoice</th>
                  <th className="py-3 px-3">Balance Due</th>
                  <th className="py-3 px-3">Overdue Status</th>
                  <th className="py-3 px-3">Section 43B(h) Clock</th>
                  <th className="py-3 px-3 text-right">Quick Follow-up</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {data.chaseNow.map((inv: any) => {
                  const daysOverdue = inv.derived?.daysOverdue || 0;
                  const isMsme = inv.client?.msmeCategory && inv.client.msmeCategory !== 'NONE';
                  const msmeRisk = daysOverdue >= 30;

                  return (
                    <tr key={inv.id} className="hover:bg-slate-800/30 transition">
                      <td className="py-3.5 px-3">
                        <Link
                          href={`/app/clients/${inv.clientId}`}
                          className="font-semibold text-white hover:text-indigo-400 transition"
                        >
                          {inv.client?.name || 'Client'}
                        </Link>
                        <div className="text-[11px] text-slate-400">
                          {inv.client?.phone || inv.client?.email || 'No phone set'}
                        </div>
                      </td>
                      <td className="py-3.5 px-3">
                        <Link
                          href={`/app/invoices/${inv.id}`}
                          className="font-mono text-indigo-400 hover:underline flex items-center gap-1"
                        >
                          {inv.number}
                          <ExternalLink className="w-3 h-3 opacity-60" />
                        </Link>
                        <div className="text-[10px] text-slate-500">
                          Due: {formatDate(inv.dueDate)}
                        </div>
                      </td>
                      <td className="py-3.5 px-3 font-mono font-bold text-white">
                        {formatInr(inv.balanceDue)}
                      </td>
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                            {daysOverdue} days overdue
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-3">
                        {isMsme || msmeRisk ? (
                          <div className="flex items-center gap-1.5 text-[11px] text-amber-400 font-medium">
                            <ShieldAlert className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            <span>
                              {daysOverdue > 45 ? 'Exceeded 45d (Tax disallowed)' : `Day ${daysOverdue} of 45`}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-500">Standard Terms</span>
                        )}
                      </td>
                      <td className="py-3.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setActiveActionModal({ type: 'CALL', item: inv })}
                            className="px-2.5 py-1 text-xs rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition flex items-center gap-1"
                            title="Log a phone call"
                          >
                            <PhoneCall className="w-3 h-3 text-indigo-400" />
                            <span>Log Call</span>
                          </button>
                          <button
                            onClick={() => setActiveActionModal({ type: 'PROMISE', item: inv })}
                            className="px-2.5 py-1 text-xs rounded bg-indigo-600/30 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/40 transition flex items-center gap-1 font-medium"
                            title="Record promise to pay"
                          >
                            <CheckCircle2 className="w-3 h-3 text-indigo-400" />
                            <span>Promise</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center rounded-xl bg-slate-950/40 border border-slate-800/50">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2 opacity-80" />
            <p className="text-sm font-semibold text-white">Zero Overdue Invoices!</p>
            <p className="text-xs text-slate-400 mt-1">
              Outstanding collections are 100% current. Fantastic job maintaining cashflow health.
            </p>
          </div>
        )}
      </div>

      {/* SECTION 3: Promises to Pay Due Today / Upcoming */}
      <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-md space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-indigo-400" />
              <span>Promises to Pay Scheduled Today</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Invoices where a debtor promised payment today. If unfulfilled, resume chasing cadence.
            </p>
          </div>
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 font-mono">
            {data?.promisesToday?.length || 0} Scheduled
          </span>
        </div>

        {data?.promisesToday && data.promisesToday.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.promisesToday.map((prom: any) => (
              <div
                key={prom.id}
                className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 flex items-start justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-white">{prom.client?.name || 'Client'}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-400 font-mono">
                      {prom.invoice?.number}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-2 font-mono">
                    Expected: {formatInr(prom.amount || prom.invoice?.balanceDue || 0)}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1 italic">
                    "{prom.notes || 'Promised payment'}"
                  </p>
                </div>
                <Link
                  href={`/app/invoices/${prom.invoiceId}`}
                  className="px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition"
                >
                  Verify
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-500 italic py-2">
            No payment promises scheduled for today. When debtors make commitments on client portal or phone, they will track here.
          </p>
        )}
      </div>

      {/* SECTION 4: Draft Invoices Ready to Issue */}
      {data?.drafts && data.drafts.length > 0 && (
        <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-md space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">
                Draft Invoices Ready to Issue
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Issued invoices start the GST timeline and automated reminder engine.
              </p>
            </div>
            <Link
              href="/app/invoices?status=DRAFT"
              className="text-xs text-indigo-400 hover:underline"
            >
              View all ({data.drafts.length})
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {data.drafts.map((draft: any) => (
              <div
                key={draft.id}
                className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono text-slate-400">{draft.number}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-medium">
                      DRAFT
                    </span>
                  </div>
                  <div className="font-semibold text-white text-sm mt-1">
                    {draft.client?.name || 'Client'}
                  </div>
                  <div className="font-mono text-base font-bold text-white mt-2">
                    {formatInr(draft.total)}
                  </div>
                </div>
                <Link
                  href={`/app/invoices/${draft.id}`}
                  className="mt-4 w-full py-1.5 px-3 rounded-lg bg-indigo-600/30 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/40 text-xs font-semibold text-center transition"
                >
                  Review & Issue
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL: Log Phone Call */}
      {activeActionModal?.type === 'CALL' && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <PhoneCall className="w-4 h-4 text-indigo-400" />
                <span>Log Call with {activeActionModal.item.client?.name}</span>
              </h3>
              <button
                onClick={() => setActiveActionModal(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Invoice: <span className="font-mono text-slate-200">{activeActionModal.item.number}</span> | Balance:{' '}
              <span className="font-mono text-slate-200">{formatInr(activeActionModal.item.balanceDue)}</span>
            </p>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Call Notes & Client Response
              </label>
              <textarea
                rows={3}
                value={callNotes}
                onChange={(e) => setCallNotes(e.target.value)}
                placeholder="e.g. Spoke with Accounts team; payment queued for approval by CFO this Friday."
                className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:ring-1 focus:ring-indigo-500 outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setActiveActionModal(null)}
                className="px-4 py-2 text-xs text-slate-400 hover:text-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={handleLogCall}
                className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-sm"
              >
                Save Call Log
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Record Promise to Pay */}
      {activeActionModal?.type === 'PROMISE' && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Record Promise to Pay</span>
              </h3>
              <button
                onClick={() => setActiveActionModal(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Invoice <span className="font-mono text-slate-200">{activeActionModal.item.number}</span> | Balance Due:{' '}
              <span className="font-mono text-emerald-400 font-bold">{formatInr(activeActionModal.item.balanceDue)}</span>
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Promised Date *
                </label>
                <input
                  type="date"
                  value={promiseDate}
                  onChange={(e) => setPromiseDate(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:ring-1 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Promised Amount (₹)
                </label>
                <input
                  type="number"
                  placeholder={String(activeActionModal.item.balanceDue)}
                  value={promiseAmount}
                  onChange={(e) => setPromiseAmount(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:ring-1 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Commitment Details / Remarks
                </label>
                <textarea
                  rows={2}
                  value={promiseNotes}
                  onChange={(e) => setPromiseNotes(e.target.value)}
                  placeholder="e.g. Director confirmed RTGS payment will be released on this date."
                  className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:ring-1 focus:ring-indigo-500 outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setActiveActionModal(null)}
                className="px-4 py-2 text-xs text-slate-400 hover:text-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={handleRecordPromise}
                className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-sm"
              >
                Confirm Promise (Pauses Cadence)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Skip Reminder */}
      {activeActionModal?.type === 'SKIP_REMINDER' && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <XCircle className="w-4 h-4 text-rose-400" />
                <span>Skip Reminder</span>
              </h3>
              <button
                onClick={() => setActiveActionModal(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Skip sending reminder for Invoice{' '}
              <span className="font-mono text-slate-200">{activeActionModal.item.invoice?.number}</span> to{' '}
              <span className="text-slate-200">{activeActionModal.item.client?.name}</span>?
            </p>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Reason for skipping
              </label>
              <input
                type="text"
                value={skipReason}
                onChange={(e) => setSkipReason(e.target.value)}
                placeholder="e.g. Spoke offline, cheque already deposited."
                className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:ring-1 focus:ring-indigo-500 outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setActiveActionModal(null)}
                className="px-4 py-2 text-xs text-slate-400 hover:text-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={handleSkipReminder}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-lg shadow-sm"
              >
                Confirm Skip
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
