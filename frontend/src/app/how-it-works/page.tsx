import React from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { ArrowRight, CheckCircle2, Send, Eye, ShieldAlert, BadgeCheck } from 'lucide-react';

export default function HowItWorksPage() {
  const steps = [
    {
      num: '01',
      title: 'Issue & Send with Dynamic GST',
      description:
        'Create professional invoices with automatic inter-state IGST or intra-state CGST/SGST calculations. Dispatch directly to client billing contacts with a public payment portal link and attached PDF.',
      icon: Send,
    },
    {
      num: '02',
      title: 'Real-Time Engagement Tracking',
      description:
        'Know the moment your client opens and reviews the invoice link. Stop guessing whether the accounts department actually received your email or if it was lost in spam.',
      icon: Eye,
    },
    {
      num: '03',
      title: 'Morning Approval Queue Review',
      description:
        'Every morning at 09:00 IST, PNX evaluates your open invoices against cadence rules (e.g. 3 days before due, on due date, 7 days overdue). Draft reminder messages appear on your Today screen for quick 1-click approval.',
      icon: ShieldAlert,
    },
    {
      num: '04',
      title: 'Record Payment & Auto-Reconcile',
      description:
        'When funds hit your bank or UPI, log the receipt or match it from your statement. PNX automatically allocates amounts oldest-first or against specific invoices, updates balances, and halts reminders.',
      icon: BadgeCheck,
    },
  ];

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white">
      <Navbar />

      <main className="flex-1 pt-32 pb-20 px-6 max-w-6xl mx-auto w-full">
        <div className="text-center max-w-2xl mx-auto mb-20">
          <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight mb-4">
            How the 4-step workflow keeps you cashflow positive
          </h1>
          <p className="text-slate-400 text-sm">
            From first invoice creation to final bank reconciliation, PNX automates the manual tracking while keeping you in total control.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-20">
          {steps.map((st) => {
            const Icon = st.icon;
            return (
              <div
                key={st.num}
                className="p-8 rounded-2xl bg-slate-900/40 border border-slate-800 relative hover:border-slate-700 transition"
              >
                <div className="flex items-center justify-between mb-6">
                  <span className="text-3xl font-extrabold text-indigo-400 font-mono">{st.num}</span>
                  <div className="w-10 h-10 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
                    <Icon className="w-5 h-5" />
                  </div>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">{st.title}</h3>
                <p className="text-xs text-slate-300 leading-relaxed">{st.description}</p>
              </div>
            );
          })}
        </div>

        <div className="text-center">
          <Link
            href="/app/today"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition text-sm shadow-xl shadow-indigo-600/30"
          >
            <span>See the Workflow Live in Action</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}
