'use client';

import React, { useState, useEffect } from 'react';
import {
  Settings,
  Building,
  CreditCard,
  Hash,
  Users,
  ShieldCheck,
  CheckCircle2,
  Save,
  QrCode,
  Sparkles,
} from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from 'sonner';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'PROFILE' | 'BANK' | 'SERIES' | 'TEAM' | 'BILLING'>('PROFILE');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Business Profile Form
  const [name, setName] = useState('');
  const [gstin, setGstin] = useState('');
  const [pan, setPan] = useState('');
  const [stateCode, setStateCode] = useState('27');
  const [addressLine1, setAddressLine1] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');
  const [udyamNumber, setUdyamNumber] = useState('');

  // Bank Form
  const [bankAccountName, setBankAccountName] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [upiId, setUpiId] = useState('');

  // Series
  const [prefix, setPrefix] = useState('ACS');
  const [nextNumber, setNextNumber] = useState('1001');

  // Members
  const [members, setMembers] = useState<any[]>([]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const [tRes, mRes] = await Promise.all([
        api.tenant.get().catch(() => ({ data: null })),
        api.tenant.members().catch(() => ({ data: [] })),
      ]);

      if (tRes?.data) {
        const t = tRes.data;
        setName(t.name || '');
        setGstin(t.gstin || '');
        setPan(t.pan || '');
        setStateCode(t.stateCode || '27');
        setAddressLine1(t.addressLine1 || '');
        setCity(t.city || '');
        setState(t.state || '');
        setPincode(t.pincode || '');
        setUdyamNumber(t.udyamNumber || '');

        setBankAccountName(t.bankAccountName || t.name || '');
        setBankName(t.bankName || '');
        setAccountNumber(t.accountNumber || '');
        setIfscCode(t.ifscCode || '');
        setUpiId(t.upiId || '');
      }

      if (mRes?.data) {
        setMembers(mRes.data);
      }
    } catch (err: any) {
      toast.error('Failed to load settings: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      await api.tenant.update({
        name,
        gstin,
        pan,
        stateCode,
        addressLine1,
        city,
        state,
        pincode,
        udyamNumber,
      });
      toast.success('Business profile updated successfully!');
    } catch (err: any) {
      toast.error('Failed to save profile: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveBank = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      await api.tenant.update({
        bankAccountName,
        bankName,
        accountNumber,
        ifscCode,
        upiId,
      });
      toast.success('Bank & UPI remittance details updated!');
    } catch (err: any) {
      toast.error('Failed to save bank details: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-24">
      {/* Header */}
      <div className="border-b border-slate-800/80 pb-6">
        <h1 className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
          <Settings className="w-6 h-6 text-indigo-400" />
          <span>Organization Settings</span>
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Configure business legal entity, GST details, bank remittance accounts, invoice series, and team permissions.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 text-xs font-medium">
        <button
          onClick={() => setActiveTab('PROFILE')}
          className={`pb-3 px-2 border-b-2 transition flex items-center gap-1.5 ${
            activeTab === 'PROFILE'
              ? 'border-indigo-500 text-indigo-400 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Building className="w-4 h-4" />
          <span>Business & GST Profile</span>
        </button>
        <button
          onClick={() => setActiveTab('BANK')}
          className={`pb-3 px-2 border-b-2 transition flex items-center gap-1.5 ${
            activeTab === 'BANK'
              ? 'border-indigo-500 text-indigo-400 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>Bank & UPI Details</span>
        </button>
        <button
          onClick={() => setActiveTab('SERIES')}
          className={`pb-3 px-2 border-b-2 transition flex items-center gap-1.5 ${
            activeTab === 'SERIES'
              ? 'border-indigo-500 text-indigo-400 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Hash className="w-4 h-4" />
          <span>Invoice Series</span>
        </button>
        <button
          onClick={() => setActiveTab('TEAM')}
          className={`pb-3 px-2 border-b-2 transition flex items-center gap-1.5 ${
            activeTab === 'TEAM'
              ? 'border-indigo-500 text-indigo-400 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Team & RBAC</span>
        </button>
        <button
          onClick={() => setActiveTab('BILLING')}
          className={`pb-3 px-2 border-b-2 transition flex items-center gap-1.5 ${
            activeTab === 'BILLING'
              ? 'border-indigo-500 text-indigo-400 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Plan & Subscription</span>
        </button>
      </div>

      {/* TAB 1: Profile */}
      {activeTab === 'PROFILE' && (
        <form onSubmit={handleSaveProfile} className="space-y-6">
          <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-md space-y-4">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Legal Identity & Tax Registration
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Legal Entity / Firm Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  GSTIN (15 Digits) *
                </label>
                <input
                  type="text"
                  required
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value.toUpperCase())}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-indigo-400"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">PAN Number</label>
                <input
                  type="text"
                  value={pan}
                  onChange={(e) => setPan(e.target.value.toUpperCase())}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Home State Code
                </label>
                <input
                  type="text"
                  value={stateCode}
                  onChange={(e) => setStateCode(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  MSME Udyam Registration #
                </label>
                <input
                  type="text"
                  placeholder="UDYAM-MH-01-0012345"
                  value={udyamNumber}
                  onChange={(e) => setUdyamNumber(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-emerald-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Registered Office Address
              </label>
              <input
                type="text"
                value={addressLine1}
                onChange={(e) => setAddressLine1(e.target.value)}
                placeholder="Unit 402, Trade Tower, Bandra Kurla Complex"
                className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white mb-2"
              />
              <div className="grid grid-cols-3 gap-3">
                <input
                  type="text"
                  placeholder="City"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white"
                />
                <input
                  type="text"
                  placeholder="State"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white"
                />
                <input
                  type="text"
                  placeholder="Pincode"
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value)}
                  className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-white"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md shadow-indigo-600/30 transition flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>Save Business Profile</span>
            </button>
          </div>
        </form>
      )}

      {/* TAB 2: Bank Details */}
      {activeTab === 'BANK' && (
        <form onSubmit={handleSaveBank} className="space-y-6">
          <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-md space-y-4">
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Bank Remittance & UPI VPA
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                These banking coordinates appear on generated PDF tax invoices and the client payment portal.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Beneficiary Account Name
                </label>
                <input
                  type="text"
                  value={bankAccountName}
                  onChange={(e) => setBankAccountName(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Bank Name</label>
                <input
                  type="text"
                  placeholder="HDFC Bank Limited"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Account Number
                </label>
                <input
                  type="text"
                  placeholder="50200012345678"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">IFSC Code</label>
                <input
                  type="text"
                  placeholder="HDFC0000060"
                  value={ifscCode}
                  onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  UPI VPA / Handle
                </label>
                <input
                  type="text"
                  placeholder="acmecloud@hdfcbank"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-indigo-400"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md shadow-indigo-600/30 transition flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>Save Bank Details</span>
            </button>
          </div>
        </form>
      )}

      {/* TAB 3: Invoice Series */}
      {activeTab === 'SERIES' && (
        <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-md space-y-4">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">
            GST Invoice Numbering Series
          </h2>
          <p className="text-xs text-slate-400">
            Per GST Rule 46(b), tax invoice numbers must be consecutive and unique within a financial year.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Prefix</label>
              <input
                type="text"
                value={prefix}
                onChange={(e) => setPrefix(e.target.value.toUpperCase())}
                className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Next Sequence Number
              </label>
              <input
                type="text"
                value={nextNumber}
                onChange={(e) => setNextNumber(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-white"
              />
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-xs font-mono text-indigo-400">
            Sample Preview: {prefix}-2026-{nextNumber}
          </div>
        </div>
      )}

      {/* TAB 4: Team */}
      {activeTab === 'TEAM' && (
        <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-md space-y-4">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">
            Team Members & Access Control
          </h2>
          <div className="divide-y divide-slate-800 text-xs">
            {members.length > 0 ? (
              members.map((m: any, i: number) => (
                <div key={i} className="py-3 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-white">{m.user?.fullName || 'Demo Admin'}</div>
                    <div className="text-slate-400 text-[11px]">{m.user?.email || 'admin@pnx.com'}</div>
                  </div>
                  <span className="px-2.5 py-0.5 rounded bg-indigo-500/20 text-indigo-400 font-mono text-[10px] font-semibold">
                    {m.role || 'OWNER'}
                  </span>
                </div>
              ))
            ) : (
              <div className="py-3 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-white">Founder / Finance Lead</div>
                  <div className="text-slate-400 text-[11px]">demo@pnx.com</div>
                </div>
                <span className="px-2.5 py-0.5 rounded bg-indigo-500/20 text-indigo-400 font-mono text-[10px] font-semibold">
                  OWNER
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 5: Billing */}
      {activeTab === 'BILLING' && (
        <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-md space-y-4">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">
            Current Subscription Plan
          </h2>
          <div className="p-4 rounded-xl bg-indigo-600/10 border border-indigo-500/30 flex items-center justify-between">
            <div>
              <span className="text-xs font-mono text-indigo-400 font-semibold uppercase">Active Plan</span>
              <div className="text-xl font-extrabold text-white">Growth Tier (₹2,999/mo)</div>
              <p className="text-xs text-slate-400 mt-1">
                Unlimited GST Invoices, WhatsApp & Email Reminders, Section 43B(h) Audit, 5 Team Seats.
              </p>
            </div>
            <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-semibold border border-emerald-500/30">
              Active
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
