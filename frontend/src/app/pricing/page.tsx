import React from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Check, ArrowRight, Zap, ShieldCheck } from 'lucide-react';

export default function PricingPage() {
  const plans = [
    {
      name: 'Starter Plan',
      price: '₹1,499',
      interval: 'per month',
      description: 'Ideal for freelance consultants and micro-agencies up to 10 active clients.',
      features: [
        'Up to 50 invoices / month',
        '2 team seats (Admin & Accountant)',
        'Daily "Today" Action Queue',
        'Approval-based email reminders',
        'GST & Inter-state tax splitting',
        'Standard PDF generator',
        'CSV & Excel export packs',
      ],
      popular: false,
      cta: 'Start with Starter',
    },
    {
      name: 'Growth Plan',
      price: '₹2,999',
      interval: 'per month',
      description: 'For growing IT services, creative studios, and consulting firms.',
      features: [
        'Up to 300 invoices / month',
        '5 team seats with granular RBAC',
        'Custom reminder cadences & templates',
        'Section 43B(h) MSME overdue alert engine',
        'Bank statement auto-suggest matching',
        'TDS deduction and receipt register',
        'Import wizard from Tally & Zoho',
        'Client public view portal links',
      ],
      popular: true,
      cta: 'Start with Growth',
    },
    {
      name: 'Managed Collections',
      price: '₹7,999',
      interval: 'per month',
      description: 'Complete hands-off peace of mind for established high-volume firms.',
      features: [
        'Unlimited invoices & clients',
        '15 team seats + CA access',
        'Official WhatsApp Business reminders',
        'Dedicated collections account manager',
        'Payment gateway Razorpay links',
        'Custom invoice series & multi-branch',
        '99.9% uptime SLA & priority support',
      ],
      popular: false,
      cta: 'Contact for Managed',
    },
  ];

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white">
      <Navbar />

      <main className="flex-1 pt-32 pb-20 px-6 max-w-7xl mx-auto w-full">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-medium mb-4">
            <Zap className="w-3.5 h-3.5 text-indigo-400" />
            <span>Fair Indian Rupee (INR) Pricing</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight mb-4">
            Predictable pricing that pays for itself in one on-time payment
          </h1>
          <p className="text-slate-400 text-sm">
            All plans include tenant data isolation in Mumbai (AWS/Supabase ap-south-1), full audit logs, and approval-first messaging.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto mb-20">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`rounded-2xl p-8 flex flex-col justify-between transition relative ${
                plan.popular
                  ? 'bg-slate-900 border-2 border-indigo-500 shadow-2xl shadow-indigo-500/20'
                  : 'bg-slate-900/40 border border-slate-800 hover:border-slate-700'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3.5 py-0.5 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 text-white text-[11px] font-bold uppercase tracking-wider shadow-md">
                  Most Popular
                </div>
              )}

              <div>
                <h3 className="text-lg font-bold text-white mb-2">{plan.name}</h3>
                <p className="text-xs text-slate-400 mb-6 min-h-[32px]">{plan.description}</p>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-4xl font-extrabold text-white">{plan.price}</span>
                  <span className="text-xs text-slate-400">{plan.interval}</span>
                </div>

                <div className="border-t border-slate-800 pt-6 mb-8">
                  <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-4">Included Features</h4>
                  <ul className="space-y-3">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-3 text-xs text-slate-300">
                        <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <Link
                href="/app/today"
                className={`w-full py-3 rounded-xl font-semibold text-xs flex items-center justify-center gap-2 transition ${
                  plan.popular
                    ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                }`}
              >
                <span>{plan.cta}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          ))}
        </div>

        {/* FAQ note */}
        <div className="p-8 rounded-2xl bg-slate-900/30 border border-slate-800 max-w-4xl mx-auto text-center">
          <div className="flex items-center justify-center gap-2 text-indigo-400 font-semibold text-sm mb-2">
            <ShieldCheck className="w-4 h-4" />
            <span>Zero Lock-in & Complete Data Export</span>
          </div>
          <p className="text-xs text-slate-400 max-w-xl mx-auto">
            You can export your complete ledger, client database, and audit history as standardized CSV/ZIP at any moment under the India DPDP provisions.
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
