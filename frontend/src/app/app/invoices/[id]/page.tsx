'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  FileText,
  ArrowLeft,
  Download,
  Share2,
  Send,
  PhoneCall,
  CheckCircle2,
  Clock,
  AlertTriangle,
  CreditCard,
  Building,
  Calendar,
  MessageSquare,
  Copy,
  ExternalLink,
  ShieldAlert,
  AlertCircle,
} from 'lucide-react';
import { api } from '@/lib/api';
import { formatInr, formatDate } from '@/lib/utils';
import { toast } from 'sonner';

export default function InvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const invoiceId = String(params.id);

  const [invoice, setInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'ACTIVITIES' | 'DISPUTES'>('OVERVIEW');

  // Activity note form
  const [noteType, setNoteType] = useState<'CALL_LOGGED' | 'NOTE_ADDED' | 'PROMISE_TO_PAY'>('NOTE_ADDED');
  const [noteContent, setNoteContent] = useState('');
  const [promiseDate, setPromiseDate] = useState('');
  const [promiseAmount, setPromiseAmount] = useState('');
  const [submittingNote, setSubmittingNote] = useState(false);

  // Send modal
  const [sendModalOpen, setSendModalOpen] = useState(false);
  const [sendChannel, setSendChannel] = useState<'WHATSAPP' | 'EMAIL'>('WHATSAPP');
  const [sendRecipient, setSendRecipient] = useState('');

  const loadInvoice = async () => {
    try {
      setLoading(true);
      const res = await api.invoices.get(invoiceId);
      if (res?.data) {
        setInvoice(res.data);
        if (res.data.client?.phone) {
          setSendRecipient(res.data.client.phone);
        } else if (res.data.client?.email) {
          setSendRecipient(res.data.client.email);
        }
      }
    } catch (err: any) {
      toast.error('Failed to load invoice: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (invoiceId) {
      loadInvoice();
    }
  }, [invoiceId]);

  const handleDownloadPdf = () => {
    const url = api.invoices.getPdfBlobUrl(invoiceId);
    window.open(url, '_blank');
  };

  const handleCopyPortalLink = () => {
    if (!invoice?.publicToken) return;
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
    const link = `${origin}/p/${invoice.publicToken}`;
    navigator.clipboard.writeText(link);
    toast.success('Public client portal link copied to clipboard!');
  };

  const handleIssueInvoice = async () => {
    try {
      await api.invoices.issue(invoiceId);
      toast.success('Invoice issued successfully!');
      loadInvoice();
    } catch (err: any) {
      toast.error('Failed to issue: ' + err.message);
    }
  };

  const handleSendInvoice = async () => {
    try {
      await api.invoices.send(invoiceId, {
        channel: sendChannel,
        recipient: sendRecipient,
      });
      toast.success(`Invoice dispatched via ${sendChannel}!`);
      setSendModalOpen(false);
      loadInvoice();
    } catch (err: any) {
      toast.error('Failed to send: ' + err.message);
    }
  };

  const handleAddActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteContent.trim() && noteType !== 'PROMISE_TO_PAY') {
      toast.error('Please enter a note or description');
      return;
    }
    if (noteType === 'PROMISE_TO_PAY' && !promiseDate) {
      toast.error('Please specify a promised payment date');
      return;
    }

    try {
      setSubmittingNote(true);
      await api.invoices.addActivity(invoiceId, {
        type: noteType,
        notes: noteContent,
        promisedDate: promiseDate || undefined,
        amount: promiseAmount ? parseFloat(promiseAmount) : undefined,
      });
      toast.success('Activity recorded on timeline!');
      setNoteContent('');
      setPromiseDate('');
      setPromiseAmount('');
      loadInvoice();
    } catch (err: any) {
      toast.error('Failed to save activity: ' + err.message);
    } finally {
      setSubmittingNote(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="p-12 text-center text-slate-400">
        <p>Invoice not found.</p>
        <Link href="/app/invoices" className="text-indigo-400 hover:underline mt-2 inline-block">
          Return to Invoices
        </Link>
      </div>
    );
  }

  const isMsme = invoice.client?.msmeCategory && invoice.client.msmeCategory !== 'NONE';
  const daysOverdue = invoice.derived?.daysOverdue || 0;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-24">
      {/* Top Navigation */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-6">
        <div className="flex items-center gap-3">
          <Link
            href="/app/invoices"
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-extrabold text-white font-mono tracking-tight">
                {invoice.number}
              </h1>
              <span
                className={`px-2.5 py-0.5 rounded text-xs font-semibold uppercase tracking-wider font-mono border ${
                  invoice.status === 'PAID'
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                    : invoice.derived?.isOverdue
                    ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                    : invoice.status === 'SENT'
                    ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30'
                    : 'bg-slate-800 text-slate-300 border-slate-700'
                }`}
              >
                {invoice.status}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Client:{' '}
              <Link href={`/app/clients/${invoice.clientId}`} className="text-slate-200 hover:underline font-semibold">
                {invoice.client?.name}
              </Link>
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {invoice.status === 'DRAFT' && (
            <button
              onClick={handleIssueInvoice}
              className="px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-sm transition flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Issue Invoice</span>
            </button>
          )}

          <button
            onClick={handleDownloadPdf}
            className="px-3 py-1.5 text-xs font-semibold text-slate-300 bg-slate-900 border border-slate-800 rounded-lg hover:bg-slate-800 transition flex items-center gap-1.5"
            title="Download GST Compliant PDF"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download PDF</span>
          </button>

          <button
            onClick={() => setSendModalOpen(true)}
            className="px-3 py-1.5 text-xs font-semibold text-indigo-400 bg-indigo-500/10 border border-indigo-500/30 rounded-lg hover:bg-indigo-500/20 transition flex items-center gap-1.5"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Send Reminder</span>
          </button>

          <button
            onClick={handleCopyPortalLink}
            className="px-3 py-1.5 text-xs font-semibold text-slate-300 bg-slate-900 border border-slate-800 rounded-lg hover:bg-slate-800 transition flex items-center gap-1.5"
            title="Copy Public Client Invoice Link"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Copy Link</span>
          </button>

          <Link
            href={`/app/payments/new?invoiceId=${invoice.id}&clientId=${invoice.clientId}`}
            className="px-3.5 py-1.5 text-xs font-semibold text-emerald-300 bg-emerald-500/20 border border-emerald-500/30 rounded-lg hover:bg-emerald-500/30 transition flex items-center gap-1.5"
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>Record Payment</span>
          </Link>
        </div>
      </div>

      {/* Section 43B(h) Warning if applicable */}
      {(isMsme || daysOverdue > 0) && (
        <div className="p-4 rounded-xl bg-slate-900/60 border border-amber-500/30 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-bold text-amber-400 flex items-center gap-2">
                <span>Section 43B(h) MSME Clock Status</span>
                <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20">
                  {daysOverdue > 45 ? 'VIOLATION THRESHOLD EXCEEDED' : `DAY ${daysOverdue} OF 45`}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                Under the Indian Finance Act, payments to registered Micro/Small enterprises beyond 45 days
                cannot be claimed as tax deductions by the buyer until actually paid.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 text-xs font-medium">
        <button
          onClick={() => setActiveTab('OVERVIEW')}
          className={`pb-3 px-2 border-b-2 transition ${
            activeTab === 'OVERVIEW'
              ? 'border-indigo-500 text-indigo-400 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Invoice Document & Details
        </button>
        <button
          onClick={() => setActiveTab('ACTIVITIES')}
          className={`pb-3 px-2 border-b-2 transition flex items-center gap-1.5 ${
            activeTab === 'ACTIVITIES'
              ? 'border-indigo-500 text-indigo-400 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <span>Activity Timeline</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300">
            {invoice.activities?.length || 0}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('DISPUTES')}
          className={`pb-3 px-2 border-b-2 transition flex items-center gap-1.5 ${
            activeTab === 'DISPUTES'
              ? 'border-indigo-500 text-indigo-400 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <span>Client Inquiries & Disputes</span>
          {invoice.disputes?.length > 0 && (
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-rose-500/20 text-rose-400">
              {invoice.disputes.length}
            </span>
          )}
        </button>
      </div>

      {/* TAB 1: Invoice Overview */}
      {activeTab === 'OVERVIEW' && (
        <div className="space-y-6">
          {/* Top Metadata Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 text-xs">
              <span className="text-slate-400">Invoice Total</span>
              <div className="text-xl font-bold font-mono text-white mt-1">
                {formatInr(invoice.total)}
              </div>
              <span className="text-[11px] text-slate-500">Includes GST</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 text-xs">
              <span className="text-slate-400">Balance Due</span>
              <div className="text-xl font-bold font-mono text-amber-400 mt-1">
                {formatInr(invoice.balanceDue)}
              </div>
              <span className="text-[11px] text-slate-500">
                {invoice.balanceDue === 0 ? 'Fully settled' : 'Unpaid balance'}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 text-xs">
              <span className="text-slate-400">Issue Date</span>
              <div className="text-sm font-semibold text-white mt-1">
                {formatDate(invoice.issueDate)}
              </div>
              <span className="text-[11px] text-slate-500">POS: State {invoice.placeOfSupply}</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 text-xs">
              <span className="text-slate-400">Due Date</span>
              <div className="text-sm font-semibold text-white mt-1">
                {formatDate(invoice.dueDate)}
              </div>
              <span className="text-[11px] font-mono text-rose-400">
                {daysOverdue > 0 ? `${daysOverdue} days overdue` : 'Within terms'}
              </span>
            </div>
          </div>

          {/* Client Billed-To Card */}
          <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-2 text-xs">
            <div className="font-semibold text-white flex items-center justify-between">
              <span>Billed To:</span>
              <Link href={`/app/clients/${invoice.clientId}`} className="text-indigo-400 hover:underline">
                View Client Profile →
              </Link>
            </div>
            <div className="text-sm font-bold text-white">{invoice.client?.name}</div>
            <div className="text-slate-400">
              GSTIN: <span className="font-mono text-slate-200">{invoice.client?.gstin || 'Unregistered'}</span> | PAN:{' '}
              <span className="font-mono text-slate-200">{invoice.client?.pan || 'N/A'}</span>
            </div>
            <div className="text-slate-400">
              {invoice.client?.addressLine1}, {invoice.client?.city}, {invoice.client?.state} -{' '}
              {invoice.client?.pincode}
            </div>
          </div>

          {/* Line Items Table */}
          <div className="rounded-2xl bg-slate-900/40 border border-slate-800 overflow-hidden">
            <div className="p-4 border-b border-slate-800 font-semibold text-white text-xs">
              Line Items & GST Breakdown
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/60 text-[11px] text-slate-400 uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-4">Item & Description</th>
                    <th className="py-2.5 px-3">HSN/SAC</th>
                    <th className="py-2.5 px-3">Qty</th>
                    <th className="py-2.5 px-3">Rate</th>
                    <th className="py-2.5 px-3">Taxable</th>
                    <th className="py-2.5 px-3">GST Rate</th>
                    <th className="py-2.5 px-4 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 font-medium">
                  {invoice.items?.map((item: any, i: number) => (
                    <tr key={item.id || i} className="hover:bg-slate-800/20">
                      <td className="py-3 px-4 font-semibold text-white">{item.description}</td>
                      <td className="py-3 px-3 font-mono text-slate-400">{item.hsnSac || '—'}</td>
                      <td className="py-3 px-3 font-mono">
                        {item.quantity} {item.unit}
                      </td>
                      <td className="py-3 px-3 font-mono">{formatInr(item.unitPrice)}</td>
                      <td className="py-3 px-3 font-mono">{formatInr(item.taxableAmount)}</td>
                      <td className="py-3 px-3 font-mono text-indigo-400">{item.gstRate}%</td>
                      <td className="py-3 px-4 font-mono font-bold text-white text-right">
                        {formatInr(item.lineTotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Total Breakup */}
            <div className="p-4 bg-slate-950/60 border-t border-slate-800 flex justify-end font-mono text-xs">
              <div className="w-72 space-y-1.5">
                <div className="flex justify-between text-slate-400">
                  <span>Taxable Subtotal:</span>
                  <span className="text-white">{formatInr(invoice.subtotal)}</span>
                </div>
                {parseFloat(invoice.cgst || '0') > 0 && (
                  <div className="flex justify-between text-slate-400">
                    <span>CGST:</span>
                    <span className="text-indigo-400">{formatInr(invoice.cgst)}</span>
                  </div>
                )}
                {parseFloat(invoice.sgst || '0') > 0 && (
                  <div className="flex justify-between text-slate-400">
                    <span>SGST:</span>
                    <span className="text-indigo-400">{formatInr(invoice.sgst)}</span>
                  </div>
                )}
                {parseFloat(invoice.igst || '0') > 0 && (
                  <div className="flex justify-between text-slate-400">
                    <span>IGST:</span>
                    <span className="text-amber-400">{formatInr(invoice.igst)}</span>
                  </div>
                )}
                {parseFloat(invoice.roundOff || '0') !== 0 && (
                  <div className="flex justify-between text-slate-400">
                    <span>Round-off:</span>
                    <span className="text-slate-300">{formatInr(invoice.roundOff)}</span>
                  </div>
                )}
                <div className="flex justify-between text-white font-bold text-sm pt-2 border-t border-slate-800">
                  <span>Total Amount:</span>
                  <span className="text-indigo-400">{formatInr(invoice.total)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Allocations */}
          {invoice.paymentAllocations?.length > 0 && (
            <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-3">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-400" />
                <span>Payments Allocated to this Invoice</span>
              </h3>
              <div className="divide-y divide-slate-800 text-xs">
                {invoice.paymentAllocations.map((alloc: any) => (
                  <div key={alloc.id} className="py-2.5 flex items-center justify-between">
                    <div>
                      <span className="font-mono text-emerald-400 font-semibold">
                        Allocated: {formatInr(alloc.amount)}
                      </span>
                      <div className="text-[11px] text-slate-400">
                        Date: {formatDate(alloc.createdAt || new Date().toISOString())}
                      </div>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-mono">
                      CLEARED
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Activity Timeline */}
      {activeTab === 'ACTIVITIES' && (
        <div className="space-y-6">
          {/* Add Activity Form */}
          <form onSubmit={handleAddActivity} className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-white">Record Activity:</span>
              <button
                type="button"
                onClick={() => setNoteType('NOTE_ADDED')}
                className={`px-2.5 py-1 text-xs rounded transition ${
                  noteType === 'NOTE_ADDED' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'
                }`}
              >
                Internal Note
              </button>
              <button
                type="button"
                onClick={() => setNoteType('CALL_LOGGED')}
                className={`px-2.5 py-1 text-xs rounded transition ${
                  noteType === 'CALL_LOGGED' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'
                }`}
              >
                Log Phone Call
              </button>
              <button
                type="button"
                onClick={() => setNoteType('PROMISE_TO_PAY')}
                className={`px-2.5 py-1 text-xs rounded transition ${
                  noteType === 'PROMISE_TO_PAY' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'
                }`}
              >
                Promise to Pay
              </button>
            </div>

            {noteType === 'PROMISE_TO_PAY' && (
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Promised Date *</label>
                  <input
                    type="date"
                    value={promiseDate}
                    onChange={(e) => setPromiseDate(e.target.value)}
                    className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Expected Amount (₹)</label>
                  <input
                    type="number"
                    placeholder={String(invoice.balanceDue)}
                    value={promiseAmount}
                    onChange={(e) => setPromiseAmount(e.target.value)}
                    className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white"
                  />
                </div>
              </div>
            )}

            <div>
              <textarea
                rows={2}
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                placeholder="Add comments, client commitments, or collection notes..."
                className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={submittingNote}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition"
              >
                Save to Timeline
              </button>
            </div>
          </form>

          {/* Timeline List */}
          <div className="space-y-3">
            {invoice.activities && invoice.activities.length > 0 ? (
              invoice.activities.map((act: any) => (
                <div
                  key={act.id}
                  className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-start gap-3 text-xs"
                >
                  <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 shrink-0">
                    {act.type === 'CALL_LOGGED' ? (
                      <PhoneCall className="w-4 h-4" />
                    ) : act.type === 'PROMISE_TO_PAY' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <MessageSquare className="w-4 h-4" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-white font-mono text-[11px]">{act.type}</span>
                      <span className="text-[10px] text-slate-500">
                        {formatDate(act.createdAt || new Date().toISOString())}
                      </span>
                    </div>
                    <p className="text-slate-300 mt-1">{act.notes}</p>
                    {act.promisedDate && (
                      <div className="mt-1 text-[11px] font-mono text-emerald-400 font-semibold">
                        Promised: {formatDate(act.promisedDate)}
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-500 py-6 text-center">No activities recorded yet.</p>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: Disputes */}
      {activeTab === 'DISPUTES' && (
        <div className="space-y-4">
          {invoice.disputes && invoice.disputes.length > 0 ? (
            invoice.disputes.map((disp: any) => (
              <div key={disp.id} className="p-5 rounded-2xl bg-slate-900/40 border border-rose-500/30 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-rose-400 flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4" />
                    <span>Dispute Status: {disp.status}</span>
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {formatDate(disp.createdAt || new Date().toISOString())}
                  </span>
                </div>
                <p className="text-white mt-1">"{disp.reason || disp.notes || 'Client raised an inquiry on billing amount'}"</p>
                {disp.contactEmail && (
                  <div className="text-[11px] text-slate-400">Raised by: {disp.contactEmail}</div>
                )}
              </div>
            ))
          ) : (
            <div className="p-8 text-center rounded-xl bg-slate-900/40 border border-slate-800">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2 opacity-80" />
              <p className="text-sm font-semibold text-white">No active disputes</p>
              <p className="text-xs text-slate-400 mt-1">
                Client has not logged any billing discrepancies on this invoice.
              </p>
            </div>
          )}
        </div>
      )}

      {/* SEND MODAL */}
      {sendModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Send className="w-4 h-4 text-indigo-400" />
              <span>Send Invoice / Reminder</span>
            </h3>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Channel</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSendChannel('WHATSAPP')}
                  className={`p-2.5 rounded-lg border text-xs font-semibold transition ${
                    sendChannel === 'WHATSAPP'
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                      : 'bg-slate-950 text-slate-400 border-slate-800'
                  }`}
                >
                  WhatsApp
                </button>
                <button
                  type="button"
                  onClick={() => setSendChannel('EMAIL')}
                  className={`p-2.5 rounded-lg border text-xs font-semibold transition ${
                    sendChannel === 'EMAIL'
                      ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/40'
                      : 'bg-slate-950 text-slate-400 border-slate-800'
                  }`}
                >
                  Email
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Recipient {sendChannel === 'WHATSAPP' ? 'Phone (with +91)' : 'Email'}
              </label>
              <input
                type="text"
                value={sendRecipient}
                onChange={(e) => setSendRecipient(e.target.value)}
                className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setSendModalOpen(false)}
                className="px-4 py-2 text-xs text-slate-400 hover:text-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={handleSendInvoice}
                className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg"
              >
                Dispatch Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
