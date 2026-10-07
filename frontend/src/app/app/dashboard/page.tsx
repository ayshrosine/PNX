'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Calendar,
  ArrowUpRight,
  ChevronRight,
  ShieldAlert,
  Download,
  Users,
  CreditCard,
  FileText,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
} from 'recharts';
import { api } from '@/lib/api';
import { formatInr, formatDate } from '@/lib/utils';
import { toast } from 'sonner';

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.dashboard
      .get()
      .then((res) => {
        if (res?.data) setData(res.data);
      })
      .catch((err) => {
        toast.error('Failed to load dashboard data: ' + err.message);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm text-slate-400">Loading metrics & cashflow telemetry...</p>
        </div>
      </div>
    );
  }

  const kpis = data?.kpis || {
    totalOutstanding: 0,
    totalOverdue: 0,
    overdueCount: 0,
    dueIn7Days: 0,
    collectedThisMonth: 0,
  };

  const ageing = data?.ageingBuckets || {};
  const ageingChartData = [
    { name: 'Current', amount: ageing.CURRENT || 0, color: '#6366f1' },
    { name: '1-15d', amount: ageing['1-15'] || 0, color: '#38bdf8' },
    { name: '16-30d', amount: ageing['16-30'] || 0, color: '#f59e0b' },
    { name: '31-45d (MSME)', amount: ageing['31-45'] || 0, color: '#f97316' },
    { name: '46-60d', amount: ageing['46-60'] || 0, color: '#ef4444' },
    { name: '60+d', amount: ageing['60+'] || 0, color: '#b91c1c' },
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight">
            Financial Dashboard
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Real-time receivables ageing, collections velocity, and Section 43B(h) exposure.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/app/today"
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-indigo-400 bg-indigo-500/10 border border-indigo-500/30 rounded-lg hover:bg-indigo-500/20 transition"
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Go to Today's Actions</span>
          </Link>
          <Link
            href="/app/invoices/new"
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-md shadow-indigo-600/30 transition"
          >
            Create Invoice
          </Link>
        </div>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Outstanding */}
        <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 backdrop-blur-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Total Outstanding</span>
            <FileText className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-3 text-2xl lg:text-3xl font-bold font-mono text-white tracking-tight">
            {formatInr(kpis.totalOutstanding)}
          </div>
          <p className="mt-1 text-xs text-slate-400">Total ledger receivables</p>
        </div>

        {/* Total Overdue */}
        <div className="p-5 rounded-xl bg-slate-900/60 border border-rose-500/30 backdrop-blur-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Total Overdue</span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="mt-3 text-2xl lg:text-3xl font-bold font-mono text-rose-400 tracking-tight">
            {formatInr(kpis.totalOverdue)}
          </div>
          <p className="mt-1 text-xs text-rose-400">
            {kpis.overdueCount} accounts past due date
          </p>
        </div>

        {/* Collected This Month */}
        <div className="p-5 rounded-xl bg-slate-900/60 border border-emerald-500/30 backdrop-blur-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Collected This Month</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-3 text-2xl lg:text-3xl font-bold font-mono text-emerald-400 tracking-tight">
            {formatInr(kpis.collectedThisMonth)}
          </div>
          <p className="mt-1 text-xs text-emerald-400">Deposits cleared & matched</p>
        </div>

        {/* Due in 7 Days */}
        <div className="p-5 rounded-xl bg-slate-900/60 border border-indigo-500/30 backdrop-blur-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Due in Next 7 Days</span>
            <Calendar className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="mt-3 text-2xl lg:text-3xl font-bold font-mono text-indigo-400 tracking-tight">
            {formatInr(kpis.dueIn7Days)}
          </div>
          <p className="mt-1 text-xs text-indigo-400">Scheduled for payment</p>
        </div>
      </div>

      {/* Visual Analytics Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Ageing Buckets Bar Chart */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-md space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                Receivables Ageing Distribution
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Outstanding balance grouped by overdue brackets
              </p>
            </div>
            <Link
              href="/app/reports"
              className="text-xs text-indigo-400 hover:underline flex items-center gap-1"
            >
              Full report <ChevronRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="h-64 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ageingChartData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                <XAxis
                  dataKey="name"
                  stroke="#64748b"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: '#334155' }}
                />
                <YAxis
                  stroke="#64748b"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: '#334155' }}
                  tickFormatter={(val) => `₹${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    border: '1px solid #1e293b',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: '#f8fafc',
                  }}
                  formatter={(val: any) => [formatInr(Number(val) || 0), 'Amount']}
                />
                <Bar dataKey="amount" radius={[6, 6, 0, 0]}>
                  {ageingChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Section 43B(h) Warning Alert */}
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-3">
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs text-slate-300">
              <span className="font-semibold text-amber-400">Section 43B(h) Audit Alert:</span>{' '}
              Payments pending over 45 days from registered MSME clients are subject to Income Tax Act
              expense disallowance for the debtor. Use the 43B(h) badge in follow-ups.
            </div>
          </div>
        </div>

        {/* Top Overdue Clients */}
        <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-md space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white tracking-tight">
              Top Debtors by Balance
            </h2>
            <Link
              href="/app/clients"
              className="text-xs text-indigo-400 hover:underline"
            >
              All clients
            </Link>
          </div>

          <div className="space-y-3 pt-2">
            {data?.topOverdueClients && data.topOverdueClients.length > 0 ? (
              data.topOverdueClients.slice(0, 5).map((client: any, idx: number) => (
                <Link
                  key={client.id || idx}
                  href={`/app/clients/${client.id}`}
                  className="block p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700 transition"
                >
                  <div className="flex items-center justify-between text-xs font-semibold text-white">
                    <span className="truncate max-w-[150px]">{client.name}</span>
                    <span className="font-mono text-rose-400 font-bold">
                      {formatInr(client.overdue || client.balance || 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1">
                    <span>{client.overdueCount || 1} overdue invoice(s)</span>
                    <span className="text-indigo-400 text-[10px]">View Profile →</span>
                  </div>
                </Link>
              ))
            ) : (
              <p className="text-xs text-slate-500 py-6 text-center">
                No overdue clients found.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Activity & Recent Transactions Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Invoices */}
        <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-md space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-400" />
              <span>Recent Invoices</span>
            </h2>
            <Link
              href="/app/invoices"
              className="text-xs text-indigo-400 hover:underline"
            >
              View all
            </Link>
          </div>

          <div className="divide-y divide-slate-800/60 text-xs">
            {data?.recentInvoices && data.recentInvoices.length > 0 ? (
              data.recentInvoices.slice(0, 5).map((inv: any) => (
                <div key={inv.id} className="py-3 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/app/invoices/${inv.id}`}
                        className="font-mono font-semibold text-white hover:text-indigo-400"
                      >
                        {inv.number}
                      </Link>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                        {inv.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">{inv.client?.name}</p>
                  </div>
                  <div className="text-right">
                    <div className="font-mono font-bold text-white">{formatInr(inv.total)}</div>
                    <div className="text-[10px] text-slate-500">{formatDate(inv.issueDate)}</div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-500 py-4 text-center">No recent invoices.</p>
            )}
          </div>
        </div>

        {/* Recent Payments Received */}
        <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-md space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-emerald-400" />
              <span>Recent Collections</span>
            </h2>
            <Link
              href="/app/payments"
              className="text-xs text-indigo-400 hover:underline"
            >
              View all
            </Link>
          </div>

          <div className="divide-y divide-slate-800/60 text-xs">
            {data?.recentPayments && data.recentPayments.length > 0 ? (
              data.recentPayments.slice(0, 5).map((pay: any) => (
                <div key={pay.id} className="py-3 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-semibold text-emerald-400">
                        {pay.reference || 'PAY-REF'}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-mono">
                        {pay.mode}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">{pay.client?.name}</p>
                  </div>
                  <div className="text-right">
                    <div className="font-mono font-bold text-emerald-400">
                      +{formatInr(pay.amount)}
                    </div>
                    <div className="text-[10px] text-slate-500">{formatDate(pay.paymentDate)}</div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-500 py-4 text-center">No recent payments recorded.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
