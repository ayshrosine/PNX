'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Building2, FileText, BellRing, CheckCircle2, ArrowRight } from 'lucide-react';

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);

  // Form State
  const [businessName, setBusinessName] = useState('Acme Cloud Studio LLP');
  const [gstin, setGstin] = useState('27AABCA1234F1Z5');
  const [stateCode, setStateCode] = useState('27');
  const [city, setCity] = useState('Mumbai');
  const [bankName, setBankName] = useState('HDFC Bank');
  const [upiId, setUpiId] = useState('acmecloud@hdfcbank');

  const [seriesPrefix, setSeriesPrefix] = useState('INV/');
  const [fiscalYear, setFiscalYear] = useState('2026-27');
  const [defaultDueDays, setDefaultDueDays] = useState(30);

  const [reminderTone, setReminderTone] = useState<'FRIENDLY' | 'NEUTRAL' | 'FIRM'>('NEUTRAL');
  const [requiresApproval, setRequiresApproval] = useState(true);

  const handleFinish = async () => {
    try {
      await api.tenant.update({
        name: businessName,
        legalName: businessName,
        gstin,
        stateCode,
        city,
        bankName,
        upiId,
        defaultDueDays,
        onboardingStep: 'done',
      });
      router.push('/app/today');
    } catch (e) {
      router.push('/app/today');
    }
  };

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col justify-between p-6">
      <div className="max-w-2xl mx-auto w-full pt-10">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 mb-3">
            <span className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white text-sm">P</span>
            <span className="font-bold text-base text-white">PNX Setup Wizard</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Set up your business in 3 quick steps</h1>
          <p className="text-xs text-slate-400 mt-1">Configure your invoice series and reminder preferences</p>
        </div>

        {/* Progress Tracker */}
        <div className="flex items-center justify-between mb-8 px-4">
          {[
            { id: 1, label: 'Business Profile', icon: Building2 },
            { id: 2, label: 'Invoicing Setup', icon: FileText },
            { id: 3, label: 'Reminders & Rules', icon: BellRing },
          ].map((s) => (
            <div key={s.id} className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition ${
                  step === s.id
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                    : step > s.id
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-slate-900 text-slate-500 border border-slate-800'
                }`}
              >
                {step > s.id ? <CheckCircle2 className="w-4 h-4" /> : s.id}
              </div>
              <span className={`text-xs hidden sm:block ${step === s.id ? 'text-white font-medium' : 'text-slate-500'}`}>
                {s.label}
              </span>
            </div>
          ))}
        </div>

        {/* Step Cards */}
        <div className="p-8 rounded-2xl bg-slate-900/60 border border-slate-800 shadow-xl backdrop-blur-xl">
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-white mb-2">Step 1: Business Profile & GSTIN</h2>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Trade / Legal Name</label>
                <input
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">GSTIN (Optional if unregistered)</label>
                  <input
                    type="text"
                    value={gstin}
                    onChange={(e) => setGstin(e.target.value.toUpperCase())}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 font-mono focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">State Code (e.g. 27 for MH)</label>
                  <input
                    type="text"
                    value={stateCode}
                    onChange={(e) => setStateCode(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 font-mono focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">City</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Bank Name for Invoices</label>
                  <input
                    type="text"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">UPI ID for Quick QR</label>
                <input
                  type="text"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 font-mono focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs rounded-lg flex items-center gap-2 transition"
                >
                  <span>Continue to Step 2</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-white mb-2">Step 2: Invoice Series & Terms</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Series Prefix</label>
                  <input
                    type="text"
                    value={seriesPrefix}
                    onChange={(e) => setSeriesPrefix(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 font-mono focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Fiscal Year</label>
                  <input
                    type="text"
                    value={fiscalYear}
                    onChange={(e) => setFiscalYear(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 font-mono focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Default Payment Terms (Days)</label>
                <input
                  type="number"
                  value={defaultDueDays}
                  onChange={(e) => setDefaultDueDays(parseInt(e.target.value, 10))}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 focus:border-indigo-500 focus:outline-none"
                />
                <p className="text-[11px] text-slate-500 mt-1">Default due date will be calculated as issue date + {defaultDueDays} days.</p>
              </div>

              <div className="p-3.5 rounded-lg bg-slate-950/60 border border-slate-800 text-xs text-slate-300">
                <span className="text-slate-500">Preview Invoice Number: </span>
                <span className="font-mono text-indigo-400 font-bold">{seriesPrefix}{fiscalYear}/0001</span>
              </div>

              <div className="pt-4 flex justify-between">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-4 py-2.5 text-xs text-slate-400 hover:text-white"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs rounded-lg flex items-center gap-2 transition"
                >
                  <span>Continue to Step 3</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-white mb-2">Step 3: Reminder Style & Approvals</h2>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-2">Default Reminder Tone</label>
                <div className="grid grid-cols-3 gap-3">
                  {(['FRIENDLY', 'NEUTRAL', 'FIRM'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setReminderTone(t)}
                      className={`p-3 rounded-lg border text-xs font-semibold transition ${
                        reminderTone === t
                          ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-white">Require Human Approval Before Send</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Recommended: Keeps draft reminders in your morning queue for quick review.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={requiresApproval}
                  onChange={(e) => setRequiresApproval(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-0 bg-slate-900 border-slate-700"
                />
              </div>

              <div className="pt-4 flex justify-between">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-4 py-2.5 text-xs text-slate-400 hover:text-white"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleFinish}
                  className="px-7 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-lg flex items-center gap-2 transition shadow-lg shadow-emerald-600/25"
                >
                  <span>Complete Setup & Open Today Screen</span>
                  <CheckCircle2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
