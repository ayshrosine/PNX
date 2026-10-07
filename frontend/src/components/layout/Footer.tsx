import React from 'react';
import Link from 'next/link';

export function Footer() {
  return (
    <footer className="border-t border-slate-800 bg-slate-950/60 pt-16 pb-12 text-slate-400 text-sm">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
          <div className="space-y-4">
            <div className="font-bold text-lg text-white flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-xs text-white">P</span>
              PNX FLOW
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Collections-first invoice-to-payment workflow engineered specifically for Indian micro, small, and growing B2B service firms.
            </p>
            <div className="text-[11px] text-slate-500 font-mono">
              Compliant with Section 43B(h) MSME 45-day payment timelines.
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-slate-200 text-xs uppercase tracking-wider mb-4">Product</h4>
            <ul className="space-y-2.5 text-xs">
              <li><Link href="/features" className="hover:text-white transition">Today Action List</Link></li>
              <li><Link href="/features" className="hover:text-white transition">Approval-Based Reminders</Link></li>
              <li><Link href="/features" className="hover:text-white transition">Indian GST & Invoicing</Link></li>
              <li><Link href="/pricing" className="hover:text-white transition">Pricing Plans</Link></li>
              <li><Link href="/app/today" className="text-indigo-400 hover:underline">Interactive Demo App</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-slate-200 text-xs uppercase tracking-wider mb-4">Workflows</h4>
            <ul className="space-y-2.5 text-xs">
              <li><Link href="/how-it-works" className="hover:text-white transition">Invoice Dispatch & Email</Link></li>
              <li><Link href="/how-it-works" className="hover:text-white transition">TDS & Bank Reconciliation</Link></li>
              <li><Link href="/how-it-works" className="hover:text-white transition">Client Public Portal</Link></li>
              <li><Link href="/how-it-works" className="hover:text-white transition">CA & Accountant Export Packs</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-slate-200 text-xs uppercase tracking-wider mb-4">Security & Legal</h4>
            <ul className="space-y-2.5 text-xs">
              <li><span className="text-slate-400">Data Residency: Mumbai (ap-south-1)</span></li>
              <li><span className="text-slate-400">India DPDP Act 2023 Ready</span></li>
              <li><span className="text-slate-400">PostgreSQL Tenant RLS Isolation</span></li>
              <li><span className="text-slate-400">Strict Human Approval Before Send</span></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-800/80 pt-8 flex flex-col md:flex-row items-center justify-between text-xs text-slate-400">
          <div>© 2026 PNX Flow. Built for Indian B2B Service Firms.</div>
          <div className="flex gap-6 mt-4 md:mt-0">
            <span>Terms of Service</span>
            <span>Privacy Policy</span>
            <span>Security Architecture</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
