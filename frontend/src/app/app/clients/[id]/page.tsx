'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Users,
  ArrowLeft,
  Building,
  ShieldCheck,
  ShieldAlert,
  PauseCircle,
  PlayCircle,
  Plus,
  FileText,
  CreditCard,
  Download,
  Mail,
  Phone,
  Calendar,
  ExternalLink,
} from 'lucide-react';
import { api } from '@/lib/api';
import { formatInr, formatDate } from '@/lib/utils';
import { toast } from 'sonner';

export default function ClientDetailPage() {
  const params = useParams();
  const clientId = String(params.id);

  const [client, setClient] = useState<any>(null);
  const [statement, setStatement] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'INVOICES' | 'STATEMENT' | 'CONTACTS'>('INVOICES');

  // Pause modal
  const [pauseModalOpen, setPauseModalOpen] = useState(false);
  const [pauseDate, setPauseDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().split('T')[0];
  });
  const [pauseReason, setPauseReason] = useState('');

  // Add Contact modal
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactRole, setContactRole] = useState('ACCOUNTS');

  const loadData = async () => {
    try {
      setLoading(true);
      const [cRes, sRes] = await Promise.all([
        api.clients.get(clientId),
        api.clients.getStatement(clientId).catch(() => ({ data: null })),
      ]);
      if (cRes?.data) setClient(cRes.data);
      if (sRes?.data) setStatement(sRes.data);
    } catch (err: any) {
      toast.error('Failed to load client profile: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (clientId) loadData();
  }, [clientId]);

  const handlePauseReminders = async () => {
    try {
      await api.clients.pauseReminders(clientId, {
        untilDate: pauseDate,
        reason: pauseReason || 'Manual pause by finance lead',
      });
      toast.success('Reminders paused until ' + formatDate(pauseDate));
      setPauseModalOpen(false);
      loadData();
    } catch (err: any) {
      toast.error('Pause failed: ' + err.message);
    }
  };

  const handleResumeReminders = async () => {
    try {
      await api.clients.resumeReminders(clientId);
      toast.success('Reminder schedule resumed!');
      loadData();
    } catch (err: any) {
      toast.error('Failed to resume: ' + err.message);
    }
  };

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactName.trim()) {
      toast.error('Contact name is required');
      return;
    }
    try {
      await api.clients.addContact(clientId, {
        name: contactName,
        email: contactEmail || undefined,
        phone: contactPhone || undefined,
        designation: contactRole,
      });
      toast.success('Contact added!');
      setContactModalOpen(false);
      setContactName('');
      setContactEmail('');
      setContactPhone('');
      loadData();
    } catch (err: any) {
      toast.error('Failed to add contact: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="p-12 text-center text-slate-400">
        <p>Client not found.</p>
        <Link href="/app/clients" className="text-indigo-400 hover:underline mt-2 inline-block">
          Return to Clients
        </Link>
      </div>
    );
  }

  const isMsme = client.msmeCategory && client.msmeCategory !== 'NONE';
  const isPaused = Boolean(client.remindersPausedUntil);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-24">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div className="flex items-center gap-3">
          <Link
            href="/app/clients"
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-extrabold text-white tracking-tight">{client.name}</h1>
              {isMsme && (
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  <span>MSME {client.msmeCategory}</span>
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              GSTIN: <span className="font-mono text-slate-200">{client.gstin || 'Unregistered'}</span> | State:{' '}
              {client.stateCode || '27'} | Credit Terms: {client.creditDays || 30} days
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {isPaused ? (
            <button
              onClick={handleResumeReminders}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-300 bg-emerald-500/20 border border-emerald-500/30 rounded-lg hover:bg-emerald-500/30 transition"
            >
              <PlayCircle className="w-3.5 h-3.5" />
              <span>Resume Reminders</span>
            </button>
          ) : (
            <button
              onClick={() => setPauseModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-lg hover:bg-amber-500/20 transition"
              title="Pause automated reminders during active discussions"
            >
              <PauseCircle className="w-3.5 h-3.5" />
              <span>Pause Reminders</span>
            </button>
          )}

          <Link
            href={`/app/invoices/new?clientId=${client.id}`}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-sm transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Invoice</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 text-xs">
          <span className="text-slate-400">Total Billed</span>
          <div className="text-xl font-bold font-mono text-white mt-1">
            {formatInr(statement?.summary?.totalBilled || client.totalBilled || 0)}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 text-xs">
          <span className="text-slate-400">Total Collections</span>
          <div className="text-xl font-bold font-mono text-emerald-400 mt-1">
            {formatInr(statement?.summary?.totalCollected || client.totalCollected || 0)}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 text-xs">
          <span className="text-slate-400">Outstanding Balance</span>
          <div className="text-xl font-bold font-mono text-white mt-1">
            {formatInr(client.outstandingBalance || 0)}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/40 border border-rose-500/20 text-xs">
          <span className="text-slate-400">Overdue Balance</span>
          <div className="text-xl font-bold font-mono text-rose-400 mt-1">
            {formatInr(client.overdueBalance || 0)}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 text-xs font-medium">
        <button
          onClick={() => setActiveTab('INVOICES')}
          className={`pb-3 px-2 border-b-2 transition ${
            activeTab === 'INVOICES'
              ? 'border-indigo-500 text-indigo-400 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Invoices & Bills
        </button>
        <button
          onClick={() => setActiveTab('STATEMENT')}
          className={`pb-3 px-2 border-b-2 transition ${
            activeTab === 'STATEMENT'
              ? 'border-indigo-500 text-indigo-400 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Statement of Account (Ledger)
        </button>
        <button
          onClick={() => setActiveTab('CONTACTS')}
          className={`pb-3 px-2 border-b-2 transition ${
            activeTab === 'CONTACTS'
              ? 'border-indigo-500 text-indigo-400 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Contact Directory ({client.contacts?.length || 0})
        </button>
      </div>

      {/* TAB 1: Invoices */}
      {activeTab === 'INVOICES' && (
        <div className="rounded-2xl bg-slate-900/40 border border-slate-800 overflow-hidden">
          {client.invoices && client.invoices.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/60 text-[11px] text-slate-400 uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-4">Invoice #</th>
                    <th className="py-2.5 px-4">Issue Date</th>
                    <th className="py-2.5 px-4">Due Date</th>
                    <th className="py-2.5 px-4">Total</th>
                    <th className="py-2.5 px-4">Balance</th>
                    <th className="py-2.5 px-4">Status</th>
                    <th className="py-2.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 font-medium">
                  {client.invoices.map((inv: any) => (
                    <tr key={inv.id} className="hover:bg-slate-800/20">
                      <td className="py-3 px-4 font-mono font-semibold text-indigo-400">
                        <Link href={`/app/invoices/${inv.id}`} className="hover:underline flex items-center gap-1">
                          {inv.number}
                          <ExternalLink className="w-3 h-3 opacity-60" />
                        </Link>
                      </td>
                      <td className="py-3 px-4 text-slate-400">{formatDate(inv.issueDate)}</td>
                      <td className="py-3 px-4 text-slate-400">{formatDate(inv.dueDate)}</td>
                      <td className="py-3 px-4 font-mono font-semibold text-white">
                        {formatInr(inv.total)}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-amber-400">
                        {formatInr(inv.balanceDue)}
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                          {inv.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Link
                          href={`/app/invoices/${inv.id}`}
                          className="px-2.5 py-1 text-xs rounded bg-slate-800 hover:bg-slate-700 text-slate-200"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-xs text-slate-500 py-8 text-center">No invoices issued to this client yet.</p>
          )}
        </div>
      )}

      {/* TAB 2: Statement of Account */}
      {activeTab === 'STATEMENT' && (
        <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h2 className="text-sm font-bold text-white">Statement of Account (Running Ledger)</h2>
              <p className="text-xs text-slate-400">
                Detailed transaction chronological ledger with debit, credit, and running balance.
              </p>
            </div>
            <button
              onClick={() => window.print()}
              className="px-3 py-1.5 text-xs font-semibold text-slate-300 bg-slate-900 border border-slate-800 rounded-lg hover:bg-slate-800 flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Print / Export</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 text-[11px] text-slate-400 uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Reference</th>
                  <th className="py-2.5 px-3 text-right">Debit (₹)</th>
                  <th className="py-2.5 px-3 text-right">Credit (₹)</th>
                  <th className="py-2.5 px-3 text-right">Running Balance (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 font-medium">
                {statement?.transactions && statement.transactions.length > 0 ? (
                  statement.transactions.map((t: any, i: number) => (
                    <tr key={i} className="hover:bg-slate-800/20">
                      <td className="py-3 px-3 text-slate-400">{formatDate(t.date)}</td>
                      <td className="py-3 px-3 font-semibold text-white">{t.type}</td>
                      <td className="py-3 px-3 font-mono text-indigo-400">{t.reference}</td>
                      <td className="py-3 px-3 font-mono text-right text-rose-400">
                        {t.debit > 0 ? formatInr(t.debit) : '—'}
                      </td>
                      <td className="py-3 px-3 font-mono text-right text-emerald-400">
                        {t.credit > 0 ? formatInr(t.credit) : '—'}
                      </td>
                      <td className="py-3 px-3 font-mono text-right font-bold text-white">
                        {formatInr(t.balance)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-slate-500">
                      Ledger is clean. No historical transactions found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: Contacts */}
      {activeTab === 'CONTACTS' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => setContactModalOpen(true)}
              className="px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Contact Person</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {client.contacts && client.contacts.length > 0 ? (
              client.contacts.map((contact: any) => (
                <div
                  key={contact.id}
                  className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-sm">{contact.name}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-medium">
                      {contact.designation || 'Accounts'}
                    </span>
                  </div>
                  {contact.email && (
                    <div className="flex items-center gap-2 text-slate-400">
                      <Mail className="w-3.5 h-3.5 text-slate-500" />
                      <span>{contact.email}</span>
                    </div>
                  )}
                  {contact.phone && (
                    <div className="flex items-center gap-2 text-slate-400">
                      <Phone className="w-3.5 h-3.5 text-slate-500" />
                      <span>{contact.phone}</span>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-500 col-span-2 text-center py-6">
                No additional contacts configured. Primary client profile is used.
              </p>
            )}
          </div>
        </div>
      )}

      {/* PAUSE MODAL */}
      {pauseModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <PauseCircle className="w-4 h-4 text-amber-400" />
              <span>Pause Reminders for {client.name}</span>
            </h3>

            <p className="text-xs text-slate-400">
              No automated or queued WhatsApp/Email payment reminders will be sent to this client until the
              specified resumption date.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Pause Reminders Until
                </label>
                <input
                  type="date"
                  value={pauseDate}
                  onChange={(e) => setPauseDate(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Internal Reason
                </label>
                <input
                  type="text"
                  placeholder="e.g. Founder offline discussion ongoing"
                  value={pauseReason}
                  onChange={(e) => setPauseReason(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setPauseModalOpen(false)}
                className="px-4 py-2 text-xs text-slate-400 hover:text-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={handlePauseReminders}
                className="px-4 py-2 text-xs font-semibold text-amber-300 bg-amber-500/20 border border-amber-500/30 rounded-lg hover:bg-amber-500/30"
              >
                Confirm Pause
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD CONTACT MODAL */}
      {contactModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-400" />
              <span>Add Contact Person</span>
            </h3>

            <form onSubmit={handleAddContact} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Sharma"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Email</label>
                <input
                  type="email"
                  placeholder="ramesh@company.in"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Phone</label>
                <input
                  type="text"
                  placeholder="+91 98200 99999"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Role / Designation</label>
                <input
                  type="text"
                  placeholder="e.g. VP Finance / Head of Accounts"
                  value={contactRole}
                  onChange={(e) => setContactRole(e.target.value)}
                  className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setContactModalOpen(false)}
                  className="px-4 py-2 text-xs text-slate-400 hover:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg"
                >
                  Save Contact
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
