'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Users,
  Plus,
  Search,
  Building,
  ShieldCheck,
  ShieldAlert,
  PauseCircle,
  PlayCircle,
  ExternalLink,
  Phone,
  Mail,
  ChevronRight,
} from 'lucide-react';
import { api } from '@/lib/api';
import { formatInr } from '@/lib/utils';
import { toast } from 'sonner';

export default function ClientsListPage() {
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

  // New Client Form
  const [name, setName] = useState('');
  const [gstin, setGstin] = useState('');
  const [pan, setPan] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [stateCode, setStateCode] = useState('27');
  const [msmeCategory, setMsmeCategory] = useState<'NONE' | 'MICRO' | 'SMALL' | 'MEDIUM'>('NONE');
  const [creditDays, setCreditDays] = useState(30);

  const loadClients = async () => {
    try {
      setLoading(true);
      const res = await api.clients.list();
      if (res?.data) {
        setClients(res.data);
      }
    } catch (err: any) {
      toast.error('Failed to load clients: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClients();
  }, []);

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Client name is required');
      return;
    }

    try {
      await api.clients.create({
        name,
        gstin: gstin || undefined,
        pan: pan || undefined,
        email: email || undefined,
        phone: phone || undefined,
        stateCode,
        msmeCategory,
        creditDays: Number(creditDays),
      });
      toast.success('Client added successfully!');
      setModalOpen(false);
      setName('');
      setGstin('');
      setPan('');
      setEmail('');
      setPhone('');
      loadClients();
    } catch (err: any) {
      toast.error('Failed to add client: ' + err.message);
    }
  };

  const filteredClients = clients.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.name?.toLowerCase().includes(q) ||
      c.gstin?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight">
            Client Directory
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Manage B2B debtor relationships, MSME classifications, and customized credit terms.
          </p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-md shadow-indigo-600/30 transition"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Client</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative w-full md:w-80">
        <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by client name, GSTIN..."
          className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>

      {/* Clients Table */}
      <div className="rounded-2xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-md overflow-hidden">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : filteredClients.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider bg-slate-950/40 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Client Name & Details</th>
                  <th className="py-3 px-4">GSTIN & State</th>
                  <th className="py-3 px-4">MSME Category</th>
                  <th className="py-3 px-4">Outstanding Balance</th>
                  <th className="py-3 px-4">Overdue Balance</th>
                  <th className="py-3 px-4">Cadence</th>
                  <th className="py-3 px-4 text-right">Profile</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {filteredClients.map((client) => {
                  const isMsme = client.msmeCategory && client.msmeCategory !== 'NONE';
                  const isPaused = Boolean(client.remindersPausedUntil);

                  return (
                    <tr key={client.id} className="hover:bg-slate-800/30 transition group">
                      <td className="py-3.5 px-4">
                        <Link
                          href={`/app/clients/${client.id}`}
                          className="font-semibold text-white hover:text-indigo-400 flex items-center gap-1.5"
                        >
                          <span>{client.name}</span>
                          <ChevronRight className="w-3.5 h-3.5 opacity-40 group-hover:opacity-100" />
                        </Link>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {client.email || client.phone || 'No direct contact set'}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono">
                        <div className="text-slate-200">{client.gstin || 'Unregistered'}</div>
                        <div className="text-[10px] text-slate-500">State: {client.stateCode || '27'}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        {isMsme ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 w-max">
                            <ShieldCheck className="w-3 h-3" />
                            <span>MSME {client.msmeCategory}</span>
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-500">Standard</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-semibold text-white">
                        {formatInr(client.outstandingBalance || 0)}
                      </td>
                      <td className="py-3.5 px-4 font-mono">
                        {client.overdueBalance > 0 ? (
                          <span className="text-rose-400 font-bold">
                            {formatInr(client.overdueBalance)}
                          </span>
                        ) : (
                          <span className="text-slate-500">₹0.00</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        {isPaused ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                            PAUSED
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                            ACTIVE
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Link
                          href={`/app/clients/${client.id}`}
                          className="px-2.5 py-1 text-xs rounded bg-slate-800 hover:bg-slate-700 text-slate-200 transition font-medium"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center">
            <Users className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <p className="text-sm font-semibold text-white">No clients found</p>
            <p className="text-xs text-slate-400 mt-1">
              Add your first client or customer to start sending GST invoices.
            </p>
          </div>
        )}
      </div>

      {/* ADD CLIENT MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Building className="w-4 h-4 text-indigo-400" />
                <span>Add Client</span>
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateClient} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Company / Legal Entity Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Nexus Retail Private Limited"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">GSTIN</label>
                  <input
                    type="text"
                    placeholder="27AABCU9603R1ZM"
                    value={gstin}
                    onChange={(e) => setGstin(e.target.value.toUpperCase())}
                    className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">PAN</label>
                  <input
                    type="text"
                    placeholder="AABCU9603R"
                    value={pan}
                    onChange={(e) => setPan(e.target.value.toUpperCase())}
                    className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Billing Email
                  </label>
                  <input
                    type="email"
                    placeholder="accounts@nexusretail.in"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    WhatsApp / Phone
                  </label>
                  <input
                    type="text"
                    placeholder="+91 98200 12345"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    MSME Category
                  </label>
                  <select
                    value={msmeCategory}
                    onChange={(e) => setMsmeCategory(e.target.value as any)}
                    className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white"
                  >
                    <option value="NONE">Not Registered / None</option>
                    <option value="MICRO">Micro Enterprise</option>
                    <option value="SMALL">Small Enterprise</option>
                    <option value="MEDIUM">Medium Enterprise</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Credit Terms (Days)
                  </label>
                  <input
                    type="number"
                    value={creditDays}
                    onChange={(e) => setCreditDays(Number(e.target.value))}
                    className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-xs text-slate-400 hover:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-sm"
                >
                  Create Client
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
