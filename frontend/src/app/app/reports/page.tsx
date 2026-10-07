'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  BarChart3,
  ShieldAlert,
  ShieldCheck,
  Download,
  Calendar,
  FileSpreadsheet,
  AlertTriangle,
  Clock,
  ExternalLink,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';
import { api } from '@/lib/api';
import { formatInr, formatDate } from '@/lib/utils';
import { toast } from 'sonner';

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<'43B' | 'AGEING' | 'COLLECTIONS' | 'TDS'>('43B');
  const [msmeData, setMsmeData] = useState<any[]>([]);
  const [ageingData, setAgeingData] = useState<any[]>([]);
  const [collectionsData, setCollectionsData] = useState<any[]>([]);
  const [tdsData, setTdsData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadReports = async () => {
    try {
      setLoading(true);
      const [mRes, aRes, cRes, tRes] = await Promise.all([
        api.reports.msmeClock().catch(() => ({ data: [] })),
        api.reports.ageing().catch(() => ({ data: [] })),
        api.reports.collections().catch(() => ({ data: [] })),
        api.reports.tds().catch(() => ({ data: [] })),
      ]);
      if (mRes?.data) setMsmeData(mRes.data);
      if (aRes?.data) setAgeingData(aRes.data);
      if (cRes?.data) setCollectionsData(cRes.data);
      if (tRes?.data) setTdsData(tRes.data);
    } catch (err: any) {
      toast.error('Failed to load reports: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  const handleExportCsv = (reportName: string) => {
    toast.success(`Exporting ${reportName} to CSV...`);
    // Create simple CSV blob
    let csvContent = 'data:text/csv;charset=utf-8,';
    if (reportName === '43B') {
      csvContent += 'Invoice Number,Client,MSME Category,Days Elapsed,Statutory Limit,Balance Due,Status\n';
      msmeData.forEach((row) => {
        csvContent += `"${row.number}","${row.clientName}","${row.msmeCategory}","${row.daysElapsed}","45 Days","${row.balanceDue}","${row.status}"\n`;
      });
    } else {
      csvContent += 'Client,Current,1-15d,16-30d,31-45d,46-60d,60+d,Total\n';
      ageingData.forEach((row) => {
        csvContent += `"${row.clientName}","${row.current}","${row.bucket1_15}","${row.bucket16_30}","${row.bucket31_45}","${row.bucket46_60}","${row.bucket60_plus}","${row.total}"\n`;
      });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${reportName.toLowerCase()}_report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-24">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <BarChart3 className="w-6 h-6 text-indigo-400" />
            <span>Reports & Section 43B(h) Audit</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Statutory MSME compliance audit, accounts receivable ageing matrix, and Form 26AS TDS reconciliation.
          </p>
        </div>

        <button
          onClick={() => handleExportCsv(activeTab)}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-200 bg-slate-900 border border-slate-800 rounded-lg hover:bg-slate-800 transition"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export {activeTab} CSV</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 text-xs font-medium">
        <button
          onClick={() => setActiveTab('43B')}
          className={`pb-3 px-2 border-b-2 transition flex items-center gap-1.5 ${
            activeTab === '43B'
              ? 'border-indigo-500 text-indigo-400 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <ShieldAlert className="w-4 h-4 text-amber-400" />
          <span>Section 43B(h) Compliance Clock</span>
        </button>
        <button
          onClick={() => setActiveTab('AGEING')}
          className={`pb-3 px-2 border-b-2 transition flex items-center gap-1.5 ${
            activeTab === 'AGEING'
              ? 'border-indigo-500 text-indigo-400 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <span>Ageing Matrix</span>
        </button>
        <button
          onClick={() => setActiveTab('COLLECTIONS')}
          className={`pb-3 px-2 border-b-2 transition flex items-center gap-1.5 ${
            activeTab === 'COLLECTIONS'
              ? 'border-indigo-500 text-indigo-400 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <span>Collections Velocity</span>
        </button>
        <button
          onClick={() => setActiveTab('TDS')}
          className={`pb-3 px-2 border-b-2 transition flex items-center gap-1.5 ${
            activeTab === 'TDS'
              ? 'border-indigo-500 text-indigo-400 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <span>TDS Reconciliation</span>
        </button>
      </div>

      {/* TAB 1: Section 43B(h) Compliance Clock */}
      {activeTab === '43B' && (
        <div className="space-y-6">
          {/* Statutory Explainer */}
          <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs text-slate-200 space-y-2">
            <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>Section 43B(h) of the Income Tax Act (Finance Act 2023)</span>
            </div>
            <p className="leading-relaxed">
              Any sum payable to a registered <strong>Micro or Small enterprise</strong> must be paid within 15 days
              (or maximum 45 days if written agreement exists). If payment is delayed past the financial year end, the buyer
              <strong> cannot claim tax deduction for the purchase/expense</strong> until the year it is actually paid.
              Use this statutory leverage to accelerate payments from large corporate buyers.
            </p>
          </div>

          <div className="rounded-2xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-md overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                MSME Invoices Audit Matrix
              </span>
              <span className="text-xs text-slate-400">Statutory threshold: 45 Days</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/60 text-[11px] text-slate-400 uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Invoice #</th>
                    <th className="py-3 px-4">Buyer Client</th>
                    <th className="py-3 px-4">MSME Category</th>
                    <th className="py-3 px-4">Days Elapsed</th>
                    <th className="py-3 px-4">Balance Due</th>
                    <th className="py-3 px-4">Statutory Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {msmeData.length > 0 ? (
                    msmeData.map((row, i) => {
                      const days = row.daysElapsed || 0;
                      const isDisallowed = days > 45;
                      const isHighRisk = days >= 30 && days <= 45;

                      return (
                        <tr key={i} className="hover:bg-slate-800/30 transition">
                          <td className="py-3.5 px-4 font-mono font-semibold text-indigo-400">
                            <Link href={`/app/invoices/${row.invoiceId || row.id}`} className="hover:underline">
                              {row.number}
                            </Link>
                          </td>
                          <td className="py-3.5 px-4 font-semibold text-white">
                            {row.clientName || 'Client'}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-mono">
                              {row.msmeCategory || 'MICRO'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-mono">
                            <div className="flex items-center gap-1.5">
                              <span className="text-white font-bold">{days} days</span>
                              <span className="text-[10px] text-slate-500">/ 45d limit</span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 font-mono font-bold text-white">
                            {formatInr(row.balanceDue || 0)}
                          </td>
                          <td className="py-3.5 px-4">
                            {isDisallowed ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-rose-500/20 text-rose-400 border border-rose-500/30">
                                Disallowed for Buyer
                              </span>
                            ) : isHighRisk ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-500/20 text-amber-400 border border-amber-500/30">
                                Critical (Day {days}/45)
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                                Safe ({45 - days}d left)
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <Link
                              href={`/app/invoices/${row.invoiceId || row.id}`}
                              className="px-2.5 py-1 text-xs rounded bg-slate-800 hover:bg-slate-700 text-slate-200"
                            >
                              Chase Now
                            </Link>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-500">
                        No invoices currently tracked under MSME Section 43B(h).
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Ageing Matrix */}
      {activeTab === 'AGEING' && (
        <div className="rounded-2xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-md overflow-hidden">
          <div className="p-4 border-b border-slate-800 font-bold text-white text-xs uppercase tracking-wider">
            Accounts Receivable Ageing Matrix
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-950/60 text-[11px] text-slate-400 uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4 font-sans">Client Name</th>
                  <th className="py-3 px-3 text-right">Current</th>
                  <th className="py-3 px-3 text-right">1-15 Days</th>
                  <th className="py-3 px-3 text-right">16-30 Days</th>
                  <th className="py-3 px-3 text-right text-amber-400">31-45 Days</th>
                  <th className="py-3 px-3 text-right text-rose-400">46-60 Days</th>
                  <th className="py-3 px-3 text-right text-rose-500">60+ Days</th>
                  <th className="py-3 px-4 text-right font-sans font-bold text-white">Total Due</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {ageingData.length > 0 ? (
                  ageingData.map((row, i) => (
                    <tr key={i} className="hover:bg-slate-800/30 transition">
                      <td className="py-3.5 px-4 font-sans font-semibold text-white">
                        {row.clientName}
                      </td>
                      <td className="py-3.5 px-3 text-right text-slate-300">{formatInr(row.current || 0)}</td>
                      <td className="py-3.5 px-3 text-right text-slate-300">{formatInr(row.bucket1_15 || 0)}</td>
                      <td className="py-3.5 px-3 text-right text-slate-300">{formatInr(row.bucket16_30 || 0)}</td>
                      <td className="py-3.5 px-3 text-right text-amber-400">{formatInr(row.bucket31_45 || 0)}</td>
                      <td className="py-3.5 px-3 text-right text-rose-400">{formatInr(row.bucket46_60 || 0)}</td>
                      <td className="py-3.5 px-3 text-right text-rose-500">{formatInr(row.bucket60_plus || 0)}</td>
                      <td className="py-3.5 px-4 text-right font-bold text-white">
                        {formatInr(row.total || 0)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-500 font-sans">
                      No ageing receivables.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: Collections */}
      {activeTab === 'COLLECTIONS' && (
        <div className="rounded-2xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-md overflow-hidden">
          <div className="p-4 border-b border-slate-800 font-bold text-white text-xs uppercase tracking-wider">
            Collections Velocity & Inflow Register
          </div>
          <div className="p-8 text-center text-slate-400 text-xs">
            <p>Collections register updated in real-time as payments are recorded.</p>
          </div>
        </div>
      )}

      {/* TAB 4: TDS Reconciliation */}
      {activeTab === 'TDS' && (
        <div className="rounded-2xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-md overflow-hidden">
          <div className="p-4 border-b border-slate-800 font-bold text-white text-xs uppercase tracking-wider">
            TDS Deductions (Form 26AS Match)
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 text-[11px] text-slate-400 uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Client</th>
                  <th className="py-3 px-4">Payment Ref</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Gross Amount</th>
                  <th className="py-3 px-4 text-right">TDS Deducted (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {tdsData.length > 0 ? (
                  tdsData.map((row, i) => (
                    <tr key={i} className="hover:bg-slate-800/30">
                      <td className="py-3.5 px-4 font-semibold text-white">{row.clientName}</td>
                      <td className="py-3.5 px-4 font-mono text-slate-300">{row.reference}</td>
                      <td className="py-3.5 px-4 text-slate-400">{formatDate(row.date)}</td>
                      <td className="py-3.5 px-4 font-mono">{formatInr(row.grossAmount)}</td>
                      <td className="py-3.5 px-4 font-mono font-bold text-amber-400 text-right">
                        {formatInr(row.tdsAmount)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500">
                      No TDS deductions recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
