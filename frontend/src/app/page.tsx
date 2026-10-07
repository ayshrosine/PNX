import React from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import {
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  CalendarCheck,
  BellRing,
  Clock,
  Sparkles,
  TrendingUp,
  FileCheck2,
  AlertCircle,
  Building2,
} from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white">
      <Navbar />

      {/* Hero Section */}
      <section className="pt-36 pb-20 px-6 max-w-7xl mx-auto w-full text-center relative overflow-hidden">
        {/* Ambient Gradient Glows */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[350px] bg-gradient-to-tr from-indigo-600/20 via-violet-600/20 to-emerald-500/10 blur-[130px] -z-10 pointer-events-none rounded-full" />

        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-medium mb-8">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          <span>Section 43B(h) & MSME 45-day payment tracking ready</span>
        </div>

        <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight text-white max-w-4xl mx-auto leading-[1.15] mb-6">
          Get paid <span className="bg-gradient-to-r from-indigo-400 via-violet-300 to-emerald-400 bg-clip-text text-transparent">on time</span> without the uncomfortable follow-ups.
        </h1>

        <p className="text-lg md:text-xl text-slate-300 max-w-2xl mx-auto mb-10 leading-relaxed font-normal">
          The collections-first workflow platform for Indian B2B service firms. Turn invoices into a daily action list, review reminders before they send, and cut DSO by 18 days.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
          <Link
            href="/app/today"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 transition font-semibold text-white shadow-xl shadow-indigo-600/30 text-base"
          >
            <span>Explore Live Demo App</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/pricing"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 transition font-medium text-slate-200 text-base"
          >
            <span>View Pricing (INR)</span>
          </Link>
        </div>

        {/* Live Interface Teaser Card */}
        <div className="relative mx-auto max-w-5xl rounded-2xl p-2 bg-gradient-to-b from-slate-700/40 to-slate-900/60 border border-slate-700/50 shadow-2xl backdrop-blur-xl">
          <div className="rounded-xl bg-slate-950/90 p-6 md:p-8 text-left border border-slate-800">
            {/* Header of Mock */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between pb-6 mb-6 border-b border-slate-800 gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <h3 className="text-xl font-bold text-white">Today&apos;s Collection Action List</h3>
                  <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-mono">
                    ₹1,91,900 Overdue
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">2 Reminders waiting for your 1-click review & approval</p>
              </div>
              <Link
                href="/app/today"
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition flex items-center gap-2"
              >
                <span>Open in App</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Mock Items */}
            <div className="space-y-3">
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-slate-100">TechCorp India Pvt Ltd</span>
                    <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">INV/2026-27/0101</span>
                    <span className="text-xs text-rose-400 font-mono">23 days overdue</span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Reminder draft: &quot;Payment follow-up: Invoice INV/2026-27/0101 is overdue&quot;
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-sm font-bold text-white">₹1,41,600.00</div>
                    <div className="text-[11px] text-slate-400 font-mono">GST 18% included</div>
                  </div>
                  <span className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-medium">
                    Ready to Approve
                  </span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-slate-100">Nexus Retail Solutions</span>
                    <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">INV/2026-27/0102</span>
                    <span className="text-xs text-amber-400 font-mono">Remaining Balance Overdue</span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Follow-up: Acknowledging ₹50,000 part-payment, requesting ₹50,300 balance
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-sm font-bold text-white">₹50,300.00</div>
                    <div className="text-[11px] text-emerald-400 font-mono">₹50,000 Paid</div>
                  </div>
                  <span className="px-3 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-medium">
                    Needs Review
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Key Value Pillars */}
      <section className="py-20 border-t border-slate-800/80 bg-slate-950/40 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-2xl md:text-4xl font-bold text-white mb-4">
              Engineered for the realities of Indian B2B cashflow
            </h2>
            <p className="text-slate-400 text-sm">
              Generic global invoicing software sends embarrassing auto-reminders. PNX gives you complete control with a collections-first architecture.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-8 rounded-2xl bg-slate-900/40 border border-slate-800/80 hover:border-slate-700 transition">
              <div className="w-12 h-12 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center mb-6">
                <CalendarCheck className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">1. Daily &quot;Today&quot; Action List</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Log in and immediately see who owes what, who promised payment today, and which reminders require approval. No digging through messy spreadsheets.
              </p>
            </div>

            <div className="p-8 rounded-2xl bg-slate-900/40 border border-slate-800/80 hover:border-slate-700 transition">
              <div className="w-12 h-12 rounded-xl bg-violet-600/20 text-violet-400 border border-violet-500/30 flex items-center justify-center mb-6">
                <BellRing className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">2. Explicit Human Approvals</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Never accidentally ping a client who just sent a check or is disputing a deliverable. You review, edit, or approve all reminder drafts with one click.
              </p>
            </div>

            <div className="p-8 rounded-2xl bg-slate-900/40 border border-slate-800/80 hover:border-slate-700 transition">
              <div className="w-12 h-12 rounded-xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mb-6">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">3. Indian GST & 43B(h) Clock</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Inter-state IGST vs CGST/SGST automatic splitting, TDS deduction recording, and an MSME 45-day overdue clock that protects your buyer tax deductions.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Bottom */}
      <section className="py-20 px-6 max-w-5xl mx-auto text-center w-full">
        <div className="p-10 md:p-14 rounded-3xl bg-gradient-to-b from-indigo-950/60 to-slate-950 border border-indigo-500/30 shadow-2xl relative overflow-hidden">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Take command of your receivables today
          </h2>
          <p className="text-slate-300 text-sm max-w-xl mx-auto mb-8">
            Experience the complete platform live in your browser, pre-populated with realistic Indian B2B client data.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/app/today"
              className="px-8 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition text-sm shadow-xl shadow-indigo-600/40"
            >
              Launch Live App
            </Link>
            <Link
              href="/signup"
              className="px-8 py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 font-medium transition text-sm"
            >
              Create Free Account
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
