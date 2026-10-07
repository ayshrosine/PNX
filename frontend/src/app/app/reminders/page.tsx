'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  BellRing,
  CheckCircle2,
  Send,
  XCircle,
  Clock,
  Sparkles,
  Settings2,
  FileCode,
  ShieldCheck,
  Plus,
  ArrowRight,
  ExternalLink,
  MessageSquare,
  Mail,
} from 'lucide-react';
import { api } from '@/lib/api';
import { formatInr, formatDate } from '@/lib/utils';
import { toast } from 'sonner';

export default function RemindersPage() {
  const [activeTab, setActiveTab] = useState<'QUEUE' | 'RULES' | 'TEMPLATES'>('QUEUE');
  const [reminders, setReminders] = useState<any[]>([]);
  const [rules, setRules] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // New Template Modal
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateChannel, setTemplateChannel] = useState<'WHATSAPP' | 'EMAIL'>('WHATSAPP');
  const [templateSubject, setTemplateSubject] = useState('');
  const [templateBody, setTemplateBody] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const [remRes, rulesRes, tempRes] = await Promise.all([
        api.reminders.list().catch(() => ({ data: [] })),
        api.reminders.rules().catch(() => ({ data: [] })),
        api.reminders.templates().catch(() => ({ data: [] })),
      ]);
      if (remRes?.data) setReminders(remRes.data);
      if (rulesRes?.data) setRules(rulesRes.data);
      if (tempRes?.data) setTemplates(tempRes.data);
    } catch (err: any) {
      toast.error('Failed to load reminders data: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleApprove = async (id: string) => {
    try {
      await api.reminders.approve(id);
      toast.success('Reminder approved for automated delivery');
      loadData();
    } catch (err: any) {
      toast.error('Approval failed: ' + err.message);
    }
  };

  const handleSendNow = async (id: string) => {
    try {
      await api.reminders.sendNow(id);
      toast.success('Reminder sent immediately!');
      loadData();
    } catch (err: any) {
      toast.error('Send failed: ' + err.message);
    }
  };

  const handleSkip = async (id: string) => {
    try {
      await api.reminders.skip(id, 'Skipped from Reminders Queue');
      toast.info('Reminder skipped');
      loadData();
    } catch (err: any) {
      toast.error('Skip failed: ' + err.message);
    }
  };

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateName.trim() || !templateBody.trim()) {
      toast.error('Name and message body are required');
      return;
    }

    try {
      await api.reminders.createTemplate({
        name: templateName,
        channel: templateChannel,
        subject: templateSubject || undefined,
        body: templateBody,
      });
      toast.success('Template saved successfully!');
      setTemplateModalOpen(false);
      setTemplateName('');
      setTemplateBody('');
      setTemplateSubject('');
      loadData();
    } catch (err: any) {
      toast.error('Failed to create template: ' + err.message);
    }
  };

  const insertVariableChip = (variable: string) => {
    setTemplateBody((prev) => `${prev} {{${variable}}}`);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-24">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <BellRing className="w-6 h-6 text-indigo-400" />
            <span>Reminders & Cadence Engine</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Human-in-the-loop approval workflows, WhatsApp & Email message templates, and automated follow-up cadences.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'TEMPLATES' && (
            <button
              onClick={() => setTemplateModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-sm transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Template</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 text-xs font-medium">
        <button
          onClick={() => setActiveTab('QUEUE')}
          className={`pb-3 px-2 border-b-2 transition flex items-center gap-1.5 ${
            activeTab === 'QUEUE'
              ? 'border-indigo-500 text-indigo-400 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <span>Approval Queue</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
            {reminders.filter((r) => r.status === 'DRAFT').length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('RULES')}
          className={`pb-3 px-2 border-b-2 transition flex items-center gap-1.5 ${
            activeTab === 'RULES'
              ? 'border-indigo-500 text-indigo-400 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <span>Cadence Rules</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
            {rules.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('TEMPLATES')}
          className={`pb-3 px-2 border-b-2 transition flex items-center gap-1.5 ${
            activeTab === 'TEMPLATES'
              ? 'border-indigo-500 text-indigo-400 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <span>Message Templates</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
            {templates.length}
          </span>
        </button>
      </div>

      {/* TAB 1: Queue */}
      {activeTab === 'QUEUE' && (
        <div className="rounded-2xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-md overflow-hidden">
          {reminders.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/60 text-[11px] text-slate-400 uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Client</th>
                    <th className="py-3 px-4">Invoice #</th>
                    <th className="py-3 px-4">Channel</th>
                    <th className="py-3 px-4">Rule / Trigger</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {reminders.map((rem) => (
                    <tr key={rem.id} className="hover:bg-slate-800/30 transition">
                      <td className="py-3.5 px-4 font-semibold text-white">
                        {rem.client?.name || 'Client'}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-indigo-400">
                        <Link href={`/app/invoices/${rem.invoiceId}`} className="hover:underline flex items-center gap-1">
                          {rem.invoice?.number || 'INV'}
                          <ExternalLink className="w-3 h-3 opacity-60" />
                        </Link>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                            rem.channel === 'WHATSAPP'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                          }`}
                        >
                          {rem.channel}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-300">
                        {rem.rule?.name || 'Automated Follow-up'}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono ${
                            rem.status === 'SENT'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : rem.status === 'APPROVED'
                              ? 'bg-indigo-500/20 text-indigo-400'
                              : rem.status === 'SKIPPED'
                              ? 'bg-slate-800 text-slate-400'
                              : 'bg-amber-500/20 text-amber-400'
                          }`}
                        >
                          {rem.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {rem.status === 'DRAFT' ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleApprove(rem.id)}
                              className="px-2.5 py-1 text-xs rounded bg-indigo-600/30 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/40 transition font-medium"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleSendNow(rem.id)}
                              className="px-2.5 py-1 text-xs rounded bg-emerald-600/30 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/40 transition font-medium"
                            >
                              Send Now
                            </button>
                            <button
                              onClick={() => handleSkip(rem.id)}
                              className="p-1 text-slate-400 hover:text-rose-400"
                              title="Skip"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-500">Processed</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-12 text-center">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-3 opacity-80" />
              <p className="text-sm font-semibold text-white">Reminders queue is clear</p>
              <p className="text-xs text-slate-400 mt-1">
                No reminders are currently waiting for human approval.
              </p>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Rules */}
      {activeTab === 'RULES' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-slate-900/60 border border-indigo-500/20 text-xs text-slate-300 flex items-start gap-3">
            <Sparkles className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-white">Automated Cadence Pipeline:</span> Rules trigger
              reminders automatically relative to invoice due dates (e.g. T-3 pre-due gentle heads-up, T+7
              polite follow-up, T+30 Section 43B(h) statutory escalation). Invoices marked with paused reminders
              are automatically protected.
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {rules.map((rule) => (
              <div
                key={rule.id}
                className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-sm">{rule.name}</span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-semibold ${
                      rule.channel === 'WHATSAPP'
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-blue-500/20 text-blue-400'
                    }`}
                  >
                    {rule.channel}
                  </span>
                </div>

                <div className="flex items-center gap-4 text-xs font-mono text-slate-400">
                  <div>
                    Trigger:{' '}
                    <span className="text-white font-semibold">
                      {rule.daysOffset < 0
                        ? `${Math.abs(rule.daysOffset)} days before due`
                        : rule.daysOffset === 0
                        ? 'On Due Date'
                        : `${rule.daysOffset} days after due`}
                    </span>
                  </div>
                  <div>
                    Approval:{' '}
                    <span className={rule.requiresApproval ? 'text-amber-400' : 'text-emerald-400'}>
                      {rule.requiresApproval ? 'Human Required' : 'Auto Dispatch'}
                    </span>
                  </div>
                </div>

                <div className="text-[11px] text-slate-400 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
                  Template:{' '}
                  <span className="text-slate-200 font-semibold">
                    {rule.template?.name || 'Default Template'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: Templates */}
      {activeTab === 'TEMPLATES' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {templates.map((tmpl) => (
              <div
                key={tmpl.id}
                className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-sm">{tmpl.name}</span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-semibold ${
                      tmpl.channel === 'WHATSAPP'
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-blue-500/20 text-blue-400'
                    }`}
                  >
                    {tmpl.channel}
                  </span>
                </div>

                {tmpl.subject && (
                  <div className="text-xs text-slate-300 font-semibold">
                    Subject: {tmpl.subject}
                  </div>
                )}

                <div className="text-xs text-slate-300 whitespace-pre-wrap bg-slate-950/80 p-3 rounded-xl border border-slate-800/80 font-mono text-[11px] leading-relaxed">
                  {tmpl.body}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CREATE TEMPLATE MODAL */}
      {templateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <FileCode className="w-4 h-4 text-indigo-400" />
              <span>Create Message Template</span>
            </h3>

            <form onSubmit={handleCreateTemplate} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Template Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. WhatsApp - Friendly Reminder Day 7"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Channel</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTemplateChannel('WHATSAPP')}
                    className={`p-2 rounded-lg border text-xs font-semibold transition ${
                      templateChannel === 'WHATSAPP'
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                        : 'bg-slate-950 text-slate-400 border-slate-800'
                    }`}
                  >
                    WhatsApp
                  </button>
                  <button
                    type="button"
                    onClick={() => setTemplateChannel('EMAIL')}
                    className={`p-2 rounded-lg border text-xs font-semibold transition ${
                      templateChannel === 'EMAIL'
                        ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/40'
                        : 'bg-slate-950 text-slate-400 border-slate-800'
                    }`}
                  >
                    Email
                  </button>
                </div>
              </div>

              {templateChannel === 'EMAIL' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Email Subject Line
                  </label>
                  <input
                    type="text"
                    placeholder="Invoice {{invoiceNumber}} from {{businessName}}"
                    value={templateSubject}
                    onChange={(e) => setTemplateSubject(e.target.value)}
                    className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white"
                  />
                </div>
              )}

              {/* Dynamic Variables Chips */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Insert Variables:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    'clientName',
                    'invoiceNumber',
                    'balanceDue',
                    'dueDate',
                    'portalLink',
                    'businessName',
                    'msmeClockDays',
                  ].map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => insertVariableChip(v)}
                      className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-indigo-300 text-[10px] font-mono transition"
                    >
                      + {`{{${v}}}`}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Message Body *
                </label>
                <textarea
                  rows={5}
                  required
                  value={templateBody}
                  onChange={(e) => setTemplateBody(e.target.value)}
                  placeholder="Hi {{clientName}}, gently reminding you regarding invoice {{invoiceNumber}} for {{balanceDue}}..."
                  className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setTemplateModalOpen(false)}
                  className="px-4 py-2 text-xs text-slate-400 hover:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg"
                >
                  Save Template
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
