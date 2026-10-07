import React from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import {
  CalendarCheck,
  BellRing,
  FileText,
  Clock,
  ShieldCheck,
  UploadCloud,
  ArrowRight,
  Check,
} from 'lucide-react';

export default function FeaturesPage() {
  const features = [
    {
      icon: CalendarCheck,
      title: 'Daily "Today" Action List',
      description:
        'Instead of an overwhelming list of 500 invoices, you start your morning with a focused prioritized queue: draft reminders waiting for approval, clients who promised payment today, and overdue accounts requiring personal calls.',
      points: [
        'One-click bulk approval for routine follow-ups',
        'Direct links to client finance contacts with WhatsApp & phone',
        'Promise-to-pay tracker with reminder alerts on promise dates',
      ],
    },
    {
      icon: BellRing,
      title: 'Approval-Based Reminder Engine',
      description:
        'Never send embarrassing automated reminder emails to a client who just sent a check or is disputing an invoice. All reminders generate as DRAFT entries following your configured cadences.',
      points: [
        'Cadence rules: 3 days before due, on due date, 7 days overdue, 30 days overdue',
        'Variable placeholders for invoice link, total amount, and bank UPI details',
        'Quiet hours and weekend protections ensure professional communication',
      ],
    },
    {
      icon: FileText,
      title: 'Indian GST Invoicing & PDF Engine',
      description:
        'Generate beautiful, professional GST-compliant tax invoices in seconds. Dynamic place-of-supply logic automatically splits taxes into CGST/SGST for intra-state or IGST for inter-state clients.',
      points: [
        'Live totals preview with automatic rupee round-off',
        'Amount in Indian Words helper (lakhs & crores)',
        'Built-in QR and NEFT/RTGS bank remittance footer on every PDF',
      ],
    },
    {
      icon: Clock,
      title: 'Section 43B(h) & 45-Day MSME Clock',
      description:
        'Protect your cashflow under India’s Income Tax Section 43B(h). Highlights invoices approaching 15 or 45 days, giving corporate buyers a legal compliance incentive to pay on time.',
      points: [
        'Classify buyers as Micro, Small, Medium, or Non-MSME',
        'Visual alert badges for accounts approaching 45 days',
        'Audit-ready export packs for Chartered Accountants and auditors',
      ],
    },
    {
      icon: UploadCloud,
      title: 'Import Wizard from Tally, Zoho & Excel',
      description:
        'Bring your existing client roster and historical invoices into PNX in under 2 minutes. Map columns effortlessly and validate duplicates before committing.',
      points: [
        'CSV and Excel format detection with sample templates',
        'Automatic GSTIN format validation and state code resolution',
        'Non-destructive dry-run validation with inline row corrections',
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white">
      <Navbar />

      <main className="flex-1 pt-32 pb-20 px-6 max-w-7xl mx-auto w-full">
        <div className="text-center max-w-3xl mx-auto mb-20">
          <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight mb-4">
            Built from scratch for B2B collections
          </h1>
          <p className="text-slate-400 text-base leading-relaxed">
            Every feature in PNX is designed to minimize payment delays, eliminate accounting friction, and maintain healthy client relationships.
          </p>
        </div>

        <div className="space-y-12">
          {features.map((feat, index) => {
            const Icon = feat.icon;
            return (
              <div
                key={feat.title}
                className="p-8 md:p-10 rounded-2xl bg-slate-900/40 border border-slate-800 flex flex-col md:flex-row items-start gap-8 hover:border-slate-700 transition"
              >
                <div className="w-14 h-14 rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center shrink-0">
                  <Icon className="w-7 h-7" />
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-white mb-3">{feat.title}</h3>
                  <p className="text-sm text-slate-300 leading-relaxed mb-6">{feat.description}</p>
                  <ul className="space-y-2.5">
                    {feat.points.map((pt) => (
                      <li key={pt} className="flex items-center gap-3 text-xs text-slate-400">
                        <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>{pt}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-20 text-center">
          <Link
            href="/app/today"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition text-sm shadow-xl shadow-indigo-600/30"
          >
            <span>Try All Features in Demo Mode</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}
